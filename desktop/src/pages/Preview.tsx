import React, { useState } from 'react';
import { toast } from 'sonner';

export default function PreviewPage() {
  const [svgInput, setSvgInput] = useState('');
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRender = () => {
    setError(null);
    const trimmed = svgInput.trim();
    if (!trimmed) {
      toast.error('Please paste an SVG first');
      return;
    }
    if (!trimmed.startsWith('<svg') || !trimmed.endsWith('>')) {
      setError('Invalid SVG input. Must start with <svg...> and end with >');
      toast.error('Invalid SVG');
      return;
    }
    setPreviewSvg(trimmed);
    toast.success('SVG rendered');
  };

  const handleClear = () => {
    setSvgInput('');
    setPreviewSvg(null);
    setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(svgInput);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Preview</h1>
        <p className="text-sm text-gray-500 mt-1">Render and preview SVG diagrams</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-400">SVG Input</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!svgInput}
                className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:text-gray-200 disabled:opacity-50 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={handleClear}
                className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:text-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            placeholder="Paste your SVG markup here..."
            className="w-full h-80 bg-gray-800 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none placeholder-gray-600"
          />
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-400">Preview</h2>
          </div>
          <div className="h-80 flex items-center justify-center bg-gray-800/50">
            {error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : previewSvg ? (
              <div
                className="w-full h-full p-4 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <p className="text-gray-600 text-sm">No SVG rendered yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={handleRender}
          disabled={!svgInput}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Render SVG
        </button>
      </div>
    </div>
  );
}
