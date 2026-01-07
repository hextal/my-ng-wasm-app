# Figma Design System Integration Rules

**Project**: my-ng-wasm-app (Angular Image Editor)  
**Generated**: 2025-12-18  
**Purpose**: Guide AI assistants in converting Figma designs to production-ready Angular code

---

## 1. Design System Structure

### 1.1 Token Definitions

**Location**: Design tokens are NOT currently centralized in a dedicated file.

**Current State**:
- Colors, spacing, and typography are hardcoded in component SCSS files
- Some Tailwind utility classes are used (see `src/styles.scss`)
- Custom CSS properties are defined inline in component styles

**Action Required**: When implementing Figma designs with design tokens:
1. Extract tokens from Figma (colors, spacing, typography, etc.)
2. Create a new file: `src/styles/_design-tokens.scss`
3. Define CSS custom properties in `:root` selector
4. Import tokens file in `src/styles.scss` before other imports

**Example Token Structure**:
```scss
// src/styles/_design-tokens.scss
:root {
  // Colors (from Figma CDS)
  --cds-surface-1: #ffffff;
  --cds-on-surface-3: #171717;
  --cds-brand-secondary-purple-40: #7c00c7;
  
  // Spacing
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-gap-lg: 24px;
  
  // Typography
  --font-family-primary: 'DM Sans', sans-serif;
  --font-size-base: 16px;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --line-height-text: 24px;
  
  // Border Radius
  --radius-circle: 100px;
  --radius-full: 50%;
}
```

---

## 2. Component Library

### 2.1 Component Structure

**Location**: `src/app/features/` and `src/app/core/`

**Architecture**: 
- **Angular 21.0.0** with standalone components
- **Signal-based** reactive state management (no NgRx, use Angular signals)
- **SOLID principles** enforced (see `AGENTS.md`)
- Component prefix: `app-` (configured in `angular.json`)

**Component Pattern**:
```typescript
@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [CommonModule, FormsModule, ...],
  templateUrl: './component-name.component.html',
  styleUrls: ['./component-name.component.scss']
})
export class ComponentNameComponent {
  // Use signals for reactive state
  public myState = signal<string>('');
  
  // Services injected via constructor
  constructor(private myService: MyService) {}
}
```

**Template Syntax**:
- **MUST** use Angular 21+ control flow: `@if`, `@for`, `@switch`
- **NEVER** use legacy directives: `*ngIf`, `*ngFor`, `*ngSwitch`

```html
<!-- CORRECT -->
@if (showElement) {
  <div>Content</div>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}

<!-- INCORRECT -->
<div *ngIf="showElement">Content</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

### 2.2 Feature Organization

**Pattern**: Feature-based module structure
```
src/app/
├── core/                    # Singleton services, constants
│   ├── services/           # Business logic services
│   ├── constants/          # App-wide constants
│   └── integration/        # Integration tests
├── features/               # Feature modules
│   └── image-editor/       # Main feature
│       ├── components/     # Sub-components (create this for new components)
│       ├── image-editor.component.ts
│       ├── image-editor.component.html
│       └── image-editor.component.scss
└── types/                  # TypeScript type definitions
```

**When Adding New Components from Figma**:
1. Create under `features/[feature-name]/components/[component-name]/`
2. Generate using Angular CLI: `ng generate component features/[feature]/components/[name] --standalone`
3. Keep related components together in the same feature directory

---

## 3. Frameworks & Libraries

### 3.1 UI Framework

**Primary**: Angular 21.0.0
- **Router**: `@angular/router` (v21.0.0)
- **Forms**: `@angular/forms` (v21.0.0) - Reactive Forms preferred
- **Material**: `@angular/material` (v21.0.2) - Available but not heavily used
- **CDK**: `@angular/cdk` (v21.0.2) - For advanced component behaviors

### 3.2 Styling Approach

**Hybrid System**:
1. **Tailwind CSS 3.4.0** - Utility classes (currently installed but minimally used)
2. **Custom SCSS** - Primary styling method (preferred)
3. **CSS Custom Properties** - For design tokens (recommended going forward)

**Tailwind Configuration** (`tailwind.config.js`):
```javascript
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
```

**Important**: When converting Figma designs:
- **AVOID** installing Tailwind as a dependency (it's already present but underutilized)
- **PREFER** custom SCSS with design tokens over Tailwind classes
- Convert Tailwind classes from Figma output to custom SCSS

### 3.3 Build System

**Package Manager**: `bun` (v1.3.4+)
- **MUST** use `bun add` for dependencies
- **NEVER** use `npm` or `yarn`

**Build Tool**: Angular CLI with Vite
- Build: `bun run build`
- Serve: `bun run dev` or `bun run start` (port 4800)
- Test: `bun test` (Vitest)

**Test Framework**: Vitest (v4.0.8)
- Unit tests: `.spec.ts` files
- Integration tests: `.integration.spec.ts` files
- Config: `vitest.config.ts`

---

## 4. Asset Management

### 4.1 Asset Storage

**Location**: `public/` directory

**Current Assets**:
```
public/
├── .nojekyll       # GitHub Pages config
└── favicon.ico     # Site favicon
```

**Asset Handling**:
- Static assets go in `public/` directory
- Angular copies `public/` contents to dist during build (see `angular.json`)
- WASM files are handled separately (see `angular.json` assets config)

### 4.2 Figma Assets Integration

**When downloading assets from Figma**:

1. **SVGs**: Save to `public/assets/icons/` (create directory if needed)
2. **Images**: Save to `public/assets/images/`
3. **Fonts**: Install via npm/bun and import in `styles.scss`

**Example SVG Usage**:
```html
<!-- In component template -->
<img src="/assets/icons/image-icon.svg" alt="Image icon" />

