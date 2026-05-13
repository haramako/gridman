import { useState, useRef, useEffect } from 'react'

const ROW_HEIGHT = 28
const OVERSCAN = 5

export function useVirtualScroll(rowCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  )
  const topPad = startIndex * ROW_HEIGHT
  const bottomPad = Math.max(0, (rowCount - 1 - endIndex) * ROW_HEIGHT)

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return { containerRef, scrollTop, containerHeight, startIndex, endIndex, topPad, bottomPad, onScroll }
}

export { ROW_HEIGHT }
