/**
 * useBLEData - Web Bluetooth hook for PostureGuard
 * 
 * Features:
 * - Auto-calibration: First reading becomes the baseline (supports ANY sensor orientation)
 * - Deviation-based detection: Only flags bad posture when deviating from baseline
 * - Time-based warnings: Good → Needs Correction (3s) → Bad (8s)
 * - Ignores sudden movements
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PostureState } from '../types';

// BLE UUIDs (must match ESP32 firmware)
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Posture thresholds (degrees deviation from baseline)
const WARNING_THRESHOLD = 15;  // Show "Needs Correction" warning (reduced from 18)
const BAD_THRESHOLD = 25;      // Show "Bad Posture" alert (reduced from 30)
const WARNING_TIME_MS = 3000;  // 3 seconds before warning
const BAD_TIME_MS = 8000;      // 8 seconds before bad posture alert
const MOVEMENT_THRESHOLD = 25; // Ignore sudden movements above this change rate

// Match the same SensorData interface as useIoTData
interface SensorData {
    pitch: number;
    roll: number;
    state: PostureState;
    connected: boolean;
    vibration: boolean;
    buzzerActive: boolean;
    headTiltMinutes: number;
}

export interface BLEHookResult {
    sensorData: SensorData;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendCommand: (cmd: string) => void;
    isCalibrated: boolean;
    baseline: { pitch: number; roll: number };
    deviation: { pitch: number; roll: number };
    recalibrate: () => void;
}

export function useBLEData(): BLEHookResult {
    const [sensorData, setSensorData] = useState<SensorData>({
        pitch: 0,
        roll: 0,
        state: PostureState.GOOD,
        connected: false,
        vibration: false,
        buzzerActive: false,
        headTiltMinutes: 0,
    });

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviation, setDeviation] = useState({ pitch: 0, roll: 0 });

    // Use refs for values that need to be accessed in callbacks without causing re-renders
    const isCalibrated = useRef(false);
    const baseline = useRef({ pitch: 0, roll: 0 });
    const deviceRef = useRef<any>(null);
    const characteristicRef = useRef<any>(null);

    // For time-based state machine
    const warningStartTimeRef = useRef<number | null>(null);
    const badStartTimeRef = useRef<number | null>(null);
    const lastPitchRef = useRef<number>(0);
    const lastRollRef = useRef<number>(0);
    const currentStateRef = useRef<PostureState>(PostureState.GOOD);

    // Head tilt duration tracking (for BLE mode — ESP32 sends headTilt but not duration)
    const headTiltStartRef = useRef<number | null>(null);

    // Calculate roll difference with 360° normalization
    const calculateRollDiff = (currentRoll: number, baselineRoll: number): number => {
        let diff = Math.abs(currentRoll - baselineRoll);
        if (diff > 180) {
            diff = 360 - diff;
        }
        return diff;
    };

    // Process incoming BLE data
    const handleNotification = useCallback((event: any) => {
        const value = event.target?.value;
        if (!value) return;

        try {
            // Decode the received data
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(value);

            // Parse JSON from ESP32
            const data = JSON.parse(text);
            const pitch = data.pitch ?? 0;
            const roll = data.roll ?? 0;
            const sensorError = data.sensor_error === true;

            // Auto-calibrate on first reading
            if (!isCalibrated.current && !sensorError) {
                baseline.current = { pitch, roll };
                isCalibrated.current = true;
                console.log(`✅ Auto-calibrated! Baseline: Pitch=${pitch.toFixed(1)}°, Roll=${roll.toFixed(1)}°`);
            }

            // Calculate deviation from baseline
            const pitchDiff = Math.abs(pitch - baseline.current.pitch);
            const rollDiff = calculateRollDiff(roll, baseline.current.roll);

            // Update deviation state for display
            setDeviation({ pitch: pitchDiff, roll: rollDiff });

            // Determine posture state
            let state = PostureState.GOOD;

            if (isCalibrated.current) {
                const now = Date.now();

                // Check for sudden movement (ignore it)
                const pitchChange = Math.abs(pitch - lastPitchRef.current);
                const rollChange = Math.abs(roll - lastRollRef.current);
                const isSuddenMovement = pitchChange > MOVEMENT_THRESHOLD || rollChange > MOVEMENT_THRESHOLD;

                lastPitchRef.current = pitch;
                lastRollRef.current = roll;

                if (isSuddenMovement) {
                    // Keep previous state during sudden movements
                    state = currentStateRef.current;
                    console.log(`⚡ Sudden movement detected, keeping state: ${state}`);
                } else {
                    // Determine raw state based on deviation thresholds
                    let rawState: 'good' | 'warning' | 'bad' = 'good';
                    if (pitchDiff > BAD_THRESHOLD || rollDiff > BAD_THRESHOLD) {
                        rawState = 'bad';
                    } else if (pitchDiff > WARNING_THRESHOLD || rollDiff > WARNING_THRESHOLD) {
                        rawState = 'warning';
                    }

                    // Log deviation and raw state for debugging
                    console.log(`📊 Pitch: ${pitch.toFixed(1)}° (dev: ${pitchDiff.toFixed(1)}°), Roll: ${roll.toFixed(1)}° (dev: ${rollDiff.toFixed(1)}°) → Raw: ${rawState}`);

                    // Apply time-based state machine
                    if (rawState === 'good') {
                        // Reset all timers
                        warningStartTimeRef.current = null;
                        badStartTimeRef.current = null;
                        currentStateRef.current = PostureState.GOOD;
                        state = PostureState.GOOD;
                    } else if (rawState === 'warning') {
                        badStartTimeRef.current = null;
                        if (!warningStartTimeRef.current) {
                            warningStartTimeRef.current = now;
                            console.log('⏱️ Warning timer started');
                        }
                        const warningDuration = now - warningStartTimeRef.current;
                        if (warningDuration >= WARNING_TIME_MS) {
                            currentStateRef.current = PostureState.WARNING;
                            state = PostureState.WARNING;
                            console.log('⚠️ STATE: Needs Correction');
                        } else {
                            state = PostureState.GOOD; // Still in grace period
                        }
                    } else { // rawState === 'bad'
                        if (!warningStartTimeRef.current) {
                            warningStartTimeRef.current = now;
                        }
                        if (!badStartTimeRef.current) {
                            badStartTimeRef.current = now;
                            console.log('⏱️ Bad posture timer started');
                        }

                        const badDuration = now - badStartTimeRef.current;
                        const warningDuration = now - warningStartTimeRef.current;

                        if (badDuration >= BAD_TIME_MS) {
                            currentStateRef.current = PostureState.BAD;
                            state = PostureState.BAD;
                            console.log('🔴 STATE: Bad Posture!');
                        } else if (warningDuration >= WARNING_TIME_MS) {
                            currentStateRef.current = PostureState.WARNING;
                            state = PostureState.WARNING;
                            console.log('⚠️ STATE: Needs Correction');
                        } else {
                            state = PostureState.GOOD; // Still in grace period
                        }
                    }
                }
            }

            // Parse head tilt and buzzer state from ESP32 BLE data
            const isHeadTilted = data.headTilt === true || data.buzzerActive === true;
            const isBuzzerActive = data.buzzerActive === true;

            // Track head tilt duration locally
            let headTiltMinutes = 0;
            if (isHeadTilted) {
                if (headTiltStartRef.current === null) {
                    headTiltStartRef.current = Date.now();
                }
                headTiltMinutes = (Date.now() - headTiltStartRef.current) / 60000;
            } else {
                headTiltStartRef.current = null;
            }

            setSensorData({
                pitch,
                roll,
                state: sensorError ? PostureState.GOOD : state,
                connected: !sensorError,
                vibration: state === PostureState.BAD,
                buzzerActive: isBuzzerActive,
                headTiltMinutes: Math.round(headTiltMinutes * 10) / 10,
            });
        } catch (e) {
            console.error('BLE: Failed to parse data:', e);
        }
    }, []);

    const connect = useCallback(async () => {
        // Check if Web Bluetooth is available
        const nav = navigator as any;
        if (!nav.bluetooth) {
            setError('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            console.log('🔵 Requesting Bluetooth device...');

            // Request the device
            const device = await nav.bluetooth.requestDevice({
                filters: [{ name: 'PostureGuard' }],
                optionalServices: [SERVICE_UUID],
            });

            deviceRef.current = device;

            // Handle disconnection
            device.addEventListener('gattserverdisconnected', () => {
                console.log('🔴 BLE Device disconnected');
                setIsConnected(false);
                setSensorData(prev => ({ ...prev, connected: false }));
            });

            console.log('🔵 Connecting to GATT server...');
            const server = await device.gatt?.connect();

            if (!server) {
                throw new Error('Failed to connect to GATT server');
            }

            console.log('🔵 Getting service...');
            const service = await server.getPrimaryService(SERVICE_UUID);

            console.log('🔵 Getting characteristic...');
            const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
            characteristicRef.current = characteristic;

            // Subscribe to notifications
            console.log('🔵 Subscribing to notifications...');
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handleNotification);

            setIsConnected(true);
            setSensorData(prev => ({ ...prev, connected: true }));
            console.log('✅ BLE Connected! Auto-calibration will happen on first reading...');

        } catch (e: any) {
            console.error('❌ BLE Connection failed:', e);
            setError(e.message || 'Failed to connect');
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    }, [handleNotification]);

    const disconnect = useCallback(() => {
        if (characteristicRef.current) {
            try {
                characteristicRef.current.removeEventListener('characteristicvaluechanged', handleNotification);
            } catch (e) { }
        }

        if (deviceRef.current?.gatt?.connected) {
            try {
                deviceRef.current.gatt.disconnect();
            } catch (e) { }
        }

        deviceRef.current = null;
        characteristicRef.current = null;
        setIsConnected(false);
        isCalibrated.current = false;
        setSensorData(prev => ({ ...prev, connected: false }));
        console.log('🔴 BLE Disconnected');
    }, [handleNotification]);

    // Manual recalibration
    const recalibrate = useCallback(() => {
        isCalibrated.current = false;
        warningStartTimeRef.current = null;
        badStartTimeRef.current = null;
        currentStateRef.current = PostureState.GOOD;
        console.log('🔄 Recalibration requested - next reading will become new baseline');
    }, []);

    const sendCommand = useCallback((cmd: string) => {
        if (!characteristicRef.current) {
            console.warn('BLE: Cannot send command - not connected');
            return;
        }

        try {
            const encoder = new TextEncoder();
            characteristicRef.current.writeValue(encoder.encode(cmd + '\n'));
            console.log('📤 BLE Command sent:', cmd);

            // Update vibration state
            if (cmd === 'VIBRATE_ON') {
                setSensorData(prev => ({ ...prev, vibration: true }));
            } else if (cmd === 'VIBRATE_OFF') {
                setSensorData(prev => ({ ...prev, vibration: false }));
            }
        } catch (e) {
            console.error('BLE: Failed to send command:', e);
        }
    }, []);

    return {
        sensorData,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        sendCommand,
        isCalibrated: isCalibrated.current,
        baseline: baseline.current,
        deviation,
        recalibrate,
    };
}
