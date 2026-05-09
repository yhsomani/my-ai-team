## 2024-05-09 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Found multiple instances across the frontend components (`AuraNavbar`, `AuraModal`, and `Toast`) where icon-only buttons (`AuraButton` with `size="icon"` or native `<button>`) were missing descriptive `aria-label`s. This pattern significantly impacts screen reader users, who would only hear "button" without context.
**Action:** Always ensure any button that visually relies entirely on an icon includes an `aria-label` attribute describing its function or action.
