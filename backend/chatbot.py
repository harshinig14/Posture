"""
AI Chatbot for PostureGuard
Uses intelligent local AI with variation - no external API required.
"""
import os
from typing import Optional
from datetime import datetime
import random
import hashlib

# ============ USER SESSION DATA ============
user_session_data = {
    "current_pitch": 0,
    "current_roll": 0,
    "current_yaw": 0,
    "current_state": "Good",
    "alert_count": 0,
    "good_posture_time": 0,
    "bad_posture_time": 0,
    "session_start": datetime.now(),
    "last_alert_time": None,
}

def update_user_session(pitch: float, roll: float, yaw: float, state: str, vibration: bool):
    """Update user session data with latest sensor readings."""
    global user_session_data
    user_session_data["current_pitch"] = pitch
    user_session_data["current_roll"] = roll
    user_session_data["current_yaw"] = yaw
    user_session_data["current_state"] = state
    
    if vibration:
        user_session_data["alert_count"] += 1
        user_session_data["last_alert_time"] = datetime.now()
    
    if state == "Good":
        user_session_data["good_posture_time"] += 0.2
    elif state == "Bad":
        user_session_data["bad_posture_time"] += 0.2

def calculate_posture_score() -> float:
    """Calculate posture score 0-100."""
    data = user_session_data
    total_time = data["good_posture_time"] + data["bad_posture_time"]
    if total_time == 0:
        return 100
    return (data["good_posture_time"] / total_time) * 100

def get_time_greeting() -> str:
    hour = datetime.now().hour
    if hour < 12:
        return random.choice(["Good morning", "Morning", "Hey, good morning"])
    elif hour < 17:
        return random.choice(["Good afternoon", "Hey there", "Hi"])
    else:
        return random.choice(["Good evening", "Hey", "Hi there"])

def get_variation_seed(query: str) -> int:
    """Create a variation seed based on query + timestamp for unique responses."""
    seed_str = query + str(datetime.now().minute)
    return int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)

# ============ RESPONSE GENERATORS ============

def generate_status_response() -> str:
    """Generate a unique status response each time."""
    data = user_session_data
    score = calculate_posture_score()
    state = data["current_state"]
    alerts = data["alert_count"]
    good_mins = data["good_posture_time"] / 60
    bad_mins = data["bad_posture_time"] / 60
    pitch = data["current_pitch"]
    roll = data["current_roll"]
    
    greeting = get_time_greeting()
    
    # Unique openers
    openers = [
        f"{greeting}! 👋 Let me check your posture data...",
        f"Hey! 💪 Here's how you're doing right now...",
        f"{greeting}! 📊 Let's look at your posture stats...",
        f"Alright! 😊 Here's your current posture breakdown...",
    ]
    opener = random.choice(openers)
    
    # State-specific messages
    if state == "Good":
        state_msgs = [
            "You're sitting with **excellent posture** right now! Keep it up! 🎉",
            "Your posture is looking **great** at the moment! 💚",
            "Nice! You're maintaining **good posture**. Your spine thanks you! 🙌",
            "**Perfect form!** This is exactly how you should be sitting. ✨",
        ]
    elif state == "Warning":
        state_msgs = [
            "I'm noticing you're *slightly* off from ideal posture. A small adjustment could help! 🤔",
            "Your posture could use a *tiny* correction. Try pulling your shoulders back a bit! 💭",
            "Almost there! Just a *minor* adjustment needed. Check your chin position! 📍",
        ]
    else:
        state_msgs = [
            "I can see your posture needs some attention right now. Time to sit up! 💪",
            "Your sensors show poor posture. Take a moment to reset your position! 🔄",
            "Time for a posture check! Try the chin tuck and shoulder roll combo. 🧘",
        ]
    state_msg = random.choice(state_msgs)
    
    # Score interpretation
    if score >= 90:
        score_msgs = [
            f"Your posture score is **{score:.0f}%** — absolutely crushing it! 🏆",
            f"An impressive **{score:.0f}%**! You're a posture champion! 🌟",
            f"**{score:.0f}%** posture score! This is elite-level sitting! 👑",
        ]
    elif score >= 70:
        score_msgs = [
            f"You're at **{score:.0f}%** — solid work with room to grow! 👍",
            f"A respectable **{score:.0f}%**! Keep building on this momentum! 📈",
            f"**{score:.0f}%** is good progress! Small improvements add up! 💪",
        ]
    elif score >= 50:
        score_msgs = [
            f"Your score is **{score:.0f}%**. We can definitely improve this together! 🎯",
            f"**{score:.0f}%** — there's potential here! Let's work on it! 💡",
            f"You're at **{score:.0f}%**. Awareness is the first step! 🌱",
        ]
    else:
        score_msgs = [
            f"**{score:.0f}%** is a starting point. Let's turn this around! 💪",
            f"Your score is **{score:.0f}%**, but that can change! Ready to improve? 🚀",
            f"**{score:.0f}%** today — tomorrow can be different! I believe in you! ✨",
        ]
    score_msg = random.choice(score_msgs)
    
    # Build the response
    response = f"""{opener}

{state_msg}

{score_msg}

**📊 Session Stats:**
- ✅ Good posture: {good_mins:.1f} min
- ⚠️ Needs work: {bad_mins:.1f} min
- 🔔 Alerts: {alerts}
- 📐 Current angles: Pitch {pitch:.1f}°, Roll {roll:.1f}°
"""
    
    # Add contextual tip
    if alerts > 5:
        tips = [
            "\n*Lots of alerts today! Maybe try the 5-minute desk reset?* 💡",
            "\n*Your body's asking for breaks! Try standing for 2 minutes.* 🚶",
        ]
        response += random.choice(tips)
    elif score >= 80:
        tips = [
            "\n*Keep this up and your back will thank you!* 💚",
            "\n*You're building great habits! Consistency is key.* ⭐",
        ]
        response += random.choice(tips)
    
    return response

