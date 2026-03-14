"""
Posture History Module for PostureGuard ML System
Stores time-series posture data for:
- Pattern mining (discover user habits)
- Prediction model training (LSTM)
- Personalized insights generation
"""
import sqlite3
import os
import csv
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import statistics

# Database path (same as auth.py)
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")

# Current session tracking
current_session = {
    "session_id": None,
    "user_id": None,
    "start_time": None,
    "last_log_time": None
}

def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_posture_history_table():
    """Initialize the posture_history table."""
    conn = get_db()
    
    # Main history table for time-series data
    conn.execute("""
        CREATE TABLE IF NOT EXISTS posture_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            pitch REAL NOT NULL,
            roll REAL NOT NULL,
            yaw REAL NOT NULL,
            posture_state TEXT NOT NULL,
            hour_of_day INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            minutes_in_session INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Index for faster queries
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_posture_user_time 
        ON posture_history(user_id, timestamp)
    """)
    
    # Sessions table to track work sessions
    conn.execute("""
        CREATE TABLE IF NOT EXISTS posture_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            total_duration_mins INTEGER DEFAULT 0,
            good_posture_percent REAL DEFAULT 0,
            bad_posture_count INTEGER DEFAULT 0,
            alerts_triggered INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Alerts table for persistent alert/log storage
    conn.execute("""
        CREATE TABLE IF NOT EXISTS posture_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            alert_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            duration INTEGER DEFAULT 15,
            alert_type TEXT NOT NULL DEFAULT 'Vibration',
            severity TEXT NOT NULL DEFAULT 'Bad',
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_alerts_user_time
        ON posture_alerts(user_id, timestamp DESC)
    """)
    
    conn.commit()
    conn.close()
    print("✅ Posture history tables initialized!")


def start_session(user_id: int) -> str:
    """Start a new posture tracking session."""
    global current_session
    
    session_id = str(uuid.uuid4())[:8]
    now = datetime.now()
    
    current_session = {
        "session_id": session_id,
        "user_id": user_id,
        "start_time": now,
        "last_log_time": None
    }
    
    # Save to database
    conn = get_db()
    conn.execute("""
        INSERT INTO posture_sessions (session_id, user_id, start_time)
        VALUES (?, ?, ?)
    """, (session_id, user_id, now))
    conn.commit()
    conn.close()
    
    print(f"📍 Started session {session_id} for user {user_id}")
    return session_id


def end_session():
    """End the current session and calculate summary."""
    global current_session
    
    if not current_session["session_id"]:
        return
    
    session_id = current_session["session_id"]
    now = datetime.now()
    
    conn = get_db()
    
    # Calculate session stats
    history = conn.execute("""
        SELECT posture_state FROM posture_history 
        WHERE session_id = ?
    """, (session_id,)).fetchall()
    
    if history:
        total = len(history)
        good_count = sum(1 for h in history if h["posture_state"] == "Good")
        good_percent = (good_count / total) * 100
        bad_count = sum(1 for h in history if h["posture_state"] == "Bad")
        
        duration = (now - current_session["start_time"]).total_seconds() / 60
        
        conn.execute("""
            UPDATE posture_sessions 
            SET end_time = ?, total_duration_mins = ?, 
                good_posture_percent = ?, bad_posture_count = ?
            WHERE session_id = ?
        """, (now, int(duration), good_percent, bad_count, session_id))
        conn.commit()
    
    conn.close()
    
    print(f"📍 Ended session {session_id}")
    current_session = {"session_id": None, "user_id": None, "start_time": None, "last_log_time": None}


def should_log() -> bool:
    """Check if enough time has passed to log (30 seconds throttle)."""
    if current_session["last_log_time"] is None:
        return True
    
    elapsed = (datetime.now() - current_session["last_log_time"]).total_seconds()
    return elapsed >= 30  # Log every 30 seconds


def log_posture_reading(
    user_id: int,
    pitch: float,
    roll: float,
    yaw: float,
    posture_state: str,
    force: bool = False
) -> bool:
    """
    Log a posture reading to the database.
    Throttled to once every 30 seconds unless force=True.
    """
    global current_session
    
    # Check throttle
    if not force and not should_log():
        return False
    
    # Start session if needed
    if current_session["session_id"] is None or current_session["user_id"] != user_id:
        start_session(user_id)
    
    now = datetime.now()
    hour_of_day = now.hour
    day_of_week = now.weekday()  # 0=Monday, 6=Sunday
    
    # Calculate minutes in session
    minutes_in_session = 0
    if current_session["start_time"]:
        minutes_in_session = int((now - current_session["start_time"]).total_seconds() / 60)
    
    conn = get_db()
    conn.execute("""
        INSERT INTO posture_history 
        (user_id, session_id, timestamp, pitch, roll, yaw, posture_state, 
         hour_of_day, day_of_week, minutes_in_session)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, 
        current_session["session_id"], 
        now, 
        pitch, 
        roll, 
        yaw, 
        posture_state,
        hour_of_day,
        day_of_week,
        minutes_in_session
    ))
    conn.commit()
    conn.close()
    
    current_session["last_log_time"] = now
    
    # Trigger automatic ML training if enough data has accumulated
    try:
        from auto_trainer import trigger_auto_training
        trigger_auto_training(user_id)
    except Exception as e:
        pass  # Don't let training errors affect data logging
    
    return True


