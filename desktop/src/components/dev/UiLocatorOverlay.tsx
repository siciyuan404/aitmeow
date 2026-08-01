import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';

interface LocatorInfo {
  element: Element;
  tag: string;
  selector: string;
  text: string;
  role: string;
  label: string;
  className: string;
  rect: DOMRect;
  point: { x: number; y: number };
}

function escapeCss(value: string) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function getClassName(element: Element) {
  return typeof element.className === 'string' ? element.className : '';
}

function getElementText(element: Element) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

function getElementLabel(element: Element) {
  return (
    element.getAttribute('aria-label')
    || element.getAttribute('title')
    || element.getAttribute('alt')
    || ''
  );
}

function getElementSelector(element: Element) {
  if (element.id) {
    return `#${escapeCss(element.id)}`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && parts.length < 6) {
    const tag = current.tagName.toLowerCase();
    const testId = current.getAttribute('data-testid') || current.getAttribute('data-test-id');
    let part = tag;

    if (current.id) {
      part = `#${escapeCss(current.id)}`;
      parts.unshift(part);
      break;
    }

    if (testId) {
      part += `[data-testid="${testId.replace(/"/g, '\\"')}"]`;
    } else {
      const classes = getClassName(current)
        .split(/\s+/)
        .filter(Boolean)
        .filter((name) => !name.includes('[') && !name.includes(':'))
        .slice(0, 3);

      if (classes.length > 0) {
        part += `.${classes.map(escapeCss).join('.')}`;
      }
    }

    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const currentTag = current.tagName;
      const sameTagSiblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === currentTag,
      );
      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    current = parent;
  }

  return parts.join(' > ');
}

function buildLocatorInfo(element: Element, point: { x: number; y: number }): LocatorInfo {
  return {
    element,
    tag: element.tagName.toLowerCase(),
    selector: getElementSelector(element),
    text: getElementText(element),
    role: element.getAttribute('role') || '',
    label: getElementLabel(element),
    className: getClassName(element),
    rect: element.getBoundingClientRect(),
    point,
  };
}

function getElementPoint(element: Element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
}

