# AGENTS.md — opencode build guide for the clipboard app

<aside>
📋

**How to use this file**

1. Create your project: `npm create @quick-start/electron@latest my-clipboard -- --template react-ts`
2. At the repo root, create a file named **`AGENTS.md`** and paste the entire code block below into it.
3. Open the project in VS Code. Launch opencode CLI in the integrated terminal.
4. Confirm DeepSeek v4 Pro is the active model: `opencode /model` (or however your build selects models).
5. Tell opencode: **"Read [AGENTS.md](http://AGENTS.md) and start with Task 1."** It will pick up the architecture, conventions, and the ordered task list.
6. Work task-by-task. After each task finishes, run `npm run dev` and verify the acceptance criteria *before* moving on. Don't let the agent skip ahead.
</aside>

<aside>
💡

**Why this works:** opencode treats `AGENTS.md` as standing context (same convention Aider, Claude Code, Cursor use). DeepSeek v4 Pro is strong on long-context instruction following, so a single dense, well-structured file beats fragmenting rules across multiple chat prompts.

</aside>

## The file (copy everything inside the code block)

```markdown
# AGENTS.md — Clipboard Manager (Windows-first Electron app)

> **For the AI coding agent:** This file is your single source of truth. Read it fully before writing any code. Follow the **Task Queue** at the bottom in strict order. After every task, stop and report; do not auto-advance.

---

## 0. Project mission

Build a local-first, privacy-respecting **clipboard history + screenshot manager** for Windows 10/11 in Electron. Visual / functional equivalent to category leaders (Paste, Supaste) but with our own brand, copy, and assets.

**Non-negotiables:**
- 100% local storage. Zero outbound network calls except auto-update + license check.
- Cold start < 1.5 s, idle RAM < 200 MB, hotkey → overlay visible < 100 ms.
- Win11-native feel: acrylic backdrops, rounded cards, system theme follow.
- One-time license, free tier capped at last 50 clips.

---

## 1. Locked tech stack (do NOT substitute without explicit approval)

| Layer | Choice |
|---|---|
| Shell | Electron 32+ |
| Scaffold | electron-vite |
| UI | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Animation | Framer Motion |
| Icons | Lucide React |
| State (renderer) | Zustand |
| IPC | Electron contextBridge with typed channels (see §6) |
| DB | better-sqlite3 + drizzle-orm |
| Search | SQLite FTS5 |
| Clipboard hook | `clipboard-event` (fallback: 750ms polling) |
| Keyboard hook | `uiohook-napi` |
| Foreground window | `active-win` |
| Global hotkeys | Electron `globalShortcut` |
| Screenshots | Electron `desktopCapturer` + custom region overlay |
| Auto-update | `electron-updater` |
| Packaging | `electron-builder` → NSIS + MSIX |
| Logging | `electron-log` (rotate daily) |

**Forbidden:** Redux, MobX, jQuery, Bootstrap, Material-UI, styled-components, axios (use `fetch`), moment.js (use `date-fns`), default exports for components.

---

## 2. Folder structure (canonical — do not deviate)

```

src/

main/                  # Electron main process (Node, has full OS access)

index.ts             # Entry: app lifecycle, single-instance lock

clipboard/

listener.ts        # clipboard-event subscription

classify.ts        # type classifier

sensitive.ts       # sensitive content detector

hash.ts            # SHA-256 of payloads

capture-service.ts # orchestrator

screenshots/

region-capture.ts  # Active region selector

file-watcher.ts    # Passive PrtScn watcher

db/

schema.ts          # Drizzle schema

client.ts          # better-sqlite3 instance + drizzle wrapper

migrations/        # Raw SQL migrations (FTS5 lives here)

queries.ts         # Reusable typed query functions

hotkeys/

index.ts           # globalShortcut registration

paste-back.ts      # uiohook Ctrl+V synthesis

windows/

library.ts         # Main app window factory

overlay.ts         # Quick-paste overlay factory

shelf.ts           # Top-center floating shelf factory

settings.ts        # Settings window factory

ipc/

handlers.ts        # ipcMain.handle registrations

