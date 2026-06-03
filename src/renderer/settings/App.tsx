import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { motion } from 'framer-motion'

interface AppSettings {
  sensitiveMode: 'mark' | 'skip' | 'store'
  retentionMax: number
  theme: 'system' | 'dark' | 'light'
  licenseKey: string | null
  hotkeys: Record<string, string>
}

const hotkeyLabels: [string, string][] = [
  ['Ctrl+Alt+V', 'Quick Paste Overlay'],
  ['Ctrl+Alt+L', 'Toggle Library'],
  ['Ctrl+Alt+S', 'Screenshot Region'],
  ...Array.from({ length: 10 }, (_, i) => [`Ctrl+Alt+${i}`, `Slot ${i}`]),
]

export function App(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({
    sensitiveMode: 'mark',
    retentionMax: 5000,
    theme: 'system',
    licenseKey: null,
    hotkeys: {},
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.invoke('settings:get').then((s) => {
      if (s) setSettings(s as AppSettings)
    })
  }, [])

  const handleSave = async (): Promise<void> => {
    await window.api.invoke('settings:set', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-4 py-2 border-b border-border min-h-[42px]">
        <h1 className="text-sm font-semibold text-fg">Settings</h1>
        <div className="no-drag flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Save size={12} /> Saved
            </span>
          )}
          <button
            onClick={() => window.api.send('window:hide', 'settings')}
            className="p-1 rounded hover:bg-bg-elevated text-fg-muted"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Hotkeys */}
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Hotkeys</h2>
          <div className="space-y-2">
            {hotkeyLabels.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-card border border-border">
                <span className="text-sm text-fg">{label}</span>
                <code className="text-xs bg-bg px-2 py-1 rounded text-accent font-mono">{key}</code>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-fg-subtle mt-2">Hotkey rebinding coming in a future update.</p>
        </section>

        {/* Sensitive content */}
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Sensitive Content</h2>
          <div className="space-y-2">
            {[
              { value: 'mark' as const, label: 'Mark as sensitive', desc: 'Store but flag content from password managers' },
              { value: 'skip' as const, label: 'Skip capture', desc: 'Don\'t store sensitive clipboard content' },
              { value: 'store' as const, label: 'Store normally', desc: 'Capture all content without filtering' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-card border cursor-pointer transition-colors ${
                  settings.sensitiveMode === opt.value
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border bg-bg-elevated hover:border-border/60'
                }`}
              >
                <input
                  type="radio"
                  name="sensitive"
                  value={opt.value}
                  checked={settings.sensitiveMode === opt.value}
                  onChange={() => update('sensitiveMode', opt.value)}
                  className="mt-0.5 accent-accent"
                />
                <div>
                  <p className="text-sm text-fg">{opt.label}</p>
                  <p className="text-xs text-fg-subtle mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Retention */}
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Retention</h2>
          <div className="px-3 py-3 bg-bg-elevated rounded-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg">Maximum clips</span>
              <span className="text-sm font-mono text-accent">{settings.retentionMax.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={settings.retentionMax}
              onChange={(e) => update('retentionMax', parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-fg-subtle">100</span>
              <span className="text-[10px] text-fg-subtle">10,000</span>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Appearance</h2>
          <div className="flex gap-2">
            {([
              { value: 'system' as const, label: 'System' },
              { value: 'dark' as const, label: 'Dark' },
              { value: 'light' as const, label: 'Light' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => update('theme', opt.value)}
                className={`px-4 py-2 text-xs rounded-pill transition-colors ${
                  settings.theme === opt.value
                    ? 'bg-accent text-white'
                    : 'bg-bg-elevated text-fg-muted border border-border hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* License */}
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">License</h2>
          <div className="px-3 py-3 bg-bg-elevated rounded-card border border-border">
            <p className="text-xs text-fg-muted mb-2">
              Free tier: last 50 clips. Enter a license key for unlimited history.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.licenseKey ?? ''}
                onChange={(e) => update('licenseKey', e.target.value || null)}
                placeholder="Enter license key…"
                className="flex-1 bg-bg px-3 py-1.5 text-sm text-fg rounded-card border border-border outline-none focus:border-accent placeholder:text-fg-subtle"
              />
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-accent text-white text-xs font-medium rounded-pill hover:bg-accent-hover transition-colors"
              >
                Activate
              </button>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-card hover:bg-accent-hover transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
