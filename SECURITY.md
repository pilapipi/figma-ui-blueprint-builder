# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| Earlier versions | No |

## Reporting a vulnerability

Do not open a public Issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting form:

<https://github.com/pilapipi/figma-ui-blueprint-builder/security/advisories/new>

Please include:

- affected version or commit;
- impact and attack scenario;
- minimal reproduction steps;
- relevant Blueprint or plugin behavior with private data removed;
- any suggested mitigation.

The maintainers aim to acknowledge a complete report within three business days
and will coordinate validation, remediation, disclosure, and credit with the
reporter. Timelines depend on severity and reproducibility.

## Scope

Relevant reports include:

- unsafe handling of Blueprint or embedded image data;
- generated content modifying untagged Figma nodes;
- unexpected network or data exfiltration behavior;
- dependency or build-chain vulnerabilities;
- privilege or repository automation issues.

The plugin manifest intentionally allows no network access. Do not include
customer files, credentials, personal data, or confidential screenshots in a
security report unless the maintainers explicitly request a secure transfer.
