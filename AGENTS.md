# my-ng-wasm-app Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-10

## Active Technologies

- TypeScript 5.9.2 (Angular 21.0.0) (001-wasm-media-editor)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

bun test; bun run build

## Build System

- **Package Manager**: bun (v1.3.4+)
- **Build Tool**: Angular CLI with bun
- **Test Framework**: vitest

## Code Style

TypeScript 5.9.2 (Angular 21.0.0): Follow standard conventions

## Recent Changes

- 001-wasm-media-editor: Added TypeScript 5.9.2 (Angular 21.0.0)

<!-- MANUAL ADDITIONS START -->
## Development Standards

- Always use `bun` as the package manager and for running scripts
- Use `vitest` for all unit and integration testing
- Run `bun run build` to build the application
- Run `bun test` to execute tests
- Angular 21+ control flow syntax (@if, @for) must be used instead of legacy directives (*ngIf, *ngFor)
- **AVOID CDN usage wherever possible** - Use locally installed packages via bun
- All dependencies should be installed via `bun add` and served from `node_modules` or `public` directory

## SOLID Principles (MANDATORY)

All code MUST strictly adhere to SOLID principles:

1. **Single Responsibility Principle (SRP)**
   - Each class/service has ONE reason to change
   - Services handle ONLY their domain (e.g., FFmpegService handles ONLY FFmpeg, PhotonService handles ONLY Photon)
   - Components handle ONLY presentation logic for their specific feature
   - Never mix concerns (e.g., don't initialize FFmpeg in a Photon service)

2. **Open/Closed Principle (OCP)**
   - Open for extension, closed for modification
   - Use interfaces and abstract classes for extensibility

3. **Liskov Substitution Principle (LSP)**
   - Derived classes must be substitutable for their base classes

4. **Interface Segregation Principle (ISP)**
   - Many specific interfaces are better than one general interface
   - Clients should not depend on interfaces they don't use

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions, not concretions
   - High-level modules should not depend on low-level modules

## Service Architecture Rules

- Each WASM library (FFmpeg, Photon) gets its own dedicated service
- Services are injected via constructor dependency injection
- Components call the appropriate service for their needs
- No cross-service initialization or dependencies
- Each service manages its own lifecycle and state
<!-- MANUAL ADDITIONS END -->
