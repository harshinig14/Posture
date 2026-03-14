"""
Pattern Mining Module for PostureGuard ML System

Discovers personal fatigue patterns and habits from posture history.
Generates AI-powered insights like:
- "You slouch most at 3pm"
- "Your posture degrades after 47 minutes"
- "Wednesdays are your worst day"
- "You've improved 15% this week"
"""
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
import statistics

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def discover_patterns(user_id: int, days: int = 30) -> Dict:
    """
    Discover all patterns for a user.
    Returns insights that can be displayed in the UI.
    """
    conn = get_db()
    cutoff = datetime.now() - timedelta(days=days)
    
    # Fetch all history
    rows = conn.execute("""
        SELECT timestamp, pitch, roll, posture_state, 
               hour_of_day, day_of_week, minutes_in_session, session_id
        FROM posture_history
        WHERE user_id = ? AND timestamp > ?
        ORDER BY timestamp
    """, (user_id, cutoff)).fetchall()
    
    conn.close()
    
    if len(rows) < 2:
        return {
            "success": False,
            "message": "Not enough data yet. Use the app for at least 1 minute to see patterns.",
            "data_points": len(rows)
        }
    
    history = [dict(row) for row in rows]
    
    # Calculate all patterns
    patterns = {
        "worst_hour": find_worst_hour(history),
        "best_hour": find_best_hour(history),
        "worst_day": find_worst_day(history),
        "fatigue_threshold": find_fatigue_threshold(history),
        "improvement_rate": calculate_improvement(history, days),
        "daily_average": calculate_daily_average(history),
        "peak_productivity": find_peak_productivity_hours(history),
        "session_stats": calculate_session_stats(history)
    }
    
    # Generate human-readable insights
    insights = generate_insights(patterns)
    
    return {
        "success": True,
        "patterns": patterns,
        "insights": insights,
        "data_points": len(history)
    }


def find_worst_hour(history: List[Dict]) -> Dict:
    """Find the hour with the most bad posture."""
    hourly_stats = defaultdict(lambda: {"total": 0, "bad": 0})
    
    for row in history:
        hour = row["hour_of_day"]
        hourly_stats[hour]["total"] += 1
        if row["posture_state"] == "Bad":
            hourly_stats[hour]["bad"] += 1
    
    worst_hour = None
    worst_percent = 0
    
    for hour, stats in hourly_stats.items():
        if stats["total"] >= 5:  # Need at least 5 data points
            bad_percent = (stats["bad"] / stats["total"]) * 100
            if bad_percent > worst_percent:
                worst_percent = bad_percent
                worst_hour = hour
    
    return {
        "hour": worst_hour,
        "bad_percent": round(worst_percent, 1),
        "readable": f"{worst_hour}:00" if worst_hour is not None else None
    }


def find_best_hour(history: List[Dict]) -> Dict:
    """Find the hour with the best posture."""
    hourly_stats = defaultdict(lambda: {"total": 0, "good": 0})
    
    for row in history:
        hour = row["hour_of_day"]
        hourly_stats[hour]["total"] += 1
        if row["posture_state"] == "Good":
            hourly_stats[hour]["good"] += 1
    
    best_hour = None
    best_percent = 0
    
    for hour, stats in hourly_stats.items():
        if stats["total"] >= 5:
            good_percent = (stats["good"] / stats["total"]) * 100
            if good_percent > best_percent:
                best_percent = good_percent
                best_hour = hour
    
    return {
        "hour": best_hour,
        "good_percent": round(best_percent, 1),
        "readable": f"{best_hour}:00" if best_hour is not None else None
    }


def find_worst_day(history: List[Dict]) -> Dict:
    """Find the day of week with worst posture."""
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily_stats = defaultdict(lambda: {"total": 0, "bad": 0})
    
    for row in history:
        day = row["day_of_week"]
        daily_stats[day]["total"] += 1
        if row["posture_state"] == "Bad":
            daily_stats[day]["bad"] += 1
    
    worst_day = None
    worst_percent = 0
    
    for day, stats in daily_stats.items():
        if stats["total"] >= 5:
            bad_percent = (stats["bad"] / stats["total"]) * 100
            if bad_percent > worst_percent:
                worst_percent = bad_percent
                worst_day = day
    
    return {
        "day": worst_day,
        "day_name": day_names[worst_day] if worst_day is not None else None,
        "bad_percent": round(worst_percent, 1)
    }