events.ts           # webContents.send broadcast helpers

tray.ts              # System tray icon

autostart.ts         # Login-item registration

license.ts           # License key validation + safeStorage

logger.ts            # electron-log setup

preload/

index.ts             # contextBridge.exposeInMainWorld('api', …)

renderer/

library/             # Window: main app

App.tsx

main.tsx

index.html

overlay/             # Window: quick-paste

App.tsx

main.tsx

index.html

shelf/               # Window: floating shelf

App.tsx

main.tsx

index.html

settings/

…

onboarding/

…

components/          # SHARED across all windows

ClipCard.tsx

SearchBar.tsx

FilterChips.tsx

ColorSwatch.tsx

CodeBlock.tsx

ImageThumb.tsx

ui/                # shadcn primitives

hooks/

useClips.ts

useSearch.ts

useTheme.ts

store/               # Zustand

clipsStore.ts

uiStore.ts

settingsStore.ts

styles/

globals.css        # Tailwind + tokens

fonts.css

lib/

formatters.ts

hotkey-display.ts

shared/                # Types/constants used by BOTH main + renderer

types.ts             # Clip, Category, ClipType union

ipc-channels.ts      # IPC channel name constants

config.ts            # Default settings, retention defaults

resources/               # icons, tray PNGs, fonts

electron.vite.config.ts

electron-builder.yml

tailwind.config.ts

tsconfig.json

package.json

```

If a file's purpose doesn't match any existing folder, **ask before creating new top-level folders**.

---

## 3. Architecture diagram (reference only)

```

Windows OS

├─ Clipboard ──────┐

├─ ScreenCapture ─┬──────┐

├─ GlobalHotkeys ─┤      │

└─ ForegroundWin ─┤      │

v      v

CaptureService (main process)

│  │  │

│  │  └─> Classifier → Sensitive → DB write

│  └─────> File store (images on disk)

└───────> IPC broadcast "clip:added"

│

┌───────────────┼─────────────┐

v                v                v

Library window   Overlay window   Shelf window

(full UI)        (Ctrl+Alt+V)     (top-center)

```

Process model: **single Electron process**, multiple BrowserWindows. No background service.

---

## 4. Core data types (define in `src/shared/types.ts`)

```

export type ClipType =

| 'text' | 'url' | 'color' | 'code' | 'email' |
| --- | --- | --- | --- | --- |
| 'json' | 'svg' | 'html' | 'image' | 'file' |

export interface Clip {

id: number

contentHash: string

type: ClipType

textValue: string | null

blobPath: string | null     // relative to userData/blobs

sourceApp: string | null

sourceTitle: string | null

byteSize: number

isSensitive: boolean

isPinned: boolean

createdAt: number           // unix ms

lastUsedAt: number

useCount: number

categories?: number[]

}

export interface Category {

id: number

name: string

icon: string | null         // lucide icon name

color: string | null        // hex

sortOrder: number

}

export interface CapturePayload {

type: ClipType

text?: string

html?: string

imageBuffer?: Buffer

filePaths?: string[]

}

```

All IPC payloads must use these types. No `any`, no untyped objects crossing process boundaries.

---

## 5. Database (Drizzle + raw SQL for FTS5)

### Schema (`src/main/db/schema.ts`)

```

import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core'

export const clips = sqliteTable('clips', {

id:          integer('id').primaryKey({ autoIncrement: true }),

contentHash: text('content_hash').notNull(),

type:        text('type').notNull(),

textValue:   text('text_value'),

blobPath:    text('blob_path'),

sourceApp:   text('source_app'),

sourceTitle: text('source_title'),

byteSize:    integer('byte_size').notNull().default(0),

isSensitive: integer('is_sensitive', { mode: 'boolean' }).notNull().default(false),

isPinned:    integer('is_pinned', { mode: 'boolean' }).notNull().default(false),

createdAt:   integer('created_at').notNull(),

lastUsedAt:  integer('last_used_at').notNull(),

useCount:    integer('use_count').notNull().default(0),

})

