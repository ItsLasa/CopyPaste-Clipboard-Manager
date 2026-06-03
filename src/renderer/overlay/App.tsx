import { useState, useEffect, useRef, useCallback } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Type, Link, Palette, Code, Mail, FileImage, FileText } from 'lucide-react'
import type { Clip, ClipType } from '@shared/types'

const typeIcons: Record<ClipType, React.FC<{ size?: number }>> = {
  text: FileText,
  url: Link,
  color: Palette,
  code: Code,
  email: Mail,
  json: Code,
  svg: FileImage,
  html: Code,
  image: FileImage,
  file: FileText,
}

const typeColors: Record<ClipType, string> = {
  text: '#A1A1AA',
  url: '#4FC3F7',
  color: '#CE93D8',
  code: '#7C5CFF',
  email: '#A5D6A7',
  json: '#FFD54F',
  svg: '#FF8A65',
  html: '#FF8A65',
  image: '#4DB6AC',
  file: '#A1A1AA',
}

const FILTER_TYPES: ClipType[] = ['text', 'url', 'color', 'code', 'email', 'image', 'file']

export function App(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filterType, setFilterType] = useState<ClipType | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const cleanup = window.api.on('overlay:shown', () => {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    })

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.api.send('window:hide', 'overlay')
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cleanup()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const performSearch = useCallback(
    async (q: string, type: ClipType | null) => {
      if (!q.trim() && !type) {
        const result = await window.api.invoke('clips:query', { limit: 20, offset: 0, type: type ?? undefined })
        setClips(result as Clip[])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await window.api.invoke('clips:search', {
          query: q,
          limit: 20,
          type: type ?? undefined,
        })
        setClips(result as Clip[])
      } catch {
        setClips([])
      }
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query, filterType)
    }, 80)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, filterType, performSearch])

  const handleSelect = (clip: Clip): void => {
    window.api.send('overlay:select', clip.id)
  }

  const formatPreview = (clip: Clip): string => {
    if (!clip.textValue) return ''
    return clip.textValue.length > 120 ? clip.textValue.slice(0, 120) + '…' : clip.textValue
  }

  const formatTime = (ts: number): string => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="h-screen flex items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-[700px] rounded-sheet bg-bg-elevated border border-border shadow-pop overflow-hidden">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-bg rounded-card">
            <Search size={16} className="text-fg-subtle shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search clips…"
              className="flex-1 bg-transparent text-fg text-sm outline-none placeholder:text-fg-subtle"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex((i) => Math.min(i + 1, clips.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const clip = clips[selectedIndex]
                  if (clip) {
                    handleSelect(clip)
                  }
                }
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-fg-subtle hover:text-fg p-0.5 rounded"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mt-2 px-1 overflow-x-auto">
            <button
              onClick={() => setFilterType(null)}
              className={`px-2.5 py-1 text-xs rounded-pill transition-colors ${
                filterType === null
                  ? 'bg-accent text-white'
                  : 'bg-bg text-fg-muted hover:text-fg'
              }`}
            >
              All
            </button>
            {FILTER_TYPES.map((type) => {
              const Icon = typeIcons[type]
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-pill transition-colors ${
                    filterType === type
                      ? 'bg-accent text-white'
                      : 'bg-bg text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon size={12} />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && clips.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-fg-subtle text-sm">
              {query ? 'No clips match your search' : 'No clips yet — start copying!'}
            </div>
          )}

          {!loading &&
            clips.map((clip, index) => {
              const Icon = typeIcons[clip.type] ?? FileText
              const color = typeColors[clip.type] ?? '#A1A1AA'
              return (
                <div
                  key={clip.id}
                  onClick={() => handleSelect(clip)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent-subtle'
                      : 'hover:bg-bg-subtle'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}22` }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">
                      {formatPreview(clip)}
                    </p>
                    {clip.sourceApp && (
                      <p className="text-xs text-fg-subtle mt-0.5">
                        {clip.sourceApp} · {formatTime(clip.createdAt)}
                      </p>
                    )}
                  </div>
                  {clip.isPinned && (
                    <span className="text-xs text-accent px-1.5 py-0.5 rounded bg-accent-subtle">
                      Pinned
                    </span>
                  )}
                </div>
              )
            })}
        </div>

        <div className="px-4 py-2 border-t border-border text-xs text-fg-subtle flex justify-between">
          <span>↑↓ Navigate · Enter to paste · Esc to close</span>
          <span>{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
