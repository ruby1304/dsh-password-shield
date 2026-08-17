/**
 * dsh-password-shield — browser half (client bundle).
 *
 * Two password-manager annoyances live in DSH's web UI:
 *
 * 1. API-key inputs (Models page, official-DeepSeek onboarding dialog, and
 *    Plugins > Web Search card) render as `<input type="password">`. Chrome's
 *    built-in password manager deliberately ignores `autocomplete="off"` on
 *    password fields and shows its native save/autofill bubble over them.
 *    This bundle converts those fields into masked `type="text"` fields,
 *    which Chrome's password manager never treats as passwords.
 * 2. The iCloud Passwords Chrome extension runs WebKit-style form heuristics
 *    over the page and pops its completion-list bubble ("打开'密码' App /
 *    查找和创建密码") over fields it classifies as credential fields — on DSH
 *    conversation pages this shows up floating over the chat composer. The
 *    bubble is an in-page `<div popover>` whose open shadow root hosts an
 *    iframe pointing at the extension's `completion_list.html`. This bundle
 *    watches the DOM and removes that container the moment it is inserted,
 *    so the bubble never appears on DSH pages. (DSH itself ships no popover
 *    whose shadow root hosts such an iframe, so the blocker is surgical.)
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
  /** iCloud Passwords serves its in-page completion list from this resource. */
  var COMPLETION_LIST_PATH = 'completion_list'

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

  /**
   * Whether a node hosts the iCloud Passwords completion list: the extension
   * appends a `<div popover>` to <body> whose open shadow root contains an
   * iframe pointing at its `completion_list.html` resource.
   */
  function isCompletionListHost(node) {
    if (!node || node.nodeType !== 1) return false
    var root = node.shadowRoot
    if (!root) return false
    try {
      return root.querySelector('iframe[src*="' + COMPLETION_LIST_PATH + '"]') !== null
    } catch (_error) {
      return false
    }
  }

  /**
   * Neutralize one completion-list host without detaching it: remove the
   * iframe from its shadow root and force it invisible. The element stays
   * connected so the extension's popover bookkeeping (`showPopover` /
   * `hidePopover` / `isVisible`) never throws; it just renders nothing.
   */
  function neutralizeCompletionListHost(node) {
    if (!isCompletionListHost(node)) return false
    try {
      var frames = node.shadowRoot.querySelectorAll('iframe[src*="' + COMPLETION_LIST_PATH + '"]')
      for (var i = 0; i < frames.length; i++) frames[i].remove()
    } catch (_error) {}
    if (node.style) {
      node.style.setProperty('display', 'none', 'important')
      node.style.setProperty('visibility', 'hidden', 'important')
      node.style.setProperty('opacity', '0', 'important')
      node.style.setProperty('pointer-events', 'none', 'important')
      node.style.setProperty('left', '-999999px', 'important')
      node.style.setProperty('top', '-999999px', 'important')
    }
    return true
  }

  /** Scan one document for completion-list hosts (top-level and popover-marked). */
  function removeCompletionListPopups(doc) {
    if (!doc || !doc.body) return
    var candidates = doc.body.querySelectorAll('[popover]')
    for (var i = 0; i < candidates.length; i++) neutralizeCompletionListHost(candidates[i])
    // Direct body children are cheap to probe even without the attribute.
    for (var child = doc.body.firstElementChild; child; child = child.nextElementSibling) {
      if (child.shadowRoot) neutralizeCompletionListHost(child)
    }
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
    removeCompletionListPopups(doc)
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
        // The iCloud completion list is appended to <body> already complete
        // with its shadow iframe — neutralize it before it ever paints.
        if (added.shadowRoot && neutralizeCompletionListHost(added)) continue
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
