import { useState, useEffect, useCallback, useRef } from 'react';
import { PostureState } from '../types';

interface SensorData {
    pitch: number;
    roll: number;
    state: PostureState;
    connected: boolean;
    vibration: boolean;
    buzzerActive: boolean;
    headTiltMinutes: number;
}

const WS_URL = 'ws://localhost:8000/ws/frontend';

export const useIoTData = () => {
    const [sensorData, setSensorData] = useState<SensorData>({
        pitch: 0,
        roll: 0,
        state: PostureState.GOOD,
        connected: false,
        vibration: false,
        buzzerActive: false,
        headTiltMinutes: 0,
    });

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('Connected to PostureGuard Backend. Waiting for device status...');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setSensorData(prev => ({
                        ...prev,
                        pitch: data.pitch !== undefined ? data.pitch : prev.pitch,
                        roll: data.roll !== undefined ? data.roll : prev.roll,
                        state: data.state === 'Bad' ? PostureState.BAD :
                            data.state === 'Warning' ? PostureState.WARNING :
                                data.state === 'Good' ? PostureState.GOOD : prev.state,
                        connected: data.connected !== undefined ? data.connected : prev.connected,
                        vibration: data.vibration !== undefined ? data.vibration : prev.vibration,
                        buzzerActive: data.buzzerActive !== undefined ? data.buzzerActive : prev.buzzerActive,
                        headTiltMinutes: data.headTiltMinutes !== undefined ? data.headTiltMinutes : prev.headTiltMinutes,
                    }));
                } catch (e) {
                    console.error('Failed to parse sensor data:', e);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from Backend. Reconnecting in 3s...');
                setSensorData(prev => ({ ...prev, connected: false }));
                setTimeout(connect, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const calibrate = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'calibrate' }));
            console.log('Calibration request sent!');
        }
    }, []);

    return { sensorData, calibrate };
};