<!-- Or with Angular binding -->
<img [src]="iconPath" [alt]="iconAlt" />
```

**Example in TypeScript**:
```typescript
export class MyComponent {
  iconPath = '/assets/icons/image-icon.svg';
  iconAlt = 'Image icon';
}
```

### 4.3 Font Management

**Current Fonts**: System fonts (see `src/styles.scss`)
```scss
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

**When Adding Custom Fonts from Figma** (e.g., DM Sans):

**Option 1: Google Fonts CDN** (Quick)
```scss
// In src/styles.scss
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap');

body {
  font-family: 'DM Sans', sans-serif;
}
```

**Option 2: Local Fonts** (Preferred for production)
```bash
# Install font package
bun add @fontsource/dm-sans
```

```scss
// In src/styles.scss
@import '@fontsource/dm-sans/400.css';  // Regular
@import '@fontsource/dm-sans/600.css';  // SemiBold
```

**Asset Optimization**: Not currently implemented
- Consider adding image optimization in future
- WASM files are served directly from `node_modules` (configured in `angular.json`)

---

## 5. Icon System

### 5.1 Current Icon Strategy

**No dedicated icon system**. Current implementation uses:
1. **Emoji/Unicode icons** (via `@ctrl/ngx-emoji-mart`)
2. **Inline SVG** in templates
3. **Material Icons** (available via `@angular/material` but not used extensively)

### 5.2 Figma Icon Integration Strategy

**For new icons from Figma**:

**Recommended Approach**:
```typescript
// 1. Save SVG to public/assets/icons/
// 2. Create icon registry service (if multiple icons)

// src/app/core/services/icon-registry.service.ts
@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  private icons = new Map<string, string>();
  
  register(name: string, path: string) {
    this.icons.set(name, path);
  }
  
  get(name: string): string {
    return this.icons.get(name) || '';
  }
}

// 3. Create icon component
@Component({
  selector: 'app-icon',
  template: `<img [src]="iconPath" [alt]="name" [class]="classes" />`,
  standalone: true
})
export class IconComponent {
  @Input() name!: string;
  @Input() classes = '';
  
  constructor(private iconRegistry: IconRegistryService) {}
  
  get iconPath() {
    return this.iconRegistry.get(this.name);
  }
}
```

**Simple Approach** (for few icons):
```typescript
// Just reference directly
<img src="/assets/icons/image-icon.svg" alt="Load image" class="icon" />
```

**Icon Naming Convention**:
- Use kebab-case: `image-icon.svg`, `filter-icon.svg`
- Prefix by category if many icons: `action-save.svg`, `nav-home.svg`

---

## 6. Styling Approach

### 6.1 CSS Methodology

