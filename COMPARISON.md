# Related open-source plugins (checked before building this one)

The npm/GitHub search (Aug 2026) found no DSH plugin that suppresses the Chrome
password-manager prompt on API-key fields. The closest projects solve different
problems:

| Project | What it does | Why it is not the fix |
|---|---|---|
| [dsh-passwords](https://www.npmjs.com/package/dsh-passwords) | Server-grade login gateway / multi-tenant access | Adds a login password page; does not touch DSH API-key inputs |
| [deepseek-harness-auth](https://www.npmjs.com/package/deepseek-harness-auth) | Fail-closed HTTP auth proxy for the web profile | Protects access to DSH; the API-key dialog still uses `type="password"` |
| [dsh-password-prompt](https://github.com/MagicCrazyMan/dsh-password-prompt) | Lets the agent ask the user for a password in a masked panel | Adds another password input; does not silence browser prompts |
| [dsh-terminal-panel](https://github.com/wuwuzhige-sudo/dsh-terminal-panel) | Web terminal with a sudo password prompt | Different feature; same browser-password-manager exposure on its field |
| LAN/Tailscale auth gates (`dsh-web-auth`, `dsh-lan-gate`, etc.) | Password-gate remote access | Authentication for the whole UI, not the API-key autofill prompt |

`dsh-password-shield` is the missing piece: it converts every DSH
`<input type="password">` secret field into a visually-masked `type="text"`
field, which is the reliable way to keep Chrome / iCloud Passwords / 1Password
from treating DSH API keys as account passwords.
