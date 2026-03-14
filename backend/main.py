from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from typing import Optional, Any

# Import auth and chatbot modules
from auth import register_user, login_user, get_user_from_token, logout_user, get_user_profile, update_user_profile
from chatbot import get_chatbot_response, update_user_session
from posture_history import (
    log_posture_reading, get_user_history, get_daily_summary, 
    get_hourly_breakdown, get_statistics, export_to_csv, end_session,
    save_alert, get_alerts, clear_alerts
)
from baseline_learning import (
    start_calibration, add_calibration_sample, finish_calibration,
    get_baseline, calculate_deviation, get_calibration_status, has_baseline
)
from pattern_miner import discover_patterns, get_quick_stats
from posture_predictor import predict_slouch, train_model, get_prediction_status
from auto_trainer import get_model_status, force_train
from ml_insights import get_personalized_insights

# Default user ID for posture logging (will be replaced with auth later)
CURRENT_USER_ID = 1

# Calibration state
calibration_in_progress = False

app = FastAPI(title="PostureGuard Backend")

# Pydantic models for request validation
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    message: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    height: Optional[str] = None
    workingHours: Optional[str] = None
    alertDelay: Optional[int] = None
    alertIntensity: Optional[int] = None
    profileComplete: Optional[bool] = None
    age: Optional[Any] = None
    occupation: Optional[str] = None
    dailyGoal: Optional[int] = None
    breakInterval: Optional[int] = None
    soundAlerts: Optional[bool] = None
    weeklyReport: Optional[bool] = None
    gender: Optional[str] = None
    emergencyContact: Optional[str] = None
    isDisabled: Optional[bool] = None
    disabilityType: Optional[str] = None
    caretakerName: Optional[str] = None
    caretakerPhone: Optional[str] = None

class CalibrationRequest(BaseModel):
    pitch: Optional[float] = None
    roll: Optional[float] = None

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store connected frontend clients
frontend_clients: list[WebSocket] = []

# Store the latest sensor data
latest_sensor_data = {"pitch": 0, "roll": 0, "yaw": 0, "connected": False}

# Store user baseline for personalized calibration
user_baseline = {"pitch": 0, "roll": 0}


@app.get("/")
def read_root():
    return {"status": "PostureGuard Backend is running"}


# Posture Detection State Management
posture_state_duration = 0  # Seconds in current potential 'Bad' state
warning_state_duration = 0  # Seconds in warning state before escalating
current_detected_state = "Good"
vibration_command_sent = False

# Movement sensitivity - MORE FORGIVING thresholds
LAST_PITCH = 0
LAST_ROLL = 0
MOVEMENT_THRESHOLD = 20  # Degrees change per sample to consider "Sudden" movement (ignore it)
WARNING_TIMEOUT = 3      # Seconds before showing "Needs Correction" warning
BAD_POSTURE_TIMEOUT = 8  # Seconds of bad posture before alert and vibration
SITTING_THRESHOLD = 50   # Absolute pitch range for sitting position

# Posture deviation thresholds (MORE FORGIVING - 360° support)
PITCH_WARNING_THRESHOLD = 18  # Degrees deviation from baseline to show warning
PITCH_BAD_THRESHOLD = 30      # Degrees deviation from baseline to count as bad
ROLL_WARNING_THRESHOLD = 18   # Roll deviation for warning
ROLL_BAD_THRESHOLD = 30       # Roll deviation for bad posture

# Head tilt threshold for disabled users (buzzer alert for caretaker)
HEAD_TILT_THRESHOLD = 25      # Degrees of roll deviation to trigger buzzer

# Track whether the current user is disabled (loaded from profile)
is_disabled_user = False
buzzer_command_sent = False

# Track continuous bad posture duration for notifications
bad_posture_continuous_start = None  # timestamp when bad posture started

# Track continuous head tilt duration for caretaker notifications
head_tilt_continuous_start = None  # timestamp when head tilt started

