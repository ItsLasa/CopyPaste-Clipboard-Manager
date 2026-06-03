import { UiohookKey } from 'uiohook-napi'
import { clipboard } from 'electron'
import { log } from '../logger'

let uiohook: { keyToggle: (key: number, state: 'down' | 'up') => void } | null = null

function getUiohook(): typeof uiohook {
  if (!uiohook) {
    try {
      const { uIOhook } = require('uiohook-napi')
      uiohook = uIOhook
    } catch (err) {
      log.error('Failed to load uiohook-napi:', err)
      uiohook = null
    }
  }
  return uiohook
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function pasteBack(): Promise<void> {
  const hook = getUiohook()
  if (!hook) {
    log.error('uiohook not available for paste-back')
    return
  }

  await sleep(60)

  hook.keyToggle(UiohookKey.Ctrl, 'down')
  hook.keyToggle(UiohookKey.V, 'down')
  await sleep(10)
  hook.keyToggle(UiohookKey.V, 'up')
  hook.keyToggle(UiohookKey.Ctrl, 'up')
}

export async function pasteText(text: string): Promise<void> {
  clipboard.writeText(text)
  await sleep(50)
  await pasteBack()
}
