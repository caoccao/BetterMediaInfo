# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BetterMediaInfo is a cross-platform desktop application that provides a modern GUI for MediaInfo. It's built using:
- **Frontend**: React 19 + TypeScript with Material-UI (MUI) v7
- **Backend**: Rust with Tauri v2 framework
- **Native Library**: MediaInfoLib (C++) for media file analysis via FFI
- **State Management**: Zustand for React state
- **Package Manager**: pnpm for Node.js dependencies

## Development Commands

### Prerequisites Setup
This project requires external MediaInfoLib dependencies to be built first. See `docs/development.md` for complete setup instructions including:
- Building MediaInfoLib, ZenLib, and zlib from source
- Platform-specific dependencies (Ubuntu packages, Xcode, Visual Studio)

### Core Development Commands
```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm dev
# Alternative: pnpm tauri dev

# Build for production
pnpm build
# Alternative: pnpm tauri build

# Type checking
tsc -b

# Preview production build
pnpm preview

# Run Rust tests
cd src-tauri && cargo test

# Build NSIS installer (Windows)
node src-tauri/scripts/copy_dlls.cjs
node src-tauri/scripts/patch_tauri_conf.cjs
```

### Build System Notes
- Uses Tauri's bundler which creates platform-specific packages (deb, rpm, AppImage, dmg, exe)
- Vite-based build system with React plugin
- Cross-platform build via GitHub Actions for Linux, macOS, and Windows
- Frontend dev server runs on http://localhost:1420

## Architecture

### Frontend-Backend Communication Pattern
The application uses a strict protocol-based communication pattern between TypeScript and Rust:

1. **Protocol Files**: `src/lib/protocol.ts` ↔ `src-tauri/src/protocol.rs`
   - Data structures must be kept in sync between TypeScript and Rust
   - TypeScript uses interfaces/enums, Rust uses structs/enums with serde serialization
   - Field names use camelCase in TypeScript, snake_case in Rust with `#[serde(rename)]`

2. **IPC Layer**: `src/lib/service.ts` ↔ `src-tauri/src/lib.rs`
   - TypeScript calls Rust commands via Tauri's `invoke()` API
   - All Tauri commands are defined with `#[tauri::command]` attribute
   - Commands return `Result<T, String>` for error handling

3. **Business Logic**: Rust side (`src-tauri/src/controller.rs`)
   - All media file analysis happens in Rust via MediaInfoLib FFI
   - File system operations and configuration management in Rust
   - Frontend receives processed data structures, never raw FFI data

### Frontend Structure (`src/`)
- **React 19**: Uses modern React with hooks
- **Component Structure** (`src/components/`):
  - `Layout.tsx` - Root layout component
  - `MainContent.tsx` - Main content area with tab management
  - `Toolbar.tsx` - Top toolbar with file operations
  - `List.tsx` - File list view with card/grid toggle and filtering (uses MUI DataGrid)
  - `Details.tsx` - Detailed stream property view per file
  - `Config.tsx` - Settings panel with display mode selection
  - `About.tsx` - About dialog with version info
  - `Footer.tsx` - Footer component
- **Libraries** (`src/lib/`):
  - `service.ts` - Tauri command bindings (invoke layer)
  - `store.tsx` - Zustand store for global state management
  - `protocol.ts` - TypeScript interfaces matching Rust protocol
  - `format.ts` - Data formatting utilities (duration, file size, etc.)
  - `dialog.ts` - File/directory dialog helpers
  - `fs.ts` - File system utilities (recursive scanning)
  - `types.ts` - Additional TypeScript type definitions
- **Entry Points**:
  - `App.tsx` - Root component with MUI theme provider and dark mode logic
  - `main.tsx` - React application entry point

### Backend Structure (`src-tauri/src/`)
- `main.rs` - Application entry point, CLI argument handling
- `lib.rs` - Tauri command handlers (IPC entry points)
- `controller.rs` - Business logic layer (file analysis orchestration)
- `media_info.rs` - MediaInfoLib FFI bindings and safe wrappers
- `protocol.rs` - Shared data structures with frontend
- `streams.rs` - Media stream parsing and property extraction
- `config.rs` - Application configuration management
- `bindings.rs` - Auto-generated C bindings (reference only, not used directly)

