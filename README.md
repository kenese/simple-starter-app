# Starter App — Multi-User Real-Time App Template

A modern, full-stack monorepo template for building real-time collaboration applications.

## 🚀 Tech Stack

### Core Architecture
- **Monorepo**: Turborepo for workspace management
- **Package Manager**: pnpm

### Frontend (`apps/web`)
- **Framework**: React 19 + Vite
- **Routing**: React Router
- **State Management**: Zustand
- **Styling**: CSS Modules/Plain CSS
- **Real-time**: Socket.IO Client

### Backend (`apps/server`)
- **Server**: Express
- **Real-time**: Socket.IO
- **Room Management**: Custom room & state management

### Shared Types (`packages/shared`)
- **Language**: TypeScript
- **Contents**: Shared DTOs, events, state interfaces, and constants

### Testing & Documentation
- **Unit/Component Testing**: Vitest & React Testing Library
- **End-to-End Testing**: Playwright
- **UI Component Explorer**: Storybook

---

## 📂 Project Structure

```
.
├── apps/
│   ├── server/       # Express + Socket.IO backend
│   └── web/          # React + Vite frontend (includes Storybook & tests)
├── packages/
│   └── shared/       # Shared TypeScript types for precise contract between client & server
└── package.json    # Root config and turbo scripts
```

---

## 🏎️ Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Development Environment
Run both the frontend and backend simultaneously:
```bash
pnpm dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### 3. Build for Production
```bash
pnpm build
```

---

## 🛠️ Additional Commands

| Command | Description |
|---|---|
| `pnpm storybook` | Starts Storybook UI at `http://localhost:6006` |
| `pnpm test` | Runs unit & component tests via Vitest |
| `pnpm test:e2e` | Runs Playwright E2E tests |
| `pnpm lint` | Runs the linter across all packages |
| `pnpm clean` | Cleans up `dist` and `.turbo` folders |

---

## 💡 Key Design Patterns

- **Single Source of Truth**: All synced state lives in `AppState` which resides in the shared package.
- **Room-Based Isolation**: Every connecting user joins a specific "room" where the state is isolated.
- **Optimistic Updates**: The UI updates the Zustand store instantly, then broadcasts the action to peer clients.
- **Typed Socket Events**: Interactions employ strict typing following a `noun:verb` convention (e.g., `state:update`, `room:join`).

---

## 🎨 Conventions

- Use **Zustand** for complex client state logic; avoid Redux or Context API unless necessary.
- **Dark Mode Default**: the template ships with a dark theme (Backgrounds: `#0f0f1a`/`#1a1a2e`, Text: `#e2e8f0`, Accent: `#6366f1`).
- Typography uses **Inter** from Google Fonts.
