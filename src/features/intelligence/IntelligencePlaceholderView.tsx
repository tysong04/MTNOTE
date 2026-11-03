import React from 'react';
import { IntelligenceView } from './IntelligenceView';

interface IntelligencePlaceholderViewProps {
  onOpenImport: () => void;
  onNavigateToMessage?: (chatId: string, messageId?: string) => void;
}

export const IntelligencePlaceholderView: React.FC<IntelligencePlaceholderViewProps> = (props) => {
  return <IntelligenceView {...props} />;
};

export { IntelligenceView };