**Current**: Component-scoped SCSS (Angular default encapsulation)
- Each component has its own `.scss` file
- Styles are scoped to component by default (ViewEncapsulation.Emulated)
- Global styles in `src/styles.scss`

**Naming Convention**: BEM-like structure
```scss
.component-name {
  &__element {
    // Element styles
  }
  
  &--modifier {
    // Modifier styles
  }
  
  &__element--modifier {
    // Element with modifier
  }
}
```

**Example from codebase** (`image-editor.component.scss`):
```scss
.editor-header {
  display: flex;
  align-items: center;
  
  &__logo {
    display: flex;
    gap: 12px;
  }
  
  &__button {
    padding: 10px;
    
    &--primary {
      background: #1976d2;
    }
  }
}
```

### 6.2 Global Styles

**Location**: `src/styles.scss`

**Current Structure**:
```scss
// 1. Third-party imports
@use '@ctrl/ngx-emoji-mart/picker';

// 2. Tailwind directives (if using Tailwind)
@tailwind base;
@tailwind components;
@tailwind utilities;

// 3. Global resets and base styles
body {
  margin: 0;
  padding: 0;
  // ...
}

// 4. Design tokens (TO BE ADDED)
// @import 'styles/design-tokens';

// 5. Utility classes (TO BE ADDED)
// @import 'styles/utilities';
```

### 6.3 Responsive Design

**Breakpoints** (not currently defined, add as needed):
```scss
// TO BE ADDED: src/styles/_breakpoints.scss
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1536px;

@mixin respond-to($breakpoint) {
  @media (min-width: $breakpoint) {
    @content;
  }
}
```

**Usage**:
```scss
.component {
  width: 100%;
  
  @include respond-to($breakpoint-md) {
    width: 50%;
  }
}
```

### 6.4 Converting Figma to SCSS

**Process**:
1. Extract design tokens from Figma (colors, spacing, typography)
2. Create CSS custom properties in `_design-tokens.scss`
3. Convert Figma/React/Tailwind output to semantic SCSS classes
4. Use BEM naming convention
5. Reference design tokens via `var(--token-name)`

**Example Conversion**:

**Figma Output** (React + Tailwind):
```jsx
<div className="bg-[#7c00c7] h-[40px] rounded-[100px] px-[12px] py-[8px]">
  <p className="text-[16px] font-semibold text-white">Load image</p>
</div>
```

**Converted to Angular + SCSS**:

```html
<!-- Template -->
<button class="btn btn--primary">Load image</button>
```

```scss
// Component SCSS
.btn {
  height: var(--button-height, 40px);
  padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
  border: none;
  border-radius: var(--radius-circle, 100px);
  font-family: var(--font-family-primary, sans-serif);
  font-size: var(--font-size-base, 16px);
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
  transition: all 0.2s;
  
  &--primary {
    background-color: var(--cds-brand-secondary-purple-40, #7c00c7);
    color: var(--cds-surface-1, white);
    
    &:hover {
      opacity: 0.9;
    }
  }
}
```

---

## 7. Project Structure Overview

```
my-ng-wasm-app/
├── .cursor/
│   └── rules/
│       └── figma_design_system_rules.md  # This file
├── .specify/                # Feature specifications and memory
├── public/                  # Static assets
│   └── assets/             # TO BE CREATED for Figma assets
│       ├── icons/          # SVG icons from Figma
│       └── images/         # Image assets from Figma
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── constants/  # App constants (THUMBNAIL_PREVIEW, etc.)
│   │   │   └── services/   # Business logic services
│   │   ├── features/
│   │   │   └── image-editor/
│   │   │       ├── components/     # TO BE CREATED for sub-components
│   │   │       ├── image-editor.component.ts
│   │   │       ├── image-editor.component.html
│   │   │       └── image-editor.component.scss
│   │   └── types/          # TypeScript type definitions
│   ├── styles/             # TO BE CREATED
│   │   ├── _design-tokens.scss   # Design tokens from Figma
│   │   ├── _breakpoints.scss     # Responsive breakpoints
│   │   └── _utilities.scss       # Utility classes
│   ├── styles.scss         # Global styles entry point
│   └── index.html          # App entry point
├── AGENTS.md               # Development standards (SOLID, etc.)
├── angular.json            # Angular CLI configuration
├── package.json            # Dependencies (use bun)
├── tailwind.config.js      # Tailwind configuration
└── vitest.config.ts        # Test configuration
```

