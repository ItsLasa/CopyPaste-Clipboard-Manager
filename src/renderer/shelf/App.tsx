import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Link, Palette, Code, Mail, FileImage } from 'lucide-react'
import type { Clip, ClipType } from '@shared/types'

const typeIcons: Record<ClipType, React.FC<{ size?: number }>> = {
  text: FileText, url: Link, color: Palette, code: Code,
  email: Mail, json: Code, svg: FileImage, html: Code,
  image: FileImage, file: FileText,
}

function formatPreview(text: string | null): string {
  if (!text) return ''
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

export function App(): React.JSX.Element {
  const [clips, setClips] = useState<Clip[]>([])
  const [expanded, setExpanded] = useState(false)
  const hoveringRef = useRef(false)
  const expandedRef = useRef(false)

  const loadClips = useCallback(async () => {
    try {
      const result = await window.api.invoke('clips:query', { limit: 6, offset: 0 })
      setClips(result as Clip[])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadClips()

    const unsub = window.api.on('clip:added', () => {
      loadClips()
    })

    return () => { unsub() }
  }, [loadClips])

  const handleMouseEnter = (): void => {
    hoveringRef.current = true
    setExpanded(true)
  }

  const handleMouseLeave = (): void => {
    hoveringRef.current = false
    setTimeout(() => {
      if (!hoveringRef.current) {
        setExpanded(false)
      }
    }, 300)
  }

  const handleClipClick = async (clip: Clip): Promise<void> => {
    if (!expanded) return
    await window.api.invoke('overlay:select', clip.id)
  }

  const handleDragStart = (e: React.DragEvent, clip: Clip): void => {
    e.preventDefault()
    // Notify main process to handle drag via startDrag
    window.api.send('drag:start', { clipId: clip.id, blobPath: clip.blobPath })
  }

  return (
    <div
      className="relative w-full flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed pill — always visible */}
      <div
        className="w-full h-3 bg-bg-elevated/80 backdrop-blur-xl rounded-b-pill cursor-pointer border-b border-border/30"
        style={{ WebkitAppRegion: 'no-drag' }}
      />

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 84, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div
              className="w-full bg-bg-elevated/95 backdrop-blur-xl rounded-b-sheet border border-border/40 shadow-shelf"
              style={{ height: 84 }}
            >
              <div className="flex items-center gap-2 px-3 h-full">
                {clips.length === 0 && (
                  <div className="w-full text-center">
                    <p className="text-xs text-fg-subtle">No clips yet — start copying!</p>
                  </div>
                )}
                {clips.map((clip) => {
                  const Icon = typeIcons[clip.type] ?? FileText
                  return (
                    <div
                      key={clip.id}
                      onClick={() => handleClipClick(clip)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, clip)}
                      className="flex-shrink-0 w-[72px] p-1.5 rounded-card bg-bg hover:bg-bg-subtle cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-center w-full h-9 rounded-md bg-bg-subtle mb-1">
                        <Icon size={16} className="text-fg-muted group-hover:text-fg transition-colors" />
                      </div>
                      <p className="text-[10px] text-fg-muted truncate text-center leading-tight">
                        {formatPreview(clip.textValue)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
