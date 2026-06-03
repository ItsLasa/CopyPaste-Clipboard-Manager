import type { ClipType } from '@shared/types'
import {
  FileText, Link, Palette, Code, Mail, FileImage,
} from 'lucide-react'

const TYPE_LABELS: { type: ClipType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { type: 'text', label: 'Text', icon: FileText },
  { type: 'url', label: 'Links', icon: Link },
  { type: 'color', label: 'Colors', icon: Palette },
  { type: 'code', label: 'Code', icon: Code },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'image', label: 'Images', icon: FileImage },
  { type: 'file', label: 'Files', icon: FileText },
]

interface FilterChipsProps {
  selected: ClipType | null
  onChange: (type: ClipType | null) => void
}

export function FilterChips({ selected, onChange }: FilterChipsProps): React.JSX.Element {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TYPE_LABELS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => onChange(selected === type ? null : type)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-pill transition-colors whitespace-nowrap ${
            selected === type
              ? 'bg-accent text-white'
              : 'bg-bg text-fg-muted hover:text-fg hover:bg-bg-elevated'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}
