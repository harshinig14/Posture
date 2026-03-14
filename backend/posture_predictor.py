"""
Posture Prediction Module for PostureGuard ML System

Uses LSTM (Long Short-Term Memory) neural network to predict
when a user will slouch BEFORE it happens.

This is the most innovative part of the system:
- Most apps are REACTIVE (alert after bad posture)
- This is PREDICTIVE (alert before bad posture)

Model Architecture:
- Input: Last N minutes of posture data (pitch, roll, time_in_session, hour)
- Output: Probability of slouching in next 5 minutes
"""
import os
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Try to import TensorFlow (may not be installed)
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("⚠️ TensorFlow not installed. Using simple prediction fallback.")

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Model parameters
SEQUENCE_LENGTH = 120  # 2 minutes of data at 1 sample/sec
PREDICTION_HORIZON = 300  # Predict 5 minutes ahead (in seconds)
FEATURES = ["pitch", "roll", "minutes_in_session", "hour_of_day"]


def get_db():
    """Get database connection."""
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class SimplePredictor:
    """
    Simple rule-based predictor for when TensorFlow is not available.
    Uses pattern mining results to make predictions.
    """
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.fatigue_threshold = 45  # Default: posture degrades after 45 mins
        self.worst_hours = []
        self._load_patterns()
    
    def _load_patterns(self):
        """Load patterns from pattern miner results."""
        try:
            from pattern_miner import discover_patterns
            patterns = discover_patterns(self.user_id, days=14)
            
            if patterns.get("success"):
                threshold = patterns["patterns"]["fatigue_threshold"]["threshold_minutes"]
                if threshold and threshold < 120:
                    self.fatigue_threshold = threshold
                
                worst_hour = patterns["patterns"]["worst_hour"]["hour"]
                if worst_hour is not None:
                    self.worst_hours = [worst_hour, (worst_hour + 1) % 24]
        except Exception as e:
            print(f"Could not load patterns: {e}")
    
    def predict(self, current_data: Dict) -> Dict:
        """
        Make a simple prediction based on rules.
        
        Args:
            current_data: {pitch, roll, minutes_in_session, hour_of_day}
        
        Returns:
            {probability, alert_in_minutes, confidence, reason}
        """
        probability = 0.2  # Base probability
        reasons = []
        
        mins_in_session = current_data.get("minutes_in_session", 0)
        current_hour = current_data.get("hour_of_day", 12)
        pitch = abs(current_data.get("pitch", 0))
        roll = abs(current_data.get("roll", 0))
        
        # Factor 1: Time in session approaching fatigue threshold
        if mins_in_session > self.fatigue_threshold * 0.7:
            fatigue_factor = min(1.0, mins_in_session / self.fatigue_threshold)
            probability += 0.3 * fatigue_factor
            reasons.append(f"You've been working for {mins_in_session} mins")
        
        # Factor 2: Current hour is a "bad" hour
        if current_hour in self.worst_hours:
            probability += 0.2
            reasons.append(f"{current_hour}:00 is typically a challenging hour")
        
        # Factor 3: Already showing early signs (slight forward lean)
        if 8 < pitch < 20:  # Warning zone
            probability += 0.15
            reasons.append("Detecting early signs of forward lean")
        
        if 8 < roll < 20:  # Side lean warning
            probability += 0.1
            reasons.append("Slight side tilt detected")
        
        # Cap probability
        probability = min(0.95, probability)
        
        # Calculate when alert should trigger
        time_remaining = max(0, self.fatigue_threshold - mins_in_session)
        alert_in_minutes = max(1, int(time_remaining * (1 - probability)))
        
        confidence = "high" if len(reasons) >= 2 else "medium" if reasons else "low"
        
        return {
            "probability": round(probability, 2),
            "alert_in_minutes": alert_in_minutes,
            "confidence": confidence,
            "reasons": reasons,
            "model_type": "rule_based"
        }