---

## 8. Integration Workflow

### 8.1 Step-by-Step: Figma to Production

**Phase 1: Analysis**
1. Review Figma design in context of existing app structure
2. Identify reusable components vs. one-off components
3. Extract design tokens (colors, spacing, typography, etc.)
4. Check for existing similar components in codebase

**Phase 2: Setup**
1. Create `src/styles/_design-tokens.scss` if not exists
2. Define all design tokens as CSS custom properties
3. Import design tokens in `src/styles.scss`
4. Create `public/assets/icons/` directory if not exists

**Phase 3: Asset Extraction**
1. Download SVG icons from Figma to `public/assets/icons/`
2. Download images from Figma to `public/assets/images/`
3. Install custom fonts if needed: `bun add @fontsource/[font-name]`
4. Import fonts in `src/styles.scss`

**Phase 4: Component Generation**
1. Determine component location: `features/[feature]/components/[name]`
2. Generate component: `ng generate component [path] --standalone`
3. Or manually create component files following Angular structure

**Phase 5: Implementation**
1. Convert Figma design to Angular template syntax
2. Use Angular 21+ control flow (`@if`, `@for`, etc.)
3. Create component SCSS using design tokens
4. Implement component TypeScript logic with signals
5. Add proper TypeScript types

**Phase 6: Integration**
1. Import new component where needed
2. Test responsive behavior
3. Add accessibility attributes (ARIA labels, roles, etc.)
4. Write unit tests (`.spec.ts`)

**Phase 7: Documentation**
1. Add JSDoc comments to component class
2. Document any complex logic or state management
3. Update `AGENTS.md` if new patterns introduced

### 8.2 Common Patterns

**Empty State Component** (from Figma example):
```typescript
// empty-state.component.ts
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="empty-state">
      <div class="empty-state__container">
        <div class="empty-state__icon-wrapper">
          <img [src]="iconPath" alt="" class="empty-state__icon" />
        </div>
        <p class="empty-state__text">{{ message }}</p>
        <button class="empty-state__button" (click)="action.emit()">
          {{ buttonText }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() message = 'Load an image to start editing';
  @Input() buttonText = 'Load image';
  @Input() iconPath = '/assets/icons/image-icon.svg';
  @Output() action = new EventEmitter<void>();
}
```

**Usage**:
```html
<app-empty-state 
  message="No items found"
  buttonText="Add item"
  (action)="handleAddItem()" />
```

---

## 9. Code Quality Standards

### 9.1 SOLID Principles (Mandatory)

**From AGENTS.md**:
1. **Single Responsibility**: Each service/component has ONE responsibility
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Derived classes substitutable for base classes
4. **Interface Segregation**: Many specific interfaces > one general interface
5. **Dependency Inversion**: Depend on abstractions, not concretions

**Example**:
```typescript
// WRONG: PhotonService initializing FFmpeg (violates SRP)
export class PhotonService {
  async init() {
    await this.initPhoton();
    await this.initFFmpeg(); // WRONG! Not PhotonService's responsibility
  }
}

// CORRECT: Each service handles its own domain
export class PhotonService {
  async init() {
    await this.initPhoton(); // Only Photon
  }
}

export class FFmpegService {
  async init() {
    await this.initFFmpeg(); // Only FFmpeg
  }
}
```

### 9.2 TypeScript Standards

- **Strict mode** enabled (see `tsconfig.json`)
- Always define types for function parameters and return values
- Use interfaces for object shapes
- Use type unions for enums
- Avoid `any` type

**Example**:
```typescript
// Component input/output types
export interface LoadImageEvent {
  file: File;
  timestamp: number;
}

export class MyComponent {
  @Output() loadImage = new EventEmitter<LoadImageEvent>();
  
  handleLoad(file: File): void {
    this.loadImage.emit({ file, timestamp: Date.now() });
  }
}
```

### 9.3 Testing Requirements

**From AGENTS.md**:
- Use Vitest for all testing
- Run tests: `bun test`
- Write tests for new components
- Integration tests for services

