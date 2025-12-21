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
  const [quantity, setQuantity] = useState(0)

  useEffect(() => {
    const sync = () => {
      const cart = getCart()
      const found = cart.find((c: any) => c.id === item.id)
      setQuantity(found ? found.qty : 0)
    }
    sync()
    
    const handler = () => sync()
    window.addEventListener("cart:changed", handler)
    return () => window.removeEventListener("cart:changed", handler)
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

  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
        id: item.id,
        title: item.title,
        qty: 1
    })
  }

  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation()
    incrementQty(item.id, -1)
  }
  
  return (
    <div
      className={`relative w-full h-[280px] rounded-[20px] p-2 flex flex-col transition-all duration-500 ease-out transform-gpu ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
      } snap-start cursor-pointer bg-white shadow-sm border border-gray-100`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-square rounded-[15px] overflow-hidden bg-gray-50 mx-auto shrink-0">
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
      <div className="flex flex-col w-full grow pt-2">
        {/* Title */}
        <div className="w-full text-left text-[11px] font-bold text-[#222222] font-[family-name:var(--font-family)] leading-tight line-clamp-2 min-h-[28px]">
          {item.title}
        </div>

        {/* Price Section */}
        <div className="mt-1 flex flex-col items-start">
           {/* Old Price */}
           {(isDiscounted || item.id === 6 || item.id === 2) && (
               <div className="text-[10px] text-[#8A8A8A] line-through font-[family-name:var(--font-family)]">
                   {item.id === 6 ? "6000 РУБ" : item.id === 2 ? "32 000 р." : ""}
               </div>
           )}
           {/* New Price */}
           <div className="text-[13px] font-extrabold text-[#222222] font-[family-name:var(--font-family)]">
               {isDiscounted ? (item.id === 6 ? "4200руб" : item.id === 2 ? "24 000 р." : priceParts.main) : priceParts.main}
           </div>
        </div>

        {/* Quantity Controls */}
        <div className="mt-auto w-full flex items-center justify-between gap-2">
           <button 
             onClick={handleMinus}
             className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-90 transition-transform text-[#222222] pb-1"
             aria-label="Уменьшить"
           >
             -
           </button>
           <span className="text-[14px] font-semibold text-[#222222] min-w-[20px] text-center">
             {quantity}
           </span>
           <button 
             onClick={handlePlus}
             className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-90 transition-transform text-[#222222] pb-1"
             aria-label="Увеличить"
           >
             +
           </button>
        </div>
      </div>
    </div>
  )
}