@app.websocket("/ws/esp32")
async def esp32_endpoint(websocket: WebSocket):
    global posture_state_duration, current_detected_state, vibration_command_sent
    global LAST_PITCH, LAST_ROLL
    global buzzer_command_sent
    global bad_posture_continuous_start
    global head_tilt_continuous_start
    
    await websocket.accept()
    latest_sensor_data["connected"] = True
    print("ESP32 connected!")
    
    # Notify frontend
    for client in frontend_clients:
        try: await client.send_json({"type": "status", "connected": True})
        except: pass
    
    try:
        while True:
            data = await websocket.receive_text()
            sensor_data = json.loads(data)
            
            pitch = sensor_data.get("pitch", 0)
            roll = sensor_data.get("roll", 0)
            yaw = sensor_data.get("yaw", 0)
            sensor_error = sensor_data.get("sensor_error", False)
            
            # If sensor has error, broadcast that and skip posture processing
            if sensor_error:
                for client in frontend_clients:
                    try: await client.send_json({
                        "type": "data",
                        "pitch": 0, "roll": 0, "yaw": 0,
                        "state": "Good",
                        "connected": True,
                        "vibration": False,
                        "sensor_error": True
                    })
                    except: pass
                continue
            
            # Collect calibration samples if calibration is in progress
            if calibration_in_progress:
                add_calibration_sample(CURRENT_USER_ID, pitch, roll, yaw)
            
            
            # 1. Detect Sudden Movement (Coughing, laughing, etc.)
            pitch_delta = abs(pitch - LAST_PITCH)
            roll_delta = abs(roll - LAST_ROLL)
            is_sudden_movement = pitch_delta > MOVEMENT_THRESHOLD or roll_delta > MOVEMENT_THRESHOLD
            
            LAST_PITCH = pitch
            LAST_ROLL = roll
            
            latest_sensor_data["pitch"] = pitch
            latest_sensor_data["roll"] = roll
            latest_sensor_data["yaw"] = yaw
            
            # 2. Standing/Walking Detection - ignore these postures
            # If pitch is very extreme, user might be standing, walking, or bending
            is_standing_or_moving = abs(pitch) > SITTING_THRESHOLD + 20 or abs(pitch - LAST_PITCH) > 10

            # 3. Calculate Posture Deviation from CALIBRATED BASELINE
            # Normalize roll to handle 360° (e.g., if baseline is 90° and current is 95°, diff is only 5°)
            pitch_diff = abs(pitch - user_baseline["pitch"])
            
            # Roll normalization for 360° support
            roll_diff = abs(roll - user_baseline["roll"])
            if roll_diff > 180:
                roll_diff = 360 - roll_diff
            
            # Determine raw posture quality (before time-based logic)
            raw_state = "Good"
            if is_standing_or_moving:
                raw_state = "Good"  # Don't penalize standing/walking/bending
                posture_state_duration = 0
                warning_state_duration = 0
            elif is_sudden_movement:
                # Ignore sudden movements (coughing, sneezing, turning head quickly)
                raw_state = current_detected_state  # Keep previous state
            elif pitch_diff > PITCH_BAD_THRESHOLD or roll_diff > ROLL_BAD_THRESHOLD:
                raw_state = "Bad"
            elif pitch_diff > PITCH_WARNING_THRESHOLD or roll_diff > ROLL_WARNING_THRESHOLD:
                raw_state = "Warning"
            else:
                raw_state = "Good"

            # 4. TIME-BASED STATE MACHINE (Good → Needs Correction → Bad)
            # This prevents instant state changes and gives user time to correct
            if raw_state == "Good":
                # User corrected posture - reset all timers
                posture_state_duration = 0
                warning_state_duration = 0
                current_detected_state = "Good"
            elif raw_state == "Warning":
                # Mild deviation - track but don't escalate yet
                warning_state_duration += 0.2  # ~200ms per sample
                posture_state_duration = 0
                if warning_state_duration >= WARNING_TIMEOUT:
                    current_detected_state = "Warning"  # Show "Needs Correction"
                else:
                    current_detected_state = "Good"  # Still within grace period
            elif raw_state == "Bad":
                # Significant deviation - escalate through warning first
                warning_state_duration += 0.2
                posture_state_duration += 0.2
                
                if posture_state_duration >= BAD_POSTURE_TIMEOUT:
                    current_detected_state = "Bad"  # Full bad posture alert
                elif warning_state_duration >= WARNING_TIMEOUT:
                    current_detected_state = "Warning"  # First show warning
                else:
                    current_detected_state = "Good"  # Still in grace period

            # 5. Vibration Control
            if current_detected_state == "Bad":
                if not vibration_command_sent:
                    await websocket.send_text("VIBRATE_ON")
                    vibration_command_sent = True
            else:
                if vibration_command_sent:
                    await websocket.send_text("VIBRATE_OFF")
                    vibration_command_sent = False
            
            # Update chatbot with current user status
            update_user_session(pitch, roll, yaw, current_detected_state, vibration_command_sent)
            
            # Log posture data for ML (throttled to every 30 seconds)
            log_posture_reading(
                user_id=CURRENT_USER_ID,
                pitch=pitch,
                roll=roll,
                yaw=yaw,
                posture_state=current_detected_state
            )
            
            # 6. Buzzer Control for Disabled Users (HEAD TILT detection)
            # Buzzer triggers when disabled user tilts head left/right (roll deviation)
            # This is SEPARATE from posture vibration — it's for caretaker alert
            import time as _time
            head_tilt_minutes = 0
            if is_disabled_user:
                if roll_diff > HEAD_TILT_THRESHOLD:
                    if not buzzer_command_sent:
                        await websocket.send_text("BUZZER_ON")
                        buzzer_command_sent = True
                        print(f"🔔 BUZZER ON - Disabled user head tilt detected (roll_diff={roll_diff:.1f}°)")
                    # Track continuous head tilt duration
                    if head_tilt_continuous_start is None:
                        head_tilt_continuous_start = _time.time()
                    head_tilt_minutes = (_time.time() - head_tilt_continuous_start) / 60.0
                else:
                    if buzzer_command_sent:
                        await websocket.send_text("BUZZER_OFF")
                        buzzer_command_sent = False
                        print(f"🔕 BUZZER OFF - Head tilt corrected")
                    head_tilt_continuous_start = None
            
            # Track continuous bad posture duration for notifications
            if current_detected_state == "Bad":
                if bad_posture_continuous_start is None:
                    bad_posture_continuous_start = _time.time()
                bad_posture_minutes = (_time.time() - bad_posture_continuous_start) / 60.0
            else:
                bad_posture_continuous_start = None
                bad_posture_minutes = 0
            
            # Broadcast to all frontend clients
            broadcast_data = {
                "type": "data",
                "pitch": pitch,
                "roll": roll,
                "yaw": yaw,
                "state": current_detected_state,
                "connected": True,
                "vibration": current_detected_state == "Bad",
                "buzzerActive": buzzer_command_sent if is_disabled_user else False,
                "headTilt": roll_diff > HEAD_TILT_THRESHOLD,
                "headTiltMinutes": round(head_tilt_minutes, 1),
                "badPostureMinutes": round(bad_posture_minutes, 1)
            }
            for client in frontend_clients:
                try: await client.send_json(broadcast_data)
                except: pass
                    
    except WebSocketDisconnect:
        latest_sensor_data["connected"] = False
        print("ESP32 disconnected!")
        for client in frontend_clients:
            try: await client.send_json({"type": "status", "connected": False})
            except: pass


