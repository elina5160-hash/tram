import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { splitPrice } from "@/lib/price"
import { addToCart, getCart, incrementQty, removeFromCart } from "@/lib/cart"
import LazyVideo from "@/components/ui/lazy-video"

interface ProductCardProps {
  item: any
  index: number
  isVisible: boolean
  onClick: () => void
  showBadge?: boolean
  showCartButton?: boolean
}

export function ProductCard({ item, index, isVisible, onClick, showBadge, showCartButton = false }: ProductCardProps) {
  const priceParts = splitPrice(item.price)
  const isDiscounted = [2, 6].includes(item.id)
  
  // Local state to track quantity in cart for this item
  const [qty, setQty] = useState(0)

  // Update quantity when cart changes
  const updateQty = () => {
    const cart = getCart()
    const cartItem = cart.find((i) => i.id === item.id)
    setQty(cartItem ? cartItem.qty : 0)
  }

  useEffect(() => {
    updateQty()
    window.addEventListener("cart:changed", updateQty)
    return () => window.removeEventListener("cart:changed", updateQty)
  }, [item.id])

  const handleImageLoad = () => {
    try {
      const payload = { type: "IMAGE_LOAD", message: "product card image loaded", data: { id: item.id, ts: Date.now() } }
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      navigator.sendBeacon("/api/log", blob)
    } catch {}
  }

  const handleImageError = (e: any) => {
    const map: Record<string, string> = {
        "/night.png": "/day.png",
        "/Zakvaska.png": "/1.png",
        "/Rozling.png": "/розлинг1.jpg",
        "/Risling.png": "/рислинг1.png",
        "/Xmel.png": "/хмель1.png",
    }
    const el = e.currentTarget
    const next = map[item.image] || "/главная4.png"
    if (el && next) el.srcset = next 
    if (el && next) el.src = next
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
        id: item.id,
        title: item.title,
        qty: 1
    })
  }
  
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (qty === 0) {
      addToCart({
        id: item.id,
        title: item.title,
        qty: 1
      })
    } else {
      incrementQty(item.id, 1)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    incrementQty(item.id, -1)
  }

  return (
    <div
      className={`relative w-full aspect-[151/244] rounded-[15px] p-1 flex flex-col transition-all duration-500 ease-out transform-gpu ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
      } snap-start cursor-pointer`}
      style={{
        background: "linear-gradient(150deg, #f3f3f3 0%, #eee 100%)",
        transitionDelay: `${index * 60}ms`,
      }}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-square rounded-[15px] overflow-hidden bg-white mx-auto mt-[1px] shrink-0">
        <Link href={`/item/${item.id}`} className="block w-full h-full" aria-label="Открыть товар">
          {item.image.endsWith(".mp4") ? (
            <LazyVideo src={item.image} className="w-full h-full object-cover" />
          ) : (
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-cover"
              sizes="143px"
              priority={index < 2}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </Link>
        {showBadge && (
             <div className="absolute top-2 left-2 px-2 py-1 rounded-[10px] text-[9px] bg-[#E8F8E8] text-[#267A2D]">
                Новинка
             </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col px-1 w-full grow">
        {/* Status */}
        <div className="w-full text-right text-[9px] font-semibold text-[#8A8A8A] mt-[12px] font-[family-name:var(--font-family)]">
          В наличии
        </div>

        {/* Title */}
        <div className="w-full text-left text-[10px] font-semibold text-[#222222] mt-[6px] pl-[2px] font-[family-name:var(--font-family)] leading-tight line-clamp-2">
          {item.title}
        </div>

        {/* Price/Volume & Cart Button */}
        <div className={`w-full mt-auto pl-[2px] pr-[4px] pb-3 flex items-end justify-between gap-2 font-[family-name:var(--font-family)]`}>
           {/* Controls (Left) */}
           {showCartButton && (
               <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-full p-[2px]">
                 <button 
                   onClick={handleDecrement}
                   disabled={qty === 0}
                   className={`w-[22px] h-[22px] rounded-full bg-white shadow-sm flex items-center justify-center active:scale-90 transition-transform text-[#222222] font-medium ${qty === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                   aria-label="Уменьшить"
                 >
                   -
                 </button>
                 <span className="text-[12px] font-bold min-w-[14px] text-center">{qty}</span>
                 <button 
                   onClick={handleIncrement}
                   className="w-[22px] h-[22px] rounded-full bg-[#267A2D] flex items-center justify-center active:scale-90 transition-transform text-white font-medium"
                   aria-label="Увеличить"
                 >
                   +
                 </button>
               </div>
           )}

           {/* Price (Right) */}
           <div className={`text-right ${!showCartButton ? "ml-auto" : ""}`}>
               <span className={`${showCartButton ? "text-[13px]" : "text-[10px]"} font-extrabold text-[#222222]`}>
                 {isDiscounted ? (item.id === 6 ? "4200руб" : item.id === 2 ? "24 000 р." : priceParts.main) : priceParts.main}
               </span>
               {priceParts.sub && (
                 <span className={`${showCartButton ? "text-[13px]" : "text-[10px]"} font-extrabold text-[#7b7b7b]`}>/{priceParts.sub}</span>
               )}
           </div>
        </div>
      </div>
    </div>
  )
}
