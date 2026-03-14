"""
Authentication module for PostureGuard
Provides user registration, login, profile management, and JWT token management.
"""
import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from typing import Optional

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "posture_guard.db")

# JWT-like token storage - persisted in database for server restart survival
active_tokens: dict[str, dict] = {}  # In-memory cache, backed by DB

def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with users table."""
    conn = get_db()
    
    # Create users table with profile fields
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            height TEXT DEFAULT '',
            working_hours TEXT DEFAULT '09:00 - 17:00',
            alert_delay INTEGER DEFAULT 5,
            alert_intensity INTEGER DEFAULT 80,
            profile_complete INTEGER DEFAULT 0,
            age TEXT DEFAULT '',
            occupation TEXT DEFAULT 'desk',
            daily_goal INTEGER DEFAULT 80,
            break_interval INTEGER DEFAULT 45,
            sound_alerts INTEGER DEFAULT 1,
            weekly_report INTEGER DEFAULT 1,
            gender TEXT DEFAULT '',
            emergency_contact TEXT DEFAULT '',
            is_disabled INTEGER DEFAULT 0,
            disability_type TEXT DEFAULT '',
            caretaker_name TEXT DEFAULT '',
            caretaker_phone TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Add new columns if they don't exist (for existing databases)
    new_columns = [
        ("height", "TEXT DEFAULT ''"),
        ("working_hours", "TEXT DEFAULT '09:00 - 17:00'"),
        ("alert_delay", "INTEGER DEFAULT 5"),
        ("alert_intensity", "INTEGER DEFAULT 80"),
        ("profile_complete", "INTEGER DEFAULT 0"),
        ("age", "TEXT DEFAULT ''"),
        ("occupation", "TEXT DEFAULT 'desk'"),
        ("daily_goal", "INTEGER DEFAULT 80"),
        ("break_interval", "INTEGER DEFAULT 45"),
        ("sound_alerts", "INTEGER DEFAULT 1"),
        ("weekly_report", "INTEGER DEFAULT 1"),
        ("gender", "TEXT DEFAULT ''"),
        ("emergency_contact", "TEXT DEFAULT ''"),
        ("is_disabled", "INTEGER DEFAULT 0"),
        ("disability_type", "TEXT DEFAULT ''"),
        ("caretaker_name", "TEXT DEFAULT ''"),
        ("caretaker_phone", "TEXT DEFAULT ''"),
    ]
    
    for col_name, col_type in new_columns:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass
    
    conn.commit()
    
    # Create auth tokens table for persistent token storage
    conn.execute("""
        CREATE TABLE IF NOT EXISTS auth_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            profile_complete INTEGER DEFAULT 0,
            expires DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    
    # Load existing valid tokens into memory cache
    rows = conn.execute(
        "SELECT token, user_id, name, email, profile_complete, expires FROM auth_tokens WHERE expires > ?",
        (datetime.now().isoformat(),)
    ).fetchall()
    for row in rows:
        active_tokens[row["token"]] = {
            "user_id": row["user_id"],
            "name": row["name"],
            "email": row["email"],
            "profile_complete": bool(row["profile_complete"]),
            "expires": datetime.fromisoformat(row["expires"])
        }
    
    conn.close()
    print(f"Database initialized! Loaded {len(active_tokens)} active tokens.")

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = "posture_guard_salt_2026"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def register_user(name: str, email: str, password: str) -> dict:
    """Register a new user."""
    conn = get_db()
    try:
        password_hash = hash_password(password)
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "success": True, 
            "user_id": user_id, 
            "message": "User registered successfully",
            "profile_complete": False
        }
    except sqlite3.IntegrityError:
        return {"success": False, "message": "Email already registered"}
    finally:
        conn.close()

def login_user(email: str, password: str) -> dict:
    """Authenticate a user and return a token."""
    conn = get_db()
    try:
        password_hash = hash_password(password)
        user = conn.execute(
            "SELECT id, name, email, profile_complete FROM users WHERE email = ? AND password_hash = ?",
            (email, password_hash)
        ).fetchone()
        
        if user:
            # Generate a simple token
            token = secrets.token_urlsafe(32)
            expires = datetime.now() + timedelta(days=7)
            
            # Store in memory cache
            active_tokens[token] = {
                "user_id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "profile_complete": bool(user["profile_complete"]),
                "expires": expires
            }
            
            # Persist to database
            conn.execute(
                "INSERT OR REPLACE INTO auth_tokens (token, user_id, name, email, profile_complete, expires) VALUES (?, ?, ?, ?, ?, ?)",
                (token, user["id"], user["name"], user["email"], int(user["profile_complete"]), expires.isoformat())
            )
            conn.commit()
            
            return {
                "success": True,
                "token": token,
                "user": {
                    "id": user["id"], 
                    "name": user["name"], 
                    "email": user["email"],
                    "profile_complete": bool(user["profile_complete"])
                }
            }
        else:
            return {"success": False, "message": "Invalid email or password"}
    finally:
        conn.close()

