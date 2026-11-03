import { UserProfile, UserPreferences } from './types';

const PROFILE_STORAGE_KEY = 'octonote_user_profile';
const SESSION_STORAGE_KEY = 'octonote_active_session';

export const DEFAULT_PREFERENCES: UserPreferences = {
  compactView: false,
  autoExtractLinks: true,
  defaultTab: 'overview',
};

/**
 * Extracts 1-2 uppercase letters for user avatar
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'O';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retrieves the persisted local profile from browser localStorage.
 */
export function getLocalProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.displayName) {
      return null;
    }
    // Ensure preferences fallback
    return {
      ...parsed,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(parsed.preferences || {}),
      },
    };
  } catch (err) {
    console.error('Failed to read local profile:', err);
    return null;
  }
}

/**
 * Persists changes to the current local profile.
 */
export function saveLocalProfile(updates: Partial<UserProfile>): UserProfile {
  const existing = getLocalProfile() || {
    id: `user_${Date.now()}`,
    displayName: 'Octonote User',
    email: 'user@octonote.local',
    avatarInitial: 'OU',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    preferences: DEFAULT_PREFERENCES,
  };

  const updated: UserProfile = {
    ...existing,
    ...updates,
    displayName: updates.displayName?.trim() || existing.displayName,
    email: updates.email?.trim() || existing.email,
    avatarInitial: getInitials(updates.displayName || existing.displayName),
    lastActiveAt: new Date().toISOString(),
    preferences: {
      ...existing.preferences,
      ...(updates.preferences || {}),
    },
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save profile to localStorage:', err);
  }

  return updated;
}

/**
 * Validates and registers a new local profile.
 */
export function registerLocalProfile(
  displayName: string,
  email: string,
  bio?: string,
  passcode?: string
): { success: boolean; profile?: UserProfile; error?: string } {
  const trimmedName = displayName.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: 'Display name must be at least 2 characters.' };
  }

  // Basic email pattern check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const newProfile: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    displayName: trimmedName,
    email: trimmedEmail,
    bio: bio?.trim() || '',
    role: 'Workspace Owner',
    avatarInitial: getInitials(trimmedName),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    passcode: passcode?.trim() || undefined,
    preferences: DEFAULT_PREFERENCES,
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
    setSessionActive(true);
    return { success: true, profile: newProfile };
  } catch (err) {
    return { success: false, error: 'Failed to save profile to local browser storage.' };
  }
}

/**
 * Validates credentials against the saved on-device profile.
 */
export function loginLocalProfile(
  email: string,
  passcode?: string
): { success: boolean; profile?: UserProfile; error?: string } {
  const existing = getLocalProfile();
  if (!existing) {
    return {
      success: false,
      error: 'No local profile found on this browser. Please create one to continue.',
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (existing.email.toLowerCase() !== trimmedEmail) {
    return {
      success: false,
      error: `Email does not match the active local profile ("${existing.email}").`,
    };
  }

  if (existing.passcode && existing.passcode !== passcode?.trim()) {
    return {
      success: false,
      error: 'Incorrect passcode. Please try again.',
    };
  }

  // Touch last active
  saveLocalProfile({ lastActiveAt: new Date().toISOString() });
  setSessionActive(true);
  return { success: true, profile: existing };
}

/**
 * Checks whether the current browser session is marked as authenticated.
 */
export function isSessionActive(): boolean {
  try {
    const active = localStorage.getItem(SESSION_STORAGE_KEY);
    // If user has a profile and session is active or not explicitly locked
    return active === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets session active state (e.g. after login or logout).
 */
export function setSessionActive(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(SESSION_STORAGE_KEY, 'true');
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, 'false');
    }
  } catch (err) {
    console.error('Failed to update session state:', err);
  }
}

/**
 * Signs out of the local session.
 * Does NOT delete imported chats or profile data.
 */
export function signOutLocalSession(): void {
  setSessionActive(false);
}

/**
 * Resets the local profile settings and removes the profile record.
 */
export function resetLocalProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset profile:', err);
  }
}
