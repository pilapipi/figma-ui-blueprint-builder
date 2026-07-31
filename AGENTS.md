# Agent protocol

This repository is a generic screenshot / design-document to Figma component
and screen builder.

## Required workflow

For each new product project:

1. Obtain a readable Figma document, copied `.fig` file, or exported screenshots.
2. Complete `PROJECT_BRIEF.md` and `SOURCE_INVENTORY.md`.
3. Analyze repeated patterns and complete `COMPONENT_MAP.md`.
4. Apply user customization before authoring `blueprint.json`.
5. Validate the Blueprint, build the plugin, generate in Figma, and verify exact
   component and screen counts.

Do not claim visual analysis when only filenames or node metadata are available.
Ask for copied files or screenshots when source access is blocked.

## Architecture boundary

- `code.ts` is a domain-neutral Blueprint runtime.
- Domain content belongs in `projects/*/blueprint.json`.
- Examples must stay small and generic.
- Never add a customer name, hard-coded page count, or product-specific phase
  branch to the runtime.
- Extend the JSON Schema and generic renderer only when the current Layer DSL
  cannot represent a reusable capability.

## Output quality

- Reference screenshots are evidence, not final full-screen image layers.
- Final screens use editable text, vectors, frames, Auto Layout, components,
  and instances.
- Every source state has an explicit rebuild / merge / omit decision.
- Generated nodes are tagged with the `ui_blueprint_builder` namespace.
- Never remove untagged user content.

Run `npm run check` before committing.
