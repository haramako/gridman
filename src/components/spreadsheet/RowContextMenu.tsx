import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: never;
}

export interface ContextMenuSeparator {
  separator: true;
  label?: never;
  onClick?: never;
  disabled?: never;
  danger?: never;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface Props {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export default function RowContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className="min-w-36 bg-background border rounded shadow-lg py-1 text-sm"
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          // biome-ignore lint/suspicious/noArrayIndexKey: separator has no stable label
          return <div key={i} className="my-1 border-t" />;
        }
        const menuItem = item as ContextMenuItem;
        return (
          <button
            key={menuItem.label}
            type="button"
            disabled={menuItem.disabled}
            className={[
              'w-full text-left px-3 py-1.5 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed',
              menuItem.danger ? 'text-destructive hover:bg-destructive/10' : '',
            ].join(' ')}
            onClick={() => {
              menuItem.onClick();
              onClose();
            }}
          >
            {menuItem.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
