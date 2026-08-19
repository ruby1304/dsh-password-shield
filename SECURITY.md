# Security policy

## Supported versions

| Version | Support |
| --- | --- |
| `0.3.x` | Security fixes |
| `main` | Pre-release fixes and review |
| Older releases | Unsupported; upgrade to 0.3.x |

Version 0.1.0 rewrote password-type fields and is intentionally superseded. Version 0.3.0 does not read or modify credential fields. Its Host half is a no-op; its browser half only removes the iCloud Passwords completion-list iframe from the matching extension origin.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** flow:

<https://github.com/ruby1304/dsh-password-shield/security/advisories/new>

Do not include credentials, session text, local paths, browser profiles or extension data in a public issue. A useful report includes the DSH, browser, extension and plugin versions, plus the smallest synthetic DOM reproduction that does not contain private page data.

## Security boundaries

- The plugin is a page-level compatibility guard, not a browser or credential security boundary.
- It does not disable the iCloud Passwords extension globally.
- It does not inspect closed shadow roots or browser-owned native UI.
- It makes no network requests and stores no state.
- A local user or extension that can alter the page retains its existing authority.
