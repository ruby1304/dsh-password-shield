# dsh-password-shield

Silence the ugly browser password prompt over DeepSeek Harness API-key inputs.

DSH's official web UI renders API-key fields (first-run **Add an API key** dialog,
**Settings → Models**, and **Settings → Plugins → Web Search**) as
`<input type="password" autocomplete="off">`. Chrome deliberately ignores
`autocomplete="off"` on password fields, so its native
“Save password?” / key-icon bubble can appear on top of the dialog — and the
same happens with iCloud Passwords and similar password managers. The prompt is
especially noticeable in older DSH web profiles (for example a long-running or
SSH-tunneled instance) whose first-run onboarding or plugin API-key dialog is
still open.

This client-only plugin rewrites every DSH password-type input into a `type="text"`
input that stays visually masked with `-webkit-text-security: disc`. Chrome's
password manager only tracks real `type="password"` fields, so the prompt never
appears; React-controlled values, editing, and DSH credential storage are
unchanged.

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
| Browser shows save/autofill password UI | Browser sees an ordinary text field |
| Dots via native password masking | Dots via `-webkit-text-security: disc` |

The guard runs as soon as the client bundle loads and then watches the DOM:

- converts fields that already exist;
- converts fields inserted later (React dialogs, settings pages, third-party panels);
- re-applies the conversion if React re-renders the field back to `password`;
- walks open shadow roots;
- cleans its observer and timer when the plugin is unloaded.

## Why not fix it upstream only?

The upstream inputs are intentional masking UX; the browser behavior is the
surprising part. A plugin keeps the fix out-of-tree, version-independent, and
also covers other DSH plugins that render password fields.

## Security

This plugin never reads, stores, or transmits input values. It only changes
the HTML input type and autofill attributes in the page. API keys keep their
existing DSH credential flow.

## Development

```bash
npm install
npm test
```

## License

MIT
