# Default design system

The default Evidence Console now follows the design language from the `app/` directory of [LOOPAPPdev/ai-brand-visibility-template](https://github.com/LOOPAPPdev/ai-brand-visibility-template/tree/main/app).

## Adaptation

The original template is a React Router/Tailwind application. This repository remains a Vite + React Flow application, so the source `app/` directory is preserved under `vendor/ai-brand-visibility-template/app` while the runnable page uses a plain CSS adaptation in `frontend/src/styles/global.css`.

The page keeps the existing evidence-led information architecture and light Kumo/Cloudflare visual system, with a semantic dark palette available from Preferences:

- Near-white canvas with a restrained dot grid.
- White rounded surfaces with fine neutral borders and subtle elevation.
- Cloudflare blue as the action, focus, and supported-evidence color.
- Amber for hypotheses and unvalidated relationships.
- System/Light/Dark preference is device-local; dark mode remaps semantic tokens instead of changing component structure.
- React Flow grid, minimap, selected states, evidence cards and focus colors are driven by semantic theme tokens; the canonical causal/evidence status remains labelled in text and is never color-only.
- IBM Plex Sans for interface text and IBM Plex Mono for identifiers, citations, and status metadata.
- Responsive asymmetric workspace: evidence rail, mechanism map, and analysis rail.

The design system does not change the safety contract: retrieved passages remain data, causal links remain hypotheses until validated, and simulation remains explicitly gated.
