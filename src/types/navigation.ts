export type NavTab = 'overview' | 'chats' | 'resources' | 'search' | 'insights' | 'settings';

export interface NavItem {
  id: NavTab;
  label: string;
  description: string;
}
