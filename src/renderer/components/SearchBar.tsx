import { useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search clips…' }: SearchBarProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg rounded-card border border-border w-full max-w-md">
      <Search size={16} className="text-fg-subtle shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-fg text-sm outline-none placeholder:text-fg-subtle"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-fg-subtle hover:text-fg p-0.5 rounded">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
