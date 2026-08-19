/**
 * dsh-password-shield — client-only DeepSeek Harness plugin.
 *
 * The browser bundle removes only the iCloud Passwords completion-list iframe
 * that can float over the chat composer. The Host half is intentionally a
 * no-op: it has no credential, filesystem or network access.
 *
 * @module dsh-password-shield
 */

export const name = 'password-shield'

/** The browser half has no host service dependencies. */
export const inject = []

/** No host behavior; client bundle activation is enough. */
export function apply() {}
