export function ColorSwatch({ color }: { color: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg shrink-0 border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-mono text-fg-muted uppercase">{color}</span>
    </div>
  )
}
