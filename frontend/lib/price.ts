export function getPriceValue(price: string | number): number {
  if (typeof price === 'number') return price
  if (!price) return 0
  const match = String(price).match(/^([\d\s]+)/)
  if (match) {
    return parseInt(match[1].replace(/\s/g, ''), 10)
  }
  return 0
}

export function splitPrice(s: string | number) {
  if (typeof s === 'number') {
    return { main: s.toLocaleString('ru-RU') + ' руб.', sub: '' }
  }
  if (!s) return { main: "", sub: "" }
  const str = String(s)
  const m = str.match(/^(.*?руб\.?)/i)
  if (m) {
    const main = m[1].trim()
    let rest = str.slice(m[1].length).trim()
    if (rest.startsWith("/")) rest = rest.slice(1).trim()
    return { main, sub: rest }
  }
  const parts = str.split("/")
  return { main: (parts[0] || "").trim(), sub: (parts[1] || "").trim() }
}
