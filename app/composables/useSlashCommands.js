// Lightweight slash-commands registry for the chat composer.
// Trigger: a textarea value starting with '/' (and the caret is in the first word).

export const SLASH_COMMANDS = [
  // Code workflow — `kind: 'prompt'` commands expand into a prompt prefix
  // when applied, and combine well with pasted code attachments.
  { cmd: '/explain',  hint: 'Explain the pasted code', kind: 'prompt',
    template: 'Explain the following code in detail. Cover structure, key functions, edge cases, and any potential issues.' },
  { cmd: '/refactor', hint: 'Suggest a refactor', kind: 'prompt',
    template: 'Refactor the following code. Keep behaviour identical, improve readability and idiomatic style, and list each change you make.' },
  { cmd: '/fix',      hint: 'Find and fix bugs', kind: 'prompt',
    template: 'Review the following code for bugs, edge cases, and correctness issues. Provide the fixed version and a short explanation of each fix.' },
  { cmd: '/test',     hint: 'Generate unit tests', kind: 'prompt',
    template: 'Write unit tests for the following code. Pick an appropriate test framework for the language; cover happy path and edge cases.' },
  { cmd: '/document', hint: 'Add documentation', kind: 'prompt',
    template: 'Add concise, useful comments/docstrings to the following code. Do not rewrite logic. Output only the documented version.' },
  { cmd: '/review',   hint: 'Senior-engineer code review', kind: 'prompt',
    template: 'Review the following code as a senior engineer. Flag correctness bugs first, then design issues, then nits. Be specific.' },

  // Conversation ops
  { cmd: '/new',     hint: 'Start a new conversation' },
  { cmd: '/clear',   hint: 'Clear the composer' },
  { cmd: '/model',   hint: 'Switch model (e.g. /model qwen3:14b)' },
  { cmd: '/title',   hint: 'Rename current conversation' },
  { cmd: '/pin',     hint: 'Pin / unpin current conversation' },
  { cmd: '/star',    hint: 'Star / unstar current conversation' },
  { cmd: '/archive', hint: 'Archive current conversation' },
  { cmd: '/share',   hint: 'Generate a share link' },
  { cmd: '/export',  hint: 'Export conversation (e.g. /export json)' },
  { cmd: '/move',    hint: 'Move to a project' },
  { cmd: '/tags',    hint: 'Manage tags for this conversation' },
]

export function useSlashCommands() {
  /** Returns the suggestion list for the current input, or null. */
  function match(input) {
    if (!input || !input.startsWith('/')) return null
    // Only show menu while the user is typing the first word
    if (/\s/.test(input)) return null
    const q = input.slice(1).toLowerCase()
    const list = q
      ? SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(q))
      : SLASH_COMMANDS
    return list.length ? list : null
  }

  /**
   * Parse a finalized slash input (sent via Enter).
   *   '/model qwen3:14b' → { cmd: '/model', arg: 'qwen3:14b' }
   *   '/new'             → { cmd: '/new', arg: '' }
   *   not a command      → null
   */
  function parse(input) {
    if (!input || !input.startsWith('/')) return null
    const spaceIdx = input.indexOf(' ')
    const cmd = spaceIdx === -1 ? input : input.slice(0, spaceIdx)
    const arg = spaceIdx === -1 ? '' : input.slice(spaceIdx + 1).trim()
    if (!SLASH_COMMANDS.some(c => c.cmd === cmd)) return null
    return { cmd, arg }
  }

  return { match, parse, list: SLASH_COMMANDS }
}