def get_user_history(
    user_id: int, 
    days: int = 7,
    limit: int = 10000
) -> List[Dict]:
    """Get posture history for a user for the last N days."""
    conn = get_db()
    
    cutoff = datetime.now() - timedelta(days=days)
    
    rows = conn.execute("""
        SELECT timestamp, pitch, roll, yaw, posture_state, 
               hour_of_day, day_of_week, minutes_in_session, session_id
        FROM posture_history
        WHERE user_id = ? AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (user_id, cutoff, limit)).fetchall()
    
    conn.close()
    
    return [dict(row) for row in rows]


def get_daily_summary(user_id: int, days: int = 7) -> List[Dict]:
    """Get daily posture summary for charts."""
    conn = get_db()
    
    cutoff = datetime.now() - timedelta(days=days)
    
    rows = conn.execute("""
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as total_readings,
            SUM(CASE WHEN posture_state = 'Good' THEN 1 ELSE 0 END) as good_count,
            SUM(CASE WHEN posture_state = 'Bad' THEN 1 ELSE 0 END) as bad_count,
            AVG(pitch) as avg_pitch,
            AVG(roll) as avg_roll
        FROM posture_history
        WHERE user_id = ? AND timestamp > ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    """, (user_id, cutoff)).fetchall()
    
    conn.close()
    
    result = []
    for row in rows:
        total = row["total_readings"]
        good_percent = (row["good_count"] / total * 100) if total > 0 else 0
        result.append({
            "date": row["date"],
            "totalReadings": total,
            "goodPercent": round(good_percent, 1),
            "badCount": row["bad_count"],
            "avgPitch": round(row["avg_pitch"], 1) if row["avg_pitch"] else 0,
            "avgRoll": round(row["avg_roll"], 1) if row["avg_roll"] else 0
        })
    
    return result


def get_hourly_breakdown(user_id: int, days: int = 7) -> Dict:
    """Get hourly breakdown for heatmap visualization."""
    conn = get_db()
    
    cutoff = datetime.now() - timedelta(days=days)
    
    rows = conn.execute("""
        SELECT 
            hour_of_day,
            COUNT(*) as total,
            SUM(CASE WHEN posture_state = 'Bad' THEN 1 ELSE 0 END) as bad_count
        FROM posture_history
        WHERE user_id = ? AND timestamp > ?
        GROUP BY hour_of_day
        ORDER BY hour_of_day
    """, (user_id, cutoff)).fetchall()
    
    conn.close()
    
    # Initialize all hours
    hourly = {h: {"total": 0, "badPercent": 0} for h in range(24)}
    
    for row in rows:
        hour = row["hour_of_day"]
        total = row["total"]
        bad_percent = (row["bad_count"] / total * 100) if total > 0 else 0
        hourly[hour] = {
            "total": total,
            "badPercent": round(bad_percent, 1)
        }
    
    return hourly


def get_session_history(user_id: int, limit: int = 20) -> List[Dict]:
    """Get recent session summaries."""
    conn = get_db()
    
    rows = conn.execute("""
        SELECT session_id, start_time, end_time, total_duration_mins,
               good_posture_percent, bad_posture_count, alerts_triggered
        FROM posture_sessions
        WHERE user_id = ? AND end_time IS NOT NULL
        ORDER BY start_time DESC
        LIMIT ?
    """, (user_id, limit)).fetchall()
    
    conn.close()
    
    return [dict(row) for row in rows]


def export_to_csv(user_id: int, days: int = 30) -> str:
    """Export user's posture history to CSV for ML training."""
    history = get_user_history(user_id, days=days, limit=100000)
    
    if not history:
        return None
    
    # Create exports directory
    export_dir = os.path.join(os.path.dirname(__file__), "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    filename = f"posture_history_user_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join(export_dir, filename)
    
    with open(filepath, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=history[0].keys())
        writer.writeheader()
        writer.writerows(history)
    
    return filepath


def get_statistics(user_id: int, days: int = 7) -> Dict:
    """Get overall statistics for a user."""
    history = get_user_history(user_id, days=days)
    
    if not history:
        return {
            "totalReadings": 0,
            "goodPercent": 0,
            "avgSessionMins": 0,
            "worstHour": None,
            "bestHour": None,
            "improvementRate": 0
        }
    
    total = len(history)
    good_count = sum(1 for h in history if h["posture_state"] == "Good")
    good_percent = (good_count / total) * 100
    
    # Find worst and best hours
    hourly = get_hourly_breakdown(user_id, days)
    worst_hour = max(hourly.items(), key=lambda x: x[1]["badPercent"] if x[1]["total"] > 0 else 0)
    best_hour = min(hourly.items(), key=lambda x: x[1]["badPercent"] if x[1]["total"] > 0 else 100)
    
    return {
        "totalReadings": total,
        "goodPercent": round(good_percent, 1),
        "avgSessionMins": 0,  # TODO: Calculate from sessions
        "worstHour": worst_hour[0] if worst_hour[1]["total"] > 0 else None,
        "bestHour": best_hour[0] if best_hour[1]["total"] > 0 else None,
        "improvementRate": 0  # TODO: Compare with previous period
    }


# Initialize table on module load
init_posture_history_table()


def save_alert(user_id: int, alert_id: str, timestamp: str, duration: int, alert_type: str, severity: str) -> bool:
    """Save an alert to the database for persistence."""
    try:
        conn = get_db()
        conn.execute("""
            INSERT INTO posture_alerts (user_id, alert_id, timestamp, duration, alert_type, severity)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, alert_id, timestamp, duration, alert_type, severity))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving alert: {e}")
        return False


def get_alerts(user_id: int, limit: int = 100) -> List[Dict]:
    """Get alerts for a user, most recent first."""
    conn = get_db()
    rows = conn.execute("""
        SELECT alert_id, timestamp, duration, alert_type, severity
        FROM posture_alerts
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (user_id, limit)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def clear_alerts(user_id: int) -> bool:
    """Clear all alerts for a user."""
    try:
        conn = get_db()
        conn.execute("DELETE FROM posture_alerts WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error clearing alerts: {e}")
        return False
