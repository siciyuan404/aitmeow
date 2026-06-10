import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, type ValidationResponse } from '@/services/api';

interface CenterPanelProps {
  templateParams: Record<string, string>;
  activeRules: Set<string>;
  onSaveSuccess: (id: string) => void;
}

export default function CenterPanel({ templateParams, activeRules, onSaveSuccess }: CenterPanelProps) {
  const [svgInput, setSvgInput] = useState('');
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'svg' | 'png'>('svg');
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const ruleNames = useCallback(() => {
    const map: Record<string, string> = { max_size: 'max_size', viewbox: 'viewbox', require_ids: 'require_ids' };
    return Array.from(activeRules).map((r) => map[r] || r).filter(Boolean);
  }, [activeRules]);

  const handleValidate = async () => {
    if (!svgInput.trim()) return toast.error('Paste an SVG first');
    setBusy(true);
    try {
      const r = await api.validate(svgInput, ruleNames());
      setValidation(r);
      toast(r.valid ? 'SVG is valid' : `${r.errors.length} error(s)`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleRender = async () => {
    if (!svgInput.trim()) return toast.error('Paste an SVG first');
    setBusy(true);
    try {
      const r = await api.render(svgInput);
      setPreviewPng(r.data);
      setPreviewSvg(svgInput);
      setViewMode('png');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleSave = async () => {
    if (!svgInput.trim()) return;
    const name = prompt('Name:', 'untitled.svg')?.trim();
    if (!name) return;
    try {
      const r = await api.saveSvg({ name, svg_content: svgInput });
      onSaveSuccess(r.id);
      toast.success(`Saved "${r.name}"`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(svgInput); toast.success('Copied'); };
  const handleClear = () => { setSvgInput(''); setPreviewSvg(null); setPreviewPng(null); setValidation(null); };

  return (
    <section className="flex-1 p-4 flex flex-col gap-3 overflow-hidden min-w-[400px]">
      <div className="bg-white border border-slate-200 rounded-2xl flex-1 min-h-0 relative shadow-sm flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          <button className="w-7 h-7 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-slate-800 text-xs flex items-center justify-center"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
          <button className="w-7 h-7 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-slate-800 text-xs flex items-center justify-center"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></button>
          <button className="w-7 h-7 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-slate-800 text-xs flex items-center justify-center"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg></button>
        </div>

        {previewPng && viewMode === 'png' ? (
          <img src={previewPng} alt="Preview" className="max-w-full max-h-full object-contain relative z-0" />
        ) : previewSvg ? (
          <div className="relative z-0 w-full h-full flex items-center justify-center p-4" dangerouslySetInnerHTML={{ __html: previewSvg }} />
        ) : (
          <p className="text-slate-400 text-sm z-0">Paste SVG or select a template to start</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 h-[200px] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">SVG Source</span>
          <button onClick={handleCopy} className="text-slate-400 hover:text-slate-600 p-1 rounded">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <textarea
          value={svgInput}
          onChange={(e) => setSvgInput(e.target.value)}
          placeholder='<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">...'
          className="flex-1 border border-slate-200 rounded-xl bg-slate-50/50 p-3 font-mono text-[11px] text-slate-600 resize-none focus:outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleValidate} disabled={busy || !svgInput}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          Validate
        </button>
        <button onClick={handleRender} disabled={busy || !svgInput}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Render
        </button>
        <button onClick={handleSave} disabled={!svgInput}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save
        </button>
        <button onClick={handleClear}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400 font-medium rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition-all">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {validation && (
        <div className={`rounded-xl p-2.5 px-3 border text-xs ${validation.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {validation.valid ? (
            <span>All {activeRules.size} rules passed. SVG is valid.</span>
          ) : (
            <div className="space-y-0.5">
              {validation.errors.map((e, i) => (
                <div key={i}>[{e.code}] L{e.line}:{e.column} — {e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
