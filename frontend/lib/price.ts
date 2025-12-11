export function getPriceValue(priceStr: string): number {
  if (!priceStr) return 0
  const match = priceStr.match(/^([\d\s]+)/)
  if (match) {
    return parseInt(match[1].replace(/\s/g, ''), 10)
  }
  return 0
}

export function splitPrice(s: string) {
  if (!s) return { main: "", sub: "" }
  const m = s.match(/^(.*?руб\.?)/i)
  if (m) {
    const main = m[1].trim()
    let rest = s.slice(m[1].length).trim()
    if (rest.startsWith("/")) rest = rest.slice(1).trim()
    return { main, sub: rest }
  }
  const parts = s.split("/")
  return { main: (parts[0] || "").trim(), sub: (parts[1] || "").trim() }
}
