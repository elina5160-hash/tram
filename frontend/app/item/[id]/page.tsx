"use client"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import BackButton from "@/components/ui/back-button"
import { HoverButton } from "@/components/ui/hover-button"
import BottomBanner from "@/components/ui/bottom-banner"
import { addToCart } from "@/lib/cart"
import { addRatingOnce, addReview, getRatingCount, getRatings, getUserStar, removeUserRating } from "@/lib/ratings"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

import LazyVideo from "@/components/ui/lazy-video"

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

type RouteParams = { id: string }

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

export default function ItemPage() {
  const params = useParams<RouteParams>()
  const idNum = Number(params.id)
  const { products: fetchedProducts } = useProducts()

  const items = useMemo(() => {
    return (fetchedProducts && fetchedProducts.length > 0 ? fetchedProducts : staticItems) as any[]
  }, [fetchedProducts])

  const item = useMemo(() => items.find((it: any) => it.id === idNum), [items, idNum])
  const [tab, setTab] = useState<"description" | "composition" | "reviews">(() => {
    try {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
      const hash = typeof window !== "undefined" ? window.location.hash : ""
      return sp.get("tab") === "reviews" || hash === "#reviews" ? "reviews" : "description"
    } catch {
      return "description"
    }
  })
  const [tariff, setTariff] = useState<"self" | "basic" | "vip">("self")
  const [volume, setVolume] = useState<"1l" | "0.5l" | "200g" | "2kg">("1l")
  const [shareOpen, setShareOpen] = useState(false)
  const [reviewInput, setReviewInput] = useState("")
  
  

  if (!item) {
    return (
      <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-24">
        <BackButton />
        <div className="flex-1 w-full flex items-center justify-center">
          <h1 className="text-xl">Товар не найден</h1>
        </div>
        <BottomBanner />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-56">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(4rem+env(safe-area-inset-top))]">

        <div className="mt-4 bg-white rounded-[20px] border border-gray-300 p-3">
          <div className="relative rounded-[16px] overflow-hidden">
            <div className="aspect-square bg-[#F1F1F1]">
              {item.id === 12 ? (
                <div className="w-full h-full overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-none w-full h-full snap-center relative">
                    <LazyVideo src="/Etra PROMO strz Detskii.mp4" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/детский.png" alt={item.title} fill className="object-cover" />
                  </div>
                </div>
              ) : item.id === 13 ? (
                <div className="w-full h-full overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/хмель1.png" alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/хмель2.png" alt={item.title} fill className="object-cover" />
                  </div>
                </div>
              ) : item.id === 14 ? (
                <div className="w-full h-full overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/розлинг1.jpg" alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/розлинг2.jpg" alt={item.title} fill className="object-cover" />
                  </div>
                </div>
              ) : item.id === 16 ? (
                <div className="w-full h-full overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-none w-full h-full snap-center relative">
                    <LazyVideo src="/Etra PROMO RISLING -3.mp4" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/рислинг1.png" alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/рислинг2.png" alt={item.title} fill className="object-cover" />
                  </div>
                </div>
              ) : item.id === 17 ? (
                <div className="w-full h-full overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
                  <div className="flex-none w-full h-full snap-center relative">
                    <LazyVideo src="/Etra PROMO ORANGE-2.mp4" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/апельсин1.png" alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-none w-full h-full snap-center relative">
                    <Image src="/апельсин2.png" alt={item.title} fill className="object-cover" />
                  </div>
                </div>
              ) : item.id === 18 ? (
                <LazyVideo src="/PARAZITOFF 1500x2667 9-16 PROMO-4_1.mp4" className="w-full h-full object-cover" />
              ) : item.id === 19 ? (
                <LazyVideo src="/KASHA PROMO Demo.mp4" className="w-full h-full object-cover" />
              ) : item.id === 20 ? (
                <Image src="/Набор семейный.png" alt={item.title} fill className="object-cover" />
              ) : item.id === 21 ? (
                <Image src="/баня.PNG" alt={item.title} fill className="object-cover" />
              ) : item.image.endsWith(".mp4") ? (
                <LazyVideo 
                  src={item.image} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                (() => {
                  const map: Record<string, string> = {
                    "/night.png": "/day.png",
                    "/Zakvaska.png": "/1.png",
                    "/Rozling.png": "/розлинг1.jpg",
                    "/Risling.png": "/рислинг1.png",
                    "/Xmel.png": "/хмель1.png",
                  }
                  return (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as any
                        const next = map[item.image] || "/главная4.png"
                        if (el && next) el.src = next
                      }}
                    />
                  )
                })()
              )}
            </div>
            <button
              aria-label="Поделиться"
              className="absolute top-2 right-2 w-9 h-9 rounded-[12px] bg-[#E5E5E5] border border-gray-300 flex items-center justify-center shadow-sm active:scale-105"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : ""
                if (navigator.share) {
                  navigator.share({ title: item.title, url }).catch(() => setShareOpen(true))
                } else {
                  setShareOpen(true)
                }
              }}
            >
              <Image src="/ссылка.png" alt="Поделиться" width={20} height={20} />
            </button>
            {shareOpen && (
              <div className="absolute top-12 right-2 z-10 rounded-[12px] bg-white border border-gray-300 p-2 shadow-sm">
                <div className="flex flex-col gap-2">
                  <button
                    className="px-3 py-2 rounded-[10px] border text-[12px] bg-white"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href)
                      const text = encodeURIComponent(item.title)
                      window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank")
                      setShareOpen(false)
                    }}
                  >
                    Telegram
                  </button>
                  <button
                    className="px-3 py-2 rounded-[10px] border text-[12px] bg-white"
                    onClick={() => {
                      const text = encodeURIComponent(`${item.title} — ${window.location.href}`)
                      window.open(`https://wa.me/?text=${text}`, "_blank")
                      setShareOpen(false)
                    }}
                  >
                    WhatsApp
                  </button>
                  <button
                    className="px-3 py-2 rounded-[10px] border text-[12px] bg-white"
                    onClick={() => {
                      const url = encodeURIComponent(window.location.href)
                      window.open(`https://vk.com/share.php?url=${url}`, "_blank")
                      setShareOpen(false)
                    }}
                  >
                    VK
                  </button>
                  <button
                    className="px-3 py-2 rounded-[10px] border text-[12px] bg-white"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href)
                      setShareOpen(false)
                    }}
                  >
                    Скопировать ссылку
                  </button>
                </div>
              </div>
            )}
            
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-col">
              {item.id === 6 && (
                <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
              )}
              {item.id === 2 && (
                <span className="text-[12px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
              )}
              {item.id === 10 || item.id === 7 ? null : (
                <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>{item.id === 6 ? "4200руб" : item.id === 2 ? "24 000 р." : item.id === 13 ? (volume === "1l" ? "900 руб" : "490 руб") : item.id === 14 ? (volume === "1l" ? "800 руб" : "490 руб") : item.id === 15 ? (volume === "1l" ? "750 руб" : "490 руб") : item.id === 19 ? (volume === "200g" ? "750 руб" : "6300 руб") : splitPrice(item.price).main}</span>
              )}
              {item.id !== 6 && item.id !== 2 && item.id !== 7 && item.id !== 10 && item.id !== 13 && item.id !== 14 && item.id !== 15 && item.id !== 19 && splitPrice(item.price).sub && (
                <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(item.price).sub}</span>
              )}
              {(item.id === 13 || item.id === 14 || item.id === 15) && (
                <>
                  <div className="flex gap-2 mt-2">
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center h-9 px-3 rounded-[12px] border transition-colors duration-150 text-[11px] ${volume === "1l" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={volume === "1l"}
                      onClick={() => setVolume("1l")}
                    >
                      1Л
                    </HoverButton>
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center h-9 px-3 rounded-[12px] border transition-colors duration-150 text-[11px] ${volume === "0.5l" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={volume === "0.5l"}
                      onClick={() => setVolume("0.5l")}
                    >
                      0.5Л
                    </HoverButton>
                  </div>
                </>
              )}
              {item.id === 19 && (
                <>
                  <div className="flex gap-2 mt-2">
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center h-9 px-3 rounded-[12px] border transition-colors duration-150 text-[11px] ${volume === "200g" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={volume === "200g"}
                      onClick={() => setVolume("200g")}
                    >
                      200 ГР
                    </HoverButton>
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center h-9 px-3 rounded-[12px] border transition-colors duration-150 text-[11px] ${volume === "2kg" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={volume === "2kg"}
                      onClick={() => setVolume("2kg")}
                    >
                      2 КГ
                    </HoverButton>
                  </div>
                </>
              )}
              {item.id === 7 && (
                <>
                  <div className="flex gap-2">
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center min-h-[36px] h-auto py-1 px-3 rounded-[12px] border transition-colors duration-150 text-[12px] ${tariff === "self" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={tariff === "self"}
                      onClick={() => setTariff("self")}
                    >
                      Тариф КТО ГОТОВИТ САМ
                    </HoverButton>
                    <HoverButton
                      className={`flex-1 inline-flex items-center justify-center min-h-[36px] h-auto py-1 px-3 rounded-[12px] border transition-colors duration-150 text-[12px] ${tariff === "basic" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                      aria-pressed={tariff === "basic"}
                      onClick={() => setTariff("basic")}
                    >
                      Тариф ОСНОВНОЙ
                    </HoverButton>
                  </div>
                  <HoverButton
                    className={`mt-2 w-full inline-flex items-center justify-center min-h-[36px] h-auto py-1 px-3 rounded-[12px] border transition-colors duration-150 text-[12px] ${tariff === "vip" ? "bg-[#6800E9] text-white border-[#6800E9] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-[#232323] border-[#E5E5E5] hover:bg-[#F7F7F7]"}`}
                    aria-pressed={tariff === "vip"}
                    onClick={() => setTariff("vip")}
                  >
                    Тариф VIP
                  </HoverButton>
                  <span className="mt-3 block text-[12px] font-semibold" style={{ color: "#000000" }}>
                    {tariff === "self" ? "42 000 р." : tariff === "basic" ? "55 000 р." : "60 000 р."}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-[10px] border bg-white text-[12px] active:scale-105"
                onClick={() => setTab("reviews")}
              >
                Оставить отзыв
              </button>
            </div>
          </div>

          <h1 className="text-xl font-semibold mt-4 mb-2">{item.title}</h1>
          <div className="mt-3 rounded-[16px] bg-[#F1F1F1] p-2">
            <div className="flex items-center gap-2">
                  <button
                    className={`px-3 py-2 rounded-[12px] text-[13px] ${tab === "description" ? "bg-[#E5E5E5]" : "bg-white"}`}
                    onClick={() => setTab("description")}
                  >
                    Описание
                  </button>
              {item.id !== 8 && item.id !== 10 && item.id !== 7 && item.id !== 2 && (
                <button
                  className={`px-3 py-2 rounded-[12px] text-[13px] ${tab === "composition" ? "bg-[#E5E5E5]" : "bg-white"}`}
                  onClick={() => setTab("composition")}
                >
                  Состав
                </button>
              )}
              {item.id !== 8 && item.id !== 7 && (
                <button
                  className={`px-3 py-2 rounded-[12px] text-[13px] ${tab === "reviews" ? "bg-[#E5E5E5]" : "bg-white"}`}
                  onClick={() => setTab("reviews")}
                >
                  Отзывы
                </button>
              )}
            </div>
            <div className="mt-2 text-[13px] text-[#232323]">
              {tab === "description" && (
                (item as any).description ? (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap">{(item as any).description}</p>
                  </div>
                ) : item.id === 6 ? (
                  <p>
                    3 ЛИМИТИРОВАННЫХ ВКУСА · 6 ЛИТРОВЫХ БУТЫЛОЧЕК
                    <br />
                    Сезонный №1: Инжирный Мускат (2 шт)
                    <br />
                    Сезонный №2: Арбузный Мохолхин (2 шт)
                    <br />
                    Сезонный №3: Бутия Манго (2 шт)
                  </p>
                ) : item.id === 2 ? (
                  <div className="space-y-2">
                    <p>👫 «СМЕНА МИКРОБИОМА» (24 бутылки)</p>
                    <p>Внимание: курс рассчитан на двоих! Это полная система для пар, подруг, семьи.</p>
                    <p>Цена за курс на двоих: <span style={{ textDecoration: "line-through", color: "#8A8A8A" }}>32 000 руб</span> 24 000 руб. ✔️</p>
                  </div>
                ) : item.id === 3 ? (
                  <div className="space-y-2">
                    <p>Набор ЧИСТОЕ УТРО (напитки УТРО объем 2л + пребиотический порошок ПаразитОФФ 100гр)</p>
                    <p>Антипаразитарный комплекс для глубокого очищения!</p>
                    <p>Скажите себе "ЧИСТОЕ УТРО"! ﻿😍﻿</p>
                    <p>Продукты набора уничтожают непрошенных постояльцев кишечника и выводят токсины, очищают кровь и укрепляют иммунитет.</p>
                    <p>Освободите организм от вредоносных «гостей» и наполните его энергией!</p>
                    <p>Набор расчитан на курс длительностью 20 дней.</p>
                  </div>
                ) : item.id === 4 ? (
                  <div className="space-y-2">
                    <p>Напиток БифидумФаната﻿🍊﻿, объем 1л</p>
                    <p>Напиток Фанта-стика, вкусный и бодрящий, правильный микробиом творящий :)</p>
                    <p>Подходит и к повседневному употреблению и для встреч с друзьями и близкими!</p>
                    <p>Напиток, в отличии от других наших продуктов, создан ТОЛЬКО на БИФИДОБАКТЕРИЯХ.</p>
                  </div>
                ) : item.id === 12 ? (
                  <div className="space-y-2">
                    <p>Каждая капля энзимного напитка "Детский" наполнена натуральными ингредиентами, способствующими улучшению пищеварения и укреплению иммунитета. Яркие, освежающие и насыщенные вкусы фруктов превращают каждый глоток в настоящее удовольствие!</p>
                    <p>Давайте знакомить детей с нашим новым энзимным напитком, который не только порадует своим фруктовым вкусом, но и позаботится о здоровье!</p>
                  </div>
                ) : item.id === 12 ? (
                  <p>Вода из Пластунского источника г. Сочи высокощелочная РН9.2, свекла, яблоко, лимон, апельсин,банан, спирулина, клубника, грецкий орех, ананас, груша сезонная, анис, горные травы, стевия, сироп топинамбура. сенная палочка (Bacillus Subtiles).</p>
                ) : item.id === 11 ? (
                  <div className="space-y-2">
                    <p>Сочетает в себе уникальный аромат хвойных лесов. Он богат натуральными ферментами, которые способствуют улучшению пищеварения и укрепляют иммунную систему, а освежающий еловый аромат наполняет энергией и бодростью. Наслаждайтесь каждым глотком, зная, что Вы делаете шаг к здоровью и гармонии с природой!</p>
                    <p>Подходит и к повседневному употреблению и для встреч с друзьями и близкими!</p>
                  </div>
                ) : item.id === 13 ? (
                  <div className="space-y-2">
                    <p>Легкая газированность и насыщенные ароматы энзимного напитка «Хмель» подарят вам ощущение свежести и радости в каждой капле. Этот напиток станет отличным выбором для дружеских встреч и семейных праздников, сочетая в себе полезные свойства и приятный вкус.</p>
                    <p>Подходит и к повседневному употреблению и для встреч с друзьями и близкими!</p>
                  </div>
                ) : item.id === 14 ? (
                  <div className="space-y-2">
                    <p>Сочетает в себе уникальный вкусовой букет из лепестков розы, сладкого винограда и сочных тропических нот. Он обогащён природными компонентами и растительными пробиотиками, которые способствуют поддержанию тонуса и внутреннего баланса, а лёгкое цветочное послевкусие наполняет ощущением гармонии и свежести.</p>
                    <p>Подходит и к повседневному употреблению и для встреч с друзьями и близкими!</p>
                  </div>
                ) : item.id === 15 ? (
                  <div className="space-y-2">
                    <p>Во вкусе напитка яркий цитрусовый акцент лайма и лимона с мягкой сладостью яблока, банана. Он насыщен гармонией сильных природных компонентов — женьшеня, родиолы розовой и маки перуанской, которые способствуют повышению энергии и поддержанию тонуса, а растительные пробиотики заботятся о внутреннем балансе. Освежающий вкус с лёгкой пряностью имбиря и аниса наполняет бодростью. Наслаждайтесь каждым глотком, и получайте естественный заряд энергии.</p>
                    <p>Подходит и к повседневному употреблению, и для встреч с друзьями и близкими!</p>
                  </div>
                ) : item.id === 16 ? (
                  <div className="space-y-2">
                    <p>Энзимный напиток "Рислинг" познакомит Вас с изысканным вкусом белого винограда одноименного сорта. Он содержит натуральные ферменты, которые способствуют улучшению пищеварения и укреплению иммунитета. Погрузитесь в освежающий вкус рислинга и будьте уверены, что каждый глоток приносит благо вашему организму!</p>
                  </div>
                ) : item.id === 17 ? (
                  <div className="space-y-2">
                    <p>Энзимный напиток "Апельсин" — это яркий цитрусовый взрыв, который заряжает энергией и поддерживает здоровье. Натуральные ферменты в составе улучшают обмен веществ и укрепляют иммунитет. Насладитесь сочным вкусом апельсина и почувствуйте прилив сил с каждым глотком!</p>
                  </div>
                ) : item.id === 18 ? (
                  <div className="space-y-2">
                    <p>Ферментированный антипаразитарный природный пребиотик ДВА В ОДНОМ, направленный на чистку ЖКТ от патогенной микрофлоры и на последующее питание дружественной микробиоты.</p>
                    <p>ПАРАЗИТОФФ эффективно очищает кишечник, печень и почки от токсинов и паразитов, в том числе от их яиц и продуктов жизнедеятельности.</p>
                  </div>
                ) : item.id === 19 ? (
                  <div className="space-y-2">
                    <p>Эта каша состоит из 42 ингредиентов, которые были сферментированы бактериями, под давлением в 10 атмосфер. Готовится за две минуты.</p>
                    <p>Подходит тем, кто придерживается веганства и здорового питания.</p>
                    <p>Улучшает пищеварение, очищает организм, содержит на 100% усваиваемый растительный белок, живые аминокислоты, природные пробиотики и чистые энзимы.</p>
                    <p className="font-semibold mt-4">РЕКОМЕНДАЦИИ ПО УПОТРЕБЛЕНИЮ</p>
                    <p>Прием: Принимать по желанию каждый день или через день, также в дни повышенной физической нагрузки</p>
                    <p>Лучший рецепт 100 гр смешать с теплой водой (﻿❗﻿не варить и не заливать водой выше 60 С﻿❗﻿ ) + рекомендовано добавлять 1 ст.л. любого сыродавленного масла по вкусу + 1-2 ч.л. меда + можно добавить фрукты</p>
                    <p>Подходит для изготовления RAW и VEG сладостей</p>
                  </div>
                ) : item.id === 20 ? (
                  <div className="space-y-2">
                    <p>Наш набор энзимных напитков включает в себя три варианта: “Рислинг”, “Хмель” и “Детский”.</p>
                    <p>Мы переосмыслили некоторые привычные рецепты, чтобы получить поистине полезные и вкусные напитки. Такие напитки будут уместны и в кругу семьи и в большой компании и на мероприятии : каждый обязательно найдет свой любимый вкус.</p>
                    <p>Набор состоит из трех бутылочек с напитками: Хмель (1бут), Детский (1бут), Рислинг (1бут)</p>
                  </div>
                ) : item.id === 21 ? (
                  <div className="space-y-2">
                    <p>Наш набор энзимных напитков включает в себя четыре уникальных варианта: “Рислинг”, “Хмель”, “Квас” и “Еловый”.</p>
                    <p>Мы преобразовали привычные классические рецепты, создав энзимные альтернативы, насыщенные ферментами и витаминами, которые будут бережно поддерживать ваш иммунитет.</p>
                    <p>Каждый из них предлагает удивительное сочетание вкуса и пользы для здоровья! Напитки ЭТРА идеально подойдут для душевных встреч с друзьями, для занятий спортом, праздников, отдыха на природе и оздоровительных походов в баню.</p>
                    <p>Набор состоит из 6 литровых бутылочек с напитками: Еловый (2бут), Супер Квас (2бут) Рислинг (1бут) Хмель (1бут)</p>
                  </div>
                ) : item.id === 22 ? (
                  <div className="space-y-2">
                    <p>Вкусный полезный напиток! Подходит и к повседневному употреблению и для встреч с друзьями и близкими!</p>
                  </div>
                ) : item.id === 8 ? (
                  <p>Пробка специально разработанная нами, для легкого открывания напитков, без фонтана:)</p>
                ) : item.id === 7 ? (
                  <div className="space-y-2">
                    <p>ВНИМАНИЕ, ВЕС ПОСЫЛКИ 30 КГ</p>
                    <p>Доставка включена в стоимость</p>
                  </div>
                ) : item.id === 10 ? (
                  <div className="space-y-2">
                    <p>Ольга Сайфулина — Производитель Сыродавленных Масел</p>
                    <p>Знакомьтесь: Меня зовут Ольга Сайфулина, я занимаюсь производством сыродавленных растительных масел.</p>
                    <p>Продукция: Узнать подробнее обо всей линейке продукции можно в моей группе Телеграм:</p>
                    <p>Группа: https://t.me/+fsGyPsW-LNFmN2Iy</p>
                    <p>Свежесть: Каждое масло изготавливается исключительно под ваш индивидуальный заказ, гарантируя свежесть каждого отжима и максимальную пользу продукта.</p>
                    <p>Польза для здоровья: Применяя собственные масла ежедневно, я убедилась в значительном положительном влиянии на общее состояние организма:</p>
                    <p>- Улучшение гибкости тела,</p>
                    <p>- Повышение уровня энергии и жизненных сил,</p>
                    <p>- Поддержка клеточной структуры благодаря содержанию необходимых жиров.</p>
                    <p>Полезные знания: Я погружаюсь в изучение влияния масел на наше тело и делюсь этими ценными знаниями в своей группе.</p>
                    <p>От сердца к сердцу: Моя миссия — создавать продукцию с искренней заботой о вашем здоровье, обогащая каждый продукт теплом и вниманием.</p>
                    <p>✅ Присоединяйтесь ко мне в моем сообществе, где вас ждет увлекательная информация о мире полезных растительных масел!</p>
                    <p>Для удобства пользователей, ссылки на группу:</p>
                    <p>https://t.me/cvoemaclo</p>
                    <p>https://t.me/+fsGyPsW-LNFmN2Iy</p>
                    <p>СвоеПроизводство · 📞 +7 932 407 21 09</p>
                    <p>Собственное производство растительного масла холодного отжима.</p>
                  </div>
                ) : item.id === 11 ? (
                  <p>Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, ананас, мандарин, мед (после ферментации отсутствует) , свежие пихтовые иголки и ветки, хмель сортов citra и mosaic, виноград черный, cтевия, сенная палочка (Bacillus Subtiles).</p>
                ) : item.id === 1 ? (
                  <div className="space-y-2">
                    <p>Закваска ПРАЭнзим, объем 1л</p>
                    <p>Новейший вкус в вашей жизни 🤗</p>
                    <p>Супер Качественная, Перво начальная Закваска для приготовления напитков.</p>
                    <p>
                      Её основа - тренированные бактерии, проделавшие длинный путь трансформаций. Эти бактерии побывали в различных регионах России, “считали” коды множества продуктов и теперь готовы для создания Энзимных напитков в любых условиях.
                    </p>
                    <p>Вы сможете получить питание из любых растительных продуктов…даже из хвои и коры!</p>
                    <p>
                      Друзья, иногда напитки, приготовленные вами самостоятельно из нашей закваски, бывает тяжело открывать. Для этого мы изобрели супер-пробку, она поможет открыть бутылочку легко! Для того чтобы приобрести пробку обращайтесь в нашу поддержку
                    </p>
                  </div>
                ) : item.id === 9 ? (
                  <div className="space-y-2">
                    <p>Курс Смена Микробиома, объем 12л ﻿👈﻿</p>
                    <p>Авторский курс от Кирилла Серебрянского рассчитан на 18 дней и включает в себя 12 бутылок из 4 категорий напитков:</p>
                    <p>Утро: Очищение/ Антипаразитарка</p>
                    <p>День: Наполнение</p>
                    <p>БифидумФаната: Бифидобактерии - санитары</p>
                    <p>Вечер: Восстановление</p>
                    <p>Такой состав - итог длительных поисков. Он создан на основании многочисленных положительных результатов разных людей.</p>
                    <p>ВНИМАНИЕ! Вес посылки 23кг. Для Дальнего Востока действуют индивидуальные условия по стоимости.</p>
                  </div>
                ) : (
                  <p>Полезные энзимные напитки для восстановления микробиома и энергии. Укрепляют здоровье и помогают чувствовать себя лучше.</p>
                )
              )}
              {tab === "composition" && (
                (item as any).composition ? (
                  <p className="whitespace-pre-wrap">{(item as any).composition}</p>
                ) : item.id === 13 ? (
                  <p>Вода из Пластунского источника г. Сочи высокощелочная РН9.2, ананас, манго, мед (после ферментации отсутствует), лимон абхазский, лайм, персик, дыня, груша, 4 смеси пряностей от “Алхимия вкуса”, скорлупа ореха кедра, саган-дайля, щепа дуба, щепа вишни для копчения, кубы дуба, зубровка, сорта хмеля: centennial, citra, mosaic, РАСТИТЕЛЬНЫЕ ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РОДА BACILLUS и BIFIDUM</p>
                ) : item.id === 14 ? (
                  <p>Вода из Пластунского источника г. Сочи ионизированная, высокощелочная РН9.2, роза сушеная, темный виноград сладкий, вишня, ананас, мускатный орех, корень женьшеня, родиола розовая, стевия, корень пиона, натуральный мёд, РАСТИТЕЛЬНЫЕ ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РОДА BACILLUS и BIFIDUM.</p>
                ) : item.id === 15 ? (
                  <p>вода из Пластунского источника г. Сочи ионизированная, высокощелочная РН9.2, яблоко Голден, банан, лимон, лайм, стевия, корень имбиря, мака перуанская, саган дайля, женьшень, родиола розовая, анис, натуральный мёд, РАСТИТЕЛЬНЫЕ ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РОДА BACILLUS и BIFIDUM.</p>
                ) : item.id === 16 ? (
                  <p>Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, манго , ананас, мёд (после ферментации отсутствует), хвоя пихты, саган-дайля, мускатный орех, сок винограда сорта “Рислинг”, стевия, сенная палочка (Bacillus Subtiles).</p>
                ) : item.id === 17 ? (
                  <p>Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, манго, ананас, мёд (после ферментации отсутствует), хвоя пихты, саган-дайля, мускатный орех, сок апельсина, стевия, сенная палочка (Bacillus Subtiles).</p>
                ) : item.id === 18 ? (
                  <p>Гвоздика, тмин, черный орех, окопник. Ферментированные дегидрированные продукты: стевия, роза, чага, курага, цветки лилии, календула, цедра апельсина, цветки апельсина, облепиха, родиола розовая алтайская, саган дайля, корень пиона, исландский мох, уснея бородатая, амарант, мускатный орех, мака перуанская, семена чиа, свекла, морковь, чеснок, пижма, витграсс, тархун, куркума, лавровый лист, ананас, хурма, фейхоа, лайм, лимон.</p>
                ) : item.id === 19 ? (
                  <p>Молотый лен (по старорусскому рецепту), кедровый орех, фисташка, тыквенное семя, кокосовая пудра (молотая стружка), проростки зеленой гречки, проростки зеленой чечевицы, проростки кунжута черного, протеин из белого кунжута, тыквенный протеин, конопляный протеин, гвоздика, окопник, черный тмин, ферментированная смесь из 42 продуктов, пребиотик ЭТРА ПаразитОФФ, сублимированные клубника, малина, вишня.</p>
                ) : item.id === 20 ? (
                  <div className="space-y-2">
                    <p><span className="font-semibold">Рислинг:</span> Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, манго , ананас, мёд (после ферментации отсутствует), хвоя пихты, саган-дайля, мускатный орех, сок винограда сорта “Рислинг”, стевия, сенная палочка (Bacillus Subtiles).</p>
                    <p><span className="font-semibold">Детский:</span> Вода из Пластунского источника г. Сочи высокощелочная РН9.2, свекла, яблоко, лимон, апельсин,банан, спирулина, клубника, грецкий орех, ананас, груша сезонная, анис, горные травы, стевия, сироп топинамбура. сенная палочка (Bacillus Subtiles).</p>
                    <p><span className="font-semibold">Хмель:</span> Вода из Пластунского источника г. Сочи высокощелочная РН9.2, ананас, манго, мед (после ферментации отсутствует), лимон абхазский, лайм, персик, дыня, груша, 4 смеси пряностей от “Алхимия вкуса”, скорлупа ореха кедра, саган-дайля, щепа дуба, щепа вишни для копчения, кубы дуба, зубровка, сорта хмеля: centennial, citra, mosaic, РАСТИТЕЛЬНЫЕ ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РОДА BACILLUS и BIFIDUM</p>
                  </div>
                ) : item.id === 21 ? (
                  <div className="space-y-2">
                    <p><span className="font-semibold">Супер Квас:</span> Вода с Пластунского Источника г. Сочи, Ионизированная Высокощелочная (pH 9.2), Виноград, Лимон, Яблоко, Груша, Апельсин, Солод Ржаной, Иван-Чай, Саган-Дайля, Плоды Шиповника, Смородиновый Лист, Мята Садовая, Цветки Ромашки, Чабрец, Лепестки Розы, Цветки Незабудки, Лепестки Календулы, Лепестки Василька, Натуральный Мёд, Листья Стевии, Сенная Палочка (Bacillus Subtiles). Пробиотические Бактерии - Растительные и Рода Bacillus.</p>
                    <p><span className="font-semibold">Рислинг:</span> Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, манго , ананас, мёд (после ферментации отсутствует), хвоя пихты, саган-дайля, мускатный орех, сок винограда сорта “Рислинг”, стевия, сенная палочка (Bacillus Subtiles).</p>
                    <p><span className="font-semibold">Хмель:</span> Вода из Пластунского источника г. Сочи высокощелочная РН9.2, ананас, манго, мед (после ферментации отсутствует), лимон абхазский, лайм, персик, дыня, груша, 4 смеси пряностей от “Алхимия вкуса”, скорлупа ореха кедра, саган-дайля, щепа дуба, щепа вишни для копчения, кубы дуба, зубровка, сорта хмеля: centennial, citra, mosaic, РАСТИТЕЛЬНЫЕ ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РОДА BACILLUS и BIFIDUM</p>
                    <p><span className="font-semibold">Еловый:</span> Вода из Пластунского источника г. Сочи Высокощелочная РН9.2, ананас, мандарин, мед (после ферментации отсутствует) , свежие пихтовые иголки и ветки, хмель сортов citra и mosaic, виноград черный, cтевия, сенная палочка (Bacillus Subtiles).</p>
                  </div>
                ) : item.id === 22 ? (
                  <p>Вода с Пластунского Источника г. Сочи, Ионизированная Высокощелочная (pH 9.2), Виноград, Лимон, Яблоко, Груша, Апельсин, Солод Ржаной, Иван-Чай, Саган-Дайля, Плоды Шиповника, Смородиновый Лист, Мята Садовая, Цветки Ромашки, Чабрец, Лепестки Розы, Цветки Незабудки, Лепестки Календулы, Лепестки Василька, Натуральный Мёд, Листья Стевии, Сенная Палочка (Bacillus Subtiles). Пробиотические Бактерии - Растительные и Рода Bacillus.</p>
                ) : item.id === 12 ? (
                  <p>Вода из Пластунского источника г. Сочи высокощелочная РН9.2, свекла, яблоко, лимон, апельсин,банан, спирулина, клубника, грецкий орех, ананас, груша сезонная, анис, горные травы, стевия, сироп топинамбура. сенная палочка (Bacillus Subtiles).</p>
                ) : item.id === 8 || item.id === 10 ? null : item.id === 9 ? (
                  <div className="space-y-4">
                    <p className="font-bold">СОСТАВ КУРС СМЕНЫ МИКРОБИОМА</p>
                    
                    <div>
                      <p className="font-semibold">СМЕНА МИКРОБИОМА - УТРО</p>
                      <p className="font-semibold">АНТИПАРАЗИТАРКА</p>
                      <p>СОСТАВ: Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Свеклы, Свежевыжатый Сок Свеклы, Натуральный Мёд, Виноград Тёмный, Лисички Сушёные, Чеснок, Натуральный Сироп Топинамбура, Полынь, Пижма, Лавровый Лист, Листья Стевии, Сенная Палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS, Эфиры Дотерра: Дайджест, Копайба, Зендокрин.</p>
                    </div>

                    <div>
                      <p className="font-semibold">СМЕНА МИКРОБИОМА - ДЕНЬ</p>
                      <p className="font-semibold">НАПОЛНЕНИЕ БИОМА</p>
                      <p className="font-semibold">КУРС ПРАЭНЗИМ</p>
                      <p>COCTAB: Вода с Пластунского источника г. Сочи Ионизированная, Высокощелочная PH9.2, Сок Свежевыжатый Морковный, Облепиха, Манго, Натуральный Мёд, Лимон Абхазский, Сироп Топинамбура, Мака Перуанская, Родиола Розовая (Алтайский корень), Стевия, Саган Дайля, Мускатный Орех, Сенная Палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ РАСТИТЕЛЬНЫЕ И РОДА BACILLUS, Заряд Любви и Чистка Медной Сеткой.</p>
                    </div>

                    <div>
                      <p className="font-semibold">СМЕНА МИКРОБИОМА - БИФИДУМ ФАНАТА</p>
                      <p className="font-semibold">САНИТАРЫ</p>
                      <p className="font-semibold">КУРС ПРАЭНЗИМ</p>
                      <p>COCTAB: Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Банан, Лимон Абхазский, Манго, Облепиха, Натуральный Мёд, Мака Перуанская, Урбеч, Манго-Кокос, Bifidobacterium Bifidum. ЗАряд Любви и Чистка Медной Сеткой.</p>
                    </div>

                    <div>
                      <p className="font-semibold">СМЕНА МИКРОБИОМА - ВЕЧЕР</p>
                      <p className="font-semibold">ВОССТАНОВЛЕНИЕ</p>
                      <p className="font-semibold">КУРС ПРАЭНЗИМ</p>
                      <p>COCTAB: Вода из Пластунского источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Ананаса, Пюре Манго, Пюре Винограда Темного, Натуральный Мёд, Сироп Топинамбура, Груша, Банан, Шиповник, Фенхель, Тархун, Имбирь, Озонированная Выжимка из Оливок, Сенная палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS.</p>
                    </div>
                  </div>
                ) : item.id === 3 ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">УТРО</p>
                      <p>Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Свеклы, Свежевыжатый Сок Свеклы, Натуральный Мёд, Виноград Тёмный, Лисички Сушёные, Чеснок, Натуральный Сироп Топинамбура, Полынь, Пижма, Лавровый Лист, Листья Стевии, Сенная Палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS, Эфиры Дотерра: Дайджест, Копайба, Зендокрин.</p>
                    </div>
                    <div>
                      <p className="font-semibold">СУХАЯ ФЕРМЕНТИРОВАННАЯ РАСТИТЕЛЬНАЯ СМЕСЬ ПАРАЗИТОФФ</p>
                      <p className="font-semibold">COCTAB</p>
                      <p>Гвоздика, тмин, черный орех, окопник. Ферментированные дегидрированные продукты: стевия, роза, чага, курага, цветки лилии, календула, цедра апельсина, цветки апельсина, облепиха, родиола розовая алтайская, саган дайля, корень пиона, исландский мох, уснея бородатая, амарант, мускатный орех, мака перуанская, семена чиа, свекла, морковь, чеснок, пижма, витграсс, тархун, куркума, лавровый лист, ананас, хурма, фейхоа, лайм, лимон абхазский, виноград черный, имбирь, бананы, манго, киви, кокосовая стружка, протеин конопляный, протеин семян подсолнечника, протеин белого кунжута, проростки зеленой чечевицы, проростки зеленой гречки, проростки зеленого маша, проростки льна, проростки кунжута черного.</p>
                    </div>
                  </div>
                ) : item.id === 6 ? (
                  <div className="space-y-2">
                    <p>
                      СЕЗОННЫЙ 1 · СОСТАВ: вода из Пластунского источника г. Сочи ионизированная, высокощелочная РН9.2, натуральный мёд, арбуз, виноград сорта Изабелла, инжир, стевия, имбирь, сироп топинамбура, корица, мох исландский, орех мохилхин.
                    </p>
                    <p>
                      СЕЗОННЫЙ 2 · СОСТАВ: вода из Пластунского источника г. Сочи ионизированная, высокощелочная РН9.2, натуральный мёд, арбуз, винограда сорта Изабелла, слива, базилик, стевия, инжир, черная смородина, сироп топинамбура, имбирь, корень пиона. Растительные пробиотические бактерии — рода Bacillus и Bifidum.
                    </p>
                    <p>
                      СЕЗОННЫЙ 3 · СОСТАВ: вода из Пластунского источника г. Сочи ионизированная, высокощелочная РН9.2, натуральный мёд, бутия спелая, манго, мускатный орех, стевия, сироп топинамбура, розмарин, пектин, лист лавровый, масло Doterra Дайджест.
                    </p>
                  </div>
                ) : item.id === 2 ? (
                  <div className="space-y-2">
                    <p>
                      СМЕНА МИКРОБИОМА — УТРО · АНТИПАРАЗИТАРКА · КУРС ПРАЭНЗИМ
                      <br />
                      Состав: Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Свеклы, Свежевыжатый Сок Свеклы, Натуральный Мёд, Виноград Тёмный, Лисички Сушёные, Чеснок, Натуральный Сироп Топинамбура, Полынь, Пижма, Лавровый Лист, Листья Стевии, Сенная Палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS, Эфиры Doterra: Дайджест, Копайба, Зендокрин.
                    </p>
                    <p>
                      СМЕНА МИКРОБИОМА — ДЕНЬ · НАПОЛНЕНИЕ БИОМА · КУРС ПРАЭНЗИМ
                      <br />
                      Состав: Вода с Пластунского источника г. Сочи Ионизированная, Высокощелочная PH9.2, Сок Свежевыжатый Морковный, Облепиха, Манго, Натуральный Мёд, Лимон Абхазский, Сироп Топинамбура, Мака Перуанская, Родиола Розовая (Алтайский корень), Стевия, Саган Дайля, Мускатный Орех, Сенная Палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ РАСТИТЕЛЬНЫЕ И РОДА BACILLUS, Заряд Любви и Чистка Медной Сеткой.
                    </p>
                    <p>
                      СМЕНА МИКРОБИОМА — БИФИДУМ ФАНАТА · САНИТАРЫ · КУРС ПРАЭНЗИМ
                      <br />
                      Состав: Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Банан, Лимон Абхазский, Манго, Облепиха, Натуральный Мёд, Мака Перуанская, Урбеч, Манго-Кокос, Bifidobacterium Bifidum. Заряд Любви и Чистка Медной Сеткой.
                    </p>
                    <p>
                      СМЕНА МИКРОБИОМА — ВЕЧЕР · ВОССТАНОВЛЕНИЕ · КУРС ПРАЭНЗИМ
                      <br />
                      Состав: Вода из Пластунского источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Ананаса, Пюре Манго, Пюре Винограда Темного, Натуральный Мёд, Сироп Топинамбура, Груша, Банан, Шиповник, Фенхель, Тархун, Имбирь, Озонированная Выжимка из Оливок, Сенная палочка, ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS.
                    </p>
                  </div>
                ) : item.id === 4 ? (
                  <div className="space-y-2">
                    <p>
                      Вода из Пластунского Источника г. Сочи Ионизированная, Высокощелочная РН9.2, Банан, Лимон Абхазский, Манго, Облепиха, Натуральный Мёд, Мака Перуанская, Урбеч, Манго-Кокос, Bifidobacterium Bifidum. ЗАряд Любви и Чистка Медной Сеткой.
                    </p>
                  </div>
                ) : item.id === 1 ? (
                  <div className="space-y-2">
                    <p>
                      Состав: Вода из Пластунского источника г. Сочи Ионизированная, Высокощелочная РН9.2, Пюре Ананаса, Пюре Манго, Пюре Винограда Темного, Персик, Мёд, Сироп Топинамбура, Сок Клубники, Сок Малины, Сок Свеклы, Лимон Абхазский, Банан, Лайм, Лепестки Роз, Имбирь, Лавровые Листы, Родиола Розовая (золотой корень). Березовая Чага, Стевия, Хвоя Сосны, Исландский Мох, Уснея Бородатая, Мака Перуанская, Чиа, Цветки Календулы, Куркума, Озонорованная Выжимка из Оливок, Псилиум, Корень Пиона, Кокос, Сенная Палочка,
                    </p>
                    <p>ПРОБИОТИЧЕСКИЕ БАКТЕРИИ - РАСТИТЕЛЬНЫЕ И РОДА BACILLUS,</p>
                    <p>Мускатный Орех. Пророщенные: Подсолнечник, Лен, Маш, Семена Тыквы.</p>
                    <p>Эфиры Дотерра: Дайджест, Копайба, Зендокрин, Можжевельник.</p>
                    <p>ЗАряд Любви и Чистка Медной Сеткой</p>
                  </div>
                ) : (
                  <p>Состав: ферментированные ингредиенты, натуральные экстракты, микроэлементы. Без искусственных добавок.</p>
                )
              )}
              {tab === "reviews" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    placeholder="Напишите отзыв"
                    className="w-full rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px]"
                  />
                  <button
                    className="rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px] active:scale-105"
                    onClick={() => {
                      const text = reviewInput.trim()
                      if (text) {
                        addReview(idNum, text)
                        setReviewInput("")
                      }
                    }}
                  >
                    Сохранить отзыв
                  </button>
                  <div className="mt-2 space-y-1">
                    {(getRatings().find((x) => x.id === idNum)?.reviews || []).length === 0 ? (
                      <p>Отзывов пока нет</p>
                    ) : (
                      (getRatings().find((x) => x.id === idNum)?.reviews || []).map((rv, i) => (
                        <p key={i}>• {rv}</p>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="w-full rounded-[12px] bg-white border border-gray-300 px-3 py-3 text-[13px]"
            onClick={() => window.open("https://t.me/avatime_cosmetics_income", "_blank")}
          >
            Помощь менеджера
          </button>
          <HoverButton
            className="w-full rounded-[12px] border px-3 py-3 text-[13px] active:scale-105 bg-[#6800E9] text-white"
            onClick={() => addToCart({ id: item.id === 13 && volume === "0.5l" ? 1013 : item.id === 14 && volume === "0.5l" ? 1014 : item.id === 15 && volume === "0.5l" ? 1015 : item.id, title: item.id === 7 ? `${item.title} — ${tariff === "self" ? "КТО ГОТОВИТ САМ" : tariff === "basic" ? "ОСНОВНОЙ" : "VIP"}` : item.id === 13 ? `Энзимный напиток Хмель ${volume === "1l" ? "1л" : "0.5л"}` : item.id === 14 ? `Энзимный напиток Розлинг ${volume === "1l" ? "1л" : "0.5л"}` : item.id === 15 ? `Полезный энергетик ${volume === "1l" ? "1л" : "0.5л"}` : item.title, qty: 1 })}
          >
            В корзину
          </HoverButton>
        </div>
        <div className="h-32 w-full" />
      </div>
      <BottomBanner />
    </div>
  )
}
