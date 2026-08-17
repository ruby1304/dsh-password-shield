/** dsh-password-shield: blocks only the iCloud Passwords completion-list popup. */
(function () {
  'use strict'
  var ID = 'dsh-password-shield'
  var PATH = 'completion_list.html'
  var INTERVAL = 2000
  function frames(host) {
    if (host == null || host.nodeType !== 1 || host.shadowRoot == null) return []
    try { return host.shadowRoot.querySelectorAll('iframe[src*="' + PATH + '"]') }
    catch (_error) { return [] }
  }
  function neutralize(host) {
    var list = frames(host)
    if (list.length === 0) return false
    for (var i = 0; i < list.length; i++) list[i].remove()
    host.style.setProperty('display', 'none', 'important')
    host.style.setProperty('visibility', 'hidden', 'important')
    host.style.setProperty('opacity', '0', 'important')
    host.style.setProperty('pointer-events', 'none', 'important')
    host.setAttribute('data-dsh-password-shield', 'icloud-completion-list')
    return true
  }
  function scan(doc) {
    if (doc == null || doc.body == null) return
    var candidates = doc.body.querySelectorAll('[popover]')
    for (var i = 0; i < candidates.length; i++) neutralize(candidates[i])
    for (var child = doc.body.firstElementChild; child; child = child.nextElementSibling) {
      if (child.shadowRoot != null) neutralize(child)
    }
  }
  function start(doc) {
    if (doc == null || doc.documentElement == null) return function () {}
    scan(doc)
    var observer = new doc.defaultView.MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j]
          if (node != null && node.nodeType === 1 && node.shadowRoot != null) neutralize(node)
        }
      }
    })
    observer.observe(doc.documentElement, { childList: true, subtree: true })
    var timer = doc.defaultView.setInterval(function () { scan(doc) }, INTERVAL)
    return function () { observer.disconnect(); doc.defaultView.clearInterval(timer) }
  }
  function apply(ctx) {
    var dispose = start(document)
    if (ctx && typeof ctx.effect === 'function') ctx.effect(function () { return dispose }, ID + ': iCloud popup blocker')
    else window.addEventListener('pagehide', dispose, { once: true })
  }
  var module = { exports: { inject: [], apply: apply } }
  var loader = globalThis.__ModuleLoader__
  if (loader && typeof loader.load === 'function') loader.load({ id: ID, factory: function () { return module.exports } })
})()