function formatLocatorInfo(info: LocatorInfo) {
  return [
    `selector: ${info.selector}`,
    `tag: ${info.tag}`,
    info.role ? `role: ${info.role}` : null,
    info.label ? `label: ${info.label}` : null,
    info.text ? `text: ${info.text}` : null,
    info.className ? `class: ${info.className}` : null,
    `rect: x=${Math.round(info.rect.x)}, y=${Math.round(info.rect.y)}, width=${Math.round(info.rect.width)}, height=${Math.round(info.rect.height)}`,
  ].filter(Boolean).join('\n');
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function UiLocatorOverlay() {
  const uiLocatorEnabled = useSettingsStore((state) => state.uiLocatorEnabled);
  const [info, setInfo] = useState<LocatorInfo | null>(null);
  const [picking, setPicking] = useState(false);
  const [childReturnStack, setChildReturnStack] = useState<Element[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('ui-locator-active', uiLocatorEnabled && picking);
    if (!uiLocatorEnabled) {
      setInfo(null);
      setPicking(false);
    }

    return () => {
      document.documentElement.classList.remove('ui-locator-active');
    };
  }, [uiLocatorEnabled, picking]);

  useEffect(() => {
    if (!uiLocatorEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPicking(false);
        return;
      }

      if (event.key === 'Control' && !event.repeat) {
        setPicking(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [uiLocatorEnabled]);

  useEffect(() => {
    if (!uiLocatorEnabled || !picking) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-ui-locator-ignore="true"]')) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setInfo(buildLocatorInfo(target, { x: event.clientX, y: event.clientY }));
      setChildReturnStack([]);
      setPicking(false);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [uiLocatorEnabled, picking]);

  const panelPosition = useMemo(() => {
    if (!info) return { left: 0, top: 0 };

    const width = 360;
    const height = 300;
    return {
      left: Math.max(16, Math.min(info.point.x + 14, window.innerWidth - width - 16)),
      top: Math.max(16, Math.min(info.point.y + 14, window.innerHeight - height - 16)),
    };
  }, [info]);

  const copiedText = info ? formatLocatorInfo(info) : '';

  const handleCopy = async () => {
    if (!copiedText) return;

    try {
      await copyText(copiedText);
      toast.success('UI 定位信息已复制');
    } catch (err) {
      const message = err instanceof Error ? err.message : '复制失败';
      toast.error(message);
    }
  };

  const selectElement = (element: Element, nextStack = childReturnStack) => {
    setInfo(buildLocatorInfo(element, getElementPoint(element)));
    setChildReturnStack(nextStack);
  };

  const handleSelectParent = () => {
    if (!info?.element.parentElement || info.element.parentElement === document.body) return;

    selectElement(info.element.parentElement, [info.element, ...childReturnStack]);
  };

  const handleSelectChild = () => {
    if (!info) return;

    const [previousChild, ...rest] = childReturnStack;
    if (previousChild && info.element.contains(previousChild)) {
      selectElement(previousChild, rest);
      return;
    }

    const firstChild = info.element.firstElementChild;
    if (firstChild) {
      selectElement(firstChild, []);
    }
  };

  if (!uiLocatorEnabled) return null;

  return (
    <>
      <style>
        {`
          html.ui-locator-active body * {
            outline: 1px dashed rgba(37, 99, 235, 0.32);
            outline-offset: -1px;
          }

          html.ui-locator-active body *:hover {
            outline: 2px solid rgba(37, 99, 235, 0.85);
            outline-offset: -2px;
          }

          html.ui-locator-active [data-ui-locator-ignore="true"],
          html.ui-locator-active [data-ui-locator-ignore="true"] * {
            outline: none !important;
          }
        `}
      </style>

      {!picking && (
        <div
          data-ui-locator-ignore="true"
          className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-lg"
        >
          按 Ctrl 开始 UI 定位
        </div>
      )}

      {info && (
        <div
          data-ui-locator-ignore="true"
          className="pointer-events-none fixed rounded-md border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: info.rect.left,
            top: info.rect.top,
            width: info.rect.width,
            height: info.rect.height,
            zIndex: 70,
          }}
        />
      )}

      {info && (
        <div
          data-ui-locator-ignore="true"
          className="fixed w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          style={{ left: panelPosition.left, top: panelPosition.top, zIndex: 80 }}
        >
          <div className="flex h-11 items-center justify-between border-b border-slate-200 px-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">UI 定位信息</div>
              <div className="truncate text-[11px] text-slate-500">{info.tag}</div>
            </div>
            <button
              type="button"
              onClick={() => setInfo(null)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="关闭"
              aria-label="关闭 UI 定位信息"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[290px] space-y-3 overflow-y-auto p-3">
            <div>
              <div className="mb-1 text-[11px] font-medium text-slate-500">CSS Selector</div>
              <code className="block break-all rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-700">
                {info.selector}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoCell label="尺寸" value={`${Math.round(info.rect.width)} x ${Math.round(info.rect.height)}`} />
              <InfoCell label="位置" value={`${Math.round(info.rect.x)}, ${Math.round(info.rect.y)}`} />
              <InfoCell label="Role" value={info.role || '-'} />
              <InfoCell label="Label" value={info.label || '-'} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSelectParent}
                disabled={!info.element.parentElement || info.element.parentElement === document.body}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一层
              </button>
              <button
                type="button"
                onClick={handleSelectChild}
                disabled={childReturnStack.length === 0 && !info.element.firstElementChild}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一层
              </button>
            </div>

            {info.text && (
              <div>
                <div className="mb-1 text-[11px] font-medium text-slate-500">文本</div>
                <div className="max-h-16 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                  {info.text}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              复制定位信息
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-xs text-slate-800">{value}</div>
    </div>
  );
}
