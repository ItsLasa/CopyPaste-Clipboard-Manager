export function CodeBlock({ code }: { code: string }): React.JSX.Element {
  const lines = code.split('\n').slice(0, 6)

  return (
    <div className="overflow-hidden rounded-lg bg-bg border border-border">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
      </div>
      <pre className="p-3 text-xs font-mono text-fg-muted leading-relaxed overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className="truncate">
            <span className="text-fg-subtle select-none mr-3">{i + 1}</span>
            {line || ' '}
          </div>
        ))}
        {code.split('\n').length > 6 && (
          <div className="text-fg-subtle">… +{code.split('\n').length - 6} more lines</div>
        )}
      </pre>
    </div>
  )
}