@app.websocket("/ws/frontend")
async def frontend_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for React frontend to receive real-time data.
    """
    await websocket.accept()
    frontend_clients.append(websocket)
    print("Frontend client connected!")
    
    # Send initial status
    await websocket.send_json({
        "type": "status",
        "connected": latest_sensor_data["connected"],
        "pitch": latest_sensor_data["pitch"],
        "roll": latest_sensor_data["roll"],
        "vibration": False
    })
    
    try:
        while True:
            # Keep connection alive and listen for commands
            message = await websocket.receive_text()
            command = json.loads(message)
            
            if command.get("action") == "calibrate":
                # Save current sensor values as the baseline
                user_baseline["pitch"] = latest_sensor_data["pitch"]
                user_baseline["roll"] = latest_sensor_data["roll"]
                await websocket.send_json({"status": "calibrated", "baseline": user_baseline})
                print(f"Calibration saved: {user_baseline}")
                
    except WebSocketDisconnect:
        if websocket in frontend_clients:
            frontend_clients.remove(websocket)
        print("Frontend client disconnected!")


@app.get("/api/status")
def get_status():
    """
    Returns the current sensor status and connection state.
    """
    return {
        "connected": latest_sensor_data["connected"],
        "pitch": latest_sensor_data["pitch"],
        "roll": latest_sensor_data["roll"],
        "baseline": user_baseline
    }


# ============ BLE DATA LOGGING ENDPOINT ============
# When ESP32 connects via Bluetooth (BLE) directly to the frontend,
# the frontend forwards sensor data here so it gets logged for ML insights.

class PostureLogRequest(BaseModel):
    pitch: float
    roll: float
    yaw: float = 0
    posture_state: str = "Good"

@app.post("/api/posture/log")
def api_log_posture(req: PostureLogRequest, authorization: Optional[str] = Header(None)):
    """Log posture reading from BLE-connected frontend."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    logged = log_posture_reading(
        user_id=user["id"],
        pitch=req.pitch,
        roll=req.roll,
        yaw=req.yaw,
        posture_state=req.posture_state
    )
    return {"success": True, "logged": logged}


