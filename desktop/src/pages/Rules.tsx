import React, { useState } from 'react';

interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
}

const initialRules: Rule[] = [
  { id: '1', name: 'Naming Convention', description: 'Ensure consistent naming patterns', enabled: true, severity: 'error' },
  { id: '2', name: 'Max Line Length', description: 'Lines should not exceed 80 characters', enabled: true, severity: 'warning' },
  { id: '3', name: 'Required Annotations', description: 'All public methods must have annotations', enabled: false, severity: 'error' },
  { id: '4', name: 'Type Safety', description: 'Enforce strict type checking', enabled: true, severity: 'error' },
  { id: '5', name: 'Documentation', description: 'All modules must have documentation', enabled: false, severity: 'info' },
  { id: '6', name: 'Error Handling', description: 'All errors must be properly handled', enabled: true, severity: 'warning' },
];

const severityColors: Record<string, string> = {
  error: 'text-red-400 bg-red-400/10',
  warning: 'text-yellow-400 bg-yellow-400/10',
  info: 'text-blue-400 bg-blue-400/10',
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(initialRules);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Rules</h1>
        <p className="text-sm text-gray-500 mt-1">Manage validation rules for your diagrams</p>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex items-center justify-between"
          >
            <div className="flex items-start gap-3 flex-1">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => toggleRule(rule.id)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${rule.enabled ? 'text-gray-200' : 'text-gray-500'}`}>
                    {rule.name}
                  </h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${severityColors[rule.severity]}`}>
                    {rule.severity}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${rule.enabled ? 'text-gray-500' : 'text-gray-600'}`}>
                  {rule.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
          Add New Rule
        </button>
      </div>
    </div>
  );
}
