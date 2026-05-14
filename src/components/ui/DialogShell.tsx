import { useEffect, type ReactNode } from 'react'

interface DialogShellProps {
  title: string
  width?: string
  maxHeight?: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export default function DialogShell({
  title,
  width = 'w-[520px]',
  maxHeight = 'max-h-[80vh]',
  onClose,
  footer,
  children,
}: DialogShellProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div role="dialog" className={`bg-background rounded-lg border shadow-lg ${width} ${maxHeight} flex flex-col`}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">{title}</span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClose}>✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4 text-sm">
          {children}
        </div>
        {footer}
      </div>
    </div>
  )
}
