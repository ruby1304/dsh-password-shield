# Contributing

Keep this plugin narrow. Changes must not read field values, rewrite password or API-key inputs, add telemetry, persist browser state, or broaden matching beyond a reviewed password-manager surface.

Before opening a pull request:

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run --ignore-scripts
```

Add a synthetic regression test for every selector or lifecycle change. Never attach real page HTML, credentials, session text, browser-profile data or extension storage to an issue or fixture.
