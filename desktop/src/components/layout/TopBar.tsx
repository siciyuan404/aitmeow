import React from 'react';
import StatusIndicator from '@/components/common/StatusIndicator';
import { useConnectionStore } from '@/stores/connectionStore';

export default function TopBar() {
  const { connected } = useConnectionStore();

  return (
    <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">AI Tmeow Desktop</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusIndicator status={connected ? 'connected' : 'disconnected'} />
        <span className="text-xs text-gray-500">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}
