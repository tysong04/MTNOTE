import React from 'react';
import { SearchView } from './SearchView';

interface SearchPlaceholderViewProps {
  onOpenImport: () => void;
  onNavigateToMessage?: (chatId: string, messageId?: string) => void;
}

export const SearchPlaceholderView: React.FC<SearchPlaceholderViewProps> = (props) => {
  return <SearchView {...props} />;
};

export { SearchView };
