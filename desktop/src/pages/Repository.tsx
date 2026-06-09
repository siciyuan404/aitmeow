import React, { useState } from 'react';

interface RepositoryItem {
  id: string;
  name: string;
  type: 'diagram' | 'template' | 'rule';
  updatedAt: string;
}

const mockItems: RepositoryItem[] = [
  { id: '1', name: 'Flowchart Example', type: 'diagram', updatedAt: '2024-01-15' },
  { id: '2', name: 'ER Diagram Template', type: 'template', updatedAt: '2024-01-14' },
  { id: '3', name: 'Coding Standards', type: 'rule', updatedAt: '2024-01-13' },
  { id: '4', name: 'Architecture Overview', type: 'diagram', updatedAt: '2024-01-12' },
  { id: '5', name: 'API Flow', type: 'diagram', updatedAt: '2024-01-11' },
  { id: '6', name: 'Review Checklist', type: 'rule', updatedAt: '2024-01-10' },
];

const typeColors: Record<string, string> = {
  diagram: 'text-blue-400 bg-blue-400/10',
  template: 'text-green-400 bg-green-400/10',
  rule: 'text-yellow-400 bg-yellow-400/10',
};

export default function RepositoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = mockItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Repository</h1>
        <p className="text-sm text-gray-500 mt-1">Browse your diagrams, templates, and rules</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repository..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All</option>
          <option value="diagram">Diagrams</option>
          <option value="template">Templates</option>
          <option value="rule">Rules</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[item.type]}`}
              >
                {item.type}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors">
              {item.name}
            </h3>
            <p className="text-xs text-gray-600 mt-2">Updated: {item.updatedAt}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-600 py-12">No items found</p>
      )}
    </div>
  );
}
