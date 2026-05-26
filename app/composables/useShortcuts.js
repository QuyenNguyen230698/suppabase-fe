// Register global keyboard shortcuts. Auto-cleanup on unmount.
// Use Mod (⌘ on macOS, Ctrl elsewhere).
//
//   const { isInputTarget } = useShortcuts({
//     'mod+k':       () => emit('new'),
//     'mod+/':       () => showHelp(),
//     'mod+b':       () => toggleSidebar(),
//   })

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)

function normalize(combo) {
  return combo
    .toLowerCase()
    .split('+')
    .map(s => s.trim())
    .sort((a, b) => {
      const order = { mod: 0, ctrl: 1, alt: 2, shift: 3 }
      return (order[a] ?? 9) - (order[b] ?? 9)
    })
    .join('+')
}

function eventToCombo(e) {
  const parts = []
  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.altKey)               parts.push('alt')
  if (e.shiftKey)             parts.push('shift')
  // Use e.key (lowercased); special keys keep their names
  const k = e.key?.length === 1 ? e.key.toLowerCase() : e.key?.toLowerCase()
  if (k && !['control','meta','alt','shift'].includes(k)) parts.push(k)
  return parts
    .sort((a, b) => {
      const order = { mod: 0, ctrl: 1, alt: 2, shift: 3 }
      return (order[a] ?? 9) - (order[b] ?? 9)
    })
    .join('+')
}

export function isInputTarget(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useShortcuts(map, opts = {}) {
  if (typeof window === 'undefined') return { isInputTarget }

  const normMap = {}
  for (const [combo, handler] of Object.entries(map)) {
    normMap[normalize(combo)] = handler
  }

  function onKey(e) {
    const combo = eventToCombo(e)
    const handler = normMap[combo]
    if (!handler) return
    // Block inside input/textarea unless caller explicitly wants it
    if (!opts.allowInInputs && isInputTarget(e.target)) return
    e.preventDefault()
    handler(e)
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

  return { isInputTarget, isMac }
}
