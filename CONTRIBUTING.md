# Contributing

Thank you for helping improve Figma UI Blueprint Builder.

By participating, you agree to follow the
[Code of Conduct](./CODE_OF_CONDUCT.md). Contributions intentionally submitted
for inclusion in this project are licensed under Apache License 2.0, consistent
with Section 5 of that license.

## Before opening an issue

- Use GitHub Discussions for setup help, Blueprint design questions, and
  general ideas.
- Search existing Issues and Discussions.
- Remove private Figma URLs, client screenshots, credentials, personal data,
  voice samples, payment data, and identity material.
- Reduce bugs to a minimal Blueprint whenever possible.

Security vulnerabilities must not be reported in public Issues. Follow
[SECURITY.md](./SECURITY.md).

## Development setup

```bash
git clone https://github.com/pilapipi/figma-ui-blueprint-builder.git
cd figma-ui-blueprint-builder
npm ci
npm run check
```

To test in Figma Desktop:

1. Run `npm run build`.
2. Import `manifest.json` as a local development plugin.
3. Validate and generate
   `examples/memory-music/blueprint.json`.
4. Verify the component and screen counts in Figma.

## Architecture boundary

- `code.ts` is a domain-neutral Blueprint renderer.
- Product and customer content belongs in project Blueprints, not the runtime.
- Examples must stay small, fictional, and redistributable.
- Do not add a customer name, brand-specific phase, or fixed screen count to
  the runtime.
- Extend the JSON Schema and renderer only for a reusable capability that the
  existing Layer DSL cannot express.
- Reference screenshots are evidence, not final full-screen image layers.

## Changing the Blueprint Schema

Schema changes require:

1. an updated `schema/blueprint.schema.json`;
2. matching runtime validation and rendering behavior;
3. an updated field reference in `docs/BLUEPRINT.md`;
4. a valid example or focused fixture;
5. a migration note when existing Blueprints are affected.

Backward-compatible additions should remain within Blueprint 1.x. Breaking
changes require a new `schemaVersion`.

## Pull requests

Keep pull requests focused and include:

- the problem and intended generic use case;
- the chosen design and alternatives considered;
- tests or a valid example Blueprint;
- screenshots only when they contain no confidential material;
- documentation for user-facing behavior;
- confirmation that `npm run check` passes.

Pull request titles should be concise and use an imperative verb, for example:

```text
Add radial gradient layer support
Fix nested instance text overrides
Document copied Figma file workflow
```

Maintainers may ask to move product-specific logic into an example or external
Blueprint.

## Release policy

The project follows semantic versioning:

- patch: fixes without Blueprint contract changes;
- minor: backward-compatible capabilities;
- major: breaking Schema or runtime behavior changes.

## License and trademarks

Code contributions are accepted under Apache License 2.0. No contribution
grants permission to use pilapp trademarks, trade names, logos, or product
branding beyond reasonable attribution.
