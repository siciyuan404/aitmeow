# P1c: Electron Desktop Skeleton

## Git Branch
`p1c-desktop-skeleton`

## Dependencies
- `p1b-server` (Electron connects via HTTP/WS, does not directly depend on P0)
- The Rust server should be running before desktop is fully functional

## Deliverables
- `desktop/` — Electron + React + Vite project skeleton

## Initialization Commands

```bash
cd desktop
npm init -y
npm install electron electron-forge @electron-forge/cli
npm install react react-dom vite @vitejs/plugin-react
npm install typescript @types/react @types/react-dom
npm install tailwindcss @tailwindcss/vite
npm install zustand immer
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
npm install react-router-dom
npm install sonner
npx electron-forge import
```

## Directory Structure

```
desktop/
├── package.json
├── forge.config.ts
├── tsconfig.json
├── vite.config.ts
├── index.html
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
│       ├── registry.ts
│       └── handlers/
│           ├── connection.ts
│           └── settings.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MainContent.tsx
│   │   └── common/
│   │       ├── StatusIndicator.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── Connection.tsx
│   │   ├── Preview.tsx
│   │   ├── Repository.tsx
│   │   ├── Templates.tsx
│   │   ├── Rules.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useConnection.ts
│   │   └── useSettings.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── ws.ts
│   ├── stores/
│   │   ├── connectionStore.ts
│   │   └── settingsStore.ts
│   └── styles/
│       └── index.css
└── resources/
```

## Electron Main Process Responsibilities

```typescript
// electron/main.ts
// 1. Create BrowserWindow
// 2. Spawn Rust child process (aitmeow start)
// 3. Listen to child process stdout for ready signal
// 4. IPC handlers: start / stop / restart server
// 5. IPC handlers: read/write config file

// electron/ipc/handlers/connection.ts
// "connection:start" → spawn Rust process + wait for ready
// "connection:stop"  → kill child process
// "connection:status" → return { running, port, pid }
```

## Page Skeletons (Placeholders)

Each page has a title + placeholder content. P2 will fill these with full UI.

```tsx
// pages/Connection.tsx
export default function ConnectionPage() {
  return (
    <div>
      <h1>Connection Management</h1>
      <StatusIndicator status="disconnected" />
      <button>Start Server</button>
      <button>Stop Server</button>
      <div>Port: 8765</div>
      <div>Log output area</div>
    </div>
  );
}
```

## Verification
- `npm run dev` Vite dev server starts
- `npm run start` Electron window opens
- Sidebar with 6 pages navigatable
- Connection page shows port input and start/stop buttons
