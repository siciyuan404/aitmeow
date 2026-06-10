import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, type ValidationResponse } from '@/services/api';

export default function PreviewPage() {
  const [svgInput, setSvgInput] = useState('');
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [viewMode, setViewMode] = useState<'svg' | 'png'>('svg');
  const [busy, setBusy] = useState(false);

  const handleValidate = useCallback(async () => {
    if (!svgInput.trim()) return toast.error('Paste an SVG first');
    setBusy(true);
    try {
      const result = await api.validate(svgInput);
      setValidation(result);
      if (result.valid) {
        toast.success('SVG is valid');
      } else {
        toast.error(`${result.errors.length} error(s) found`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }, [svgInput]);

  const handleRender = useCallback(async () => {
    if (!svgInput.trim()) return toast.error('Paste an SVG first');
    setBusy(true);
    try {
      const [renderResult] = await Promise.all([api.render(svgInput)]);
      setPreviewPng(renderResult.data);
      setPreviewSvg(svgInput);
      setViewMode('png');
      toast.success(`Rendered (${renderResult.size_bytes} bytes)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }, [svgInput]);

  const handleSave = useCallback(async () => {
    if (!svgInput.trim()) return;
    const name = prompt('Name for this SVG:', 'untitled.svg')?.trim();
    if (!name) return;
    try {
      const record = await api.saveSvg({ name, svg_content: svgInput });
      toast.success(`Saved as "${record.name}"`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [svgInput]);

  const handleClear = () => {
    setSvgInput('');
    setPreviewSvg(null);
    setPreviewPng(null);
    setValidation(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(svgInput);
    toast.success('Copied');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Preview</h1>
          <p className="text-sm text-gray-500">Render and validate SVG</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleValidate} disabled={busy || !svgInput}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Validate
          </button>
          <button onClick={handleRender} disabled={busy || !svgInput}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
            Render
          </button>
          <button onClick={handleSave} disabled={!svgInput}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            Save
          </button>
          <button onClick={handleCopy} disabled={!svgInput}
            className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors">
            Copy
          </button>
          <button onClick={handleClear}
            className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <div className="bg-gray-900 rounded-lg border border-gray-800 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 font-medium">SOURCE</span>
          </div>
          <textarea
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            placeholder='<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">...</svg>'
            className="flex-1 w-full bg-gray-800 text-gray-200 p-3 font-mono text-xs resize-none focus:outline-none placeholder-gray-600"
          />
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">PREVIEW</span>
            {(previewPng) && (
              <div className="flex gap-1">
                <button onClick={() => setViewMode('svg')}
                  className={`text-xs px-2 py-0.5 rounded ${viewMode === 'svg' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  SVG
                </button>
                <button onClick={() => setViewMode('png')}
                  className={`text-xs px-2 py-0.5 rounded ${viewMode === 'png' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  PNG
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-800/50 overflow-auto">
            {previewPng && viewMode === 'png' ? (
              <img src={previewPng} alt="SVG Preview" className="max-w-full max-h-full object-contain p-4" />
            ) : previewSvg ? (
              <div className="w-full h-full p-4 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: previewSvg }} />
            ) : (
              <p className="text-gray-600 text-sm">Render to see preview</p>
            )}
          </div>
        </div>
      </div>

      {validation && (
        <div className={`rounded-lg p-3 border ${validation.valid ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
          <p className={`text-sm font-medium ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
            {validation.valid ? 'SVG is valid' : `${validation.errors.length} error(s)`}
          </p>
          {validation.errors.map((e, i) => (
            <div key={i} className="text-xs text-red-300 mt-1 font-mono">
              [{e.code}] L{e.line}:{e.column} — {e.message}
            </div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={i} className="text-xs text-yellow-400 mt-1">⚠ {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
