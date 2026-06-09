import React, { useState } from 'react';

const categories = ['All', 'Flowchart', 'Architecture', 'Network', 'Database', 'UML'];

const templates = [
  { id: '1', name: 'Basic Flowchart', category: 'Flowchart', description: 'Simple process flow diagram' },
  { id: '2', name: 'Architecture Overview', category: 'Architecture', description: 'System architecture diagram' },
  { id: '3', name: 'Network Topology', category: 'Network', description: 'Network infrastructure layout' },
  { id: '4', name: 'ER Diagram', category: 'Database', description: 'Entity relationship diagram' },
  { id: '5', name: 'Class Diagram', category: 'UML', description: 'UML class diagram' },
  { id: '6', name: 'Sequence Diagram', category: 'UML', description: 'UML sequence diagram' },
  { id: '7', name: 'Data Flow', category: 'Flowchart', description: 'Data flow diagram' },
  { id: '8', name: 'Deployment Diagram', category: 'Architecture', description: 'System deployment view' },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Templates</h1>
        <p className="text-sm text-gray-500 mt-1">Start with a pre-built template</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              activeCategory === cat
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-purple-700 transition-colors cursor-pointer group"
          >
            <h3 className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors">
              {template.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
            <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
              {template.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
