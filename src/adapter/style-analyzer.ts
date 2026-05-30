export interface ExtractedTextItem {
  text: string
  fontName: string
  fontSize: number
  x: number
  y: number
  width: number
  height: number
  pageIndex: number
}

export interface StyleAnalysisResult {
  layoutStyle: "single-column" | "two-column" | "compact"
  accentColor: string
  fontFamily: string
  fontSize: string
  density: "spacious" | "normal" | "dense"
  sectionStyle: "underlined" | "colored-bg" | "minimal"
  description: string
}

export function buildStyleAnalysisPrompt(extracted: any): string {
  const summary = `PDF 页面大小: ${extracted.pageWidth}x${extracted.pageHeight}pt
页数: ${extracted.pageCount}
检测到的字体: ${extracted.fonts?.join(", ") || "未知"}
检测到的字号: ${extracted.fontSizes?.join("pt, ") || "未知"}pt

文本项（共 ${extracted.items?.length || 0} 项，按页面Y坐标降序排列）:
${(extracted.items || [])
  .sort((a: ExtractedTextItem, b: ExtractedTextItem) => b.y - a.y || a.x - b.x)
  .slice(0, 80)
  .map((item: ExtractedTextItem) => {
    const sizeHint =
      item.fontSize >= 16 ? " [标题?]" :
      item.fontSize >= 12 ? " [小节?]" :
      item.fontSize >= 9 ? " [正文?]" : " [小字?]"
    return `  [p${item.pageIndex + 1} x:${Math.round(item.x)} y:${Math.round(item.y)}] ${item.fontName} ${item.fontSize}pt: "${item.text.slice(0, 60)}"${sizeHint}`
  })
  .join("\n")}

请分析这份简历的视觉风格，输出 JSON：
{
  "layoutStyle": "single-column | two-column | compact",
  "accentColor": "主色调十六进制颜色码",
  "fontFamily": "字体风格描述",
  "fontSize": "正文字号(A4: 9-12)",
  "density": "spacious | normal | dense",
  "sectionStyle": "underlined | colored-bg | minimal",
  "description": "中文风格描述"
}`
  return summary
}