def find_fatigue_threshold(history: List[Dict]) -> Dict:
    """
    Find how many minutes into a session posture typically degrades.
    This is PREDICTIVE - tells when user will likely slouch.
    """
    session_transitions = defaultdict(list)
    
    last_state = None
    for row in history:
        if row["posture_state"] == "Bad" and last_state != "Bad":
            # Transition to bad posture
            session_transitions[row["session_id"]].append(row["minutes_in_session"])
        last_state = row["posture_state"]
    
    # Collect all first-bad-posture times
    first_bad_times = []
    for session_id, times in session_transitions.items():
        if times:
            first_bad_times.append(min(times))
    
    if not first_bad_times:
        return {"threshold_minutes": 60, "confidence": "low"}
    
    # Calculate median (more robust than mean)
    threshold = statistics.median(first_bad_times)
    
    confidence = "high" if len(first_bad_times) >= 10 else "medium" if len(first_bad_times) >= 5 else "low"
    
    return {
        "threshold_minutes": round(threshold),
        "samples": len(first_bad_times),
        "confidence": confidence
    }


def calculate_improvement(history: List[Dict], days: int) -> Dict:
    """Calculate improvement comparing this week vs last week."""
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    
    this_week = {"total": 0, "good": 0}
    last_week = {"total": 0, "good": 0}
    
    for row in history:
        ts = datetime.fromisoformat(row["timestamp"]) if isinstance(row["timestamp"], str) else row["timestamp"]
        
        if ts > week_ago:
            this_week["total"] += 1
            if row["posture_state"] == "Good":
                this_week["good"] += 1
        elif ts > two_weeks_ago:
            last_week["total"] += 1
            if row["posture_state"] == "Good":
                last_week["good"] += 1
    
    this_week_percent = (this_week["good"] / this_week["total"] * 100) if this_week["total"] > 0 else 0
    last_week_percent = (last_week["good"] / last_week["total"] * 100) if last_week["total"] > 0 else 0
    
    improvement = this_week_percent - last_week_percent
    
    return {
        "this_week_percent": round(this_week_percent, 1),
        "last_week_percent": round(last_week_percent, 1),
        "improvement": round(improvement, 1),
        "trend": "improving" if improvement > 2 else "declining" if improvement < -2 else "stable"
    }


def calculate_daily_average(history: List[Dict]) -> Dict:
    """Calculate average daily good posture percentage."""
    daily_stats = defaultdict(lambda: {"total": 0, "good": 0})
    
    for row in history:
        ts = row["timestamp"]
        if isinstance(ts, str):
            date = ts.split(" ")[0]
        else:
            date = ts.strftime("%Y-%m-%d")
        
        daily_stats[date]["total"] += 1
        if row["posture_state"] == "Good":
            daily_stats[date]["good"] += 1
    
    daily_percents = []
    for date, stats in daily_stats.items():
        if stats["total"] > 0:
            daily_percents.append(stats["good"] / stats["total"] * 100)
    
    avg = statistics.mean(daily_percents) if daily_percents else 0
    
    return {
        "average_percent": round(avg, 1),
        "days_tracked": len(daily_stats)
    }


def find_peak_productivity_hours(history: List[Dict]) -> Dict:
    """Find consecutive hours with best posture (peak productivity window)."""
    hourly = defaultdict(lambda: {"total": 0, "good": 0})
    
    for row in history:
        hour = row["hour_of_day"]
        hourly[hour]["total"] += 1
        if row["posture_state"] == "Good":
            hourly[hour]["good"] += 1
    
    # Calculate good percent for each hour
    hour_scores = {}
    for hour in range(24):
        if hourly[hour]["total"] >= 3:
            hour_scores[hour] = hourly[hour]["good"] / hourly[hour]["total"] * 100
    
    if len(hour_scores) < 3:
        return {"start": None, "end": None}
    
    # Find best 3-hour window
    best_start = None
    best_avg = 0
    
    for start in range(22):
        if all(h in hour_scores for h in [start, start+1, start+2]):
            avg = (hour_scores[start] + hour_scores[start+1] + hour_scores[start+2]) / 3
            if avg > best_avg:
                best_avg = avg
                best_start = start
    
    if best_start is not None:
        return {
            "start": best_start,
            "end": best_start + 3,
            "readable": f"{best_start}:00 - {best_start+3}:00",
            "good_percent": round(best_avg, 1)
        }
    
    return {"start": None, "end": None}


