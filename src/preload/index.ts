import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
      callback(...args)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },
  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // @ts-expect-error define in dts
  window.api = api
}
