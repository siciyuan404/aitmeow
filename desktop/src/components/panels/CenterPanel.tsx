import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api, type ValidationResponse } from '@/services/api';
import { wsClient } from '@/services/ws';

interface CenterPanelProps {
  templateParams: Record<string, string>;
  activeRules: Set<string>;
  selectedTemplateName: string | null;
  onSaveSuccess: (id: string) => void;
}

export default function CenterPanel({ templateParams, activeRules, selectedTemplateName, onSaveSuccess }: CenterPanelProps) {
  const [svgInput, setSvgInput] = useState('');
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'svg' | 'png'>('svg');
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ruleNames = useCallback(() => {
    const map: Record<string, string> = { max_size: 'max_size', viewbox: 'viewbox', require_ids: 'require_ids' };
    return Array.from(activeRules).map((r) => map[r] || r).filter(Boolean);
  }, [activeRules]);

  // 监听来自 Claude Code 的生成结果，自动填入并渲染
  useEffect(() => {
    let lastGenId = '';

    function applyGeneration(data: any) {
      const svg = data?.svg_content || '';
      if (!svg.trim()) return;
      // 去重：已消费过的 generation 不再处理
      if (data?.id && data.id === lastGenId) return;
      lastGenId = data?.id || 'consumed';

      setSvgInput(svg);
      setPreviewSvg(svg);
      api.render(svg).then(r => {
        setPreviewPng(r.data);
        setViewMode('png');
      }).catch(() => {
        setViewMode('svg');
      });

      // 非轮询触发的才弹 toast（WS 推送）
      if (!data?._poll) {
        toast.success('Claude Code 已生成 SVG');
      }

      // 消费后清空服务端的 pending_generation
      api.updateSessionState({ clear_pending: true }).catch((err: Error) => console.warn('清除 pending_generation 失败:', err.message));
    }

    // 1) 实时 WS 推送
    const unsubscribe = wsClient.on('GenerationReady', (data: any) => {
      applyGeneration(data);
    });

    // 2) 挂载后立即拉一次（处理事件先于组件挂载到达的情况）
    const pollPending = () => {
      api.sessionState().then((state) => {
        if (state.pending_generation?.svg_content) {
          applyGeneration({ ...state.pending_generation, _poll: true });
        }
      }).catch((err: Error) => console.warn('拉取 generation 失败:', err.message));
    };
    pollPending();

    // 3) WS 重连后重新拉取（处理断连期间事件丢失的情况）
    const unsubConnected = wsClient.on('connected', pollPending);

    return () => {
      unsubscribe();
      unsubConnected();
    };
  }, []);

  // 自动同步 SVG 编辑内容到服务端 Session（供 MCP Agent 读取）
  useEffect(() => {
    if (!svgInput.trim()) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      api.updateSessionState({
        pending_svg: svgInput,
        selected_template: selectedTemplateName,
        template_params: templateParams,
      }).catch((err: Error) => console.warn('同步 SVG 到 session 失败:', err.message));
    }, 800);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [svgInput, selectedTemplateName, templateParams]);

  const handleValidate = async () => {
    if (!svgInput.trim()) return toast.error('请先粘贴 SVG 代码');
    setBusy(true);
    try {
      const r = await api.validate(svgInput, ruleNames());
      setValidation(r);
      toast(r.valid ? '验证通过' : `${r.errors.length} 个错误`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleRender = async () => {
    if (!svgInput.trim()) return toast.error('请先粘贴 SVG 代码');
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
    const name = prompt('文件名:', 'untitled.svg')?.trim();
    if (!name) return;
    try {
      const r = await api.saveSvg({ name, svg_content: svgInput });
      onSaveSuccess(r.id);
      toast.success(`已保存 "${r.name}"`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(svgInput); toast.success('已复制'); };
  const handleClear = () => { setSvgInput(''); setPreviewSvg(null); setPreviewPng(null); setValidation(null); };

  return (
    <section className="flex-1 p-4 flex flex-col gap-3 overflow-hidden min-w-[400px]">
      <div className="bg-white border border-slate-200 rounded-2xl flex-1 min-h-0 relative shadow-sm flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />

        {/* TODO: zoom controls */}


        {previewPng && viewMode === 'png' ? (
          <img src={previewPng} alt="预览" className="max-w-full max-h-full object-contain relative z-0" />
        ) : previewSvg ? (
          <div className="relative z-0 w-full h-full flex items-center justify-center p-4" dangerouslySetInnerHTML={{ __html: previewSvg }} />
        ) : (
          <p className="text-slate-500 text-sm z-0">粘贴 SVG 代码或从左侧选择模板开始</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 h-[200px] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">SVG 源码</span>
          <button onClick={handleCopy} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors" title="复制">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <textarea
          value={svgInput}
          onChange={(e) => setSvgInput(e.target.value)}
          placeholder='<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">...'
          className="flex-1 border border-slate-200 rounded-xl bg-slate-50/50 p-3 font-mono text-[11px] text-slate-700 resize-none focus:outline-none focus:border-blue-400 transition-colors placeholder:text-slate-400"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleValidate} disabled={busy || !svgInput}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          验证
        </button>
        <button onClick={handleRender} disabled={busy || !svgInput}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          渲染
        </button>
        <button onClick={handleSave} disabled={!svgInput}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all flex-1 justify-center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          保存
        </button>
        <button onClick={handleClear}
          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 font-medium rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition-all" title="清空">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {validation && (
        <div className={`rounded-xl p-2.5 px-3 border text-xs ${validation.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {validation.valid ? (
            <span>{activeRules.size} 条规则全部通过，SVG 有效</span>
          ) : (
            <div className="space-y-0.5">
              {validation.errors.map((e, i) => (
                <div key={i}>[{e.code}] 第{e.line}行:{e.column}列 — {e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
