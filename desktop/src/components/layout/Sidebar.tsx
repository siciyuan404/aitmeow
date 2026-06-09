import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/connection', label: 'Connection', icon: '🔌' },
  { path: '/preview', label: 'Preview', icon: '👁' },
  { path: '/repository', label: 'Repository', icon: '📦' },
  { path: '/templates', label: 'Templates', icon: '📋' },
  { path: '/rules', label: 'Rules', icon: '⚙' },
  { path: '/settings', label: 'Settings', icon: '🔧' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-purple-400">AI Tmeow</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
