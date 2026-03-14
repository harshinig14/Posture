"""
ML-Powered Personalized Insights Engine for PostureGuard

Aggregates data from pattern_miner, posture_predictor, posture_history,
and auto_trainer to produce comprehensive, personalized insights.

Key outputs:
1. Posture Risk Score (0-100)
2. Health Streak (consecutive good days)
3. Personalized Recommendations
4. Weekly Summary
5. Slouch Forecast
"""
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict

# Import existing modules
from pattern_miner import discover_patterns, get_quick_stats
from posture_predictor import predict_slouch, get_prediction_status
from auto_trainer import get_model_status

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calculate_risk_score(user_id: int, patterns: Dict) -> Dict:
    """
    Calculate a posture risk score (0-100, lower is better).
    
    Weighted composite of:
    - Worst hour severity (25%)
    - Fatigue threshold (25%)
    - Weekly trend (25%)
    - Daily average (25%)
    """
    score = 0
    factors = []
    
    # Factor 1: Worst hour severity (0-25 points)
    worst_hour = patterns.get("worst_hour", {})
    bad_percent = worst_hour.get("bad_percent", 0)
    worst_hour_score = min(25, bad_percent * 0.25)
    score += worst_hour_score
    if bad_percent > 40:
        factors.append(f"High bad posture rate ({bad_percent}%) at {worst_hour.get('hour', '?')}:00")
    
    # Factor 2: Fatigue threshold (0-25 points)
    fatigue = patterns.get("fatigue_threshold", {})
    threshold_min = fatigue.get("threshold_minutes", 60)
    if threshold_min < 20:
        fatigue_score = 25
    elif threshold_min < 30:
        fatigue_score = 20
    elif threshold_min < 45:
        fatigue_score = 15
    elif threshold_min < 60:
        fatigue_score = 10
    else:
        fatigue_score = 5
    score += fatigue_score
    if threshold_min < 30:
        factors.append(f"Posture degrades quickly (after {threshold_min} min)")
    
    # Factor 3: Weekly trend (0-25 points)
    improvement = patterns.get("improvement_rate", {})
    trend_val = improvement.get("improvement", 0)
    if trend_val < -10:
        trend_score = 25
    elif trend_val < -5:
        trend_score = 20
    elif trend_val < 0:
        trend_score = 15
    elif trend_val < 5:
        trend_score = 10
    else:
        trend_score = 5
    score += trend_score
    if trend_val < -5:
        factors.append(f"Declining trend ({trend_val}% this week)")
    
    # Factor 4: Daily average (0-25 points)
    daily_avg = patterns.get("daily_average", {})
    avg_percent = daily_avg.get("average_percent", 50)
    daily_score = max(0, 25 - (avg_percent * 0.25))
    score += daily_score
    if avg_percent < 50:
        factors.append(f"Low daily average ({avg_percent}% good posture)")
    
    # Clamp to 0-100
    score = max(0, min(100, round(score)))
    
    # Determine risk level
    if score <= 25:
        level = "low"
        label = "Excellent"
        color = "emerald"
    elif score <= 50:
        level = "moderate"
        label = "Good"
        color = "amber"
    elif score <= 75:
        level = "high"
        label = "Needs Attention"
        color = "orange"
    else:
        level = "critical"
        label = "At Risk"
        color = "rose"
    
    return {
        "score": score,
        "level": level,
        "label": label,
        "color": color,
        "factors": factors
    }


def calculate_health_streak(user_id: int) -> Dict:
    """
    Calculate consecutive days with >= 70% good posture.
    """
    conn = get_db()
    
    # Get daily stats for last 90 days
    cutoff = datetime.now() - timedelta(days=90)
    rows = conn.execute("""
        SELECT DATE(timestamp) as date, 
               COUNT(*) as total,
               SUM(CASE WHEN posture_state = 'Good' THEN 1 ELSE 0 END) as good
        FROM posture_history
        WHERE user_id = ? AND timestamp > ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    """, (user_id, cutoff)).fetchall()
    
    conn.close()
    
    if not rows:
        return {"current_streak": 0, "best_streak": 0, "total_good_days": 0}
    
    # Calculate streaks
    current_streak = 0
    best_streak = 0
    temp_streak = 0
    total_good_days = 0
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    for row in rows:
        total = row["total"]
        good = row["good"]
        if total < 5:  # Need minimum readings to count
            continue
            
        good_percent = (good / total) * 100
        
        if good_percent >= 70:
            temp_streak += 1
            total_good_days += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 0
    
    # Current streak: count from most recent day backwards
    current_streak = 0
    for row in rows:
        total = row["total"]
        good = row["good"]
        if total < 5:
            continue
        good_percent = (good / total) * 100
        if good_percent >= 70:
            current_streak += 1
        else:
            break
    
    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "total_good_days": total_good_days
    }


