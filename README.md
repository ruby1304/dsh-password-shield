# dsh-password-shield

Silence the ugly browser password-manager bubbles in the DeepSeek Harness (DSH) web UI.

There are two distinct bubbles, from two different engines, and this plugin handles both:

## Bubble 1 — Chrome's built-in "Save password?" prompt

DSH's official web UI renders API-key fields (first-run **Add an API key** dialog,
**Settings → Models**, and **Settings → Plugins → Web Search**) as
`<input type="password" autocomplete="off">`. Chrome deliberately ignores
`autocomplete="off"` on password fields, so its native save/autofill bubble appears
on top of the dialog. The same is true for other Chromium password managers that key
off `type="password"`.

**Fix:** the plugin rewrites every DSH password-type input into a `type="text"`
input that stays visually masked with `-webkit-text-security: disc`. Chrome's
built-in password manager only tracks real `type="password"` fields, so the prompt
never appears. React-controlled values, editing, and DSH credential storage are
unchanged.

## Bubble 2 — iCloud Passwords completion-list popup (floats over the chat composer)

The iCloud Passwords Chrome extension runs WebKit-style form heuristics on every
page. On DSH conversation pages it decides a text field is credential-shaped and
pops its completion list — the floating bubble reading
“iCloud 密码 / 打开‘密码’ App / 查找和创建密码” — anchored over the chat composer,
even when no password is saved for the site. Page-level attributes can't reliably
opt out of those heuristics, but the bubble is an in-page element: the extension
appends a `<div popover>` to `<body>` whose open shadow root hosts an iframe pointing
at its `completion_list.html`.

**Fix:** the plugin watches the DOM and neutralizes that container the moment it is
inserted — the shadow iframe is removed and the host is forced invisible (without
detaching it, so the extension's popover bookkeeping never throws). The bubble never
paints on DSH pages.

## Install

```bash
dsh plugin --profile web add dsh-password-shield
# restart the running `dsh web` process
```

Or add the row manually to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: password-shield
      name: 'dsh-password-shield'
```

Then link/build the package into the profile and restart `dsh web`.

## What it changes

| Before | After |
|---|---|
| `<input type="password" autocomplete="off">` | `<input type="text" data-dsh-password-shield="masked" autocomplete="off">` |
| Chrome shows save/autofill password UI | Chrome sees an ordinary text field |
| iCloud Passwords bubble floats over the composer | The popup container is neutralized on insertion |

The guard runs as soon as the client bundle loads and then watches the DOM:

- converts fields that already exist;
- converts fields inserted later (React dialogs, settings pages, third-party panels);
- re-applies the conversion if React re-renders the field back to `password`;
- walks open shadow roots;
- neutralizes the iCloud completion-list popup wherever it appears;
- cleans its observer and timer when the plugin is unloaded.

## Security

This plugin never reads, stores, or transmits input values. It only changes HTML
input types/autofill attributes and hides the iCloud Passwords in-page popup.
API keys keep their existing DSH credential flow.

## Development

```bash
npm install
npm test
```

## License

MIT
