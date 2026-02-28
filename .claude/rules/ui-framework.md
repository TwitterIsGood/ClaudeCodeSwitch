# Material 3 UI Framework Constraints

## Core Guideline
All new UI components, dialogs, and panels must strictly conform to **Material Design 3 (M3)** specifications.

## Technology Stack
- **Native/Window Integration**: Use `tauri-plugin-m3` (by 0xk1f0) for seamless OS-level Material You dynamic color extraction and window background materials (Mica/Acrylic).
- **React UI Component Layer**: Do NOT use raw HTML/CSS for complex components. Use Google's official **`@material/web`** (Material Web Components) as the standard frontend UI library mapped to the CSS variables provided by `tauri-plugin-m3`. Note that since `@material/web` provides Web Components, ensure proper usage within React (e.g., handling custom events).

## Migration Rules
- Any legacy custom components (current `CustomConfirmModal`, `CustomPromptModal`, `ToastContainer`) must be migrated to their M3 equivalents in future refactors.
- Do not mix legacy generic dark-theme styles with M3. Use M3 standardized surface colors, primary/secondary action colors, typography, and elevation shadows.