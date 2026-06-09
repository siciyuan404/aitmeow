import React from 'react';

type Status = 'connected' | 'connecting' | 'disconnected' | 'error';

interface StatusIndicatorProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<Status, string> = {
  connected: '#22c55e',
  connecting: '#eab308',
  disconnected: '#6b7280',
  error: '#ef4444',
};

const sizeClasses: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export default function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const color = statusColors[status];
  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 6px 2px ${color}80`,
      }}
      title={status}
    />
  );
}