def get_user_from_token(token: str) -> Optional[dict]:
    """Get user info from a token. Checks memory cache first, then database."""
    # Check in-memory cache first
    if token in active_tokens:
        token_data = active_tokens[token]
        if datetime.now() < token_data["expires"]:
            return {
                "id": token_data["user_id"],
                "name": token_data["name"],
                "email": token_data["email"],
                "profile_complete": token_data.get("profile_complete", False)
            }
        else:
            # Token expired - remove from cache and DB
            del active_tokens[token]
            try:
                conn = get_db()
                conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
                conn.commit()
                conn.close()
            except:
                pass
            return None
    
    # Not in cache - check database (handles server restart case)
    try:
        conn = get_db()
        row = conn.execute(
            "SELECT user_id, name, email, profile_complete, expires FROM auth_tokens WHERE token = ?",
            (token,)
        ).fetchone()
        conn.close()
        
        if row:
            expires = datetime.fromisoformat(row["expires"])
            if datetime.now() < expires:
                # Reload into memory cache
                active_tokens[token] = {
                    "user_id": row["user_id"],
                    "name": row["name"],
                    "email": row["email"],
                    "profile_complete": bool(row["profile_complete"]),
                    "expires": expires
                }
                return {
                    "id": row["user_id"],
                    "name": row["name"],
                    "email": row["email"],
                    "profile_complete": bool(row["profile_complete"])
                }
            else:
                # Expired - clean up
                conn = get_db()
                conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
                conn.commit()
                conn.close()
    except Exception as e:
        print(f"Token DB lookup error: {e}")
    
    return None

def get_user_profile(user_id: int) -> Optional[dict]:
    """Get full user profile by ID."""
    conn = get_db()
    try:
        user = conn.execute(
            """SELECT id, name, email, height, working_hours, 
                      alert_delay, alert_intensity, profile_complete, created_at,
                      age, occupation, daily_goal, break_interval, sound_alerts, weekly_report,
                      gender, emergency_contact, is_disabled, disability_type,
                      caretaker_name, caretaker_phone
               FROM users WHERE id = ?""",
            (user_id,)
        ).fetchone()
        
        if user:
            return {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "height": user["height"] or "",
                "workingHours": user["working_hours"] or "09:00 - 17:00",
                "alertDelay": user["alert_delay"] or 5,
                "alertIntensity": user["alert_intensity"] or 80,
                "profileComplete": bool(user["profile_complete"]),
                "createdAt": user["created_at"],
                "age": user["age"] or "",
                "occupation": user["occupation"] or "desk",
                "dailyGoal": user["daily_goal"] or 80,
                "breakInterval": user["break_interval"] or 45,
                "soundAlerts": bool(user["sound_alerts"]),
                "weeklyReport": bool(user["weekly_report"]),
                "gender": user["gender"] or "",
                "emergencyContact": user["emergency_contact"] or "",
                "isDisabled": bool(user["is_disabled"]),
                "disabilityType": user["disability_type"] or "",
                "caretakerName": user["caretaker_name"] or "",
                "caretakerPhone": user["caretaker_phone"] or ""
            }
        return None
    finally:
        conn.close()

def update_user_profile(user_id: int, profile_data: dict) -> dict:
    """Update user profile."""
    conn = get_db()
    try:
        # Build update query dynamically
        updates = []
        values = []
        
        if "name" in profile_data:
            updates.append("name = ?")
            values.append(profile_data["name"])
        if "height" in profile_data:
            updates.append("height = ?")
            values.append(profile_data["height"])
        if "workingHours" in profile_data:
            updates.append("working_hours = ?")
            values.append(profile_data["workingHours"])
        if "alertDelay" in profile_data:
            updates.append("alert_delay = ?")
            values.append(profile_data["alertDelay"])
        if "alertIntensity" in profile_data:
            updates.append("alert_intensity = ?")
            values.append(profile_data["alertIntensity"])
        if "profileComplete" in profile_data:
            updates.append("profile_complete = ?")
            values.append(1 if profile_data["profileComplete"] else 0)
        # New health fields
        if "age" in profile_data:
            updates.append("age = ?")
            values.append(profile_data["age"])
        if "occupation" in profile_data:
            updates.append("occupation = ?")
            values.append(profile_data["occupation"])
        if "dailyGoal" in profile_data:
            updates.append("daily_goal = ?")
            values.append(profile_data["dailyGoal"])
        if "breakInterval" in profile_data:
            updates.append("break_interval = ?")
            values.append(profile_data["breakInterval"])
        if "soundAlerts" in profile_data:
            updates.append("sound_alerts = ?")
            values.append(1 if profile_data["soundAlerts"] else 0)
        if "weeklyReport" in profile_data:
            updates.append("weekly_report = ?")
            values.append(1 if profile_data["weeklyReport"] else 0)
        if "gender" in profile_data:
            updates.append("gender = ?")
            values.append(profile_data["gender"])
        if "emergencyContact" in profile_data:
            updates.append("emergency_contact = ?")
            values.append(profile_data["emergencyContact"])
        if "isDisabled" in profile_data:
            updates.append("is_disabled = ?")
            values.append(1 if profile_data["isDisabled"] else 0)
        if "disabilityType" in profile_data:
            updates.append("disability_type = ?")
            values.append(profile_data["disabilityType"])
        if "caretakerName" in profile_data:
            updates.append("caretaker_name = ?")
            values.append(profile_data["caretakerName"])
        if "caretakerPhone" in profile_data:
            updates.append("caretaker_phone = ?")
            values.append(profile_data["caretakerPhone"])
        
        if updates:
            values.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            conn.execute(query, values)
            conn.commit()
            
            # Update token data if profile_complete changed
            for token, data in active_tokens.items():
                if data["user_id"] == user_id:
                    if "name" in profile_data:
                        data["name"] = profile_data["name"]
                    if "profileComplete" in profile_data:
                        data["profile_complete"] = profile_data["profileComplete"]
        
        return {"success": True, "message": "Profile updated successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        conn.close()

def logout_user(token: str) -> bool:
    """Invalidate a user token."""
    removed = False
    if token in active_tokens:
        del active_tokens[token]
        removed = True
    # Also remove from database
    try:
        conn = get_db()
        conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        removed = True
    except:
        pass
    return removed

# Initialize database on module load
init_db()
