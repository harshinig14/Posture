"""
PostureGuard Bluetooth Bridge

This script receives data from the ESP32 via Bluetooth Serial
and forwards it to the backend WebSocket server.

SETUP:
1. Pair your computer with "PostureGuard" via Bluetooth Settings
2. Find the COM port (Windows) or /dev/tty.* (Mac) for the paired device
3. Run this script: python bluetooth_bridge.py

The script will automatically connect to the ESP32 and forward all
sensor data to the backend.
"""

import serial
import serial.tools.list_ports
import asyncio
import websockets
import json
import sys
import time

# Configuration
BACKEND_WS_URL = "ws://localhost:8000/ws/esp32"
BAUD_RATE = 115200

def find_bluetooth_port():
    """Find the Bluetooth serial port for PostureGuard."""
    ports = list(serial.tools.list_ports.comports())
    
    print("\n📡 Available Serial Ports:")
    print("-" * 50)
    
    bluetooth_ports = []
    for port in ports:
        desc = port.description.lower()
        # Look for Bluetooth ports
        if 'bluetooth' in desc or 'bt' in desc or 'serial' in desc:
            print(f"  🔵 {port.device} - {port.description}")
            bluetooth_ports.append(port.device)
        else:
            print(f"  ⚪ {port.device} - {port.description}")
    
    print("-" * 50)
    
    if bluetooth_ports:
        print(f"\n💡 Likely Bluetooth ports: {bluetooth_ports}")
        return bluetooth_ports[0]  # Return first Bluetooth port found
    
    return None


async def bluetooth_to_websocket(bt_port: str):
    """Main bridge function: reads from Bluetooth, sends to WebSocket."""
    
    print(f"\n🔌 Opening Bluetooth port: {bt_port}")
    
    try:
        ser = serial.Serial(bt_port, BAUD_RATE, timeout=1)
        print(f"✅ Bluetooth Serial connected!")
    except serial.SerialException as e:
        print(f"❌ Failed to open port {bt_port}: {e}")
        print("\n💡 Tips:")
        print("   1. Make sure ESP32 is powered on")
        print("   2. Check that 'PostureGuard' is paired in Bluetooth settings")
        print("   3. Try a different COM port")
        return
    
    while True:
        try:
            print(f"\n🌐 Connecting to backend: {BACKEND_WS_URL}")
            async with websockets.connect(BACKEND_WS_URL) as ws:
                print("✅ Connected to PostureGuard Backend!")
                print("\n📊 Streaming sensor data...\n")
                
                while True:
                    # Read line from Bluetooth
                    if ser.in_waiting:
                        try:
                            line = ser.readline().decode('utf-8').strip()
                            if line.startswith('{'):
                                # It's JSON - forward to backend
                                await ws.send(line)
                                data = json.loads(line)
                                print(f"📤 Pitch: {data.get('pitch', 0):6.1f}° | Roll: {data.get('roll', 0):6.1f}° | Yaw: {data.get('yaw', 0):6.1f}°", end='\r')
                        except UnicodeDecodeError:
                            pass
                    
                    # Check for commands from backend
                    try:
                        cmd = await asyncio.wait_for(ws.recv(), timeout=0.01)
                        print(f"\n📥 Command from backend: {cmd}")
                        ser.write((cmd + '\n').encode())
                    except asyncio.TimeoutError:
                        pass
                    
                    await asyncio.sleep(0.01)
                    
        except websockets.ConnectionClosed:
            print("\n⚠️ Backend connection lost. Reconnecting in 3s...")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await asyncio.sleep(3)


def main():
    print("=" * 50)
    print("  PostureGuard Bluetooth Bridge")
    print("=" * 50)
    
    # Find Bluetooth port
    bt_port = None
    
    if len(sys.argv) > 1:
        bt_port = sys.argv[1]
        print(f"\n📋 Using specified port: {bt_port}")
    else:
        bt_port = find_bluetooth_port()
        
        if not bt_port:
            print("\n❌ No Bluetooth serial port found!")
            print("\n💡 To fix this:")
            print("   1. Open Windows Bluetooth Settings")
            print("   2. Click 'Add Bluetooth device'")
            print("   3. Look for 'PostureGuard' and pair it")
            print("   4. After pairing, re-run this script")
            print("\n   Or manually specify the port:")
            print("   python bluetooth_bridge.py COM5")
            return
    
    print(f"\n🚀 Starting bridge on {bt_port}...")
    print("   Press Ctrl+C to stop\n")
    
    try:
        asyncio.run(bluetooth_to_websocket(bt_port))
    except KeyboardInterrupt:
        print("\n\n👋 Bridge stopped.")


if __name__ == "__main__":
    main()
