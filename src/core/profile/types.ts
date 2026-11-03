export interface UserPreferences {
  compactView: boolean;
  autoExtractLinks: boolean;
  defaultTab: 'overview' | 'chats' | 'resources' | 'search' | 'insights' | 'settings' | 'profile';
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  role?: string;
  avatarInitial: string;
  createdAt: string;
  lastActiveAt: string;
  passcode?: string;
  preferences: UserPreferences;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}