# ============ AUTHENTICATION ENDPOINTS ============

@app.post("/api/register")
def api_register(request: RegisterRequest):
    """Register a new user."""
    global CURRENT_USER_ID
    result = register_user(request.name, request.email, request.password)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    # Set active user for posture logging
    if result.get("user_id"):
        CURRENT_USER_ID = result["user_id"]
        print(f"👤 Active user set to ID {CURRENT_USER_ID} (register)")
    
    return result

@app.post("/api/login")
def api_login(request: LoginRequest):
    """Login a user."""
    global CURRENT_USER_ID
    result = login_user(request.email, request.password)
    
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    
    # Set active user for posture logging
    if result.get("user", {}).get("id"):
        CURRENT_USER_ID = result["user"]["id"]
        print(f"👤 Active user set to ID {CURRENT_USER_ID} (login)")
    
    return result

@app.get("/api/me")
def api_me(authorization: Optional[str] = Header(None)):
    """Get current user info from token."""
    global CURRENT_USER_ID
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    user = get_user_from_token(token)
    if user:
        CURRENT_USER_ID = user["id"]
        print(f"👤 Active user set to ID {CURRENT_USER_ID} (token check)")
        return {"success": True, "user": user}
    else:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.post("/api/logout")
def api_logout(authorization: Optional[str] = Header(None)):
    """Logout and invalidate token."""
    if authorization:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        logout_user(token)
    return {"success": True, "message": "Logged out successfully"}


# ============ CHATBOT ENDPOINT ============

@app.post("/api/chat")
async def api_chat(request: ChatRequest):
    """Get AI chatbot response for posture-related queries."""
    result = await get_chatbot_response(request.message)
    return result


# ============ PROFILE ENDPOINTS ============

@app.get("/api/profile")
def api_get_profile(authorization: Optional[str] = Header(None)):
    """Get current user's profile."""
    global is_disabled_user
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    profile = get_user_profile(user["id"])
    if profile:
        # Sync disability status for buzzer logic
        is_disabled_user = profile.get("isDisabled", False)
        print(f"👤 User disability status loaded: {'DISABLED' if is_disabled_user else 'Normal'}")
        return {"success": True, "profile": profile}
    else:
        raise HTTPException(status_code=404, detail="Profile not found")