def calculate_session_stats(history: List[Dict]) -> Dict:
    """Calculate average session statistics."""
    sessions = defaultdict(lambda: {"readings": 0, "duration": 0})
    
    for row in history:
        sid = row["session_id"]
        sessions[sid]["readings"] += 1
        sessions[sid]["duration"] = max(sessions[sid]["duration"], row["minutes_in_session"])
    
    durations = [s["duration"] for s in sessions.values() if s["duration"] > 0]
    
    if not durations:
        return {"avg_duration": 0, "total_sessions": 0}
    
    return {
        "avg_duration": round(statistics.mean(durations)),
        "total_sessions": len(sessions),
        "longest_session": max(durations)
    }


def generate_insights(patterns: Dict) -> List[Dict]:
    """Generate human-readable insights from pattern data."""
    insights = []
    
    # Worst hour insight
    if patterns["worst_hour"]["hour"] is not None:
        hour = patterns["worst_hour"]["hour"]
        percent = patterns["worst_hour"]["bad_percent"]
        insights.append({
            "type": "warning",
            "icon": "⚠️",
            "title": f"Posture drops at {hour}:00",
            "description": f"{percent}% of readings at this hour show poor posture. Consider a break or stretch.",
            "priority": 1
        })
    
    # Fatigue threshold insight
    threshold = patterns["fatigue_threshold"]["threshold_minutes"]
    if threshold < 60 and patterns["fatigue_threshold"]["confidence"] != "low":
        insights.append({
            "type": "prediction",
            "icon": "🔮",
            "title": f"Posture degrades after {threshold} minutes",
            "description": f"Take a break around {threshold} mins into your work session to prevent slouching.",
            "priority": 2
        })
    
    # Improvement insight
    improvement = patterns["improvement_rate"]["improvement"]
    if improvement > 5:
        insights.append({
            "type": "success",
            "icon": "📈",
            "title": f"+{improvement}% improvement this week!",
            "description": "Great job! Your posture is getting better.",
            "priority": 3
        })
    elif improvement < -5:
        insights.append({
            "type": "alert",
            "icon": "📉",
            "title": f"Posture declined by {abs(improvement)}%",
            "description": "Try to be more mindful of your sitting position.",
            "priority": 3
        })
    
    # Best hour insight
    if patterns["best_hour"]["hour"] is not None:
        hour = patterns["best_hour"]["hour"]
        percent = patterns["best_hour"]["good_percent"]
        insights.append({
            "type": "info",
            "icon": "✨",
            "title": f"Best posture at {hour}:00",
            "description": f"{percent}% good posture at this hour. Schedule important work here!",
            "priority": 4
        })
    
    # Peak productivity
    if patterns["peak_productivity"]["start"] is not None:
        window = patterns["peak_productivity"]["readable"]
        insights.append({
            "type": "tip",
            "icon": "🎯",
            "title": f"Peak productivity: {window}",
            "description": "This is your best posture window. Use it for focused work!",
            "priority": 5
        })
    
    # Worst day
    if patterns["worst_day"]["day_name"]:
        day = patterns["worst_day"]["day_name"]
        insights.append({
            "type": "info",
            "icon": "📅",
            "title": f"{day}s are challenging",
            "description": f"Your posture tends to be worse on {day}s. Be extra mindful!",
            "priority": 6
        })
    
    # Sort by priority
    insights.sort(key=lambda x: x["priority"])
    
    return insights


def get_quick_stats(user_id: int) -> Dict:
    """Get quick stats for dashboard display."""
    conn = get_db()
    
    # Today's stats
    today = datetime.now().strftime("%Y-%m-%d")
    today_rows = conn.execute("""
        SELECT posture_state FROM posture_history
        WHERE user_id = ? AND DATE(timestamp) = ?
    """, (user_id, today)).fetchall()
    
    # This week stats
    week_ago = datetime.now() - timedelta(days=7)
    week_rows = conn.execute("""
        SELECT posture_state FROM posture_history
        WHERE user_id = ? AND timestamp > ?
    """, (user_id, week_ago)).fetchall()
    
    conn.close()
    
    today_total = len(today_rows)
    today_good = sum(1 for r in today_rows if r["posture_state"] == "Good")
    today_percent = round((today_good / today_total) * 100, 1) if today_total > 0 else 0
    
    week_total = len(week_rows)
    week_good = sum(1 for r in week_rows if r["posture_state"] == "Good")
    week_percent = round((week_good / week_total) * 100, 1) if week_total > 0 else 0
    
    return {
        "today": {
            "percent": today_percent,
            "readings": today_total
        },
        "week": {
            "percent": week_percent,
            "readings": week_total
        }
    }
