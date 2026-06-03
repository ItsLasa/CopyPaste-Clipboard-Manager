import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Command, Clock, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const steps = [
  {
    title: 'Welcome to Clipboard Manager',
    subtitle: 'Your local-first clipboard history',
    icon: Zap,
    description:
      'Every time you copy text, links, colors, code, or images, they\'re saved here — privately, on your device. Nothing leaves your computer.',
  },
  {
    title: 'Quick Access Hotkeys',
    subtitle: 'Speed up your workflow',
    icon: Command,
    description: '',
    hotkeys: [
      ['Ctrl+Alt+V', 'Quick Paste — search & paste any clip'],
      ['Ctrl+Alt+L', 'Toggle the Library window'],
      ['Ctrl+Alt+S', 'Capture a screenshot region'],
      ['Ctrl+Alt+0–9', 'Paste one of your last 10 clips'],
    ],
  },
  {
    title: 'Pause When You Need',
    subtitle: 'Control when clips are saved',
    icon: Clock,
    description:
      'Clipboard Manager can pause capturing when you\'re handling sensitive information. Press the pause button in the top bar, or set a schedule in Settings.',
  },
]

export function App(): React.JSX.Element {
  const [step, setStep] = useState(0)

  const handleFinish = (): void => {
    window.api.invoke('onboarding:complete')
    window.api.send('window:hide', 'onboarding')
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-end px-4 py-2 min-h-[36px]">
        <button
          onClick={handleFinish}
          className="no-drag text-xs text-fg-muted hover:text-fg px-2 py-1 rounded"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            {/* Icon */}
            {(() => {
              const Icon = steps[step].icon
              return (
                <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mb-6">
                  <Icon size={28} className="text-accent" />
                </div>
              )
            })()}

            <h1 className="text-xl font-semibold text-fg mb-1 tracking-tight">
              {steps[step].title}
            </h1>
            <p className="text-sm text-fg-muted mb-6">{steps[step].subtitle}</p>

            {/* Hotkeys table (step 1) */}
            {steps[step].hotkeys ? (
              <div className="w-full space-y-2 mb-6">
                {steps[step].hotkeys.map(([key, desc]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-card border border-border"
                  >
                    <code className="text-xs bg-bg px-2 py-1 rounded text-accent font-mono">
                      {key}
                    </code>
                    <span className="text-xs text-fg-muted">{desc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg-muted leading-relaxed max-w-sm mb-6">
                {steps[step].description}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-border">
        {/* Dots */}
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-accent' : 'bg-fg-subtle/30'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2 text-xs text-fg-muted hover:text-fg border border-border rounded-pill hover:bg-bg-elevated transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-4 py-2 text-xs bg-accent text-white rounded-pill hover:bg-accent-hover transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1 px-4 py-2 text-xs bg-accent text-white rounded-pill hover:bg-accent-hover transition-colors"
            >
              <Check size={14} /> Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