def generate_personalized_recommendations(patterns: Dict, risk_score: Dict, streak: Dict) -> List[Dict]:
    """
    Generate actionable, personalized recommendations based on ML analysis.
    """
    recommendations = []
    
    # Based on worst hour
    worst_hour = patterns.get("worst_hour", {})
    if worst_hour.get("hour") is not None:
        hour = worst_hour["hour"]
        recommendations.append({
            "icon": "⏰",
            "title": f"Set a reminder at {hour}:00",
            "description": f"Your posture drops most at {hour}:00. Set a break reminder 15 minutes before.",
            "category": "timing",
            "priority": 1
        })
    
    # Based on best hour
    best_hour = patterns.get("best_hour", {})
    if best_hour.get("hour") is not None:
        hour = best_hour["hour"]
        percent = best_hour.get("good_percent", 0)
        recommendations.append({
            "icon": "⭐",
            "title": f"Schedule important work at {hour}:00",
            "description": f"You maintain {percent}% good posture at this hour — your peak focus time.",
            "category": "productivity",
            "priority": 2
        })
    
    # Based on fatigue threshold
    fatigue = patterns.get("fatigue_threshold", {})
    threshold = fatigue.get("threshold_minutes", 60)
    if threshold < 60:
        recommendations.append({
            "icon": "🧘",
            "title": f"Take micro-breaks every {threshold} minutes",
            "description": f"Your posture degrades after {threshold} minutes. A 2-min stretch can reset your form.",
            "category": "breaks",
            "priority": 1
        })
    
    # Based on worst day
    worst_day = patterns.get("worst_day", {})
    if worst_day.get("day_name"):
        day = worst_day["day_name"]
        recommendations.append({
            "icon": "📅",
            "title": f"Plan lighter work on {day}s",
            "description": f"{day}s are your toughest day for posture. Consider shorter sessions or more breaks.",
            "category": "planning",
            "priority": 3
        })
    
    # Based on peak productivity
    peak = patterns.get("peak_productivity", {})
    if peak.get("start") is not None:
        window = peak.get("readable", "")
        recommendations.append({
            "icon": "🎯",
            "title": f"Protect your {window} window",
            "description": "This is your best posture period. Use it for deep work!",
            "category": "productivity",
            "priority": 2
        })
    
    # Based on risk score
    if risk_score.get("score", 0) > 60:
        recommendations.append({
            "icon": "🪑",
            "title": "Check your workspace ergonomics",
            "description": "Your risk score is high. Ensure your monitor is at eye level and feet are flat on the floor.",
            "category": "ergonomics",
            "priority": 1
        })
    
    # Based on streak
    if streak.get("current_streak", 0) >= 3:
        recommendations.append({
            "icon": "🔥",
            "title": f"Keep your {streak['current_streak']}-day streak alive!",
            "description": "You're building a great habit. Consistency is key to lasting improvement.",
            "category": "motivation",
            "priority": 4
        })
    elif streak.get("current_streak", 0) == 0:
        recommendations.append({
            "icon": "💪",
            "title": "Start a new streak today",
            "description": "Aim for 70% good posture today to begin building your streak.",
            "category": "motivation",
            "priority": 3
        })
    
    # Based on session stats
    session = patterns.get("session_stats", {})
    avg_duration = session.get("avg_duration", 0)
    if avg_duration > 90:
        recommendations.append({
            "icon": "⏸️",
            "title": "Break up long sessions",
            "description": f"Your average session is {avg_duration} min. Try the Pomodoro technique (25 min work, 5 min break).",
            "category": "breaks",
            "priority": 2
        })
    
    # Sort by priority
    recommendations.sort(key=lambda x: x["priority"])
    
    return recommendations


