export type RatingEntry = {
  id: number
  ratings: number[]
  reviews: string[]
}

const KEY = "ratings"
const USER_KEY = "ratings:userStars"

function normalize(items: unknown[]): RatingEntry[] {
  return items.map((it) => {
    if (typeof it === "object" && it !== null) {
      const o = it as Record<string, unknown>
      const id = typeof o.id === "number" ? o.id : Date.now()
      const ratings = Array.isArray(o.ratings) ? (o.ratings as number[]).filter((n) => typeof n === "number") : []
      const reviews = Array.isArray(o.reviews) ? (o.reviews as string[]).filter((s) => typeof s === "string") : []
      return { id, ratings, reviews }
    }
    return { id: Date.now(), ratings: [], reviews: [] }
  })
}

export function getRatings(): RatingEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? normalize(parsed) : []
  } catch {
    return []
  }
}

export function setRatings(items: RatingEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent("rating:changed"))
  } catch {}
}

export function getRatingCount(id: number): number {
  const items = getRatings()
  const entry = items.find((x) => x.id === id)
  return entry ? entry.ratings.length : 0
}

export function addRating(id: number, stars: number) {
  const items = getRatings()
  const idx = items.findIndex((x) => x.id === id)
  if (idx >= 0) {
    items[idx].ratings.push(Math.max(1, Math.min(5, stars)))
  } else {
    items.push({ id, ratings: [Math.max(1, Math.min(5, stars))], reviews: [] })
  }
  setRatings(items)
}

export function addReview(id: number, text: string) {
  const items = getRatings()
  const idx = items.findIndex((x) => x.id === id)
  if (idx >= 0) {
    items[idx].reviews.push(text)
  } else {
    items.push({ id, ratings: [], reviews: [text] })
  }
  setRatings(items)
}

export function getUserStars(): Record<number, number> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(USER_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === "object") return parsed as Record<number, number>
    return {}
  } catch {
    return {}
  }
}

export function setUserStars(map: Record<number, number>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent("rating:changed"))
  } catch {}
}

export function getUserStar(id: number): number {
  const map = getUserStars()
  return map[id] || 0
}

export function hasUserRated(id: number): boolean {
  return getUserStar(id) > 0
}

export function addRatingOnce(id: number, stars: number): boolean {
  if (hasUserRated(id)) return false
  addRating(id, stars)
  const map = getUserStars()
  map[id] = Math.max(1, Math.min(5, stars))
  setUserStars(map)
  return true
}

export function removeUserRating(id: number): boolean {
  const star = getUserStar(id)
  const items = getRatings()
  const idx = items.findIndex((x) => x.id === id)
  if (idx >= 0 && star > 0) {
    const pos = items[idx].ratings.indexOf(star)
    if (pos >= 0) {
      items[idx].ratings.splice(pos, 1)
      setRatings(items)
    }
  }
  const map = getUserStars()
  if (map[id]) {
    delete map[id]
    setUserStars(map)
  }
  return true
}