class LSTMPredictor:
    """
    LSTM-based predictor for when TensorFlow is available.
    Trains on user's own data for personalized predictions.
    """
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.model = None
        self.model_path = os.path.join(MODEL_DIR, f"user_{user_id}_lstm.h5")
        self.scaler_path = os.path.join(MODEL_DIR, f"user_{user_id}_scaler.json")
        self.scaler = None
        
        os.makedirs(MODEL_DIR, exist_ok=True)
        self._load_model()
    
    def _load_model(self):
        """Load existing model if available."""
        if os.path.exists(self.model_path):
            try:
                self.model = load_model(self.model_path)
                print(f"✅ Loaded model for user {self.user_id}")
                
                if os.path.exists(self.scaler_path):
                    with open(self.scaler_path, 'r') as f:
                        self.scaler = json.load(f)
            except Exception as e:
                print(f"Error loading model: {e}")
    
    def _build_model(self) -> keras.Model:
        """Build the LSTM model architecture."""
        model = Sequential([
            LSTM(64, input_shape=(SEQUENCE_LENGTH, len(FEATURES)), 
                 return_sequences=True),
            Dropout(0.2),
            BatchNormalization(),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')  # Probability output
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', 'AUC']
        )
        
        return model
    
    def _prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data from user's posture history.
        
        Returns:
            X: sequences of shape (samples, SEQUENCE_LENGTH, features)
            y: labels (0=stayed good, 1=slouched within PREDICTION_HORIZON)
        """
        conn = get_db()
        
        rows = conn.execute("""
            SELECT timestamp, pitch, roll, minutes_in_session, hour_of_day, posture_state
            FROM posture_history
            WHERE user_id = ?
            ORDER BY timestamp
        """, (self.user_id,)).fetchall()
        
        conn.close()
        
        if len(rows) < SEQUENCE_LENGTH + 100:
            raise ValueError(f"Not enough data. Need {SEQUENCE_LENGTH + 100} samples, have {len(rows)}")
        
        # Convert to list of dicts
        data = [dict(row) for row in rows]
        
        # Calculate scaling parameters
        pitches = [d["pitch"] for d in data]
        rolls = [d["roll"] for d in data]
        mins = [d["minutes_in_session"] for d in data]
        
        self.scaler = {
            "pitch_mean": np.mean(pitches), "pitch_std": max(np.std(pitches), 1),
            "roll_mean": np.mean(rolls), "roll_std": max(np.std(rolls), 1),
            "mins_mean": np.mean(mins), "mins_std": max(np.std(mins), 1)
        }
        
        # Save scaler
        with open(self.scaler_path, 'w') as f:
            json.dump(self.scaler, f)
        
        # Create sequences
        X = []
        y = []
        
        for i in range(len(data) - SEQUENCE_LENGTH):
            # Input sequence
            seq = []
            for j in range(SEQUENCE_LENGTH):
                d = data[i + j]
                features = [
                    (d["pitch"] - self.scaler["pitch_mean"]) / self.scaler["pitch_std"],
                    (d["roll"] - self.scaler["roll_mean"]) / self.scaler["roll_std"],
                    (d["minutes_in_session"] - self.scaler["mins_mean"]) / self.scaler["mins_std"],
                    d["hour_of_day"] / 24.0  # Normalize hour
                ]
                seq.append(features)
            
            X.append(seq)
            
            # Label: Did they have "Bad" posture in the next 5 minutes?
            future_states = [data[i + SEQUENCE_LENGTH + k]["posture_state"] 
                          for k in range(min(30, len(data) - i - SEQUENCE_LENGTH))]  # ~5 mins at 6 samples/min
            label = 1 if "Bad" in future_states else 0
            y.append(label)
        
        return np.array(X), np.array(y)
    
    def train(self, epochs: int = 50) -> Dict:
        """Train the model on user's data."""
        try:
            X, y = self._prepare_training_data()
        except ValueError as e:
            return {"success": False, "message": str(e)}
        
        # Split data
        split = int(len(X) * 0.8)
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]
        
        # Build model
        self.model = self._build_model()
        
        # Callbacks
        callbacks = [
            EarlyStopping(patience=10, restore_best_weights=True),
            ModelCheckpoint(self.model_path, save_best_only=True)
        ]
        
        # Train
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=32,
            callbacks=callbacks,
            verbose=1
        )
        
        # Evaluate
        val_loss, val_acc, val_auc = self.model.evaluate(X_val, y_val)
        
        return {
            "success": True,
            "message": f"Model trained! Validation accuracy: {val_acc:.1%}",
            "accuracy": round(val_acc, 3),
            "auc": round(val_auc, 3),
            "samples_used": len(X)
        }
    
    def predict(self, current_data: Dict, recent_history: List[Dict] = None) -> Dict:
        """
        Make a prediction using the LSTM model.
        
        If model isn't trained, falls back to SimplePredictor.
        """
        if self.model is None or self.scaler is None:
            # Fall back to rule-based
            simple = SimplePredictor(self.user_id)
            result = simple.predict(current_data)
            result["message"] = "Using rule-based prediction. Train model for better accuracy."
            return result
        
        # Use recent history if provided, otherwise just current data repeated
        if recent_history and len(recent_history) >= SEQUENCE_LENGTH:
            sequence = recent_history[-SEQUENCE_LENGTH:]
        else:
            # Create a synthetic sequence from current data
            sequence = [current_data] * SEQUENCE_LENGTH
        
        # Normalize
        X = []
        for d in sequence:
            features = [
                (d.get("pitch", 0) - self.scaler["pitch_mean"]) / self.scaler["pitch_std"],
                (d.get("roll", 0) - self.scaler["roll_mean"]) / self.scaler["roll_std"],
                (d.get("minutes_in_session", 0) - self.scaler["mins_mean"]) / self.scaler["mins_std"],
                d.get("hour_of_day", 12) / 24.0
            ]
            X.append(features)
        
        X = np.array([X])  # Add batch dimension
        
        # Predict
        probability = float(self.model.predict(X, verbose=0)[0][0])
        
        # Calculate when alert should trigger
        mins_in_session = current_data.get("minutes_in_session", 0)
        alert_in_minutes = max(1, int((1 - probability) * 10))  # 0-10 minutes
        
        return {
            "probability": round(probability, 2),
            "alert_in_minutes": alert_in_minutes,
            "confidence": "high" if probability > 0.7 or probability < 0.3 else "medium",
            "model_type": "lstm",
            "message": f"{int(probability * 100)}% chance of slouching soon"
        }


