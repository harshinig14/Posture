"""
Personalized Baseline Learning Module for PostureGuard ML System

Instead of using fixed thresholds like "15° = bad posture",
this module learns each user's unique "good posture" baseline.

Key Features:
1. Calibration - Collect 30 seconds of "good posture" data
2. Baseline Calculation - Calculate mean and std for each angle
3. Deviation Detection - Use Z-score to detect deviations from personal baseline
4. Adaptive Learning - Baseline improves over time
"""
import sqlite3
import os
import math
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import statistics

# Database path (same as other modules)
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")

# Calibration data buffer (for collecting during calibration)
calibration_buffer: Dict[int, List[Dict]] = {}


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_baseline_table():
    """Initialize the user_baselines table."""
    conn = get_db()
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_baselines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            pitch_mean REAL NOT NULL,
            pitch_std REAL NOT NULL,
            roll_mean REAL NOT NULL,
            roll_std REAL NOT NULL,
            yaw_mean REAL NOT NULL,
            yaw_std REAL NOT NULL,
            samples_count INTEGER NOT NULL,
            calibrated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ User baselines table initialized!")


def start_calibration(user_id: int) -> Dict:
    """Start a calibration session for a user."""
    global calibration_buffer
    
    calibration_buffer[user_id] = []
    
    return {
        "success": True,
        "message": "Calibration started. Sit in your best posture for 30 seconds.",
        "duration_seconds": 30
    }


def add_calibration_sample(user_id: int, pitch: float, roll: float, yaw: float) -> Dict:
    """Add a sample during calibration (called at ~5Hz for 30 seconds = 150 samples)."""
    global calibration_buffer
    
    if user_id not in calibration_buffer:
        return {"success": False, "message": "Calibration not started"}
    
    calibration_buffer[user_id].append({
        "pitch": pitch,
        "roll": roll,
        "yaw": yaw,
        "timestamp": datetime.now()
    })
    
    samples_collected = len(calibration_buffer[user_id])
    
    return {
        "success": True,
        "samples_collected": samples_collected,
        "progress_percent": min(100, int(samples_collected / 150 * 100))
    }


def finish_calibration(user_id: int) -> Dict:
    """Finish calibration and save the baseline."""
    global calibration_buffer
    
    if user_id not in calibration_buffer:
        return {"success": False, "message": "Calibration not started"}
    
    samples = calibration_buffer[user_id]
    
    if len(samples) < 50:  # Need at least 50 samples (10 seconds)
        return {
            "success": False,
            "message": f"Not enough samples. Got {len(samples)}, need at least 50."
        }
    
    # Calculate statistics
    pitches = [s["pitch"] for s in samples]
    rolls = [s["roll"] for s in samples]
    yaws = [s["yaw"] for s in samples]
    
    # Remove outliers (samples outside 2 std deviations)
    pitches = remove_outliers(pitches)
    rolls = remove_outliers(rolls)
    yaws = remove_outliers(yaws)
    
    baseline = {
        "pitch_mean": statistics.mean(pitches),
        "pitch_std": max(statistics.stdev(pitches), 2.0),  # Min 2° tolerance
        "roll_mean": statistics.mean(rolls),
        "roll_std": max(statistics.stdev(rolls), 2.0),
        "yaw_mean": statistics.mean(yaws),
        "yaw_std": max(statistics.stdev(yaws), 5.0),  # Yaw has more variance
        "samples_count": len(samples)
    }
    
    # Save to database
    save_baseline(user_id, baseline)
    
    # Clear buffer
    del calibration_buffer[user_id]
    
    return {
        "success": True,
        "message": "Calibration complete! Your personal baseline has been saved.",
        "baseline": {
            "pitch": f"{baseline['pitch_mean']:.1f}° ± {baseline['pitch_std']:.1f}°",
            "roll": f"{baseline['roll_mean']:.1f}° ± {baseline['roll_std']:.1f}°",
            "yaw": f"{baseline['yaw_mean']:.1f}° ± {baseline['yaw_std']:.1f}°"
        }
    }


def remove_outliers(data: List[float], threshold: float = 2.0) -> List[float]:
    """Remove outliers using Z-score method."""
    if len(data) < 3:
        return data
    
    mean = statistics.mean(data)
    std = statistics.stdev(data)
    
    if std == 0:
        return data
    
    return [x for x in data if abs((x - mean) / std) <= threshold]


def save_baseline(user_id: int, baseline: Dict):
    """Save or update user's baseline in database."""
    conn = get_db()
    
    # Upsert (insert or replace)
    conn.execute("""
        INSERT OR REPLACE INTO user_baselines 
        (user_id, pitch_mean, pitch_std, roll_mean, roll_std, 
         yaw_mean, yaw_std, samples_count, calibrated_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
    """, (
        user_id,
        baseline["pitch_mean"],
        baseline["pitch_std"],
        baseline["roll_mean"],
        baseline["roll_std"],
        baseline["yaw_mean"],
        baseline["yaw_std"],
        baseline["samples_count"]
    ))
    
    conn.commit()
    conn.close()
    print(f"✅ Saved baseline for user {user_id}")


