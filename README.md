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
dsh plugin --profile web add github:ruby1304/dsh-password-shield
# Restart dsh web.
```

After an npm release:

```bash
dsh plugin --profile web add dsh-password-shield
```

## Tests

```bash
npm install
npm test
```

Tests cover pre-existing and dynamically inserted iCloud completion lists, ordinary DSH popovers, unrelated extension iframes, and the guarantee that password/text inputs remain untouched.

## License

MIT
