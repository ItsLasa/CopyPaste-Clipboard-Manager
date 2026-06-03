import { create } from 'zustand'

interface UiState {
  isCapturePaused: boolean
  sidebarCollapsed: boolean
  preferredTheme: 'system' | 'dark' | 'light'

  setCapturePaused: (paused: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setPreferredTheme: (theme: 'system' | 'dark' | 'light') => void
}

export const useUiStore = create<UiState>((set) => ({
  isCapturePaused: false,
  sidebarCollapsed: false,
  preferredTheme: 'system',

  setCapturePaused: (isCapturePaused) => set({ isCapturePaused }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setPreferredTheme: (preferredTheme) => set({ preferredTheme }),
}))