@app.put("/api/profile")
def api_update_profile(request: ProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    """Update current user's profile."""
    global is_disabled_user
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Convert request to dict, excluding None values
    profile_data = {k: v for k, v in request.model_dump().items() if v is not None}
    
    # Sync disability status for buzzer logic
    if "isDisabled" in profile_data:
        is_disabled_user = profile_data["isDisabled"]
        print(f"👤 User disability status updated: {'DISABLED' if is_disabled_user else 'Normal'}")
    
    result = update_user_profile(user["id"], profile_data)
    return result


# ============ POSTURE HISTORY ENDPOINTS ============

@app.get("/api/history")
def api_get_history(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get posture history for the current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    history = get_user_history(user["id"], days=days)
    return {"success": True, "history": history, "count": len(history)}


@app.get("/api/history/daily")
def api_get_daily_summary(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get daily posture summary for charts."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    summary = get_daily_summary(user["id"], days=days)
    return {"success": True, "daily": summary}


@app.get("/api/history/hourly")
def api_get_hourly_breakdown(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get hourly posture breakdown for heatmap."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    hourly = get_hourly_breakdown(user["id"], days=days)
    return {"success": True, "hourly": hourly}


@app.get("/api/history/stats")
def api_get_statistics(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get overall posture statistics."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    stats = get_statistics(user["id"], days=days)
    return {"success": True, "stats": stats}


@app.get("/api/history/export")
def api_export_history(
    days: int = 30,
    authorization: Optional[str] = Header(None)
):
    """Export posture history to CSV for ML training."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    filepath = export_to_csv(user["id"], days=days)
    
    if filepath:
        return {"success": True, "message": f"Exported to {filepath}"}
    else:
        return {"success": False, "message": "No data to export"}


# ============ CALIBRATION ENDPOINTS ============

@app.post("/api/calibration/start")
def api_start_calibration(authorization: Optional[str] = Header(None)):
    """Start personalized posture calibration."""
    global calibration_in_progress
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    calibration_in_progress = True
    result = start_calibration(user["id"])
    return result


@app.post("/api/calibration/finish")
def api_finish_calibration(authorization: Optional[str] = Header(None)):
    """Finish calibration and save baseline."""
    global calibration_in_progress
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    calibration_in_progress = False
    result = finish_calibration(user["id"])
    return result


@app.get("/api/calibration/status")
def api_calibration_status(authorization: Optional[str] = Header(None)):
    """Get calibration status for current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    status = get_calibration_status(user["id"])
    return {"success": True, **status}


@app.post("/api/calibrate/instant")
def api_instant_calibration(
    request: Optional[CalibrationRequest] = None,
    authorization: Optional[str] = Header(None)
):
    """Instantly save current sensor position as user's baseline.
    
    Can receive pitch/roll from:
    1. Request body (for BLE mode - frontend sends data)
    2. Backend's latest_sensor_data (for WiFi mode - backend receives from ESP32)
    """
    global user_baseline
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Try to get pitch/roll from request body (BLE mode) or from backend storage (WiFi mode)
    if request and request.pitch is not None and request.roll is not None:
        # BLE mode: Frontend sends sensor data
        current_pitch = request.pitch
        current_roll = request.roll
        print(f"📱 Calibration from frontend (BLE mode)")
    else:
        # WiFi mode: Use backend's stored sensor data
        current_pitch = latest_sensor_data.get("pitch", 0)
        current_roll = latest_sensor_data.get("roll", 0)
        print(f"📡 Calibration from backend (WiFi mode)")
    
    # Update the global user baseline
    user_baseline["pitch"] = current_pitch
    user_baseline["roll"] = current_roll
    
    print(f"✅ Instant calibration saved: Pitch={current_pitch:.1f}°, Roll={current_roll:.1f}°")
    
    return {
        "success": True, 
        "message": "Baseline saved successfully",
        "baseline": {
            "pitch": round(current_pitch, 1),
            "roll": round(current_roll, 1)
        }
    }


@app.get("/api/calibration/baseline")
def api_get_baseline(authorization: Optional[str] = Header(None)):
    """Get user's current baseline."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    baseline = get_baseline(user["id"])
    
    if baseline:
        return {"success": True, "baseline": baseline}
    else:
        return {"success": False, "message": "No baseline found. Please calibrate first."}


# ============ INSIGHTS & PATTERN MINING ENDPOINTS ============

@app.get("/api/insights")
def api_get_insights(
    days: int = 30,
    authorization: Optional[str] = Header(None)
):
    """Get AI-powered insights from pattern mining."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    patterns = discover_patterns(user["id"], days=days)
    return patterns


@app.get("/api/insights/quick")
def api_get_quick_stats(authorization: Optional[str] = Header(None)):
    """Get quick stats for dashboard (today and this week)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    stats = get_quick_stats(user["id"])
    return {"success": True, **stats}


# ============ PREDICTION ENDPOINTS ============

class PredictionRequest(BaseModel):
    pitch: float = 0
    roll: float = 0
    minutes_in_session: int = 0
    hour_of_day: int = 12

@app.post("/api/predict")
def api_predict_slouch(
    request: PredictionRequest,
    authorization: Optional[str] = Header(None)
):
    """Predict probability of slouching in next 5 minutes."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    current_data = {
        "pitch": request.pitch,
        "roll": request.roll,
        "minutes_in_session": request.minutes_in_session,
        "hour_of_day": request.hour_of_day
    }
    
    prediction = predict_slouch(user["id"], current_data)
    return {"success": True, **prediction}


@app.post("/api/predict/train")
def api_train_model(authorization: Optional[str] = Header(None)):
    """Train the LSTM prediction model on user's data."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    result = train_model(user["id"])
    return result


@app.get("/api/predict/status")
def api_prediction_status(authorization: Optional[str] = Header(None)):
    """Get status of user's prediction model."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    status = get_prediction_status(user["id"])
    return {"success": True, **status}


# ============ ALERTS PERSISTENCE ENDPOINTS ============

class AlertData(BaseModel):
    alert_id: str
    timestamp: str
    duration: int = 15
    alert_type: str = 'Vibration'
    severity: str = 'Bad'

@app.get("/api/alerts")
def api_get_alerts(authorization: Optional[str] = Header(None)):
    """Get all saved alerts for the current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    alerts = get_alerts(user["id"])
    return {"success": True, "alerts": alerts}

@app.post("/api/alerts")
def api_save_alert(alert: AlertData, authorization: Optional[str] = Header(None)):
    """Save a new alert to the database."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    result = save_alert(user["id"], alert.alert_id, alert.timestamp, alert.duration, alert.alert_type, alert.severity)
    return {"success": result}

@app.delete("/api/alerts")
def api_clear_alerts(authorization: Optional[str] = Header(None)):
    """Clear all alerts for the current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    result = clear_alerts(user["id"])
    return {"success": result}


# ============ ML PERSONALIZED INSIGHTS ENDPOINT ============

@app.get("/api/ml/insights")
def api_ml_insights(
    authorization: Optional[str] = Header(None)
):
    """Get comprehensive ML-powered personalized insights."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    insights = get_personalized_insights(user["id"])
    return insights


# ============ AUTO-TRAINING ML STATUS ENDPOINTS ============

@app.get("/api/ml/status")
def api_ml_model_status(authorization: Optional[str] = Header(None)):
    """
    Get comprehensive ML model status for the current user.
    Shows training progress, accuracy, and when next training will occur.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    status = get_model_status(user["id"])
    return {"success": True, "user_id": user["id"], **status}


@app.post("/api/ml/force-train")
def api_force_train(authorization: Optional[str] = Header(None)):
    """
    Force immediate model training (override automatic scheduling).
    Only works if minimum data threshold is met.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = get_user_from_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    result = force_train(user["id"])
    return result

