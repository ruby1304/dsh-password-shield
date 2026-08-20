import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const disposers = []
function makeCtx() {
  return { effect(callback) { const dispose = callback(); if (typeof dispose === 'function') disposers.push(dispose) } }
}
function tick(ms = 0) { return new Promise((resolve) => setTimeout(resolve, ms)) }

let plugin
beforeAll(async () => {
  let handoff
  window.__ModuleLoader__ = { load(value) { handoff = value } }
  await import('../client.js')
  expect(handoff.id).toBe('dsh-password-shield')
  plugin = handoff.factory()
})

afterEach(async () => {
  while (disposers.length) disposers.pop()()
  document.body.replaceChildren()
  await tick()
})

function makeCompletionListHost(src = 'chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/completion_list.html?isDark=false') {
  const host = document.createElement('div')
  host.setAttribute('popover', 'manual')
  const shadow = host.attachShadow({ mode: 'open' })
  const frame = document.createElement('iframe')
  frame.src = src
  shadow.appendChild(frame)
  return host
}

describe('dsh-password-shield', () => {
  it('neutralizes a completion list already in the document', () => {
    const host = makeCompletionListHost()
    document.body.appendChild(host)
    plugin.apply(makeCtx())
    expect(host.shadowRoot.querySelector('iframe')).toBeNull()
    expect(host.style.display).toBe('none')
    expect(host.isConnected).toBe(true)
  })

  it('neutralizes a completion list inserted after activation', async () => {
    plugin.apply(makeCtx())
    const host = makeCompletionListHost()
    document.body.appendChild(host)
    await tick()
    expect(host.shadowRoot.querySelector('iframe')).toBeNull()
    expect(host.dataset.dshPasswordShield).toBe('icloud-completion-list')
  })

  it('leaves ordinary DSH popovers untouched', async () => {
    plugin.apply(makeCtx())
    const host = document.createElement('div')
    host.setAttribute('popover', 'manual')
    host.attachShadow({ mode: 'open' }).appendChild(document.createElement('span'))
    document.body.appendChild(host)
    await tick()
    expect(host.style.display).toBe('')
    expect(host.shadowRoot.querySelector('span')).not.toBeNull()
  })

  it('does not modify password or ordinary text inputs', async () => {
    plugin.apply(makeCtx())
    const password = document.createElement('input')
    password.type = 'password'
    password.autocomplete = 'current-password'
    const composer = document.createElement('textarea')
    composer.autocomplete = 'off'
    document.body.append(password, composer)
    await tick()
    expect(password.type).toBe('password')
    expect(password.autocomplete).toBe('current-password')
    expect(password.hasAttribute('data-dsh-password-shield')).toBe(false)
    expect(composer.autocomplete).toBe('off')
  })

  it('does not block unrelated extension iframes', async () => {
    plugin.apply(makeCtx())
    const host = makeCompletionListHost('chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/some_other_popup.html')
    document.body.appendChild(host)
    await tick()
    expect(host.shadowRoot.querySelector('iframe')).not.toBeNull()
    expect(host.style.display).toBe('')
  })

  it('does not hide a web page with the same file name', async () => {
    plugin.apply(makeCtx())
    const host = makeCompletionListHost('https://example.test/completion_list.html')
    document.body.appendChild(host)
    await tick()
    expect(host.shadowRoot.querySelector('iframe')).not.toBeNull()
    expect(host.style.display).toBe('')
  })

  it('does not hide another extension with the same file name', async () => {
    plugin.apply(makeCtx())
    const host = makeCompletionListHost('chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/completion_list.html')
    document.body.appendChild(host)
    await tick()
    expect(host.shadowRoot.querySelector('iframe')).not.toBeNull()
    expect(host.style.display).toBe('')
  })
})

describe('DSH rc.8 client package contract', () => {
  it('declares only the Cordis relationship used by the dependency-free client', async () => {
    const manifest = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8'))
    expect(manifest.version).toBe('0.3.1')
    expect(manifest.dsh.client).toEqual({ platform: 'web', inject: [] })
    expect(manifest.dsh.client).not.toHaveProperty('immediately')
    expect(manifest.dsh.client).not.toHaveProperty('external')
    expect(manifest.peerDependencies).toEqual({ '@deepseek-ai/cordis': '4.0.1' })
    expect(manifest.devDependencies['@deepseek-ai/cordis']).toBe('4.0.1')
    expect(manifest.dependencies).toBeUndefined()
    expect(Object.keys(manifest.devDependencies).filter((name) => name.startsWith('@deepseek-ai/dsh-'))).toEqual([])
  })

  it('requests no dynamic shared modules through dsh.client.inject', () => {
    expect(plugin.inject).toEqual([])
  })
})
