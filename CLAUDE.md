# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BetterMediaInfo is a cross-platform desktop application that provides a modern GUI for MediaInfo. It's built using:
- **Frontend**: Svelte 5 + SvelteKit with TypeScript, Tailwind CSS, and Svelte UX components
- **Backend**: Rust with Tauri v2 framework
- **Native Library**: MediaInfoLib (C++) for media file analysis via FFI
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

# Type checking and validation
pnpm check
pnpm check:watch

# Run Rust tests
cd src-tauri && cargo test -r

# Build NSIS installer (Windows)
node src-tauri/scripts/copy_dlls.cjs
node src-tauri/scripts/patch_tauri_conf.cjs
```

### Build System Notes
- Uses Tauri's bundler which creates platform-specific packages (deb, rpm, AppImage, dmg, exe)
- Static site generation via `@sveltejs/adapter-static` (no SSR)
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
- **Svelte 5 Runes**: Uses `$state`, `$derived`, `$effect` instead of legacy reactive syntax
- **Routes**: SvelteKit file-based routing in `src/routes/`
  - `+layout.svelte` - Root layout with Svelte UX theme initialization
  - `+page.svelte` - Main application view with tab management
  - `toolbar.svelte` - Top toolbar with file operations
  - `list.svelte` - File list view with card/list toggle and filtering
  - `details.svelte` - Detailed stream property view per file
  - `config.svelte` - Settings panel with display mode selection
  - `about.svelte` - About dialog with version info
- **Libraries** (`src/lib/`):
  - `service.ts` - Tauri command bindings (invoke layer)
  - `store.ts` - Svelte stores for global state (config, files, dialogs)
  - `protocol.ts` - TypeScript interfaces matching Rust protocol
  - `format.ts` - Data formatting utilities (duration, file size, etc.)
  - `dialog.ts` - File/directory dialog helpers
  - `fs.ts` - File system utilities (recursive scanning)

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
- **Frontend Stores** (`src/lib/store.ts`):
  - `config` - Application configuration (display mode, file extensions, etc.)
  - `darkMode` - Boolean indicating current dark mode state
  - `mediaFiles` - List of analyzed media files
  - `mediaDetailedFiles` - Files currently open in detail tabs
  - `dialogJsonCode` - JSON export dialog state
  - `dialogNotification` - Notification dialog state
  - `tabAboutStatus`/`tabSettingsStatus` - Tab visibility control

- **Configuration Persistence**:
  - Rust side: Config stored as JSON in Tauri's app data directory
  - Frontend: Config loaded on startup, saved on changes
  - No local storage used; all persistence through Tauri file APIs

### Dark Mode Implementation
The application uses Svelte UX's built-in theming system:

1. **Theme Configuration** (`src/routes/+layout.svelte`):
   - Initializes Svelte UX settings with light/dark theme definitions
   - `<ThemeInit />` component injects theme CSS into document head

2. **Theme Switching** (`src/routes/+page.svelte`):
   - Uses `getSettings().currentTheme` store from Svelte UX
   - Maps display modes: Auto → "system", Light → "light", Dark → "dark"
   - Svelte UX handles OS theme detection, `dark` class management, and localStorage persistence

3. **Component Styling**:
   - Svelte UX components automatically use dark theme from `tailwind.config.ts`
   - Custom components use Tailwind's `dark:` prefix for dark mode variants
   - **IMPORTANT**: Do NOT modify `src/app.css` for dark mode - use Tailwind classes in components

### UI Framework Details
- **Svelte UX**: Primary component library with built-in theming
  - Theme configuration in `tailwind.config.ts` under `ux.themes`
  - Uses CSS custom properties for colors (surface-100, surface-200, etc.)
- **Tailwind CSS**: Utility-first styling with dark mode via `class` strategy
  - darkMode: "class" in tailwind.config.ts
  - Dark mode triggered by `dark` class on `<html>` element
- **svhighlight**: Syntax highlighting for JSON export
- **Google Material Symbols**: Icon system

## Testing

- Rust unit tests: `cd src-tauri && cargo test -r`
- No JavaScript test framework currently configured
- CI/CD runs cargo tests as part of build validation

## Build Dependencies

External libraries that must be built before BetterMediaInfo:
- **zlib** v1.3.1: Compression library (static build required)
- **ZenLib**: MediaArea utility library
- **MediaInfoLib** v25.09: Core media analysis library

The build process expects these libraries to be in sibling directories:
```
parent-directory/
├── BetterMediaInfo/
├── MediaInfoLib/
├── ZenLib/
└── zlib/
```

## Common Pitfalls

1. **Protocol Synchronization**: When adding/modifying data structures, update BOTH `src/lib/protocol.ts` AND `src-tauri/src/protocol.rs`

2. **Svelte 5 Runes**: This project uses Svelte 5 runes (`$state`, `$derived`, `$effect`), not legacy reactive syntax (`$:`)

3. **Dark Mode Styling**:
   - Use Tailwind's `dark:` prefix in component classes
   - Do NOT add global CSS rules to `app.css` for dark mode
   - Svelte UX components automatically support dark mode via theme configuration

4. **Tauri IPC**: All backend calls must go through `src/lib/service.ts` invoke functions, never call Tauri directly from components

5. **MediaInfoLib FFI**: The auto-generated `bindings.rs` is broken and for reference only. Use the safe wrappers in `media_info.rs`