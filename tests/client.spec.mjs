import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const disposers = []

/** Minimal Cordis-like context for exercising the cleanup path. */
function makeCtx() {
  return {
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
  }
}

function tick(ms = 0) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

let plugin

beforeAll(async () => {
  let handoff
  window.__ModuleLoader__ = {
    load(value) {
      handoff = value
    },
  }
  await import('../client.js')
  expect(handoff).toBeTruthy()
  expect(handoff.id).toBe('dsh-password-shield')
  plugin = handoff.factory()
  expect(typeof plugin.apply).toBe('function')
})

afterEach(async () => {
  document.body.replaceChildren()
  while (disposers.length > 0) disposers.pop()()
  await tick()
})

function addInput(type = 'password', attrs = {}) {
  const input = document.createElement('input')
  input.type = type
  for (const [name, value] of Object.entries(attrs)) input.setAttribute(name, value)
  document.body.appendChild(input)
  return input
}

describe('dsh-password-shield', () => {
  it('converts an existing password input into a masked text input', () => {
    const input = addInput('password', { autocomplete: 'off', value: 'sk-secret' })
    plugin.apply(makeCtx())

    expect(input.type).toBe('text')
    expect(input.value).toBe('sk-secret')
    expect(input.getAttribute('data-dsh-password-shield')).toBe('masked')
    expect(input.classList.contains('dsh-password-shield-masked')).toBe(true)
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(input.getAttribute('data-1p-ignore')).toBe('true')
    expect(input.form).toBe(null)

    const style = document.getElementById('dsh-password-shield-style')
    expect(style).toBeTruthy()
    expect(style.textContent).toContain('-webkit-text-security:disc')
  })

  it('leaves ordinary text inputs untouched', () => {
    const input = addInput('text', { name: 'query', value: 'hello' })
    plugin.apply(makeCtx())

    expect(input.type).toBe('text')
    expect(input.hasAttribute('data-dsh-password-shield')).toBe(false)
  })

  it('converts password inputs inserted after activation', async () => {
    plugin.apply(makeCtx())
    const input = addInput('password', { autocomplete: 'off', value: 'late-secret' })
    await tick()

    expect(input.type).toBe('text')
    expect(input.getAttribute('data-dsh-password-shield')).toBe('masked')
    expect(input.value).toBe('late-secret')
  })

  it('re-applies the mask when a re-render sets the type back to password', async () => {
    plugin.apply(makeCtx())
    const input = addInput('password')
    await tick()
    expect(input.type).toBe('text')

    // React-style re-render: the attribute is reset on the live DOM node.
    input.setAttribute('type', 'password')
    expect(input.type).toBe('password')
    await tick()

    expect(input.type).toBe('text')
    expect(input.getAttribute('data-dsh-password-shield')).toBe('masked')
  })

  it('reaches password inputs inside shadow roots', async () => {
    plugin.apply(makeCtx())
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const input = document.createElement('input')
    input.type = 'password'
    shadow.appendChild(input)
    document.body.appendChild(host)
    await tick()

    expect(input.type).toBe('text')
    expect(input.getAttribute('data-dsh-password-shield')).toBe('masked')
  })

  it('marks the parent form autocomplete off when one exists', () => {
    const form = document.createElement('form')
    form.autocomplete = 'on'
    document.body.appendChild(form)
    const input = addInput('password')
    form.appendChild(input)

    plugin.apply(makeCtx())

    expect(form.getAttribute('autocomplete')).toBe('off')
    expect(input.type).toBe('text')
  })

  function makeCompletionListHost() {
    const host = document.createElement('div')
    host.setAttribute('popover', 'manual')
    const shadow = host.attachShadow({ mode: 'open' })
    const frame = document.createElement('iframe')
    frame.src = 'chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/completion_list.html?username=&isDark=false'
    shadow.appendChild(frame)
    return host
  }

  it('neutralizes a pre-existing iCloud completion-list popup', () => {
    const host = makeCompletionListHost()
    document.body.appendChild(host)

    plugin.apply(makeCtx())

    expect(host.shadowRoot.querySelectorAll('iframe').length).toBe(0)
    expect(host.style.display).toBe('none')
    expect(host.style.visibility).toBe('hidden')
    // The host stays connected so the extension's popover bookkeeping never throws.
    expect(host.isConnected).toBe(true)
  })

  it('neutralizes an iCloud completion-list popup inserted after activation', async () => {
    plugin.apply(makeCtx())

    const host = makeCompletionListHost()
    document.body.appendChild(host)
    await tick()

    expect(host.shadowRoot.querySelectorAll('iframe').length).toBe(0)
    expect(host.style.display).toBe('none')
  })

  it('leaves ordinary popovers (no completion-list iframe) untouched', async () => {
    plugin.apply(makeCtx())

    const popover = document.createElement('div')
    popover.setAttribute('popover', 'manual')
    const shadow = popover.attachShadow({ mode: 'open' })
    shadow.appendChild(document.createElement('span'))
    document.body.appendChild(popover)
    await tick()

    expect(popover.isConnected).toBe(true)
    expect(popover.style.display).toBe('')
    expect(popover.shadowRoot.querySelectorAll('span').length).toBe(1)
  })
})
