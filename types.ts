
export enum PostureState {
  GOOD = 'Good',
  WARNING = 'Needs Correction',
  BAD = 'Bad'
}

export interface PostureData {
  score: number;
  state: PostureState;
  neckStatus: 'Aligned' | 'Forward' | 'Slouched';
  backStatus: 'Straight' | 'Rounded' | 'Arched';
  vibrationActive: boolean;
  timeInCurrentState: number; // seconds
  pitch?: number;
  roll?: number;
  iotConnected?: boolean;
  buzzerActive?: boolean;
}

export interface UserProfile {
  name: string;
  height: string;
  workingHours: string;
  alertIntensity: number;
  alertDelay: number; // seconds
  gender?: string;
  emergencyContact?: string;
  isDisabled?: boolean;
  disabilityType?: string;
  caretakerName?: string;
  caretakerPhone?: string;
}

export interface AlertLog {
  id: string;
  timestamp: Date;
  duration: number;
  type: 'Vibration' | 'Notification' | 'Help Request';
  severity: PostureState;
}

export type TabId = 'dashboard' | 'live' | 'chatbot' | 'history' | 'insights' | 'alerts' | 'settings' | 'help';

export type AppView = 'landing' | 'auth' | 'dashboard';