def generate_stretch_response(body_part: str) -> str:
    """Generate unique stretch recommendations."""
    random.seed(get_variation_seed(body_part))
    
    intros = [
        f"Here are some great stretches for you! 🧘",
        f"Let's loosen things up! Here's what I recommend: 💪",
        f"Time for some relief! Try these: ✨",
        f"These stretches should help: 🌟",
    ]
    
    if "neck" in body_part.lower():
        exercises = [
            ("**Chin Tucks**", "Pull your chin back (make a double chin!), hold 5 seconds, repeat 10x. *This is the #1 exercise for tech neck!*"),
            ("**Neck Tilts**", "Tilt your ear toward your shoulder, hold 30 seconds each side. Feel the stretch!"),
            ("**Slow Neck Rolls**", "Drop chin to chest, gently roll left to right. *Never roll backward!*"),
            ("**Suboccipital Release**", "Place fingers at the base of your skull, apply gentle pressure, and nod slightly."),
        ]
        selected = random.sample(exercises, min(3, len(exercises)))
        outro = "\n*Do these every hour for best results!* ⏰"
        
    elif "back" in body_part.lower():
        exercises = [
            ("**Cat-Cow Stretch**", "On hands and knees, arch up like a cat 🐱, then down like a cow 🐄. Do 10 slow reps."),
            ("**Child's Pose**", "Kneel, reach arms forward, rest forehead down. Hold for 60 seconds. Pure bliss!"),
            ("**Knee-to-Chest**", "Lie on your back, pull one knee to chest, hold 30 seconds. Switch sides."),
            ("**Seated Twist**", "Sitting in your chair, twist left and hold the armrest. Repeat on right."),
        ]
        selected = random.sample(exercises, min(3, len(exercises)))
        outro = "\n*Your back carries you all day — show it some love!* 💚"
        
    else:
        exercises = [
            ("**Quick Chin Tucks**", "30 seconds of chin tucks to reset your neck."),
            ("**Shoulder Rolls**", "10 forward, 10 backward. Release that tension!"),
            ("**Chest Opener**", "Clasp hands behind back, squeeze shoulder blades together."),
            ("**Stand & Walk**", "Just 2 minutes of movement works wonders!"),
        ]
        selected = random.sample(exercises, min(4, len(exercises)))
        outro = "\n*A 5-minute break every 2 hours keeps the stiffness away!* 🎯"
    
    response = random.choice(intros) + "\n\n"
    for i, (name, desc) in enumerate(selected, 1):
        response += f"{i}. {name}\n   {desc}\n\n"
    response += outro
    
    return response

def generate_ergonomics_response() -> str:
    """Generate unique ergonomics advice."""
    random.seed(get_variation_seed("ergo"))
    
    intros = [
        "Let's optimize your workspace! 💺",
        "A good setup is half the battle! Here's the essentials: 🖥️",
        "Time for an ergonomic checkup! 🔍",
    ]
    
    tips = [
        ("**Monitor Position**", "Top of screen at eye level, arm's length away. *If you're looking down, your monitor is too low!*"),
        ("**Chair Height**", "Feet flat on floor, knees at 90°. Use a footrest if needed!"),
        ("**Lumbar Support**", "Your lower back should be supported. A rolled-up towel works great!"),
        ("**Keyboard Placement**", "Elbows at 90°, wrists straight. Don't reach for your keyboard!"),
        ("**Mouse Position**", "Keep it close to your keyboard. No reaching across the desk!"),
    ]
    
    selected = random.sample(tips, min(4, len(tips)))
    
    response = random.choice(intros) + "\n\n"
    for name, desc in selected:
        response += f"✅ {name}\n   {desc}\n\n"
    
    quick_fixes = [
        "*Stack some books under your monitor if it's too low!* 📚",
        "*The 20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds.* 👀",
        "*Even perfect setup won't help without breaks. Move every 45 min!* ⏰",
    ]
    response += random.choice(quick_fixes)
    
    return response

