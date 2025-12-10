"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addToCart } from "@/lib/cart"
 
import BottomBanner from "@/components/ui/bottom-banner"
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation"

export default function HomePage() {
  const router = useRouter()
  const items = [
    { id: 1, title: "Закваска ПРАЭнзим", price: "3 000 руб / 1л", image: "/1.png" },
    { id: 2, title: "Курс Смена Миркобиома", price: "16 000руб / 12л", image: "/2.png" },
    { id: 3, title: "Чистое Утро", price: "2400 руб / 2 л + 100гр", image: "/4.png" },
    { id: 4, title: "Бифидум Фаната", price: "1 200 руб / 1л", image: "/5.png" },
    { id: 5, title: "Набор МЕГА КОМПЛЕКТ", price: "4 400 руб / 5л", image: "/главная4.png" },
    { id: 6, title: "Набор СЕЗОННЫЙ", price: "4 200 руб / 6л", image: "/главная4.png" },
    { id: 7, title: "Бак для приготовления энзимных напитков", price: "53 000 руб / 19л", image: "/2.png" },
    { id: 8, title: "Супер пробка", price: "950 руб.", image: "/пробка.jpg" },
    { id: 9, title: "Курс Чистка Микробиома", price: "16 000 руб", image: "/2.png" },
    { id: 10, title: "Сыродавленные масла", price: "", image: "/9.png" },
  ]
  const promos = items.filter((it) => [5, 8].includes(it.id))
  const bests = items.filter((it) => [1, 5, 7].includes(it.id))
  const hits = items.filter((it) => [6].includes(it.id))
  const novelties = items.filter((it) => [1, 2, 3, 4, 9, 10].includes(it.id))
  function splitPrice(s: string) {
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
  
  const [qty, setQty] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    items.forEach((it) => (initial[it.id] = 1))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [catalogEntered, setCatalogEntered] = useState(false)
  type MenuView = "grid" | "delivery" | "payment" | "contacts" | "reviews" | "returns" | "about" | "offer" | "help" | "stores"
  const [menuView, setMenuView] = useState<MenuView>("grid")
  const menuItems: { label: string; key: MenuView }[] = [
    { label: "Доставка", key: "delivery" },
    { label: "Оплата", key: "payment" },
    { label: "Контакты", key: "contacts" },
    { label: "Отзывы", key: "reviews" },
    { label: "Возврат", key: "returns" },
    { label: "О нас", key: "about" },
    { label: "Оферта", key: "offer" },
    { label: "Помощь", key: "help" },
  ]
  

  

  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const ref = p.get("ref")
      if (ref) {
        window.localStorage.setItem("referral_code", ref)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Главная</h1>
          <button
            aria-label="Меню"
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-[12px] bg-white border border-gray-300 flex items-center justify-center"
          >
            <Image src="/Vector.png" alt="Меню" width={24} height={24} />
          </button>
        </div>
        <div
          aria-label="Баннер"
          className="mt-3 h-[280px] relative rounded-[20px] overflow-hidden"
        >
          <Image src="/афиша.png" alt="Афиша" fill className="object-contain" priority />
        </div>

        <div className="mt-1">
          <BackgroundGradientAnimation
            interactive={false}
            containerClassName="relative w-full h-[34px] rounded-[12px] border border-gray-500/60 overflow-hidden"
            gradientBackgroundStart="rgb(28, 28, 28)"
            gradientBackgroundEnd="rgb(64, 0, 120)"
            size="180%"
            blendingValue="soft-light"
          >
            <div className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap">
              <span className="marquee-left pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
            </div>
          </BackgroundGradientAnimation>
        </div>

        <section className="mt-4">
          <h2 className="text-lg font-semibold">Скидки и акции</h2>
          <div className="mt-3 inline-grid grid-cols-2 gap-3 mx-auto">
            {promos.map((it, idx) => (
              <div
                key={it.id}
                className={`bg-white rounded-[20px] border border-gray-300 p-3 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
                style={{ transitionDelay: `${idx * 60}ms` }}
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 ? (
                        <video muted playsInline autoPlay loop className="w-full h-full object-contain">
                          <source src="/видео%201.mp4" type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                  <div
                    aria-label="Добавить в корзину"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart({ id: it.id, title: it.title, qty: qty[it.id] || 1 })
                    }}
                    onMouseDown={() => setPressedId(it.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    onTouchStart={() => setPressedId(it.id)}
                    onTouchEnd={() => setPressedId(null)}
                    className="absolute bottom-2 right-2 rounded-[12px] border px-2 py-1 active:scale-105 cursor-pointer"
                    style={{ backgroundColor: pressedId === it.id ? "#6800E9" : "#FFFFFF", borderColor: pressedId === it.id ? "#6800E9" : "#D1D5DB" }}
                  >
                    <Image src="/маг.png" alt="Добавить в корзину" width={18} height={18} />
                  </div>
                </div>
                
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      {it.id !== 10 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                      )}
                      {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                        <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        aria-label="Уменьшить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] || 1) - 1) }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        −
                      </div>
                      <span className="text-[13px]">{qty[it.id] || 1}</span>
                      <div
                        aria-label="Увеличить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 1) + 1 }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                </div>
              </div>
                <div className="mt-2 hidden">
                <div className="flex items-center gap-1">
                  
                    
                    
                      <div
                        key={0}
                        aria-label="Поставить 0 звезд"
                        
                        className="w-6 h-6 cursor-pointer"
                        style={{ color: "#D1D5DB" }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81л-2.801 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118л-2.8-2.035a1 1 0 00-1.176 0л-2.8 2.035c-.785.57-1.84-.197-1.54-1.118л1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69л1.07-3.292z" />
                        </svg>
                      </div>
                    )
                  
                </div>
                
                
              </div>
            </div>
          </div>
        ))}
      </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Хиты продаж</h2>
          <div className="mt-3 inline-grid grid-cols-2 gap-3 mx-auto">
            {hits.map((it, idx) => (
              <div
                key={it.id}
                className={`bg-white rounded-[20px] border border-gray-300 p-3 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
                style={{ transitionDelay: `${idx * 60}ms` }}
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 ? (
                        <video src="/видео 1.mp4" muted playsInline autoPlay loop className="w-full h-full object-contain" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                  <div
                    aria-label="Добавить в корзину"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart({ id: it.id, title: it.title, qty: qty[it.id] || 1 })
                    }}
                    onMouseDown={() => setPressedId(it.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    onTouchStart={() => setPressedId(it.id)}
                    onTouchEnd={() => setPressedId(null)}
                    className="absolute bottom-2 right-2 rounded-[12px] border px-2 py-1 active:scale-105 cursor-pointer"
                    style={{ backgroundColor: pressedId === it.id ? "#6800E9" : "#FFFFFF", borderColor: pressedId === it.id ? "#6800E9" : "#D1D5DB" }}
                  >
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 39 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 7H22.7059H34.0731C36.3962 7 38.2112 8.53246 37.9801 10.2985L36.8022 19.2985C36.6016 20.8321 34.9124 22 32.8952 22H14.1454C12.2738 22 10.6623 20.9907 10.2952 19.5883L7 7Z" stroke={pressedId === it.id ? "#FFFFFF" : "#232323"} strokeWidth="2" strokeLinejoin="round" />
                      <path d="M7 7L5.37874 2.13619C5.15614 1.46845 4.35618 1 3.43844 1H1" stroke={pressedId === it.id ? "#FFFFFF" : "#232323"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      {it.id !== 10 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                      )}
                      {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                        <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        aria-label="Уменьшить количество"
                        onClick={(e) => {
                          e.stopPropagation()
                          setQty((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] || 1) - 1) }))
                        }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        −
                      </div>
                      <span className="text-[13px]">{qty[it.id] || 1}</span>
                      <div
                        aria-label="Увеличить количество"
                        onClick={(e) => {
                          e.stopPropagation()
                          setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 1) + 1 }))
                        }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Выбор покупателей</h2>
          <div className="mt-3 inline-grid grid-cols-2 gap-3 mx-auto">
            {bests.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-[20px] border border-gray-300 p-3"
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 ? (
                        <video src="/видео 1.mp4" muted playsInline autoPlay loop className="w-full h-full object-contain" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                  <div
                    aria-label="Добавить в корзину"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart({ id: it.id, title: it.title, qty: qty[it.id] || 1 })
                    }}
                    onMouseDown={() => setPressedId(it.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    onTouchStart={() => setPressedId(it.id)}
                    onTouchEnd={() => setPressedId(null)}
                    className="absolute bottom-2 right-2 rounded-[12px] border px-2 py-1 active:scale-105 cursor-pointer"
                    style={{ backgroundColor: pressedId === it.id ? "#6800E9" : "#FFFFFF", borderColor: pressedId === it.id ? "#6800E9" : "#D1D5DB" }}
                  >
                    <Image src="/маг.png" alt="Добавить в корзину" width={18} height={18} />
                  </div>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                      {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                        <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                    <div
                      aria-label="Уменьшить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] || 1) - 1) }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        −
                      </div>
                      <span className="text-[13px]">{qty[it.id] || 1}</span>
                    <div
                      aria-label="Увеличить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 1) + 1 }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <div className="mt-3 inline-grid grid-cols-2 gap-3 mx-auto">
            {novelties.map((it, idx) => (
              <div
                key={it.id}
                className={`bg-white rounded-[20px] border border-gray-300 p-3 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
                style={{ transitionDelay: `${idx * 60}ms` }}
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 ? (
                        <video src="/видео 1.mp4" muted playsInline autoPlay loop className="w-full h-full object-contain" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                  <div
                    aria-label="Добавить в корзину"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart({ id: it.id, title: it.title, qty: qty[it.id] || 1 })
                    }}
                    onMouseDown={() => setPressedId(it.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    onTouchStart={() => setPressedId(it.id)}
                    onTouchEnd={() => setPressedId(null)}
                    className="absolute bottom-2 right-2 rounded-[12px] border px-2 py-1 active:scale-105 cursor-pointer"
                    style={{ backgroundColor: pressedId === it.id ? "#6800E9" : "#FFFFFF", borderColor: pressedId === it.id ? "#6800E9" : "#D1D5DB" }}
                  >
                    <Image src="/маг.png" alt="Добавить в корзину" width={18} height={18} />
                  </div>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                      {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                        <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                    <div
                      aria-label="Уменьшить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] || 1) - 1) }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        −
                      </div>
                      <span className="text-[13px]">{qty[it.id] || 1}</span>
                    <div
                      aria-label="Увеличить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 1) + 1 }))
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                </div>
              </div>
              <div className="mt-2 hidden">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    return (
                      <div
                        key={idx}
                        aria-label={`Поставить ${idx + 1} звезд`}
                        
                        className="w-6 h-6 cursor-pointer"
                        style={{ color: "#D1D5DB" }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24 .588 1.81l-2.801 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.035a1 1 0 00-1.176 0l-2.8 2.035c-.785 .57-1.84-.197-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783 -.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )
                  })}
                </div>
                
                
              </div>
            </div>
          </div>
        ))}
      </div>
      </section>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className={menuView === "grid"
            ? "relative h-full w-full max-w-[420px] bg-white rounded-[20px] p-4 overflow-y-auto flex flex-col"
            : "relative h-full w-full max-w-[420px] bg-white p-4 overflow-y-auto flex flex-col"
          }>
            {menuView === "grid" ? (
              <>
                <div className="grid grid-cols-2 gap-2 content-start">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      className="w-full rounded-[16px] bg-[#F1F1F1] px-3 py-2 text-[#232323] text-[13px] text-center"
                      onClick={() => setMenuView(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    className="w-full rounded-[16px] bg-[#F1F1F1] px-3 py-3 text-[#232323] text-[14px] text-center"
                    onClick={() => setMenuView("stores")}
                  >
                    Адреса офлайн магазинов
                  </button>
                </div>
                <div className="mt-6">
                  <div className="text-[13px] font-semibold" style={{ color: "#000000" }}>Мы в соцсетях</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Telegram"
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => window.open("https://t.me/etraproject_official", "_blank")}
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[#232323]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M22 3.5 2.8 10.8c-.7.3-.7 1.2 0 1.5l5.1 1.7 1.7 5.1c.2.7 1.2.7 1.5 0l2.3-5.6 6.3-8.5c.5-.7-.2-1.7-1.4-1.5Z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#232323]">Telegram</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="YouTube"
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => window.open("https://www.youtube.com/@KirillSerebrjansky", "_blank")}
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[#232323]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <rect x="3" y="6" width="18" height="12" rx="3" />
                          <path d="M10 9v6l5-3-5-3Z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#232323]">YouTube</span>
                    </div>
                    <a
                      href="https://www.instagram.com/etraproject?igsh=ZTB6bGt5MmtkdGlt&utm_source=qr"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[#232323]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                          <rect x="3" y="3" width="18" height="18" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#232323]">Instagram</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <button
                    aria-label="Назад"
                    onClick={() => setMenuView("grid")}
                    className="px-3 py-2 rounded-[12px] bg-white border border-gray-300 text-[13px]"
                  >
                    Назад
                  </button>
                </div>
                <div className="rounded-[20px] bg-[#F1F1F1] p-4 text-[#232323] text-[13px] leading-relaxed">
                  {menuView === "delivery" && (
                    <>
                      <p>Мы делаем доставку через СДЕК. Доставляем нашу продукцию по России и всему СНГ. Обращаем ваше внимание, доставка в СДЕК оплачивается отдельно и зависит от региона доставки и объема посылки.</p>
                      <p className="mt-2">Если разные продукты должны отправится по разным адресам — укажите нужный адрес для каждого.</p>
                      <p className="mt-2">Пожалуйста, заполните <strong>ВСЕ</strong> запрашиваемые данные, чтобы заказ пришел к вам как можно скорее.</p>
                      <p className="mt-2">В период от трех до пяти дней вам будет направлено уведомление с вашим трек-номером, по которому можно отслеживать статус доставки (проверьте смс, Telegram, Vkontakte, электронную почту). <strong>ВАЖНО!</strong> В период высокого сезона отправка продукции, а соответственно и трек номера может достигать двух-трех недель.</p>
                      <p className="mt-2">Если вам долго не идет трек-номер, пожалуйста, ознакомьтесь с информацией <a href="https://telegra.ph/Davno-zakazali-a-dostavki-vsyo-net-08-13" target="_blank" rel="noopener noreferrer" className="underline">здесь</a>.</p>
                      <p className="mt-2">Самовывоз возможен по адресу: г. Сочи, Центральный район, Транспортная 17А (пункт выдачи СДЕК). <strong>ВАЖНО!</strong> Необходим предзаказ через бота. Когда ваша посылка будет готова к выдаче, вам сообщат наши коллеги из СДЕК.</p>
                      <p className="mt-2">Доставка в другие страны возможна через Почту России. У нас много успешных примеров доставки за рубеж. Однако всегда есть вероятность того, что посылка не пройдет таможню. Этот риск покупатель берет на себя. Кроме того, цена непосредственно доставки составит <strong>от 50 евро</strong>.</p>
                    </>
                  )}
                  {menuView === "payment" && (
                    <>
                      <p><strong>Оплата:</strong> оформление корзины в приложении через официальных партнёров Т Банк / Робокасса.</p>
                      <p className="mt-2">Оплата картой: онлайн по указанным реквизитам в уведомлении заказа.</p>
                      <p className="mt-2">Наличными: при самовывозе со склада.</p>
                      <p className="mt-2">Можете написать нашей службе поддержки и уточнить актуальную информацию об оплате.</p>
                      <p className="mt-2"><a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">Нажмите, чтобы написать нам (@avatime_cosmetics_income)</a></p>
                    </>
                  )}
                  {menuView === "contacts" && (
                    <>
                      <p><strong>Контакты:</strong> Поддержка на связи каждый будний день. В нашем сообществе ответ можно получить в любое время дня и ночи.</p>
                      <p className="mt-2">Служба поддержки <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                      <p className="mt-2">Дружелюбное сообщество <a href="http://t.me/enzyme_trend_russia" target="_blank" rel="noopener noreferrer" className="underline">http://t.me/enzyme_trend_russia</a></p>
                      <p className="mt-2"><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                    </>
                  )}
                  {menuView === "reviews" && (
                    <>
                      <p>Отзывы: <a href="https://t.me/enzyme_trend_russia/5052" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/enzyme_trend_russia/5052</a></p>
                    </>
                  )}
                  {menuView === "returns" && (
                    <>
                      <p><strong>Условия возврата и обмена товаров</strong></p>
                      <p className="mt-2">Интернет-магазин Энзимов ЭТРА руководствуется законодательством Российской Федерации при оформлении возврата и обменов.</p>
                      <p className="mt-2">Пищевая продукция, относящаяся к товарам надлежащего качества, не подлежит возврату или обмену, если была в употреблении и нарушена целостность упаковки, в связи с санитарно-гигиеническими требованиями.</p>
                      <p className="mt-2">Возврату и обмену подлежат только товары <strong>ненадлежащего качества</strong> (например, производственный брак, повреждение, нарушение целостности упаковки, выявленные при получении товара).</p>
                      <p className="mt-2">Покупатель имеет право в течение <strong>10 календарных дней</strong> с момента получения товара обратиться с требованием о возврате или обмене товара ненадлежащего качества. Претензии по качеству товара принимаются в установленные сроки при условии подтверждения дефекта.</p>
                      <p className="mt-2">Для оформления возврата или обмена необходимо связаться с продавцом и предоставить подтверждающие документы и сведения о выявленном дефекте.</p>
                      <p className="mt-2">Решение о возврате денежных средств или замене товара принимается продавцом в течение <strong>10 календарных дней</strong> с момента получения обращения покупателя.</p>
                      <p className="mt-2">Возврат денежных средств осуществляется в срок, не превышающий <strong>10 календарных дней</strong> после принятия решения о возврате.</p>
                      <p className="mt-2">В случае возврата товара ненадлежащего качества расходы по доставке товара обратно к продавцу и повторной доставке товара покупателю возмещаются продавцом.</p>
                      <p className="mt-2">По любым вопросам обращайтесь в поддержку: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "about" && (
                    <>
                      <div className="relative w-full h-48 rounded-[16px] overflow-hidden mb-3">
                        <Image src="/мужик.png" alt="Кирилл Серебрянский" fill className="object-cover" />
                      </div>
                      <p><strong>Здравствуй, дорогой друг!</strong></p>
                      <p className="mt-2">Меня зовут Кирилл Серебрянский, я основатель компании ЭТРА.</p>
                      <p className="mt-2">Я устал видеть людей, которые не доверяют своему организму. Которые ходят к врачам, пьют таблетки, но ничего не меняется. Потому что никто не объясняет им, как это работает. Болезни, усталость и хронические проблемы становятся серьёзными барьерами, которые трудно преодолеть в одиночку.</p>
                      <p className="mt-2">ЭТРА помогает избавиться от этого груза — токсинов, патогенов и устаревших пищевых привычек. Мы хотим показать тебе истинную природу твоего организма: сильного и гармоничного.</p>
                      <p className="mt-2">ЭТРА — это напитки с подтверждёнными клиническими результатами, направленные на восстановление микробиома. Эффект становится заметным всего за <strong>14 дней</strong>, повышая качество жизни и эффективно устраняя источники ваших проблем с энергией и самочувствием.</p>
                      <p className="mt-2">Приглашаем вас в мир, полный энергии, счастья и здоровья!</p>
                      <p className="mt-2">📱 Сообщество в Telegram <a href="http://t.me/enzyme_trend_russia" target="_blank" rel="noopener noreferrer" className="underline">http://t.me/enzyme_trend_russia</a></p>
                      <p className="mt-2">📱 Канал в Telegram <a href="https://t.me/etraproject_official" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/etraproject_official</a></p>
                      <p className="mt-2">📱 Эфиры в Telegram <a href="https://t.me/ETRA_EFIR" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/ETRA_EFIR</a></p>
                      <p className="mt-2">📱 YouTube канал Этра <a href="https://www.youtube.com/@KirillSerebrjansky" target="_blank" rel="noopener noreferrer" className="underline">https://www.youtube.com/@KirillSerebrjansky</a></p>
                      <p className="mt-2">📱 YouTube канал Кирилл Серебрянский <a href="https://youtube.com/@kirillserebrjansky" target="_blank" rel="noopener noreferrer" className="underline">https://youtube.com/@kirillserebrjansky</a></p>
                      <p className="mt-2">📱 Instagram <a href="https://www.instagram.com/etraproject" target="_blank" rel="noopener noreferrer" className="underline">https://www.instagram.com/etraproject</a></p>
                      <p className="mt-2"><strong>Наше производство:</strong> Краснодарский край, Сочи, Пластунская улица, 102Б</p>
                      <p className="mt-2"><strong>Контакты и адреса партнёров:</strong></p>
                      <ul className="mt-2 list-disc pl-5">
                        <li>Сочи, пгт Красная Поляна, Вознесенская улица, 36, «Гранат» — +7 (963) 160-10-75</li>
                        <li>Сочи, пгт Красная Поляна, улица ГЭС, 49А, «Sunsvet” — +7 (938) 469-03-69</li>
                        <li>Сочи, улица Островского, 1, Кафе «Я люблю тебя» — +7 (962) 888-86-56</li>
                        <li>Сочи, Параллельная улица, 9лит5, ЖК Остров Мечты, этаж 1, «PROПитание» — +7 (988) 401-00-50</li>
                        <li>Сочи, микрорайон Центральный, Морской переулок, 2, Магазин «Птичка» — +7 (981) 244-65-74</li>
                        <li>Сочи, Пластунская улица, 102Б, Оздоровительный центр «Зеркала Козырева Сфера» — +7 (962) 888-10-81</li>
                      </ul>
                      <p className="mt-2"><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                      <p className="mt-2">Наша дружелюбная поддержка ответит на все ваши вопросы: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "offer" && (
                    <>
                      <p>Оферта: <a href="https://disk.yandex.ru/d/r7SXu-Tn9lx7OA" target="_blank" rel="noopener noreferrer" className="underline">https://disk.yandex.ru/d/r7SXu-Tn9lx7OA</a></p>
                    </>
                  )}
                  {menuView === "help" && (
                    <>
                      <p>Помощь: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "stores" && (
                    <>
                      <p><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                      <p className="mt-2"><strong>Самовывоз возможен со склада:</strong> г. Сочи, Центральный район, Транспортная 17А (пункт выдачи СДЕК). <strong>Необходим предзаказ!</strong> Когда ваша посылка будет готова к выдаче, мы вам сообщим.</p>
                      <p className="mt-2"><strong>Наша продукция представлена на витринах наших партнёров:</strong></p>
                      <ul className="mt-2 list-disc pl-5">
                        <li>Сочи, пгт Красная Поляна, Вознесенская улица, 36, «Гранат» — +7 (963) 160-10-75</li>
                        <li>Сочи, пгт Красная Поляна, улица ГЭС, 49А, «Sunsvet” — +7 (938) 469-03-69</li>
                        <li>Сочи, улица Островского, 1 Кафе «Я люблю тебя» — +7 (962) 888-86-56</li>
                        <li>Сочи, Параллельная улица, 9лит5  ЖК Остров Мечты, этаж 1, «PROПитание» — +7 (988) 401-00-50</li>
                        <li>Сочи, микрорайон Центральный, Морской переулок, 2, Магазин «Птичка» — +7 (981) 244-65-74</li>
                        <li>Сочи, Пластунская улица, 102Б, Оздоровительный центр «Зеркала Козырева Сфера» — +7 (962) 888-10-81</li>
                      </ul>
                    </>
                  )}
                </div>
                
              </div>
            )}
          </div>
        </div>
      )}

      <BottomBanner />
    </div>
  )
}
