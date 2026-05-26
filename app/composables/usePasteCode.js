// Detect long / code-like pastes and convert them into compact attachment chips
// so the composer textarea doesn't balloon. The chip stores the raw text + a
// detected language; on send we splice each chip back into the prompt as a
// fenced markdown block (```lang\n...\n```).
//
// Heuristics for "this looks like code":
//   • length >= MIN_CODE_LEN, OR
//   • >= 3 newlines AND any of the language signals below

const MIN_CODE_LEN = 400        // chars
const MIN_LINES_FOR_CODE = 6    // if shorter, require strong signal

const LANG_SIGNATURES = [
  { lang: 'vue',        re: /<template[\s>]|<script\s+setup|<style\s+scoped/ },
  { lang: 'jsx',        re: /^import\s.+from\s+['"]react['"]|<\w+[^>]*\/>/m },
  { lang: 'tsx',        re: /:\s*React\.(FC|FunctionComponent|JSX)/ },
  { lang: 'ts',         re: /^(import|export)\s.+from\s+['"].+['"];?$/m, ext: ['interface ', ': string', ': number', ': boolean'] },
  { lang: 'javascript', re: /^(const|let|var|function|class|import|export)\b/m },
  { lang: 'python',     re: /^\s*(def|class|import|from)\s+\w+/m },
  { lang: 'go',         re: /^(package|func|import)\s+/m },
  { lang: 'rust',       re: /^(fn|use|struct|impl|pub)\s+/m },
  { lang: 'java',       re: /^(public|private|protected)\s+(class|interface|static)\b/m },
  { lang: 'sql',        re: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE)\b/i },
  { lang: 'json',       re: /^\s*[{[][\s\S]*[}\]]\s*$/ },
  { lang: 'yaml',       re: /^[a-zA-Z_][\w-]*:\s*.+$/m },
  { lang: 'html',       re: /^<!DOCTYPE\s+html|<html[\s>]/im },
  { lang: 'css',        re: /^[.#]?[\w-]+\s*\{[\s\S]*?\}/m },
  { lang: 'bash',       re: /^#!\/(usr\/)?bin\/(bash|sh|zsh)|^\$\s+\w+/m },
]

export function detectCodeLang(text) {
  if (!text) return null
  for (const sig of LANG_SIGNATURES) {
    if (sig.re.test(text)) {
      // ts/js disambiguation: TS-only keywords
      if (sig.lang === 'javascript' && (text.includes('interface ') || /:\s*(string|number|boolean)\b/.test(text))) {
        return 'ts'
      }
      return sig.lang
    }
  }
  return null
}

export function looksLikeCode(text) {
  if (!text) return false
  if (text.length >= MIN_CODE_LEN) return !!detectCodeLang(text) || text.includes('\n')
  const lines = text.split('\n').length
  if (lines < MIN_LINES_FOR_CODE) return false
  return !!detectCodeLang(text)
}

let _counter = 0
export function makeCodeAttachment(content) {
  _counter += 1
  const lang = detectCodeLang(content) || 'text'
  const lines = content.split('\n').length
  const id = `code-${Date.now()}-${_counter}`
  const titleSeed = firstMeaningfulLine(content)
  const title = `${lang === 'text' ? 'Snippet' : lang} • ${lines} lines`
  return { id, lang, lines, content, title, preview: titleSeed }
}

function firstMeaningfulLine(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const l of lines) {
    if (l.length >= 8 && !/^[-=*\/<>{}\[\]]+$/.test(l)) return l.slice(0, 60)
  }
  return lines[0]?.slice(0, 60) || ''
}

export function wrapAsFenced(attachment) {
  return '```' + (attachment.lang || '') + '\n' + attachment.content + '\n```'
}
