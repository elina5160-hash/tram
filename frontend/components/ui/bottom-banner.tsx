"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

import { useBottomBanner } from "@/hooks/useBottomBanner"
import { getCart } from "@/lib/cart"

function Item({ href, renderIcon, label, onClick }: { href: string; renderIcon: (state: { pressed: boolean; isActive: boolean }) => React.ReactNode; label: string; onClick?: () => void }) {
  const pathname = usePathname()
  const [pressed, setPressed] = useState(false)
  const isActive = href.startsWith("/") && pathname === href
  const color = pressed || isActive ? "#387246" : "#353535"
  
  if (!href) {
    return (
        <button
            className="flex flex-col items-center gap-1 min-w-0 basis-1/4"
            style={{ color }}
            onClick={onClick}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onTouchStart={() => setPressed(true)}
            onTouchEnd={() => setPressed(false)}
        >
            {renderIcon({ pressed, isActive })}
            <span className="text-[10px]">{label}</span>
        </button>
    )
  }

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 min-w-0 basis-1/4"
      style={{ color }}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      prefetch={href.startsWith("/")}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {renderIcon({ pressed, isActive })}
      <span className="text-[10px]">{label}</span>
    </Link>
  )
}

export default function BottomBanner() {
  const { items: bannerItems } = useBottomBanner()
  const [count, setCount] = useState(() => getCart().reduce((sum, it) => sum + (it.qty ?? 1), 0))
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  
  useEffect(() => {
    const update = () => setCount(getCart().reduce((sum, it) => sum + (it.qty ?? 1), 0))
    window.addEventListener("cart:changed", update)
    window.addEventListener("storage", update)
    
    // Get user photo from Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
        const user = (window as any).Telegram.WebApp.initDataUnsafe.user
        if (user.photo_url) setUserPhoto(user.photo_url)
    }

    return () => {
      window.removeEventListener("cart:changed", update)
      window.removeEventListener("storage", update)
    }
  }, [])

  const getItem = (id: string) => bannerItems.find(i => i.id === id)

  const homeItem = getItem('home')
  const shopItem = getItem('shop')
  const cartItem = getItem('cart')
  const supportItem = getItem('support')

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 w-full flex items-center justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="relative w-full max-w-[420px] h-[52px] rounded-[20px] bg-[#F0F0F0]/70 backdrop-blur-xl border-none shadow-inner mb-[12px] px-4 flex items-center justify-between overflow-hidden">
        
        {homeItem?.enabled !== false && (
          <Item
            href={homeItem?.href || "/home"}
            label={homeItem?.label || "Главная"}
            renderIcon={() => (
              <svg className="w-[26px] h-auto" viewBox="0 0 37 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M36 25.0397V15.0741C36 13.4513 35.1248 11.8995 33.5792 10.7818L21.1785 1.81408C19.6776 0.728638 17.3224 0.728638 15.8215 1.81409L3.42083 10.7818C1.87516 11.8995 1 13.4513 1 15.0741V25.0397C1 26.6747 2.74111 28 4.88889 28H32.1111C34.2589 28 36 26.6747 36 25.0397Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 16.75C13 14.6789 14.6416 13 16.6667 13H20.3333C22.3584 13 24 14.6789 24 16.75V28H13V16.75Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          />
        )}

        {shopItem?.enabled !== false && (
          <Item
            href={shopItem?.href || "/shop"}
            label={shopItem?.label || "Каталог"}
            renderIcon={() => (
              <svg className="w-[20px] h-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          />
        )}

        {cartItem?.enabled !== false && (
          <Item
            href={cartItem?.href || "/cart"}
            label={cartItem?.label || "Корзина"}
            renderIcon={({ pressed, isActive }) => (
              <div className="relative">
                <Image
                  src="/маг.png"
                  alt="Корзина"
                  width={20}
                  height={20}
                  className="block"
                  style={pressed || isActive ? { filter: "invert(36%) sepia(19%) saturate(923%) hue-rotate(76deg) brightness(92%) contrast(92%)" } : undefined}
                />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-[#C42C2C] text-black text-[10px] leading-none px-1.5 py-0.5 min-w-[18px] text-center">
                    {count}
                  </span>
                )}
              </div>
            )}
          />
        )}

        {supportItem?.enabled !== false && (
          <Item
            href={supportItem?.href || "https://t.me/avatime_cosmetics_income"}
            label={supportItem?.label || "Поддержка"}
            renderIcon={() => (
              <svg className="w-[24px] h-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M2 6L12 13L22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          />
        )}

        <Item
            href="/profile/orders"
            label="Домой"
            renderIcon={() => (
                <div className="w-[24px] h-[24px] rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
                    {userPhoto ? (
                        <Image src={userPhoto} alt="User" width={24} height={24} className="w-full h-full object-cover" />
                    ) : (
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    )}
                </div>
            )}
        />
      </div>
    </div>
  )
}
