"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addToCart, incrementQty } from "@/lib/cart"
import { getPriceValue, splitPrice } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { staticItems } from "@/data/staticItems"

import BottomBanner from "@/components/ui/bottom-banner"


export default function HomePage() {
  const router = useRouter()
  const { products: fetchedProducts } = useProducts()
  const [adminOpen, setAdminOpen] = useState(false)

  const items = (fetchedProducts && fetchedProducts.length > 0 ? fetchedProducts : staticItems) as any[]
  const promos = items.filter((it: any) => {
    const priceVal = getPriceValue(it.price)
    const isCheap = priceVal > 0 && priceVal < 1000
    // Check for hardcoded discounted items (IDs 2 and 6 have old prices shown in JSX)
    // Also check title for "акция" keyword
    const isDiscounted = [2, 6].includes(it.id) || it.title.toLowerCase().includes("акция")
    // Keep original manual IDs [6, 8] (8 is cheap, 6 is discounted)
    return isCheap || isDiscounted || [6, 8].includes(it.id)
  })
  const bests = items.filter((it: any) => [1, 7, 3, 4].includes(it.id))
  const novelties = items.filter((it: any) => [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].includes(it.id))
  
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
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col justify-start relative pb-40">
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
          className="mt-3 h-[220px] relative rounded-[20px] overflow-hidden cursor-pointer"
          onClick={() => setAdminOpen(true)}
        >
          <Image src="/2 51.png" alt="Афиша" fill className="object-contain rounded-[20px]" priority />
        </div>

        <div className="mt-2 h-[34px] relative rounded-[20px] border border-gray-300 overflow-hidden [background:linear-gradient(40deg,_rgb(28,_28,_28),_rgb(64,_0,_120))]">
          <div className="absolute inset-0 overflow-hidden flex items-center">
            <div className="marquee-track h-full flex items-center whitespace-nowrap" style={{ animationDuration: "12s" }}>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ETRA🤗</span>
            </div>
          </div>
        </div>

 

        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Скидки и акции</h2>
            <Link href="/catalog" className="text-[13px]" style={{ color: "#267A2D" }}>Смотреть все</Link>
          </div>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {promos.map((it, idx) => (
              <div
                key={it.id}
                className={`bg-white rounded-[20px] border border-gray-300 p-2 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"} min-w-[180px] snap-start`}
                style={{ transitionDelay: `${idx * 60}ms` }}
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video muted playsInline autoPlay loop className="w-full h-full object-cover">
                          <source src={it.id === 6 ? "/видео%201.mp4" : it.image} type="video/mp4" />
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
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      {it.id !== 10 && (
                        <span className="text-[12px] whitespace-nowrap font-semibold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
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
                          incrementQty(it.id, -1)
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
                          addToCart({ id: it.id, title: it.title, qty: 1 })
                        }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                    </div>
                  </div>
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Выбор покупателей</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {bests.map((it) => {
              return (
              <div
                key={it.id}
                className="bg-white rounded-[20px] border border-gray-300 p-2 min-w-[180px] snap-start"
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video src={it.id === 6 ? "/видео 1.mp4" : it.image} muted playsInline autoPlay loop className="w-full h-full object-cover" />
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
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap font-semibold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
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
                        incrementQty(it.id, -1)
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
                        addToCart({ id: it.id, title: it.title, qty: 1 })
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                      </div>
                    </div>
                  </div>
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                </div>
              </div>
              )
            })}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Новинки</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {novelties.map((it, idx) => {
              return (
              <div
                key={it.id}
                className={`bg-white rounded-[20px] border border-gray-300 p-2 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"} min-w-[180px] snap-start`}
                style={{ transitionDelay: `${idx * 60}ms` }}
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video src={it.id === 6 ? "/видео 1.mp4" : it.image} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-[10px] text-[11px]" style={{ backgroundColor: "#E8F8E8", color: "#267A2D" }}>Новинка</div>
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
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap font-semibold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
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
                        incrementQty(it.id, -1)
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
                        addToCart({ id: it.id, title: it.title, qty: 1 })
                      }}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                      >
                        +
                    </div>
                  </div>
                  </div>
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                </div>
              </div>
              )
            })}
          </div>
        </section>


      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className={menuView === "grid"
            ? "relative h-full w-[66vw] bg-white rounded-[20px] p-4 overflow-y-auto flex flex-col"
            : "relative h-full w-[66vw] bg-white p-4 overflow-y-auto flex flex-col"
          }>
            {menuView === "grid" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button
                    aria-label="Назад"
                    onClick={() => {
                      setMenuOpen(false)
                      router.push("/home")
                    }}
                    className="px-3 py-2 rounded-[12px] bg-white border border-gray-300 text-[13px]"
                  >
                    Назад
                  </button>
                </div>
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
                    Адреса офлайн-магазинов
                  </button>
                </div>
                <div className="mt-6">
                  <div className="text-[13px] font-semibold text-center" style={{ color: "#000000" }}>Мы в соцсетях</div>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Telegram"
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => window.open("https://t.me/etraproject_official", "_blank")}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#232323] border border-gray-300 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                          <path fillRule="evenodd" clipRule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM12.43 8.85893C11.2629 9.3444 8.93015 10.3492 5.43191 11.8733C4.86385 12.0992 4.56628 12.3202 4.53919 12.5363C4.4934 12.9015 4.95073 13.0453 5.57349 13.2411C5.6582 13.2678 5.74598 13.2954 5.83596 13.3246C6.44866 13.5238 7.27284 13.7568 7.70131 13.766C8.08996 13.7744 8.52375 13.6142 9.00266 13.2853C12.2712 11.079 13.9584 9.96381 14.0643 9.93977C14.1391 9.92281 14.2426 9.90148 14.3128 9.96385C14.3829 10.0262 14.3761 10.1443 14.3686 10.176C14.3233 10.3691 12.5281 12.0381 11.5991 12.9018C11.3095 13.171 11.1041 13.362 11.0621 13.4056C10.968 13.5034 10.8721 13.5958 10.78 13.6846C10.2108 14.2333 9.78393 14.6448 10.8036 15.3168C11.2937 15.6397 11.6858 15.9067 12.077 16.1731C12.5042 16.4641 12.9303 16.7543 13.4816 17.1157C13.6221 17.2078 13.7562 17.3034 13.8869 17.3965C14.3841 17.751 14.8308 18.0694 15.3826 18.0186C15.7033 17.9891 16.0345 17.6876 16.2027 16.7884C16.6002 14.6632 17.3816 10.0585 17.5622 8.16098C17.5781 7.99473 17.5582 7.78197 17.5422 7.68858C17.5262 7.59518 17.4928 7.46211 17.3714 7.3636C17.2276 7.24694 17.0057 7.22234 16.9064 7.22408C16.455 7.23204 15.7626 7.47282 12.43 8.85893Z" fill="white" />
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
                      <div className="w-10 h-10 rounded-full bg-[#232323] border border-gray-300 flex items-center justify-center">
                        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                          <path d="M23.4994 2.51077C23.3672 2.03162 23.1033 1.59354 22.7342 1.24045C22.365 0.887358 21.9036 0.631669 21.3961 0.499009C19.5182 0.00488856 11.9939 0.00488843 11.9939 0.00488843C8.85647 -0.0305416 5.7199 0.126649 2.60425 0.475479C2.0966 0.617829 1.63593 0.879408 1.26573 1.23553C0.895536 1.59164 0.628022 2.03053 0.488446 2.51077C0.151841 4.32482 -0.0115629 6.16355 0.000183311 8.00485C-0.0123684 9.84625 0.151042 11.685 0.488446 13.499C0.625149 13.9779 0.892086 14.4152 1.26304 14.768C1.63399 15.1207 2.09619 15.3766 2.60425 15.5107C4.50723 16.0048 11.9939 16.0048 11.9939 16.0048C15.1355 16.0403 18.2763 15.8831 21.3961 15.5342C21.9036 15.4016 22.365 15.1459 22.7342 14.7928C23.1033 14.4397 23.3672 14.0016 23.4994 13.5225C23.8446 11.7093 24.0122 9.87035 24.0002 8.02845C24.0261 6.17825 23.8583 4.33012 23.4994 2.51077ZM9.60269 11.4284V4.58136L15.8625 8.00485L9.60269 11.4284Z" fill="white" />
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
                      <div className="w-10 h-10 rounded-full bg-[#232323] border border-gray-300 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                          <path fillRule="evenodd" clipRule="evenodd" d="M6.46494 0.066C7.63828 0.01222 8.01228 0 11 0C13.9883 0 14.3617 0.01283 15.5344 0.066C16.7059 0.11917 17.5059 0.30556 18.2056 0.5775C18.9395 0.85381 19.6043 1.28674 20.1538 1.84617C20.7133 2.3956 21.1463 3.06046 21.4225 3.79439C21.6944 4.49411 21.8802 5.29406 21.934 6.46494C21.9878 7.63828 22 8.01228 22 11C22 13.9877 21.9872 14.3617 21.934 15.5351C21.8808 16.7059 21.6944 17.5059 21.4225 18.2056C21.1414 18.9286 20.7649 19.5427 20.1538 20.1538C19.6044 20.7133 18.9395 21.1463 18.2056 21.4225C17.5059 21.6944 16.7059 21.8802 15.5351 21.934C14.3617 21.9878 13.9877 22 11 22C8.01228 22 7.63828 21.9872 6.46494 21.934C5.29406 21.8808 4.49411 21.6944 3.79439 21.4225C3.07144 21.1414 2.45728 20.7649 1.84617 20.1538C1.28664 19.6044 0.85368 18.9395 0.5775 18.2056C0.30556 17.5059 0.11978 16.7059 0.066 15.5351C0.01222 14.3617 0 13.9883 0 11C0 8.01167 0.01283 7.63828 0.066 6.46556C0.11917 5.29406 0.30556 4.49411 0.5775 3.79439C0.85381 3.06051 1.28674 2.39568 1.84617 1.84617C2.39559 1.28664 3.06045 0.85368 3.79439 0.5775C4.49411 0.30556 5.29406 0.11978 6.46494 0.066ZM15.4452 2.046C14.2853 1.99344 13.937 1.98183 11 1.98183C8.063 1.98183 7.71467 1.99344 6.55478 2.046C5.48228 2.09489 4.89989 2.27394 4.51244 2.42489C3.99911 2.62411 3.63244 2.86244 3.24744 3.24744C2.86306 3.63244 2.62411 3.99911 2.42489 4.51244C2.27394 4.89989 2.09489 5.48228 2.046 6.55478C1.99344 7.71467 1.98183 8.063 1.98183 11C1.98183 13.937 1.99344 14.2853 2.046 15.4452C2.09489 16.5177 2.27394 17.1001 2.42489 17.4876C2.60111 17.9654 2.88219 18.3976 3.24744 18.7526C3.60234 19.1178 4.03461 19.3989 4.51244 19.5751C4.89989 19.7261 5.48228 19.9051 6.55478 19.954C7.71467 20.0066 8.06239 20.0182 11 20.0182C13.9376 20.0182 14.2853 20.0066 15.4452 19.954C16.5177 19.9051 17.1001 19.7261 17.4876 19.5751C18.0009 19.3759 18.3676 19.1376 18.7526 18.7526C19.1178 18.3977 19.3989 17.9654 19.5751 17.4876C19.7261 17.1001 19.9051 16.5177 19.954 15.4452C20.0066 14.2853 20.0182 13.937 20.0182 11C20.0182 8.063 20.0066 7.71467 19.954 6.55478C19.9051 5.48228 19.7261 4.89989 19.5751 4.51244C19.3759 3.99911 19.1376 3.63244 18.7526 3.24744C18.3676 2.86306 18.0009 2.62411 17.4876 2.42489C17.1001 2.27394 16.5177 2.09489 15.4452 2.046ZM9.5955 14.3909C10.0408 14.5754 10.518 14.6703 11 14.6703C11.9735 14.6703 12.907 14.2836 13.5953 13.5953C14.2837 12.907 14.6704 11.9734 14.6704 11C14.6704 10.0266 14.2837 9.093 13.5953 8.40468C12.907 7.71636 11.9735 7.32966 11 7.32966C10.518 7.32966 10.0408 7.4246 9.5955 7.60905C9.1501 7.7935 8.74553 8.06385 8.40471 8.40468C8.06389 8.7455 7.79353 9.1501 7.60908 9.5954C7.42463 10.0407 7.3297 10.518 7.3297 11C7.3297 11.482 7.42463 11.9593 7.60908 12.4046C7.79353 12.8499 8.06389 13.2545 8.40471 13.5953C8.74553 13.9361 9.1501 14.2065 9.5955 14.3909ZM7.00205 7.00201C8.06238 5.94168 9.5005 5.34599 11 5.34599C12.4996 5.34599 13.9377 5.94168 14.998 7.00201C16.0583 8.06234 16.654 9.5005 16.654 11C16.654 12.4995 16.0583 13.9376 14.998 14.998C13.9377 16.0583 12.4996 16.654 11 16.654C9.5005 16.654 8.06238 16.0583 7.00205 14.998C5.94172 13.9376 5.34603 12.4995 5.34603 11C5.34603 9.5005 5.94172 8.06234 7.00205 7.00201ZM17.9077 6.18838C18.1583 5.93773 18.2991 5.59779 18.2991 5.24333C18.2991 4.88886 18.1583 4.54892 17.9077 4.29828C17.657 4.04764 17.3171 3.90683 16.9626 3.90683C16.6082 3.90683 16.2682 4.04764 16.0176 4.29828C15.7669 4.54892 15.6261 4.88886 15.6261 5.24333C15.6261 5.59779 15.7669 5.93773 16.0176 6.18838C16.2682 6.43902 16.6082 6.57983 16.9626 6.57983C17.3171 6.57983 17.657 6.43902 17.9077 6.18838Z" fill="white" />
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
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  )
}
