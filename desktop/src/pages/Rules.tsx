import { useState } from 'react';

interface RuleDef {
  id: string;
  name: string;
  description: string;
  code: string;
  builtin: boolean;
}

const builtinRules: RuleDef[] = [
  { id: 'max_size', name: 'Max File Size', description: 'SVG must not exceed the configured size limit (100KB)', code: 'R001', builtin: true },
  { id: 'viewbox', name: 'Require ViewBox', description: 'SVG must contain a viewBox attribute', code: 'R002', builtin: true },
  { id: 'require_ids', name: 'Element IDs', description: 'All meaningful elements must have id attributes for click selection', code: 'R003', builtin: true },
  { id: 'color_palette', name: 'Color Palette', description: 'Only allow specified colors (useful for brand consistency)', code: 'R004', builtin: true },
  { id: 'custom_regex', name: 'Custom Pattern', description: 'Apply a custom regex pattern to SVG content', code: 'R005', builtin: true },
];

export default function RulesPage() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['max_size', 'viewbox', 'require_ids']));

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Validation Rules</h1>
        <p className="text-sm text-gray-500 mt-1">Configure which rules apply during SVG validation</p>
      </div>

      <div className="space-y-2">
        {builtinRules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-gray-900 rounded-lg border p-4 flex items-start gap-3 transition-colors ${
              enabled.has(rule.id) ? 'border-gray-700' : 'border-gray-800 opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={enabled.has(rule.id)}
              onChange={() => toggle(rule.id)}
              disabled={rule.builtin && rule.id === 'max_size'}
              className="mt-0.5 w-4 h-4 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-200">{rule.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">{rule.code}</span>
                {rule.builtin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">builtin</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-xs text-gray-500">
          {enabled.size} of {builtinRules.length} rules active.
          Enabled rules are applied when calling <code className="text-purple-400">svg_validate</code> via MCP or the REST API.
        </p>
      </div>
    </div>
  );
}
