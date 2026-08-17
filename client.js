/**
 * dsh-password-shield — browser half (client bundle).
 *
 * DeepSeek Harness renders API-key inputs (Models page, official-DeepSeek
 * onboarding dialog, and Plugins > Web Search card) as
 * `<input type="password" autocomplete="off">`. Chrome deliberately ignores
 * `autocomplete="off"` on password fields and may show its native
 * save/update/use-password bubble over them; iCloud Passwords and similar
 * extensions do the same. This bundle keeps every secret field visually
 * masked while changing its real input type to `text`, so browser password
 * managers never classify DSH API keys as account passwords.
 *
 * The bundle has no imports and only talks to the DSH client module loader.
 */
(function () {
  'use strict'

  var ID = 'dsh-password-shield'
  var MARK = 'data-dsh-password-shield'
  var CLASS = 'dsh-password-shield-masked'
  var STYLE_ID = 'dsh-password-shield-style'
  var SWEEP_INTERVAL_MS = 2000

  /** Set an attribute only when the value would change (avoids observer loops). */
  function setAttr(node, name, value) {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value)
  }

  /** Whether a node is an input that a password manager could classify as a password field. */
  function isPasswordInput(node) {
    if (!node || node.nodeType !== 1 || node.tagName !== 'INPUT') return false
    var attr = String(node.getAttribute('type') || '').toLowerCase()
    var prop = String(node.type || '').toLowerCase()
    return attr === 'password' || prop === 'password'
  }

  /** Rewrite one password field into a masked text field. */
  function maskInput(input) {
    if (!input || input.nodeType !== 1 || input.tagName !== 'INPUT') return
    var wasPassword = isPasswordInput(input)
    var wasMarked = input.getAttribute(MARK) === 'masked'
    if (!wasPassword && !wasMarked) return

    if (!wasMarked) {
      input.setAttribute(MARK, 'masked')
      if (input.classList) input.classList.add(CLASS)
    }

    // Neutral autofill surface. `type="text"` is what actually removes the
    // field from Chrome's password-manager form model; these attributes stop
    // other autofill heuristics from guessing that this is a credential.
    setAttr(input, 'autocomplete', 'off')
    setAttr(input, 'autocapitalize', 'off')
    setAttr(input, 'autocorrect', 'off')
    setAttr(input, 'spellcheck', 'false')
    setAttr(input, 'data-lpignore', 'true')
    setAttr(input, 'data-1p-ignore', 'true')

    if (wasPassword) {
      try {
        // Changing the live `type` property also updates the attribute; a
        // later React re-render may set it back, and the observer + periodic
        // sweep below re-apply the conversion.
        input.type = 'text'
      } catch (_error) {
        // Very old engines may refuse type changes on some inputs; Chrome,
        // Edge, Safari, and Firefox all accept it.
      }
    }

    var form = input.form
    if (form) setAttr(form, 'autocomplete', 'off')
  }

  /** Visit every input under one root, descending into open shadow roots. */
  function sweepTree(root, seen) {
    if (!root) return
    var hostList = []
    if (root.nodeType === 9) {
      var doc = root
      if (doc.documentElement) hostList.push(doc.documentElement)
    } else if (root.nodeType === 1) {
      hostList.push(root)
    }

    while (hostList.length > 0) {
      var host = hostList.pop()
      var inputs = host.querySelectorAll ? host.querySelectorAll('input') : []
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i]
        if (!seen.has(input)) {
          seen.add(input)
          if (isPasswordInput(input) || input.getAttribute(MARK) === 'masked') maskInput(input)
        }
      }
      if (host.shadowRoot) hostList.push(host.shadowRoot)
      if (typeof host.querySelectorAll === 'function') {
        var elements = host.querySelectorAll('*')
        for (var j = 0; j < elements.length; j++) {
          var element = elements[j]
          if (element.shadowRoot) hostList.push(element.shadowRoot)
        }
      }
    }
  }

  /** Full pass over the document and all open shadow trees. */
  function sweepDocument(doc) {
    sweepTree(doc, new Set())
  }

  /** Process newly inserted nodes without walking the whole page. */
  function handleMutations(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i]
      if (mutation.type === 'attributes') {
        var target = mutation.target
        if (isPasswordInput(target) || (target && target.getAttribute && target.getAttribute(MARK) === 'masked')) {
          maskInput(target)
        }
        continue
      }
      if (mutation.type !== 'childList') continue
      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var added = mutation.addedNodes[j]
        if (!added || added.nodeType !== 1) continue
        if (added.tagName === 'INPUT') {
          if (isPasswordInput(added) || added.getAttribute(MARK) === 'masked') maskInput(added)
        }
        if (typeof added.querySelectorAll === 'function') {
          sweepTree(added, new Set())
        }
      }
    }
  }

  /** Inject the masking stylesheet once per document. */
  function ensureStyle(doc) {
    if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return
    var style = doc.createElement('style')
    style.id = STYLE_ID
    style.setAttribute('data-plugin', ID)
    style.textContent = [
      'input[data-dsh-password-shield="masked"]{',
      '-webkit-text-security:disc;',
      'text-security:disc;',
      '}',
      'input[data-dsh-password-shield="masked"]::-ms-reveal{display:none;}',
    ].join('')
    doc.head.appendChild(style)
  }

  /** Start the guard; returns a disposer. */
  function start(doc) {
    if (!doc || !doc.documentElement) return function () {}
    ensureStyle(doc)
    sweepDocument(doc)

    var observer = null
    if (typeof doc.defaultView !== 'undefined' && typeof doc.defaultView.MutationObserver === 'function') {
      observer = new doc.defaultView.MutationObserver(handleMutations)
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['type', 'autocomplete', MARK],
      })
    }

    var timer = doc.defaultView && typeof doc.defaultView.setInterval === 'function'
      ? doc.defaultView.setInterval(function () { sweepDocument(doc) }, SWEEP_INTERVAL_MS)
      : null

    var disposed = false
    return function dispose() {
      if (disposed) return
      disposed = true
      if (observer) observer.disconnect()
      if (timer !== null) doc.defaultView.clearInterval(timer)
    }
  }

  /** Cordis client entrypoint. */
  function apply(ctx) {
    var dispose = start(document)
    if (ctx && typeof ctx.effect === 'function') {
      ctx.effect(function () { return dispose }, ID + ': password input guard')
      return
    }
    // Non-Cordis fallback (tests / defensive reuse): observe until page unload.
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', dispose, { once: true })
    }
  }

  var module = { exports: {} }
  var exports = module.exports
  exports.inject = []
  exports.apply = apply

  var sink = globalThis.__ModuleLoader__
  if (sink && typeof sink.load === 'function') {
    sink.load({ id: ID, factory: function () { return module.exports } })
  }
})()
