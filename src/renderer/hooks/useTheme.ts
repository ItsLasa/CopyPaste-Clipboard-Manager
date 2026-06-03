import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'

type Theme = 'system' | 'dark' | 'light'

export function useTheme(): void {
  const { preferredTheme } = useUiStore()

  useEffect(() => {
    applyTheme(preferredTheme)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      if (preferredTheme === 'system') {
        applyTheme(preferredTheme)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preferredTheme])
}

function applyTheme(theme: Theme): void {
  let resolved: 'dark' | 'light'
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    resolved = theme
  }
  document.documentElement.setAttribute('data-theme', resolved)
}