def generate_pain_response(pain_area: str) -> str:
    """Generate empathetic pain management advice."""
    random.seed(get_variation_seed(pain_area))
    
    empathy = [
        f"I'm sorry you're dealing with pain! 😔 Let me help...",
        f"Pain is no fun. Here's what might help: 💚",
        f"That sounds uncomfortable! Let's address it: 🩹",
    ]
    
    if "neck" in pain_area.lower():
        advice = """
**Immediate Relief:**
- Apply heat for 15-20 minutes
- Gentle chin tucks take pressure off the neck
- Massage the base of your skull

**Root Causes to Check:**
- Monitor too low? *Most common cause!*
- Phone cradling? Use speaker or earbuds
- Pillow height? Should keep spine neutral

**Red Flags (see a doctor):**
- Pain lasting 2+ weeks
- Numbness in arms
- Weakness in hands
"""
    elif "back" in pain_area.lower():
        advice = """
**Quick Relief:**
- Stand up and walk for 2 minutes
- Cat-cow stretches on the floor
- Apply heat to tight muscles

**Things to Check:**
- Lumbar support in your chair
- Are you sitting at proper height?
- When did you last stand up?

**Warning Signs:**
- Shooting pain down leg
- Numbness or weakness
- Pain after injury
"""
    else:
        advice = """
**General Pain Management:**
- Movement is medicine! Walk around
- Gentle stretching for the affected area
- Heat for muscle tension, ice for inflammation
- Stay hydrated — muscles need water!

**When to Seek Help:**
- Pain lasting 2+ weeks
- Numbness or tingling
- Pain gets worse over time
"""
    
    return random.choice(empathy) + advice + "\n*Don't push through severe pain. Listen to your body!* 💪"

def generate_help_response() -> str:
    """Show what the chatbot can do."""
    greetings = [
        "Hey there! 👋 I'm your posture buddy!",
        "Hi! 😊 Welcome to your AI posture assistant!",
        "Hello! 💪 Ready to help you sit better!",
    ]
    
    return f"""{random.choice(greetings)}

**Here's what I can do:**

📊 **"How am I doing?"** — Real-time posture analysis
🧘 **"Neck stretches"** — Exercises for relief
💺 **"Desk setup tips"** — Ergonomic guidance
😣 **"My neck hurts"** — Pain management advice
📈 **"My posture score"** — Your session stats

I can see your sensor data in real-time, so my advice is personalized to *you*! 

What would you like to know? �"""

# ============ MAIN RESPONSE GENERATOR ============

async def get_chatbot_response(query: str) -> dict:
    """Generate an intelligent, varied response."""
    query_lower = query.lower()
    
    # Seed randomness for variation
    random.seed(get_variation_seed(query))
    
    # Route to appropriate generator
    if any(kw in query_lower for kw in ["how am i", "my score", "my status", "my posture", "doing", "how's"]):
        response = generate_status_response()
    elif any(kw in query_lower for kw in ["stretch", "exercise", "workout"]):
        if "neck" in query_lower:
            response = generate_stretch_response("neck")
        elif "back" in query_lower:
            response = generate_stretch_response("back")
        else:
            response = generate_stretch_response("general")
    elif any(kw in query_lower for kw in ["desk", "chair", "setup", "ergonomic", "monitor"]):
        response = generate_ergonomics_response()
    elif any(kw in query_lower for kw in ["pain", "hurt", "ache", "sore"]):
        if "neck" in query_lower:
            response = generate_pain_response("neck")
        elif "back" in query_lower:
            response = generate_pain_response("back")
        else:
            response = generate_pain_response("general")
    elif any(kw in query_lower for kw in ["help", "hi", "hello", "hey", "what can"]):
        response = generate_help_response()
    else:
        # Default response with user's current status
        data = user_session_data
        score = calculate_posture_score()
        response = f"""I'm not quite sure what you're asking, but here's what I know! 🤔

**Your Current Status:**
- Posture: **{data["current_state"]}**
- Score: **{score:.0f}%**
- Alerts today: **{data["alert_count"]}**

Try asking me things like:
- *"How am I doing?"*
- *"Neck stretches"*
- *"Desk setup tips"*

What would you like to explore? 😊"""
    
    return {
        "success": True,
        "response": response,
        "source": "local_ai"
    }