**Test Structure**:
```typescript
// component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyComponent]
    });
  });
  
  it('should create', () => {
    const fixture = TestBed.createComponent(MyComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
  
  it('should emit event on button click', () => {
    const fixture = TestBed.createComponent(MyComponent);
    const component = fixture.componentInstance;
    let emitted = false;
    
    component.action.subscribe(() => emitted = true);
    component.handleClick();
    
    expect(emitted).toBe(true);
  });
});
```

---

## 10. Important Constants

### 10.1 Image Processing

**From `src/app/core/constants/image-editor.constants.ts`**:
```typescript
// Thumbnail configuration
THUMBNAIL_PREVIEW.DEFAULT_SIZE = 200;  // px
THUMBNAIL_PREVIEW.QUALITY = 0.85;      // 0-1

// Performance
PERFORMANCE.SLOW_OPERATION_WARNING_MS = 2000;
PERFORMANCE.ADJUSTMENT_DEBOUNCE_MS = 150;
```

### 10.2 Canvas Configuration

```typescript
CANVAS_CONFIG.MAX_ZOOM = 4.0;
CANVAS_CONFIG.MIN_ZOOM = 0.1;
CANVAS_CONFIG.ZOOM_STEP = 0.1;
```

---

## 11. Anti-Patterns to Avoid

### 11.1 Don't Mix Concerns
```typescript
// WRONG: Component handles HTTP calls directly
export class MyComponent {
  async loadData() {
    const response = await fetch('/api/data');
    this.data = await response.json();
  }
}

// CORRECT: Component delegates to service
export class MyComponent {
  constructor(private dataService: DataService) {}
  
  async loadData() {
    this.data = await this.dataService.getData();
  }
}
```

### 11.2 Don't Use Legacy Angular Syntax
```html
<!-- WRONG -->
<div *ngIf="condition">Content</div>
<div *ngFor="let item of items">{{ item }}</div>

<!-- CORRECT -->
@if (condition) {
  <div>Content</div>
}
@for (item of items; track item.id) {
  <div>{{ item }}</div>
}
```

### 11.3 Don't Install CDN Dependencies
```typescript
// WRONG: Using CDN in index.html
<script src="https://cdn.example.com/library.js"></script>

// CORRECT: Install locally
// bun add library
import { Library } from 'library';
```

### 11.4 Don't Create Unnecessary Files
- **AVOID** creating README.md files unless explicitly requested
- **AVOID** creating documentation files unless explicitly requested
- **PREFER** editing existing files over creating new ones
- Keep codebase lean and focused

---

## 12. Quick Reference

### 12.1 Common Commands
```bash
# Development
bun run dev               # Start dev server (port 4800)
bun run build             # Build for production
bun test                  # Run tests

# Generate components
ng generate component features/[feature]/components/[name] --standalone

# Add dependencies
bun add [package-name]
bun add -d [dev-package]  # Dev dependency
```

### 12.2 File Templates

**Component**:
```typescript
import { Component, signal, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
export class MyComponentComponent {
  // State
  public myState = signal<string>('');
  
  // Inputs/Outputs
  @Input() myInput!: string;
  @Output() myOutput = new EventEmitter<void>();
  
  // Methods
  handleAction(): void {
    this.myOutput.emit();
  }
}
```

**Service**:
```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MyService {
  constructor() {}
  
  public doSomething(): void {
    // Implementation
  }
}
```

---

## 13. Summary Checklist

When converting Figma designs to code:

- [ ] Extract design tokens (colors, spacing, typography)
- [ ] Create/update `_design-tokens.scss` with CSS custom properties
- [ ] Download and save SVG/image assets to `public/assets/`
- [ ] Install custom fonts via bun if needed
- [ ] Generate component using Angular CLI or manually
- [ ] Convert Figma output to Angular template syntax (use `@if`, `@for`)
- [ ] Write component SCSS using design tokens and BEM naming
- [ ] Implement TypeScript with signals and proper types
- [ ] Add accessibility attributes (ARIA)
- [ ] Write unit tests (`.spec.ts`)
- [ ] Follow SOLID principles
- [ ] Verify responsive behavior
- [ ] Test on different screen sizes

---

**Last Updated**: 2025-12-18  
**Maintained By**: AI Development Team  
**Questions**: Refer to AGENTS.md for additional development standards
