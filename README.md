# dsh-password-shield

A narrowly scoped DSH web plugin that blocks the iCloud Passwords completion-list popup floating over the chat composer in old conversations.

## The problem

The iCloud Passwords Chrome extension applies WebKit-style credential-field heuristics to every page. On some DSH conversation pages it misclassifies the chat composer and injects its empty completion list:

- iCloud Passwords
- Open Passwords App
- Find and create passwords

No saved credential is required. The empty-state popup itself confirms that the extension offered autofill even though it found no credential for the DSH URL.

The popup is implemented as a `<div popover>` appended to `<body>`. Its open shadow root contains an iframe whose extension URL points to `completion_list.html`.

## The fix

The plugin watches the DOM for exactly that structure. When it appears, it removes the completion-list iframe and forces its host invisible while keeping the host connected, allowing the extension to finish its own show/hide bookkeeping safely.

It intentionally does **not**:

- change `input[type=password]` into another type;
- modify API-key fields;
- change autocomplete attributes;
- read or store field values;
- hide ordinary DSH popovers;
- hide unrelated extension iframes.

## Install

```bash
dsh plugin --profile web add dsh-password-shield@0.3.1 --save-exact --ignore-scripts
# Restart dsh web.
```

For a reviewed checkout during development only:

```bash
dsh plugin --profile web add github:ruby1304/dsh-password-shield#<full-commit-sha> --save-exact --ignore-scripts
```

Never use a mutable branch or `link:` checkout as production state.

Version `0.3.1` targets DSH `0.1.0-rc.8` exactly. Its browser bundle has no
DSH-internal module request, relies only on the rc.8 baseline loader, and does
not request eager activation.

## Privacy and security

- The Host half is a no-op. It has no credential, filesystem, process or network access.
- The browser half never reads input values and never changes password or API-key fields.
- Matching is limited to the public iCloud Passwords extension ID and a `completion_list.html` iframe inside an open shadow root.
- The plugin sends no telemetry and stores no state.

Uninstall with `dsh plugin --profile web remove dsh-password-shield`, restart DSH Web, and reload open pages. A completion-list iframe already removed from the current document is restored only by that page reload.

## Tests

```bash
npm install
npm run check
npm run release:check
```

Tests cover pre-existing and dynamically inserted iCloud completion lists, ordinary DSH popovers, unrelated extension iframes, and the guarantee that password/text inputs remain untouched.

## License

MIT
