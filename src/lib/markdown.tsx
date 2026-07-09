// A tiny, dependency-free Markdown renderer for entry notes. It builds a React
// node tree (never innerHTML) so text is escaped by construction and there's no
// XSS surface; links are protocol-checked. It covers the common subset —
// headings, bold/italic/inline-code, links, lists, blockquotes, fenced code,
// rules, paragraphs — which is all a note field needs. Not a spec-complete
// parser by design.

import { Fragment, type ReactNode } from 'react'

function safeUrl(url: string): boolean {
  try {
    const u = new URL(url, 'https://x.invalid')
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:'
  } catch {
    return false
  }
}

const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  while (rest.length) {
    const m = INLINE_RE.exec(rest)
    if (!m) {
      out.push(rest)
      break
    }
    if (m.index > 0) out.push(rest.slice(0, m.index))
    const tok = m[0]
    if (tok.startsWith('`')) {
      out.push(
        <code
          className="rounded px-1 py-0.5 text-[0.85em]"
          style={{ background: 'var(--hover)', fontFamily: 'ui-monospace, monospace' }}
        >
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**')) {
      out.push(<strong>{renderInline(tok.slice(2, -2))}</strong>)
    } else if (tok.startsWith('*')) {
      out.push(<em>{renderInline(tok.slice(1, -1))}</em>)
    } else if (tok.startsWith('_')) {
      out.push(<em>{renderInline(tok.slice(1, -1))}</em>)
    } else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)
      if (lm && safeUrl(lm[2]!)) {
        out.push(
          <a
            href={lm[2]}
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            {lm[1]}
          </a>,
        )
      } else {
        out.push(tok)
      }
    }
    rest = rest.slice(m.index + tok.length)
  }
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>)
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]!

    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        buf.push(lines[i]!)
        i++
      }
      i++ // closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-md p-2.5 text-[0.85em]"
          style={{ background: 'var(--hover)', fontFamily: 'ui-monospace, monospace' }}
        >
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1]!.length
      const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm', 'text-sm', 'text-sm']
      blocks.push(
        <div key={key++} className={`mt-1 font-semibold ${sizes[level - 1]}`}>
          {renderInline(h[2]!)}
        </div>,
      )
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} style={{ borderColor: 'var(--border)' }} />)
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i]!.startsWith('>')) {
        buf.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote
          key={key++}
          className="pl-3 italic"
          style={{ borderLeft: '3px solid var(--border-strong)', color: 'var(--fg2)' }}
        >
          {renderInline(buf.join(' '))}
        </blockquote>,
      )
      continue
    }

    // Lists (unordered / ordered)
    const ulm = /^\s*[-*+]\s+/.test(line)
    const olm = /^\s*\d+\.\s+/.test(line)
    if (ulm || olm) {
      const items: string[] = []
      const test = ulm ? /^\s*[-*+]\s+(.*)$/ : /^\s*\d+\.\s+(.*)$/
      while (i < lines.length && test.test(lines[i]!)) {
        items.push(test.exec(lines[i]!)![1]!)
        i++
      }
      const inner = items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)
      blocks.push(
        ulm ? (
          <ul key={key++} className="list-disc pl-5">
            {inner}
          </ul>
        ) : (
          <ol key={key++} className="list-decimal pl-5">
            {inner}
          </ol>
        ),
      )
      continue
    }

    // Paragraph (consume consecutive non-blank, non-structural lines)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.trim().startsWith('```') &&
      !/^#{1,6}\s/.test(lines[i]!) &&
      !lines[i]!.startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]!) &&
      !/^\s*\d+\.\s+/.test(lines[i]!)
    ) {
      para.push(lines[i]!)
      i++
    }
    blocks.push(<p key={key++}>{renderInline(para.join(' '))}</p>)
  }

  return <div className={`flex flex-col gap-2 text-sm leading-relaxed ${className}`}>{blocks}</div>
}
