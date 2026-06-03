import { create } from 'zustand'
import type { Clip, ClipType } from '@shared/types'

interface ClipsState {
  clips: Clip[]
  filterType: ClipType | null
  filterPinned: boolean
  searchQuery: string
  loading: boolean
  offset: number
  hasMore: boolean

  setClips: (clips: Clip[]) => void
  addClip: (clip: Clip) => void
  removeClip: (id: number) => void
  updateClip: (clip: Clip) => void
  setFilterType: (type: ClipType | null) => void
  setFilterPinned: (pinned: boolean) => void
  setSearchQuery: (query: string) => void
  setLoading: (loading: boolean) => void
  setOffset: (offset: number) => void
  setHasMore: (hasMore: boolean) => void
  reset: () => void
}

export const useClipsStore = create<ClipsState>((set) => ({
  clips: [],
  filterType: null,
  filterPinned: false,
  searchQuery: '',
  loading: false,
  offset: 0,
  hasMore: true,

  setClips: (clips) => set({ clips }),
  addClip: (clip) =>
    set((state) => ({
      clips: [clip, ...state.clips.slice(0, 499)],
    })),
  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
    })),
  updateClip: (clip) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === clip.id ? clip : c)),
    })),
  setFilterType: (filterType) => set({ filterType, offset: 0 }),
  setFilterPinned: (filterPinned) => set({ filterPinned, offset: 0 }),
  setSearchQuery: (searchQuery) => set({ searchQuery, offset: 0 }),
  setLoading: (loading) => set({ loading }),
  setOffset: (offset) => set({ offset }),
  setHasMore: (hasMore) => set({ hasMore }),
  reset: () => set({ clips: [], offset: 0, hasMore: true }),
}))