def get_predictor(user_id: int):
    """Get the appropriate predictor based on TensorFlow availability."""
    if TF_AVAILABLE:
        return LSTMPredictor(user_id)
    else:
        return SimplePredictor(user_id)


def predict_slouch(user_id: int, current_data: Dict) -> Dict:
    """
    Main prediction function.
    
    Args:
        user_id: The user's ID
        current_data: {pitch, roll, minutes_in_session, hour_of_day}
    
    Returns:
        {probability, alert_in_minutes, confidence, reasons/message}
    """
    predictor = get_predictor(user_id)
    return predictor.predict(current_data)


def train_model(user_id: int) -> Dict:
    """Train (or retrain) the prediction model for a user."""
    if not TF_AVAILABLE:
        return {
            "success": False,
            "message": "TensorFlow not installed. Run: pip install tensorflow"
        }
    
    predictor = LSTMPredictor(user_id)
    return predictor.train()


def get_prediction_status(user_id: int) -> Dict:
    """Check if user has a trained model."""
    model_path = os.path.join(MODEL_DIR, f"user_{user_id}_lstm.h5")
    
    if os.path.exists(model_path):
        mod_time = datetime.fromtimestamp(os.path.getmtime(model_path))
        return {
            "has_model": True,
            "model_type": "lstm" if TF_AVAILABLE else "rule_based",
            "trained_at": mod_time.isoformat(),
            "tensorflow_available": TF_AVAILABLE
        }
    else:
        return {
            "has_model": False,
            "model_type": "rule_based",
            "message": "No trained model. Using rule-based predictions.",
            "tensorflow_available": TF_AVAILABLE
        }