export const categories = sqliteTable('categories', {

id:        integer('id').primaryKey({ autoIncrement: true }),

name:      text('name').notNull(),

icon:      text('icon'),

color:     text('color'),

sortOrder: integer('sort_order').notNull().default(0),

})

export const clipCategories = sqliteTable('clip_categories', {

clipId:     integer('clip_id').notNull(),

categoryId: integer('category_id').notNull(),

}, (t) => ({ pk: primaryKey({ columns: [t.clipId, t.categoryId] }) }))

```

### Indexes + FTS5 (raw SQL migration `001_init_fts.sql`)

```

CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clips_type    ON clips(type);

CREATE INDEX IF NOT EXISTS idx_clips_app     ON clips(source_app);

CREATE INDEX IF NOT EXISTS idx_clips_hash    ON clips(content_hash);

CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(

text_value, source_app, source_title,

content='clips', content_rowid='id'

);

CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN

INSERT INTO clips_fts(rowid, text_value, source_app, source_title)

VALUES ([new.id](http://new.id), new.text_value, new.source_app, new.source_title);

END;

CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN

INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)

VALUES('delete', [old.id](http://old.id), old.text_value, old.source_app, old.source_title);

END;

CREATE TRIGGER IF NOT EXISTS clips_au AFTER UPDATE ON clips BEGIN

INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)

VALUES('delete', [old.id](http://old.id), old.text_value, old.source_app, old.source_title);

INSERT INTO clips_fts(rowid, text_value, source_app, source_title)

VALUES ([new.id](http://new.id), new.text_value, new.source_app, new.source_title);

END;

```

DB file lives at `app.getPath('userData') + '/clips.db'`. Image/file blobs at `userData/blobs/YYYY/MM/<uuid>.<ext>`. **Never store binary in SQLite — always file-on-disk + path in DB.**

### Retention policy

On each insert, if `count(*) > 5000`, delete oldest non-pinned rows in batches of 100 until under the cap. Pinned rows are immune.

---

## 6. IPC contract (typed, exhaustive)

Define channel names as string constants in `src/shared/ipc-channels.ts`. **Never** use string literals at call sites.

```

export const IPC = {

// Renderer → Main (invoke / handle)

CLIPS_QUERY:        'clips:query',

CLIPS_DELETE:       'clips:delete',

CLIPS_PIN:          'clips:pin',

CLIPS_USE:          'clips:use',          // paste a specific clip

CATEGORIES_LIST:    'categories:list',

CATEGORIES_UPSERT:  'categories:upsert',

SETTINGS_GET:       'settings:get',

SETTINGS_SET:       'settings:set',

CAPTURE_PAUSE:      'capture:pause',

CAPTURE_RESUME:     'capture:resume',

WINDOW_HIDE:        'window:hide',

DRAG_START:         'drag:start',

// Main → Renderer (send)

CLIP_ADDED:         'clip:added',

CLIP_UPDATED:       'clip:updated',

CLIP_DELETED:       'clip:deleted',

CAPTURE_STATE:      'capture:state',

} as const

```

Preload exposes them on `window.api` with full TypeScript types. Renderer **never** imports from `electron`.

---

## 7. Window specs

### 7.1 Library window
- Size: 1200×780, resizable, minimum 900×600
- `frame: false`, `titleBarStyle: 'hidden'`, custom drag region
- `backgroundMaterial: 'acrylic'`, `transparent: false`
- Hidden on launch; shown only when user clicks tray or presses `Ctrl+Alt+L`

### 7.2 Quick-paste overlay
- Size: 720×480, **not resizable**, **not in taskbar**
- `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`
- `focusable: true` (must accept keyboard input)
- Centered on monitor of foreground window (use `screen.getDisplayNearestPoint(screen.getCursorScreenPoint())`)
- Closes on `Esc`, on blur, or after paste action
- **Paste-back flow** (canonical, do not deviate):
  1. On `Ctrl+Alt+V` press → store `prevForeground = activeWin()` BEFORE showing overlay
  2. Show overlay, focus search input
  3. User selects clip + presses Enter
  4. Write clip to system clipboard
  5. `overlay.hide()`
  6. Wait 60ms (focus settle) via `setTimeout`
  7. Synthesize `Ctrl+V` via `uiohook-napi` (Ctrl down → V tap → Ctrl up)
  8. Do NOT call `prevForeground.focus()` — hiding the overlay returns focus automatically on Windows

### 7.3 Shelf window
- Size: 520×96 (expanded), 520×12 (collapsed pill)
- Position: top-center of primary display, 8px from top edge
- `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`
- `focusable: false` (never steal focus from underlying apps)
- `setAlwaysOnTop(true, 'screen-saver')`
- Collapsed by default; expands on `mouseenter` of the pill area
- Disabled on multi-monitor secondary displays in v1 (primary only)
- Drag-out via `webContents.startDrag()` with `{ file, icon }`

### 7.4 Tray icon
- Light/dark icon variants in `resources/`
- Left-click: open Library
- Right-click: menu (Pause/Resume • Open Library • Settings • About • Quit)
- Tooltip shows current state ("Capturing" / "Paused")

---

## 8. Capture pipeline (the critical path)

```

clipboard event → listener.ts

↓

read formats in priority: file → image → html → text

↓

active-win() → sourceApp, sourceTitle

↓

capture-service.ingest(payload, source)

↓

hash.compute(payload) → contentHash

↓

if hash === lastInsertedHash: bump lastUsedAt, return

↓

classify.detectType(payload) → ClipType

↓

sensitive.check(payload, sourceApp) → boolean

↓

if sensitive AND user setting === 'skip': return

↓

if image/file: write to userData/blobs/…, get blobPath

↓

db.insert(clip)

↓

if count > 5000: prune oldest non-pinned

↓

BrowserWindow.getAllWindows().forEach(w => w.webContents.send(IPC.CLIP_ADDED, clip))

```

**Performance budget:** entire pipeline < 50 ms for text, < 200 ms for images.

---

## 9. Classification rules (deterministic, no ML)

Implement in `src/main/clipboard/classify.ts`. Check in this order; first match wins:

1. **file** — payload has `filePaths` array
2. **image** — payload has `imageBuffer`
3. **svg** — text trimmed starts with `<svg` or `<?xml` containing `<svg`
4. **json** — `JSON.parse` succeeds AND first non-whitespace char is `{` or `[`
5. **html** — payload has `html` AND text contains `<` and `>`
6. **url** — `URL` constructor succeeds AND protocol in `{http:, https:, ftp:, file:, mailto:}`
7. **email** — matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
8. **color** — matches `/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i` OR `/^(rgb|hsl)a?\(/`
9. **code** — multiline AND (contains `{` and `}`) OR (contains `;` at line ends) OR (contains common keywords: `function`, `const`, `def`, `class`, `import`, `return`, `if (`, `=>`)
10. **text** — fallback

## 10. Sensitive content detection

`src/main/clipboard/sensitive.ts`. Returns true if ANY:

- Source app exe name in `['1password', 'bitwarden', 'lastpass', 'keepass', 'dashlane']` (case-insensitive substring)
- Text matches Luhn-valid 13–19 digit sequence (credit card)
- Text matches API-key patterns: `/sk-[A-Za-z0-9]{20,}/`, `/ghp_[A-Za-z0-9]{36}/`, `/xox[bp]-[A-Za-z0-9-]+/`, `/AKIA[0-9A-Z]{16}/`
- Text matches `/-----BEGIN .* PRIVATE KEY-----/`

Default user setting: `'mark'` (store but flag). Other options: `'skip'`, `'store'`.

## 11. Coding conventions

- **TypeScript:** strict mode on, `noUncheckedIndexedAccess: true`, no `any`, no `as` casts unless documented inline
- **Functions over classes** in renderer; classes acceptable in main for services with lifecycle
- **Named exports only.** No default exports anywhere except `App.tsx` entrypoints required by Vite
- **Async/await,** never `.then()` chains
- **No globals.** Singletons live behind a `getX()` accessor in their own module
- **No top-level side effects** in any module except entry points (`main/index.ts`, `renderer/*/main.tsx`)
- **Errors:** main process catches at IPC boundary, logs via `electron-log`, returns `{ ok: false, error: string }` shape
- **Comments:** explain *why*, not *what*. No JSDoc unless the function is part of a public API
- **File naming:** `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- **Imports:** group as: node builtins → external → `@/main`, `@/renderer`, `@/shared` aliases → relative
- **Tailwind:** use design tokens from `tailwind.config.ts`; never raw hex in JSX className

## 12. React conventions

- Functional components with hooks; no class components
- Co-locate component-only types in the same file
- Lift state to Zustand only when shared across components
- Memoize expensive renders with `useMemo` / `React.memo` only after profiling shows a hot path
- Virtualize any list that can exceed 100 items with `@tanstack/react-virtual`
- All async UI states must handle `loading`, `error`, `empty` explicitly
- Framer Motion: prefer `layout` animations and `whileHover` over manual transitions

## 13. Design tokens (in `tailwind.config.ts`)

```

colors: {

bg:      { DEFAULT: '#0E0E10', subtle: '#17171A', elevated: '#1E1E22' },

fg:      { DEFAULT: '#F5F5F7', muted: '#A1A1AA', subtle: '#71717A' },

surface: 'rgba(255,255,255,0.04)',

border:  'rgba(255,255,255,0.08)',

accent:  { DEFAULT: '#7C5CFF', hover: '#8E72FF', subtle: 'rgba(124,92,255,0.12)' },

danger:  '#FF5C5C',

},

borderRadius: { card: '14px', pill: '999px', sheet: '20px' },

boxShadow: {

card:  '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)',

shelf: '0 12px 40px rgba(0,0,0,0.45)',

pop:   '0 24px 60px rgba(0,0,0,0.55)',

},

fontFamily: {

sans: ['Inter', 'system-ui', 'sans-serif'],

mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],

},

letterSpacing: { tight: '-0.01em' },

```

**Visual rules:** 14px card radius, 96% opacity surfaces, single composite shadow, 280ms spring transitions (damping 22), Inter at 13/11px in chrome, JetBrains Mono in code previews, single accent hue.

## 14. Anti-patterns (must NOT do)

- DO NOT poll the clipboard. Use `clipboard-event` only.
- DO NOT store image bytes in SQLite. Always disk + path.
- DO NOT register `Ctrl+V`, `Ctrl+C`, `Ctrl+Win+V`, `Win+V`, or any single-modifier hotkey globally.
- DO NOT use `nodeIntegration: true`. Always `contextIsolation: true` + preload bridge.
- DO NOT `require('electron')` from the renderer. Use `window.api`.
- DO NOT fire-and-forget DB writes during shutdown. Drain the write queue on `before-quit`.
- DO NOT auto-focus the shelf window. It must be `focusable: false`.
- DO NOT call `app.quit()` from the Library window's close handler — hide to tray instead.
- DO NOT install Redux, MobX, axios, moment, lodash. Use the locked stack.
- DO NOT use inline styles in JSX except `style= ['--var']: value ` for dynamic CSS vars.
- DO NOT create files outside the canonical folder structure without asking.

## 15. Required practices

- ALWAYS validate IPC payloads on the main side with a Zod schema (install `zod`).
- ALWAYS wrap clipboard listener startup in `try/catch` and fall back to 750ms polling on failure.
- ALWAYS re-register `globalShortcut` bindings on `powerMonitor.on('resume')`.
- ALWAYS encrypt the license token with `safeStorage.encryptString` before persisting.
- ALWAYS run `electron-builder install-app-deps` after adding native modules.
- ALWAYS show a spinner / skeleton for any UI operation that may exceed 100 ms.
- ALWAYS write logs through `electron-log`, never `console.log`, in main process code.
- ALWAYS guard sensitive paths behind the `isSensitive` flag check + user setting.

## 16. Testing & verification

For v1 we are **not** writing unit tests. Instead, every Task in §17 has explicit **Acceptance Criteria**. The agent must:

1. Implement the task.
2. Run `npm run dev`.
3. Manually verify each acceptance criterion (or write a 5-line check script under `scripts/verify/`).
4. Report status as either `✅ task N done` with a one-line summary, or `❌ blocked: …` with the specific failure.

Add lightweight Vitest tests only for `classify.ts`, `sensitive.ts`, and `hash.ts` — these are pure functions and a regression-prone surface.

## 17. Task queue (execute in order, stop after each)

### Task 1 — Foundation
- Install all dependencies from §1
- Set up `tailwind.config.ts` with tokens from §13
- Set up `tsconfig.json` strict + path aliases (`@/main`, `@/renderer`, `@/shared`)
- Configure `electron.vite.config.ts` for 4 renderer entries (library, overlay, shelf, settings)
- `src/shared/types.ts` + `src/shared/ipc-channels.ts`
- `src/main/logger.ts` (electron-log, daily rotate, max 7 files)
- App boots; main window shows "Hello" placeholder.
- **Acceptance:** `npm run dev` opens an empty Library window with the title "Clipboard" and acrylic background. No console errors.

### Task 2 — Database layer
- Drizzle schema as in §5
- `src/main/db/client.ts` initializing better-sqlite3, applying schema + raw FTS5 migration
- `src/main/db/queries.ts` with typed functions: `insertClip`, `deleteClip`, `pinClip`, `bumpUsage`, `searchClips(query, filters)`, `listClips(limit, offset, filters)`, `countClips`
- Retention pruner function
- **Acceptance:** Boot the app; the DB file exists at `userData/clips.db`. Run a verify script that inserts 10 fake clips and searches them via FTS. Returns expected count.

### Task 3 — Capture engine (HIGHEST RISK)
- Implement `listener.ts`, `classify.ts`, `sensitive.ts`, `hash.ts`, `capture-service.ts` per §8–10
- Wire to DB queries from Task 2
- IPC broadcast `CLIP_ADDED` on every insert
- Fallback polling on listener failure
- **Acceptance:** Copy text, a URL, a hex color, a code snippet, and a screenshot. All 5 land in DB with correct `type`. Copying the same text twice does NOT create a duplicate row — `useCount` increments. Copying from 1Password (or just running the app with the source-app name spoofed in code for now) marks `isSensitive = true`.

### Task 4 — Global hotkeys + paste-back
- `src/main/hotkeys/index.ts` registers `Ctrl+Alt+V`, `Ctrl+Alt+L`, `Ctrl+Alt+S`, `Ctrl+Alt+0–9`
- `src/main/hotkeys/paste-back.ts` using `uiohook-napi`
- Re-register on `powerMonitor.resume`
- Settings stores user-customized bindings (defer UI; for now just hardcoded)
- **Acceptance:** `Ctrl+Alt+V` fires a log line in the main process. `Ctrl+Alt+0` reads the most recent clip and pastes it into Notepad.

### Task 5 — Quick-paste overlay window
- Window factory in `src/main/windows/overlay.ts` per §7.2
- React app in `src/renderer/overlay/` with: search input (autofocus), horizontal scroll row of clip cards, filter chip row, keyboard navigation
- Use shadcn `Command` component for fuzzy search behavior
- Live FTS5 query as user types (debounced 80ms)
- Esc to close, Enter to paste, arrows to navigate
- **Acceptance:** `Ctrl+Alt+V` opens the overlay over any focused app. Type a few characters → matching clips appear. Pick one + Enter → overlay closes, clip is pasted into the originally focused app.

### Task 6 — Library window UI
- Sidebar: All, Pinned, by Type (Text/Images/Links/Colors/Code/Files), by Category (dynamic)
- Main grid: virtualized via `@tanstack/react-virtual`, 200×140px cards
- Type-specific card previews (image thumb, color swatch, code with shiki highlighting, url with favicon)
- Top bar: global search, settings button, pause toggle
- Right-click context menu on cards (Pin, Delete, Copy again, Move to category)
- Listen for `CLIP_ADDED` IPC to update in real time
- **Acceptance:** Library window shows all clips, scrolling smoothly with 1000+ rows. Filters work. Search is instant. New clips appear at top without refresh.

### Task 7 — Shelf window
- Per §7.3
- Collapsed pill expands on hover via Framer Motion `layout`
- Shows last 6 clips horizontally
- Drag-out implemented for image/file clips
- Click to paste
- **Acceptance:** Shelf appears top-center on primary display. Hover expands it. Dragging an image clip into Figma successfully drops the image.

### Task 8 — Tray + autostart + settings window
- Tray with menu per §7.4
- `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })`
- Settings window: hotkey rebinder, retention policy, sensitive content mode, theme override, pause schedule, license entry field
- **Acceptance:** App starts on Windows login hidden in tray. Settings persist across restarts.

### Task 9 — Screenshot capture
- `src/main/screenshots/region-capture.ts` — transparent fullscreen overlay, drag rectangle, crop, save
- `src/main/screenshots/file-watcher.ts` — chokidar on `%USERPROFILE%\Pictures\Screenshots\`
- Both feed into CaptureService as image clips
- **Acceptance:** `Ctrl+Alt+S` shows crosshair, dragging a rectangle saves a PNG that appears in the Library. Pressing `Win+PrtScn` also produces a Library entry within 2s.

### Task 10 — Onboarding + theming polish
- 3-step first-run flow (welcome → hotkey explainer → pause-schedule offer)
- System theme follow + manual override
- Empty states, loading skeletons, focus states
- **Acceptance:** Fresh install runs onboarding. Theme toggle works without restart.

### Task 11 — Packaging
- `electron-builder.yml` per §E13 of the original doc
- `npm run build && npm run dist` produces signed (or unsigned for now) NSIS installer + MSIX
- `electron-updater` configured to GitHub Releases
- **Acceptance:** Installer produced under `dist/`. Installing it on a clean VM works end-to-end.

### Task 12 — License gating
- Free tier: hard cap on `listClips` to 50 most-recent
- Paid: unlimited
- Settings field for license key, validates against Polar.sh API on activation
- Activated state stored encrypted via `safeStorage`
- **Acceptance:** Without a license, only 50 most recent clips show. Entering a valid (mock) key unlocks the full library.

### Task 13 — Launch polish
- Error boundary on every React entry point
- Crash reporter writes to `electron-log`
- Update README with screenshots, install instructions, privacy statement
- **Acceptance:** App passes a manual 1-hour stress test (1000+ copies, no leaks, no crashes).

## 18. Communication protocol with the human operator

After each Task you must reply with:

```

✅ Task N — <one-line summary>

Files changed: <list>

How to verify: <2–3 manual steps>

Known gaps: <if any>

Ready for Task N+1: yes / no (reason)

```

If you hit ambiguity, **ask one specific question** rather than guessing. Do not invent product decisions (pricing, copy, branding) — ask.

## 19. Out of scope (v1)

- Cloud sync, cross-device paste, plugins, OCR, AI categorization. Reject feature requests in these areas; defer to v2.

## 20. Glossary

- **Clip** — one stored item, regardless of type
- **Shelf** — the floating top-center pinned strip
- **Overlay** — the centered quick-paste search popup (`Ctrl+Alt+V`)
- **Library** — the main full-window app
- **Slot** — one of 10 keyboard-accessible recent clips (`Ctrl+Alt+0–9`)
```

## After you've pasted the file

1. Run a sanity check by asking opencode: **"Summarize [AGENTS.md](http://AGENTS.md) in 5 bullet points and tell me what Task 1's acceptance criteria are."** If it answers correctly, the context loaded properly.
2. Then say: **"Start Task 1. Show me the diff before applying."**
3. Don't let it leap ahead. The §18 communication protocol is the guardrail — if it skips it, repeat: *"Follow §18 of [AGENTS.md](http://AGENTS.md)."*
4. When you hit anything unclear or want to revise scope, edit [AGENTS.md](http://AGENTS.md) itself rather than fighting it in chat. The file is the source of truth.

<aside>
🔧

**Pro tip for DeepSeek v4 Pro specifically:** it's strong at code generation but tends to over-explain. Add this line at the top of your first message to opencode: *"Be terse. Code first, prose only when asked."* Saves a lot of token budget per task.

</aside>