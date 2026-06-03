import type { Clip } from '@shared/types'

interface Api {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, callback: (...args: unknown[]) => void): () => void
  send(channel: string, ...args: unknown[]): void
}

interface IpcApi {
  clips: {
    query: (params: { limit?: number; offset?: number; type?: string; search?: string }) => Promise<Clip[]>
    delete: (id: number) => Promise<{ ok: boolean }>
    pin: (id: number, pinned: boolean) => Promise<{ ok: boolean }>
    use: (id: number) => Promise<{ ok: boolean }>
    count: () => Promise<number>
  }
}

declare global {
  interface Window {
    api: Api
  }
}
