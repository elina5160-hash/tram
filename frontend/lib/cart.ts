export type CartItem = {
  id: number
  title: string
  qty: number
}

const KEY = "cart"

function normalize(items: unknown[]): CartItem[] {
  return items.map((it) => {
    if (typeof it === "object" && it !== null) {
      const o = it as Record<string, unknown>
      const id = typeof o.id === "number" ? o.id : Date.now()
      const title = typeof o.title === "string" ? o.title : ""
      const qty = typeof o.qty === "number" ? o.qty : 1
      return { id, title, qty }
    }
    return { id: Date.now(), title: "", qty: 1 }
  })
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? normalize(parsed) : []
  } catch {
    return []
  }
}

export function setCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent("cart:changed"))
  } catch {}
}

export function addToCart(item: CartItem) {
  const items = getCart()
  const idx = items.findIndex((x) => x.id === item.id)
  if (idx >= 0) {
    items[idx].qty += item.qty
  } else {
    items.push({ id: item.id, title: item.title, qty: item.qty })
  }
  setCart(items)
}

export function clearCart() {
  setCart([])
}

export function removeFromCart(id: number) {
  const items = getCart().filter((x) => x.id !== id)
  setCart(items)
}

export function setQty(id: number, qty: number) {
  const items = getCart()
  const idx = items.findIndex((x) => x.id === id)
  if (idx >= 0) {
    items[idx].qty = Math.max(0, qty)
    if (items[idx].qty === 0) {
      items.splice(idx, 1)
    }
    setCart(items)
  }
}

export function incrementQty(id: number, delta = 1) {
  const items = getCart()
  const idx = items.findIndex((x) => x.id === id)
  if (idx >= 0) {
    const next = Math.max(0, items[idx].qty + delta)
    if (next === 0) {
      items.splice(idx, 1)
    } else {
      items[idx].qty = next
    }
    setCart(items)
  } else if (delta > 0) {
    items.push({ id, title: `Товар ${id}`, qty: delta })
    setCart(items)
  }
}
