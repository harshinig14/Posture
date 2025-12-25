
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
}

export interface UserProfile {
  name: string;
  height: string;
  workingHours: string;
  alertIntensity: number;
  alertDelay: number; // seconds
}

export interface AlertLog {
  id: string;
  timestamp: Date;
  duration: number;
  type: 'Vibration' | 'Notification';
  severity: PostureState;
}

export type TabId = 'dashboard' | 'live' | 'history' | 'insights' | 'alerts' | 'profile' | 'settings' | 'help';

export type AppView = 'landing' | 'auth' | 'dashboard';