def get_baseline(user_id: int) -> Optional[Dict]:
    """Get user's saved baseline."""
    conn = get_db()
    
    row = conn.execute("""
        SELECT pitch_mean, pitch_std, roll_mean, roll_std, 
               yaw_mean, yaw_std, samples_count, calibrated_at
        FROM user_baselines
        WHERE user_id = ? AND is_active = 1
    """, (user_id,)).fetchone()
    
    conn.close()
    
    if row:
        return {
            "pitch_mean": row["pitch_mean"],
            "pitch_std": row["pitch_std"],
            "roll_mean": row["roll_mean"],
            "roll_std": row["roll_std"],
            "yaw_mean": row["yaw_mean"],
            "yaw_std": row["yaw_std"],
            "samples_count": row["samples_count"],
            "calibrated_at": row["calibrated_at"]
        }
    
    return None


def has_baseline(user_id: int) -> bool:
    """Check if user has a saved baseline."""
    return get_baseline(user_id) is not None


def calculate_deviation(
    user_id: int, 
    pitch: float, 
    roll: float, 
    yaw: float
) -> Dict:
    """
    Calculate how much the current posture deviates from personal baseline.
    Returns deviation scores and posture state.
    
    Z-score interpretation:
    - |Z| < 1.0: Normal (within 1 std) → Good
    - 1.0 ≤ |Z| < 2.0: Mild deviation → Warning  
    - |Z| ≥ 2.0: Significant deviation → Bad
    """
    baseline = get_baseline(user_id)
    
    if not baseline:
        # Fall back to default thresholds if no baseline
        return calculate_deviation_default(pitch, roll, yaw)
    
    # Calculate Z-scores
    pitch_z = abs(pitch - baseline["pitch_mean"]) / baseline["pitch_std"]
    roll_z = abs(roll - baseline["roll_mean"]) / baseline["roll_std"]
    
    # Combined deviation score (weighted: pitch is more important for forward lean)
    combined_z = (pitch_z * 0.6) + (roll_z * 0.4)
    
    # Determine state based on combined Z-score
    if combined_z >= 2.5:
        state = "Bad"
        confidence = min(100, int(combined_z * 20))
    elif combined_z >= 1.5:
        state = "Warning"
        confidence = int(50 + (combined_z - 1.5) * 30)
    else:
        state = "Good"
        confidence = int(100 - combined_z * 30)
    
    return {
        "state": state,
        "confidence": confidence,
        "pitch_deviation": round(pitch_z, 2),
        "roll_deviation": round(roll_z, 2),
        "combined_score": round(combined_z, 2),
        "using_personal_baseline": True
    }


def calculate_deviation_default(pitch: float, roll: float, yaw: float) -> Dict:
    """Fallback deviation calculation using fixed thresholds."""
    # Default baseline (assumes 0° is perfect posture)
    pitch_diff = abs(pitch)
    roll_diff = abs(roll)
    
    if pitch_diff > 25 or roll_diff > 25:
        state = "Bad"
        confidence = 90
    elif pitch_diff > 12 or roll_diff > 12:
        state = "Warning"
        confidence = 70
    else:
        state = "Good"
        confidence = 95
    
    return {
        "state": state,
        "confidence": confidence,
        "pitch_deviation": round(pitch_diff / 15, 2),  # Normalized
        "roll_deviation": round(roll_diff / 15, 2),
        "combined_score": round((pitch_diff + roll_diff) / 30, 2),
        "using_personal_baseline": False
    }


def get_calibration_status(user_id: int) -> Dict:
    """Get calibration status for a user."""
    baseline = get_baseline(user_id)
    is_calibrating = user_id in calibration_buffer
    
    if is_calibrating:
        samples = len(calibration_buffer[user_id])
        return {
            "status": "calibrating",
            "samples_collected": samples,
            "progress_percent": min(100, int(samples / 150 * 100))
        }
    elif baseline:
        return {
            "status": "calibrated",
            "calibrated_at": baseline["calibrated_at"],
            "samples_used": baseline["samples_count"],
            "baseline": {
                "pitch": f"{baseline['pitch_mean']:.1f}° ± {baseline['pitch_std']:.1f}°",
                "roll": f"{baseline['roll_mean']:.1f}° ± {baseline['roll_std']:.1f}°"
            }
        }
    else:
        return {
            "status": "not_calibrated",
            "message": "No personal baseline. Using default thresholds."
        }


# Initialize table on module load
init_baseline_table()
