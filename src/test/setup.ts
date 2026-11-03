import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Ensure a default local profile is seeded for test environments
if (typeof localStorage !== 'undefined') {
  localStorage.setItem(
    'octonote_user_profile',
    JSON.stringify({
      id: 'usr_test_default',
      displayName: 'Alex Morgan',
      email: 'alex@octonote.local',
      avatarInitial: 'AM',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastActiveAt: '2026-01-01T00:00:00.000Z',
      preferences: {
        compactView: false,
        autoExtractLinks: true,
        defaultTab: 'overview',
      },
    })
  );
  localStorage.setItem('octonote_active_session', 'true');
}
