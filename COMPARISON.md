# Related open-source plugins

No existing DSH plugin was found that targets the iCloud Passwords in-page completion list floating over the DSH chat composer.

Related DSH authentication/password projects solve different problems:

| Project type | What it solves | Why it does not solve this issue |
|---|---|---|
| DSH login/auth gateways | Protect access to the DSH web UI | Do not control iCloud Passwords page heuristics or its injected completion list |
| Agent password-prompt panels | Let an agent request a secret securely | Add a password-entry workflow rather than suppressing the unrelated composer popup |
| Browser password-manager ignore attributes | Ask managers not to autofill selected fields | iCloud Passwords does not reliably honor those attributes for its focus/classification gate |

`dsh-password-shield` therefore uses a surgical UI-level fix: it recognizes only the iCloud extension's `completion_list.html` shadow iframe and neutralizes that popup. It does not alter DSH inputs or credential handling.
