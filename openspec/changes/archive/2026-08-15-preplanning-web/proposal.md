# Proposal: Preplanning Web — Product Front Door & Editor Hardening

## Intent

Users land in a raw editor: broken dark mode, red lint, global fixtures, non-undoable drags, low-res export, silent failures, no landing. Goal: the ideal web to pre-plan a house before consulting a professional — landing, reliable accessible editor, professional-ready output.

## Scope

### In Scope
- Landing at `/`: hero, value prop, CTA
- Foundations: lint, dark mode, layers/memo, enclosed, export
- Fixtures per floor; delete + undoable drags; opening cleanup
- Save/load: projects, rename, import/export, clear, migration
- Template confirm + preview
- PNG export: compass, scale, high-res
- Docs: TOC/prev-next, search, categories
- A11y: keyboard, focus, ARIA, real select/switch
- Toasts, boundaries, hints, empty states; minimal responsive

### Out of Scope
- Prisma/backend persistence, auth; PDF/DXF export; mobile redesign; new deps

## Capabilities

> sdd-spec contract. No specs exist — all NEW.

### New Capabilities
- `landing-page`: hero, value prop, CTA
- `dark-mode`: toggle, dark-safe colors
- `fixtures-management`: per-floor, delete, openings
- `editor-history`: fixture/compass undo
- `editor-rendering`: layers, memo, enclosed
- `project-persistence`: list, rename, import/export
- `image-export`: PNG compass, scale
- `templates`: confirm + preview
- `accessibility`: keyboard, focus, ARIA
- `docs-experience`: TOC, search, categories
- `feedback-system`: toasts, boundaries, hints

### Modified Capabilities
None — no existing specs.

## Approach

Four slices: foundations (lint, dark, layers); correctness (fixtures, history, enclosed, export); UX (landing, persistence, templates, feedback); docs + a11y + responsive. Each keeps lint/tsc/build green and validates canvas flows (04/08/09).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/` + `landing/` | New | Landing route |
| `src/app/globals.css` | Modified | `@custom-variant dark` |
| `src/components/canvas/` | Modified | Memoized, dark-safe |
| `src/stores/fixtures.store.ts` | Modified | floorId, delete, history |
| `src/stores/rooms.store.ts` | Modified | Cascade-delete openings |
| `src/components/panel/PropertiesPanel.tsx` | Modified | Enclosed, export, a11y |
| `src/lib/storage.ts` | Modified | Projects, import/export |
| `src/lib/export.ts` | New | PNG export |
| `src/components/docs/` + `src/lib/docs.ts` | Modified | TOC, search, categories |
| `src/components/ui/` | Modified | Accessible select/switch |
| `src/components/feedback/` | New | Toasts, boundaries, hints |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large scope → long delivery | High | Auto-chained slices, 800-line budget |
| Layer split regresses canvas | Med | Manual validation (04/09) |
| Storage migration data loss | Low | Migrate on load; keep legacy key |
| Dark variant breaks UI | Med | Visual pass editor + docs |
| Docs re-categorization breaks sidebar | Low | Update CATEGORY_ORDER + getDocsByCategory |

## Rollback Plan

- Revertible per-slice commits (feature-branch-chain); legacy storage key kept until import verified
- Dark: remove `@custom-variant`
- Landing: revert route; editor stays at `/`

## Dependencies

- None new; existing stack only.

## Success Criteria

- [ ] lint/tsc/build green
- [ ] Dark toggle re-themes editor + docs + grid
- [ ] Fixtures per floor; Backspace deletes; room delete removes openings
- [ ] Drags = one undo step; enclosed toggle renders
- [ ] PNG compass/scale; landing CTA; template preview + undo
- [ ] Projects CRUD + import/export, legacy migration
- [ ] Keyboard nav, visible focus, no critical axe violations
- [ ] Docs TOC/prev-next + body search; seguridad-obra visible
