/**
 * dsh-password-shield — DeepSeek Harness plugin (host half is intentionally a
 * no-op). The entire fix lives in the browser bundle served from `./client`:
 * it rewrites API-key `<input type="password">` elements (rendered by the
 * official Models / Plugins settings surfaces and by third-party panels) into
 * masked `type="text"` fields. Chrome and iCloud Passwords only trigger their
 * save/autofill bubbles for real password fields, so the conversion stops the
 * ugly prompt without touching DSH credentials.
 *
 * @module dsh-password-shield
 */

export const name = 'password-shield'

/** The browser half has no host service dependencies. */
export const inject = []

/** No host behavior; client bundle activation is enough. */
export function apply() {}
