import { useEffect, useCallback, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import {
  Inbox, Pin, Image, Type, Link, Palette, Code, Mail, FileText,
  Settings, Pause, Play, Menu,
} from 'lucide-react'
import type { Clip, ClipType } from '@shared/types'
import { useClipsStore } from '@renderer/store/clipsStore'
import { useUiStore } from '@renderer/store/uiStore'
import { useTheme } from '@renderer/hooks/useTheme'
import { ClipCard } from '@renderer/components/ClipCard'
import { SearchBar } from '@renderer/components/SearchBar'
import { FilterChips } from '@renderer/components/FilterChips'

const SIDEBAR_ITEMS = [
  { id: 'all' as const, label: 'All Clips', icon: Inbox },
  { id: 'pinned' as const, label: 'Pinned', icon: Pin },
]

const TYPE_ITEMS: { type: ClipType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Images', icon: Image },
  { type: 'url', label: 'Links', icon: Link },
  { type: 'color', label: 'Colors', icon: Palette },
  { type: 'code', label: 'Code', icon: Code },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'file', label: 'Files', icon: FileText },
]

const COLUMN_WIDTH = 200
const CARD_HEIGHT = 160
const MIN_COLUMNS = 3
const GAP = 12

export function App(): React.JSX.Element {
  useTheme()

  const {
    clips, filterType, filterPinned, searchQuery,
    setClips, addClip, removeClip, updateClip, setFilterType, setFilterPinned, setSearchQuery,
  } = useClipsStore()
  const { isCapturePaused, setCapturePaused, sidebarCollapsed, setSidebarCollapsed } = useUiStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)

  useEffect(() => {
    const updateWidth = (): void => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [sidebarCollapsed])

  const columns = Math.max(MIN_COLUMNS, Math.floor((containerWidth - 16) / (COLUMN_WIDTH + GAP)))
  const rows = Math.ceil(clips.length / columns)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  })

  // Load clips
  const loadClips = useCallback(async () => {
    try {
      const result = await window.api.invoke('clips:query', {
        limit: 500,
        offset: 0,
        type: filterType ?? undefined,
      })
      setClips(result as Clip[])
    } catch {
      // error state handled by empty/loading UI
    }
  }, [filterType, setClips])

  useEffect(() => {
    loadClips()
  }, [loadClips])

  // Real-time IPC listeners
  useEffect(() => {
    const unsub1 = window.api.on('clip:added', (clip: unknown) => {
      addClip(clip as Clip)
    })
    const unsub2 = window.api.on('clip:updated', (clip: unknown) => {
      updateClip(clip as Clip)
    })
    const unsub3 = window.api.on('clip:deleted', (id: unknown) => {
      removeClip(id as number)
    })
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [addClip, updateClip, removeClip])

  const handlePin = async (id: number): Promise<void> => {
    const clip = clips.find((c) => c.id === id)
    if (!clip) return
    await window.api.invoke('clips:pin', id, !clip.isPinned)
    updateClip({ ...clip, isPinned: !clip.isPinned })
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.invoke('clips:delete', id)
    removeClip(id)
  }

  const handleCopy = async (id: number): Promise<void> => {
    await window.api.invoke('clips:use', id)
  }

  const handleToggleCapture = async (): Promise<void> => {
    if (isCapturePaused) {
      await window.api.invoke('capture:resume')
    } else {
      await window.api.invoke('capture:pause')
    }
    setCapturePaused(!isCapturePaused)
  }

  // Filter clips by search and pinned
  const filteredClips = clips.filter((clip) => {
    if (filterPinned && !clip.isPinned) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const text = (clip.textValue ?? '').toLowerCase()
      const app = (clip.sourceApp ?? '').toLowerCase()
      if (!text.includes(q) && !app.includes(q)) return false
    }
    return true
  })

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Top bar */}
      <div className="drag-region flex items-center justify-between px-4 py-2 border-b border-border min-h-[42px]">
        <div className="flex items-center gap-3 no-drag">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-fg transition-colors"
          >
            <Menu size={18} />
          </button>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by content or app…"
          />
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button
            onClick={handleToggleCapture}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-pill transition-colors ${
              isCapturePaused
                ? 'bg-danger/20 text-danger'
                : 'bg-accent-subtle text-accent'
            }`}
          >
            {isCapturePaused ? <Play size={13} /> : <Pause size={13} />}
            {isCapturePaused ? 'Resume' : 'Pause'}
          </button>
          <button className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-fg transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 0 : 180 }}
          className="border-r border-border overflow-hidden"
        >
          <div className="p-3 space-y-4" style={{ width: 180 }}>
            {/* Main items */}
            <div>
              <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider mb-1.5 px-2">
                Library
              </p>
              {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'pinned') {
                      setFilterPinned(!filterPinned)
                      setFilterType(null)
                    } else {
                      setFilterPinned(false)
                      setFilterType(null)
                    }
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-lg transition-colors ${
                    (id === 'all' && !filterPinned && !filterType) ||
                    (id === 'pinned' && filterPinned)
                      ? 'bg-accent-subtle text-accent'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-elevated'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* By Type */}
            <div>
              <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider mb-1.5 px-2">
                By Type
              </p>
              {TYPE_ITEMS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(filterType === type ? null : type)
                    setFilterPinned(false)
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-lg transition-colors ${
                    filterType === type
                      ? 'bg-accent-subtle text-accent'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-elevated'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* Main content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4"
          style={{ height: 'calc(100vh - 42px)' }}
        >
          {/* Filter chips row */}
          <div className="mb-3">
            <FilterChips selected={filterType} onChange={setFilterType} />
          </div>

          {/* Empty state */}
          {filteredClips.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <Inbox size={48} className="text-fg-subtle mb-4" />
              <p className="text-fg-muted text-sm mb-1">
                {searchQuery
                  ? 'No clips match your search'
                  : filterType
                    ? 'No clips of this type yet'
                    : filterPinned
                      ? 'No pinned clips yet'
                      : 'No clips yet'}
              </p>
              <p className="text-fg-subtle text-xs">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start copying to build your clipboard history'}
              </p>
            </div>
          )}

          {/* Virtualized grid */}
          {filteredClips.length > 0 && (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index
                const rowClips = filteredClips.slice(
                  rowIndex * columns,
                  rowIndex * columns + columns
                )

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex gap-3"
                  >
                    {Array.from({ length: columns }).map((_, colIndex) => {
                      const clip = rowClips[colIndex]
                      if (!clip) {
                        return <div key={colIndex} style={{ width: COLUMN_WIDTH }} />
                      }
                      return (
                        <div key={clip.id} style={{ width: COLUMN_WIDTH }}>
                          <ClipCard
                            clip={clip}
                            onPin={handlePin}
                            onDelete={handleDelete}
                            onCopy={handleCopy}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {/* Skeleton loader */}
          {clips.length === 0 && filteredClips.length === 0 && (
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-bg-elevated rounded-card border border-border h-[160px] animate-pulse"
                  style={{ width: COLUMN_WIDTH }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
