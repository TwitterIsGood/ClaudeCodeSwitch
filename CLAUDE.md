# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Run development server (Vite + Tauri): `npm run tauri dev`
- Run frontend development server only: `npm run dev`
- Build frontend: `npm run build`
- Build complete application: `npm run tauri build`
- Type check: `npx tsc --noEmit`

## Architecture
This is a standard Tauri v2 application using React 19 + TypeScript + Vite for the frontend and Rust for the backend.

### Frontend (`src/`)
- **`App.tsx`**: The main entry point containing all application logic and UI. It manages the state for multi-provider configurations reading from/writing to Claude Code's `settings.json`.
- **`App.css`**: Application styling using a dark theme with specific modal and toast animations.
- Custom React components are defined within `App.tsx` (e.g., `CustomConfirmModal`, `CustomPromptModal`, `ToastContainer`) instead of separate files, creating a unified file structure.
- Interacts with the backend via `@tauri-apps/api/core` (`invoke`) and uses `@tauri-apps/plugin-dialog` for native file dialogs.

### Backend (`src-tauri/`)
- **`src/lib.rs`**: Core Rust backend containing native system commands exposed to the frontend:
  - `read_settings`: Reads a file path to string space.
  - `write_settings`: Writes a string payload to a file.
  - `get_default_settings_path`: Resolves the user's home directory across OS platforms to locate `~/.claude/settings.json`.

### Features
- **Multi-provider Configuration**: Uses `settings.json`'s `tmp` field to store non-active provider details (e.g., Azure, Bedrock, Custom) using a `provider-KEY` naming convention.
- **Environment Management**: Mutates the `env` field of `settings.json` to swap the active environment.
- **Custom UI System**: Overrides native dialogs with custom React prompt/confirm modals and a CSS-animated Toast notification system overlaid on the main React tree.