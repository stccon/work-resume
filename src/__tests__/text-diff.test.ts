import { describe, it, expect } from "vitest"
import { tokenize, diffTokens, diffText, shouldComputeDiff, DIFF_MAX_LENGTH } from "@/lib/text-diff"

describe("tokenize", () => {
  it("splits ASCII words preserving them as single tokens", () => {
    expect(tokenize("hello world")).toEqual(["hello", " ", "world"])
  })

  it("splits CJK characters individually", () => {
    expect(tokenize("资深前端工程师")).toEqual(["资", "深", "前", "端", "工", "程", "师"])
  })

  it("splits mixed CJK + ASCII + whitespace", () => {
    const out = tokenize("主导 React 8 年")
    expect(out).toContain("主")
    expect(out).toContain("导")
    expect(out).toContain(" ")
    expect(out).toContain("React")
    expect(out).toContain("8")
    expect(out).toContain("年")
  })

  it("treats punctuation as single tokens", () => {
    const out = tokenize("hello, world!")
    expect(out).toEqual(["hello", ",", " ", "world", "!"])
  })

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([])
  })

  it("preserves multiple whitespace", () => {
    expect(tokenize("a  b")).toEqual(["a", "  ", "b"])
  })

  it("preserves newlines as whitespace tokens", () => {
    const out = tokenize("a\nb")
    expect(out).toEqual(["a", "\n", "b"])
  })
})

describe("diffTokens", () => {
  it("returns empty for two empty arrays", () => {
    expect(diffTokens([], [])).toEqual([])
  })

  it("treats all of b as added when a is empty", () => {
    expect(diffTokens([], ["a", "b"])).toEqual([
      { type: "added", text: "a" },
      { type: "added", text: "b" },
    ])
  })

  it("treats all of a as removed when b is empty", () => {
    expect(diffTokens(["a", "b"], [])).toEqual([
      { type: "removed", text: "a" },
      { type: "removed", text: "b" },
    ])
  })

  it("marks all as unchanged for identical input", () => {
    const out = diffTokens(["a", "b"], ["a", "b"])
    expect(out).toEqual([
      { type: "unchanged", text: "a" },
      { type: "unchanged", text: "b" },
    ])
  })

  it("diffs simple replacement correctly", () => {
    const out = diffTokens(["a", "b", "c"], ["a", "x", "c"])
    expect(out).toEqual([
      { type: "unchanged", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "x" },
      { type: "unchanged", text: "c" },
    ])
  })
})

describe("diffText", () => {
  it("merges adjacent same-type ops", () => {
    const out = diffText("abc", "xyz")
    expect(out).toEqual([
      { type: "removed", text: "abc" },
      { type: "added", text: "xyz" },
    ])
  })

  it("diffs CJK replacement preserving common suffix", () => {
    const out = diffText("做了个系统", "主导核心交易系统")
    const original = out.filter((o) => o.type !== "added").map((o) => o.text).join("")
    const result = out.filter((o) => o.type !== "removed").map((o) => o.text).join("")
    const unchanged = out.filter((o) => o.type === "unchanged").map((o) => o.text).join("")
    expect(original).toBe("做了个系统")
    expect(result).toBe("主导核心交易系统")
    expect(unchanged).toBe("系统")
  })

  it("diffs mixed CJK + English preserving common tokens", () => {
    const out = diffText("用了 React", "主导 React 升级")
    const original = out.filter((o) => o.type !== "added").map((o) => o.text).join("")
    const result = out.filter((o) => o.type !== "removed").map((o) => o.text).join("")
    const unchanged = out.filter((o) => o.type === "unchanged").map((o) => o.text).join("")
    expect(original).toBe("用了 React")
    expect(result).toBe("主导 React 升级")
    expect(unchanged).toContain("React")
    expect(unchanged.length).toBeGreaterThan(0)
  })

  it("treats identical text as all unchanged", () => {
    const out = diffText("hello world", "hello world")
    expect(out.every((o) => o.type === "unchanged")).toBe(true)
    expect(out.map((o) => o.text).join("")).toBe("hello world")
  })

  it("handles empty b", () => {
    const out = diffText("abc", "")
    expect(out).toEqual([{ type: "removed", text: "abc" }])
  })

  it("handles empty a", () => {
    const out = diffText("", "abc")
    expect(out).toEqual([{ type: "added", text: "abc" }])
  })
})

describe("shouldComputeDiff", () => {
  it("returns true for short text", () => {
    expect(shouldComputeDiff("a", "b")).toBe(true)
  })

  it("returns false when a exceeds threshold", () => {
    expect(shouldComputeDiff("a".repeat(DIFF_MAX_LENGTH + 1), "b")).toBe(false)
  })

  it("returns false when b exceeds threshold", () => {
    expect(shouldComputeDiff("a", "b".repeat(DIFF_MAX_LENGTH + 1))).toBe(false)
  })

  it("returns true at threshold boundary", () => {
    expect(shouldComputeDiff("a".repeat(DIFF_MAX_LENGTH), "b".repeat(DIFF_MAX_LENGTH))).toBe(true)
  })
})