def generate_weekly_summary(user_id: int, patterns: Dict) -> Dict:
    """
    Generate a weekly summary comparing this week to last week.
    """
    improvement = patterns.get("improvement_rate", {})
    daily_avg = patterns.get("daily_average", {})
    session_stats = patterns.get("session_stats", {})
    
    this_week = improvement.get("this_week_percent", 0)
    last_week = improvement.get("last_week_percent", 0)
    trend = improvement.get("trend", "stable")
    change = improvement.get("improvement", 0)
    
    # Generate summary message
    if trend == "improving":
        message = f"Great progress! Your posture improved by {change}% this week."
        emoji = "🎉"
    elif trend == "declining":
        message = f"Your posture declined by {abs(change)}% this week. Let's work on getting back on track."
        emoji = "📉"
    else:
        message = "Your posture has been consistent this week. Keep maintaining your habits!"
        emoji = "➡️"
    
    return {
        "this_week_percent": this_week,
        "last_week_percent": last_week,
        "change": change,
        "trend": trend,
        "message": message,
        "emoji": emoji,
        "days_tracked": daily_avg.get("days_tracked", 0),
        "total_sessions": session_stats.get("total_sessions", 0),
        "avg_session_duration": session_stats.get("avg_duration", 0)
    }


def get_slouch_forecast(user_id: int) -> Dict:
    """
    Get current slouch prediction using existing predictor.
    """
    try:
        now = datetime.now()
        current_data = {
            "pitch": 0,
            "roll": 0,
            "minutes_in_session": 0,
            "hour_of_day": now.hour
        }
        
        prediction = predict_slouch(user_id, current_data)
        
        return {
            "available": True,
            "probability": prediction.get("probability", 0),
            "alert_in_minutes": prediction.get("alert_in_minutes", None),
            "confidence": prediction.get("confidence", "low"),
            "message": prediction.get("message", prediction.get("reason", ""))
        }
    except Exception as e:
        return {
            "available": False,
            "probability": 0,
            "message": str(e)
        }


def get_personalized_insights(user_id: int) -> Dict:
    """
    Main function: Get comprehensive ML-powered personalized insights.
    
    Returns a single response with all insight data aggregated.
    """
    # 1. Get pattern mining data
    pattern_data = discover_patterns(user_id, days=30)
    
    if not pattern_data.get("success"):
        # Not enough data yet
        quick = get_quick_stats(user_id)
        model = get_model_status(user_id)
        return {
            "success": True,
            "has_enough_data": False,
            "data_points": pattern_data.get("data_points", 0),
            "message": pattern_data.get("message", "Keep using the app to generate insights."),
            "quick_stats": quick,
            "model_status": model,
            "risk_score": {"score": 0, "level": "unknown", "label": "Not enough data", "color": "slate", "factors": []},
            "health_streak": {"current_streak": 0, "best_streak": 0, "total_good_days": 0},
            "recommendations": [
                {
                    "icon": "🌟",
                    "title": "Start collecting data",
                    "description": "Use the app for a few hours to get personalized insights.",
                    "category": "onboarding",
                    "priority": 1
                }
            ],
            "weekly_summary": None,
            "slouch_forecast": get_slouch_forecast(user_id),
            "patterns": None,
            "insights": []
        }
    
    patterns = pattern_data.get("patterns", {})
    insights = pattern_data.get("insights", [])
    
    # 2. Calculate risk score
    risk_score = calculate_risk_score(user_id, patterns)
    
    # 3. Calculate health streak
    streak = calculate_health_streak(user_id)
    
    # 4. Generate personalized recommendations
    recommendations = generate_personalized_recommendations(patterns, risk_score, streak)
    
    # 5. Generate weekly summary
    weekly_summary = generate_weekly_summary(user_id, patterns)
    
    # 6. Get slouch forecast
    slouch_forecast = get_slouch_forecast(user_id)
    
    # 7. Get quick stats
    quick = get_quick_stats(user_id)
    
    # 8. Get ML model status
    model = get_model_status(user_id)
    
    return {
        "success": True,
        "has_enough_data": True,
        "data_points": pattern_data.get("data_points", 0),
        "quick_stats": quick,
        "model_status": model,
        "risk_score": risk_score,
        "health_streak": streak,
        "patterns": patterns,
        "insights": insights,
        "recommendations": recommendations,
        "weekly_summary": weekly_summary,
        "slouch_forecast": slouch_forecast
    }