### State Management
- **Zustand Store** (`src/lib/store.tsx`):
  - `config` - Application configuration (display mode, file extensions, etc.)
  - `mediaFiles` - List of analyzed media files
  - `mediaDetailedFiles` - Files currently open in detail tabs
  - `mediaFileToAllPropertiesMap` - Map of file paths to all properties
  - `mediaFileToCommonPropertyMap` - Map of file paths to common properties
  - `mediaFileToStreamCountMap` - Map of file paths to stream counts
  - `dialogJsonCode` - JSON export dialog state
  - `dialogNotification` - Notification dialog state
  - `mediaInfoAbout` - MediaInfo version information
  - `mediaInfoParameters` - Available MediaInfo parameters
  - `tabAboutStatus`/`tabSettingsStatus` - Tab visibility control
  - `viewType` - Current view type (Card or Grid)

- **Configuration Persistence**:
  - Rust side: Config stored as JSON in Tauri's app data directory
  - Frontend: Config loaded on startup via `initConfig()`, saved on changes
  - All persistence through Tauri file APIs

### Dark Mode Implementation
The application uses MUI's built-in theming system:

1. **Theme Configuration** (`src/App.tsx`):
   - Creates MUI theme with `createTheme()` based on display mode
   - Listens to system theme preferences via `window.matchMedia('(prefers-color-scheme: dark)')`
   - Provides theme to entire app via `ThemeProvider`

2. **Display Mode Logic**:
   - Auto → Uses system preference (light/dark)
   - Light → Forces light mode
   - Dark → Forces dark mode
   - Mode changes trigger theme recreation and re-render

3. **Component Styling**:
   - MUI components automatically use theme colors
   - Custom styling via MUI's `sx` prop and `styled` components
   - Theme customization includes default component sizes (small buttons, compact tables, etc.)

### UI Framework Details
- **Material-UI (MUI) v7**: Primary component library
  - `@mui/material` - Core components (Button, TextField, Dialog, etc.)
  - `@mui/x-data-grid` - Advanced data grid for file list view
  - `@mui/icons-material` - Material Design icons
- **Monaco Editor**: Code editor for JSON export view (`@monaco-editor/react`)
- **Emotion**: CSS-in-JS styling library (used by MUI)

## Testing

- Rust unit tests: `cd src-tauri && cargo test`
  - Use `cargo test -r` for release mode tests
  - Use `cargo test [TESTNAME]` to run specific tests
- No JavaScript/TypeScript test framework currently configured
- CI/CD runs cargo tests as part of build validation

## Build Dependencies

External libraries that must be built before BetterMediaInfo:
- **zlib** v1.3.1: Compression library (static build required)
- **ZenLib**: MediaArea utility library
- **MediaInfoLib** v26.01: Core media analysis library

The build process expects these libraries to be in sibling directories:
```
parent-directory/
├── BetterMediaInfo/
├── MediaInfoLib/
├── ZenLib/
└── zlib/
```

## Common Pitfalls

1. **Protocol Synchronization**: When adding/modifying data structures, update BOTH `src/lib/protocol.ts` AND `src-tauri/src/protocol.rs`. Field names must use camelCase in TypeScript and snake_case in Rust with `#[serde(rename)]` attributes.

2. **Tauri IPC**: All backend calls must go through `src/lib/service.ts` invoke functions, never call Tauri APIs directly from components.

3. **MediaInfoLib FFI**: The auto-generated `bindings.rs` is broken and for reference only. Use the safe wrappers in `media_info.rs`.

4. **State Management**: Use Zustand store from `src/lib/store.tsx` for global state. Component-local state should use React hooks (`useState`, `useMemo`, etc.).

5. **MUI Theme**: Always use theme values via `sx` prop or `styled` API instead of hardcoded colors to ensure dark mode compatibility.
