export const DIFF_MAX_LENGTH = 200

export type DiffOpType = "unchanged" | "added" | "removed"

export interface DiffOp {
  type: DiffOpType
  text: string
}

function isCjk(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
}

function isAsciiWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch)
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch)
}

export function tokenize(text: string): string[] {
  if (!text) return []
  const tokens: string[] = []
  let i = 0
  const n = text.length
  while (i < n) {
    const ch = text[i]
    if (isWhitespace(ch)) {
      let j = i
      while (j < n && isWhitespace(text[j])) j++
      tokens.push(text.slice(i, j))
      i = j
      continue
    }
    if (isCjk(ch)) {
      tokens.push(ch)
      i++
      continue
    }
    if (isAsciiWordChar(ch)) {
      let j = i
      while (j < n && isAsciiWordChar(text[j])) j++
      tokens.push(text.slice(i, j))
      i = j
      continue
    }
    tokens.push(ch)
    i++
  }
  return tokens
}

export function diffTokens(a: string[], b: string[]): DiffOp[] {
  const n = a.length
  const m = b.length
  if (n === 0 && m === 0) return []
  if (n === 0) return b.map((t) => ({ type: "added", text: t }))
  if (m === 0) return a.map((t) => ({ type: "removed", text: t }))

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "unchanged", text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "removed", text: a[i] })
      i++
    } else {
      ops.push({ type: "added", text: b[j] })
      j++
    }
  }
  while (i < n) {
    ops.push({ type: "removed", text: a[i++] })
  }
  while (j < m) {
    ops.push({ type: "added", text: b[j++] })
  }
  return ops
}

function mergeAdjacent(ops: DiffOp[]): DiffOp[] {
  if (ops.length === 0) return []
  const out: DiffOp[] = [ops[0]]
  for (let k = 1; k < ops.length; k++) {
    const prev = out[out.length - 1]
    const cur = ops[k]
    if (prev.type === cur.type) {
      prev.text += cur.text
    } else {
      out.push(cur)
    }
  }
  return out
}

export function diffText(a: string, b: string): DiffOp[] {
  const ta = tokenize(a || "")
  const tb = tokenize(b || "")
  return mergeAdjacent(diffTokens(ta, tb))
}

export function shouldComputeDiff(a: string, b: string): boolean {
  return a.length <= DIFF_MAX_LENGTH && b.length <= DIFF_MAX_LENGTH
}
