import { UserProfile, UserPreferences } from './types';

export const PRIMARY_PROFILE_KEY = 'mtnote_user_profile';
export const LEGACY_PROFILE_KEY = 'octonote_user_profile';

export const PRIMARY_SESSION_KEY = 'mtnote_active_session';
export const LEGACY_SESSION_KEY = 'octonote_active_session';

// Aliases for compatibility
export const PROFILE_STORAGE_KEY = PRIMARY_PROFILE_KEY;
export const SESSION_STORAGE_KEY = PRIMARY_SESSION_KEY;

export const DEFAULT_PREFERENCES: UserPreferences = {
  compactView: false,
  autoExtractLinks: true,
  defaultTab: 'overview',
};

/**
 * Extracts 1-2 uppercase letters for user avatar
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retrieves the persisted local profile from browser localStorage.
 * Automatically migrates existing legacy data to preserve user setup across the rebrand.
 */
export function getLocalProfile(): UserProfile | null {
  try {
    let raw = localStorage.getItem(PRIMARY_PROFILE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_PROFILE_KEY);
      if (raw) {
        try {
          localStorage.setItem(PRIMARY_PROFILE_KEY, raw);
        } catch {}
      }
    }
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
    displayName: 'MTNOTE User',
    email: 'user@mtnote.local',
    avatarInitial: 'MU',
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
    localStorage.setItem(PRIMARY_PROFILE_KEY, JSON.stringify(updated));
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
    localStorage.setItem(PRIMARY_PROFILE_KEY, JSON.stringify(newProfile));
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
    let active = localStorage.getItem(PRIMARY_SESSION_KEY);
    if (active === null) {
      active = localStorage.getItem(LEGACY_SESSION_KEY);
      if (active !== null) {
        try {
          localStorage.setItem(PRIMARY_SESSION_KEY, active);
        } catch {}
      }
    }
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
    const val = active ? 'true' : 'false';
    localStorage.setItem(PRIMARY_SESSION_KEY, val);
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
    localStorage.removeItem(PRIMARY_PROFILE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    localStorage.removeItem(PRIMARY_SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch (err) {
    console.error('Failed to reset profile:', err);
  }
}
