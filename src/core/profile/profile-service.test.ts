import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalProfile,
  saveLocalProfile,
  registerLocalProfile,
  loginLocalProfile,
  isSessionActive,
  signOutLocalSession,
  resetLocalProfile,
  getInitials,
} from './profile-service';

describe('profile-service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates 1-2 letter initials correctly', () => {
    expect(getInitials('Alice')).toBe('AL');
    expect(getInitials('Alice Walker')).toBe('AW');
    expect(getInitials('John Fitzgerald Kennedy')).toBe('JK');
    expect(getInitials('')).toBe('M');
  });

  it('returns null when no local profile is stored', () => {
    expect(getLocalProfile()).toBeNull();
  });

  it('registers a new profile and activates session', () => {
    const res = registerLocalProfile('Sarah Connor', 'sarah@resistance.org', 'Lead Strategist');
    expect(res.success).toBe(true);
    expect(res.profile).toBeDefined();
    expect(res.profile?.displayName).toBe('Sarah Connor');
    expect(res.profile?.email).toBe('sarah@resistance.org');
    expect(res.profile?.avatarInitial).toBe('SC');
    expect(isSessionActive()).toBe(true);

    const saved = getLocalProfile();
    expect(saved?.displayName).toBe('Sarah Connor');
  });

  it('rejects registration with invalid name or email', () => {
    const invalidName = registerLocalProfile('A', 'valid@email.com');
    expect(invalidName.success).toBe(false);
    expect(invalidName.error).toContain('at least 2 characters');

    const invalidEmail = registerLocalProfile('Valid Name', 'not-an-email');
    expect(invalidEmail.success).toBe(false);
    expect(invalidEmail.error).toContain('valid email');
  });

  it('logs into an existing profile with correct email and passcode', () => {
    registerLocalProfile('David Miller', 'david@example.com', '', '1234');
    signOutLocalSession();
    expect(isSessionActive()).toBe(false);

    // Wrong passcode
    const failRes = loginLocalProfile('david@example.com', 'wrong');
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain('Incorrect passcode');

    // Correct passcode
    const okRes = loginLocalProfile('david@example.com', '1234');
    expect(okRes.success).toBe(true);
    expect(isSessionActive()).toBe(true);
  });

  it('updates profile settings and handles partial preferences', () => {
    registerLocalProfile('John Doe', 'john@test.com');
    saveLocalProfile({
      displayName: 'Johnny D',
      preferences: {
        compactView: true,
        autoExtractLinks: false,
        defaultTab: 'chats',
      },
    });

    const updated = getLocalProfile();
    expect(updated?.displayName).toBe('Johnny D');
    expect(updated?.avatarInitial).toBe('JD');
    expect(updated?.preferences.compactView).toBe(true);
    expect(updated?.preferences.autoExtractLinks).toBe(false);
  });

  it('resets local profile cleanly without throwing', () => {
    registerLocalProfile('Temp User', 'temp@test.com');
    expect(getLocalProfile()).not.toBeNull();
    resetLocalProfile();
    expect(getLocalProfile()).toBeNull();
    expect(isSessionActive()).toBe(false);
  });
});
