"""
Automatic Model Training Module for PostureGuard ML System

This module implements AUTOMATIC, INCREMENTAL learning:
- Monitors data accumulation for each user
- Triggers training when thresholds are met
- Stores per-user personalized models
- Runs training in background without blocking

Key Features:
1. No manual "Train" button needed
2. Each user gets their own unique LSTM model
3. Model improves over time as more data is collected
4. Retrains periodically to adapt to changing patterns
"""
import os
import json
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import sqlite3

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
TRAINING_STATE_FILE = os.path.join(MODEL_DIR, "training_state.json")

# Training thresholds
MIN_SAMPLES_FOR_FIRST_TRAINING = 200      # ~1.5 hours of data (30s intervals)
MIN_NEW_SAMPLES_FOR_RETRAIN = 100         # Retrain after 50 more minutes of new data
RETRAIN_COOLDOWN_HOURS = 6                # Don't retrain more often than this

# Ensure model directory exists
os.makedirs(MODEL_DIR, exist_ok=True)


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_training_state() -> Dict:
    """Load training state from disk."""
    if os.path.exists(TRAINING_STATE_FILE):
        try:
            with open(TRAINING_STATE_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}


def save_training_state(state: Dict):
    """Save training state to disk."""
    with open(TRAINING_STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2, default=str)


def get_user_sample_count(user_id: int) -> int:
    """Get total number of posture samples for a user."""
    conn = get_db()
    result = conn.execute(
        "SELECT COUNT(*) as count FROM posture_history WHERE user_id = ?",
        (user_id,)
    ).fetchone()
    conn.close()
    return result["count"] if result else 0


def get_samples_since_last_training(user_id: int, last_trained_at: str) -> int:
    """Get number of new samples since last training."""
    conn = get_db()
    result = conn.execute(
        "SELECT COUNT(*) as count FROM posture_history WHERE user_id = ? AND timestamp > ?",
        (user_id, last_trained_at)
    ).fetchone()
    conn.close()
    return result["count"] if result else 0


def should_train_model(user_id: int) -> tuple[bool, str]:
    """
    Check if we should train/retrain the model for this user.
    
    Returns:
        (should_train, reason)
    """
    state = load_training_state()
    user_state = state.get(str(user_id), {})
    
    total_samples = get_user_sample_count(user_id)
    
    # Check if user has never been trained
    if not user_state.get("last_trained_at"):
        if total_samples >= MIN_SAMPLES_FOR_FIRST_TRAINING:
            return True, f"First training: {total_samples} samples available"
        return False, f"Need {MIN_SAMPLES_FOR_FIRST_TRAINING - total_samples} more samples for first training"
    
    # Check cooldown
    last_trained = datetime.fromisoformat(user_state["last_trained_at"])
    hours_since = (datetime.now() - last_trained).total_seconds() / 3600
    
    if hours_since < RETRAIN_COOLDOWN_HOURS:
        return False, f"Cooldown: {RETRAIN_COOLDOWN_HOURS - hours_since:.1f} hours remaining"
    
    # Check if enough new data
    new_samples = get_samples_since_last_training(user_id, user_state["last_trained_at"])
    
    if new_samples >= MIN_NEW_SAMPLES_FOR_RETRAIN:
        return True, f"Retrain: {new_samples} new samples since last training"
    
    return False, f"Need {MIN_NEW_SAMPLES_FOR_RETRAIN - new_samples} more samples before retrain"


def train_user_model(user_id: int) -> Dict:
    """
    Train or retrain the LSTM model for a specific user.
    This runs in a background thread.
    """
    try:
        # Import here to avoid circular imports and TensorFlow startup delay
        from posture_predictor import LSTMPredictor, TF_AVAILABLE
        
        if not TF_AVAILABLE:
            return {
                "success": False,
                "message": "TensorFlow not installed. Run: pip install tensorflow"
            }
        
        print(f"🧠 Starting automatic training for user {user_id}...")
        
        predictor = LSTMPredictor(user_id)
        result = predictor.train(epochs=30)  # Fewer epochs for incremental training
        
        if result["success"]:
            # Update training state
            state = load_training_state()
            state[str(user_id)] = {
                "last_trained_at": datetime.now().isoformat(),
                "samples_used": result.get("samples_used", 0),
                "accuracy": result.get("accuracy", 0),
                "auc": result.get("auc", 0),
                "training_count": state.get(str(user_id), {}).get("training_count", 0) + 1
            }
            save_training_state(state)
            
            print(f"✅ Training complete for user {user_id}! Accuracy: {result.get('accuracy', 0):.1%}")
        else:
            print(f"❌ Training failed for user {user_id}: {result.get('message')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Training error for user {user_id}: {e}")
        return {"success": False, "message": str(e)}


# Background training thread
_training_lock = threading.Lock()
_training_in_progress: Dict[int, bool] = {}


def trigger_auto_training(user_id: int):
    """
    Check if training is needed and start it in background.
    Called automatically after each posture log.
    """
    global _training_in_progress
    
    # Don't start if already training for this user
    if _training_in_progress.get(user_id, False):
        return
    
    should_train, reason = should_train_model(user_id)
    
    if not should_train:
        return
    
    # Start training in background thread
    with _training_lock:
        if _training_in_progress.get(user_id, False):
            return
        _training_in_progress[user_id] = True
    
    def train_thread():
        try:
            train_user_model(user_id)
        finally:
            with _training_lock:
                _training_in_progress[user_id] = False
    
    thread = threading.Thread(target=train_thread, daemon=True)
    thread.start()
    print(f"🚀 Auto-training started for user {user_id}: {reason}")


def get_model_status(user_id: int) -> Dict:
    """Get the current model status for a user."""
    state = load_training_state()
    user_state = state.get(str(user_id), {})
    
    total_samples = get_user_sample_count(user_id)
    should_train, reason = should_train_model(user_id)
    
    model_path = os.path.join(MODEL_DIR, f"user_{user_id}_lstm.h5")
    has_model = os.path.exists(model_path)
    
    return {
        "has_personalized_model": has_model,
        "total_samples": total_samples,
        "samples_needed_for_training": max(0, MIN_SAMPLES_FOR_FIRST_TRAINING - total_samples) if not has_model else 0,
        "last_trained_at": user_state.get("last_trained_at"),
        "training_count": user_state.get("training_count", 0),
        "accuracy": user_state.get("accuracy"),
        "will_train_soon": should_train,
        "status_message": reason,
        "is_training": _training_in_progress.get(user_id, False)
    }


def force_train(user_id: int) -> Dict:
    """Force immediate training (for manual override if needed)."""
    total_samples = get_user_sample_count(user_id)
    
    if total_samples < 50:  # Absolute minimum
        return {
            "success": False,
            "message": f"Not enough data. Have {total_samples}, need at least 50 samples."
        }
    
    return train_user_model(user_id)
