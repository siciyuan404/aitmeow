import { useEffect } from 'react';
import type { TemplateDefinition } from '@/types/template';
import { useTemplateImportExport } from '../hooks/useTemplateImportExport';

interface TemplateContextMenuProps {
  template: TemplateDefinition;
  x: number;
  y: number;
  onClose: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onSetReference?: () => void;
}

export default function TemplateContextMenu({
  template,
  x,
  y,
  onClose,
  onEdit,
  onCopy,
  onDelete,
  onExport,
  onSetReference,
}: TemplateContextMenuProps) {
  const { exportToJSON } = useTemplateImportExport();

  // Handle export with built-in functionality
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      exportToJSON(template);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClick = () => onClose();
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  // 边界检测
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
  };

  const menuItems = [
    { icon: '✏️', label: '编辑模板', onClick: onEdit },
    { icon: '📋', label: '复制模板', onClick: onCopy },
    { icon: '🗑️', label: '删除模板', onClick: onDelete, danger: true },
    { divider: true },
    { icon: '📤', label: '导出 JSON', onClick: handleExport },
    { icon: '📌', label: '设为参考', onClick: onSetReference },
  ];

  return (
    <div
      style={menuStyle}
      className="bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[180px]"
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} className="h-px bg-slate-200 my-1" />;
        }

        if (!item.onClick) return null;

        return (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick?.();
              onClose();
            }}
            className={`
              w-full text-left px-4 py-2 text-sm flex items-center gap-3
              ${item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
