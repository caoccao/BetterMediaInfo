# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BetterMediaInfo is a cross-platform desktop application that provides a modern GUI for MediaInfo. It's built using:
- **Frontend**: Svelte + SvelteKit with TypeScript, Tailwind CSS, and Svelte UX components
- **Backend**: Rust with Tauri v2 framework 
- **Native Library**: MediaInfoLib (C++) for media file analysis
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
```

### Build System Notes
- Uses Tauri's bundler which creates platform-specific packages (deb, rpm, AppImage, dmg, exe)
- Static site generation via `@sveltejs/adapter-static` (no SSR)
- Cross-platform build via GitHub Actions for Linux, macOS, and Windows

## Architecture

### Frontend Structure (`src/`)
- **Routes**: SvelteKit file-based routing in `src/routes/`
  - `+page.svelte` - Main application view
  - `toolbar.svelte` - Top toolbar with file controls
  - `list.svelte` - File list view with filtering
  - `details.svelte` - Detailed media information display
  - `config.svelte` - Settings/configuration panel
  - `about.svelte` - About dialog
- **Libraries** (`src/lib/`):
  - `service.ts` - Tauri command bindings and API layer
  - `store.ts` - Svelte stores for state management
  - `protocol.ts` - TypeScript interfaces for Rust ↔ JS communication
  - `format.ts` - Data formatting utilities
  - `dialog.ts` - File dialog helpers
  - `fs.ts` - File system utilities

### Backend Structure (`src-tauri/src/`)
- `main.rs` - Application entry point
- `lib.rs` - Tauri command handlers and app setup
- `controller.rs` - Business logic layer
- `media_info.rs` - MediaInfoLib FFI bindings and wrappers
- `protocol.rs` - Shared data structures with frontend
- `streams.rs` - Media stream parsing and analysis
- `config.rs` - Application configuration management
- `bindings.rs` - Auto-generated C bindings (reference only)

### Key Integrations
- **MediaInfoLib Integration**: Direct FFI calls to MediaInfoLib C library
- **File System**: Drag-and-drop support, recursive directory scanning
- **Cross-platform**: Uses Tauri's cross-platform abstractions
- **IPC**: Tauri's invoke system for Rust ↔ JavaScript communication

### State Management
- Frontend state managed via Svelte stores (`store.ts`)
- Configuration persisted via Tauri's file system APIs
- Real-time filtering and search implemented client-side

### UI Framework Details
- **Svelte UX**: Primary component library for consistent UI
- **Tailwind CSS**: Utility-first styling with typography plugin
- **svhighlight**: Syntax highlighting for media information display
- **Google Fonts Icons**: Icon system

## Testing

- Rust unit tests: `cd src-tauri && cargo test -r`
- No JavaScript test framework currently configured
- CI/CD runs cargo tests as part of build validation

## Build Dependencies

External libraries that must be built before BetterMediaInfo:
- **zlib**: Compression library (static build required)
- **ZenLib**: MediaArea utility library 
- **MediaInfoLib**: Core media analysis library (v25.09)

The build process expects these libraries to be available in specific locations relative to the project directory.