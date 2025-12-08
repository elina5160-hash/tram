"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { getCart } from "@/lib/cart"

function Item({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const [pressed, setPressed] = useState(false)
  const isActive = pathname === href
  const color = pressed || isActive ? "#000000" : "#FFFFFF"
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 min-w-0 basis-1/4"
      style={{ color }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {icon}
      <span className="text-[10px] sm:text-[11px]">{label}</span>
    </Link>
  )
}

export default function BottomBanner() {
  const [count, setCount] = useState(() => getCart().reduce((sum, it) => sum + (it.qty ?? 1), 0))
  useEffect(() => {
    const update = () => setCount(getCart().reduce((sum, it) => sum + (it.qty ?? 1), 0))
    window.addEventListener("cart:changed", update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener("cart:changed", update)
      window.removeEventListener("storage", update)
    }
  }, [])
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 w-full flex items-center justify-center px-3">
      <div className="relative w-full max-w-[calc(100vw-24px)] sm:max-w-[520px] md:max-w-[620px] lg:max-w-[720px] h-[52px] sm:h-[64px] md:h-[70px] rounded-[20px] bg-[#232323]/50 border border-gray-400/60 shadow-inner mb-[12px] px-4 sm:px-6 md:px-8 flex items-center justify-between overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 h-1/2 rounded-t-[20px] bg-gradient-to-b from-white/30 via-white/15 to-transparent" />
        <Item
          href="/home"
          label="Главная"
          icon={
            <svg className="w-[26px] sm:w-[28px] md:w-[30px] lg:w-[32px] h-auto" viewBox="0 0 37 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M36 25.0397V15.0741C36 13.4513 35.1248 11.8995 33.5792 10.7818L21.1785 1.81408C19.6776 0.728638 17.3224 0.728638 15.8215 1.81409L3.42083 10.7818C1.87516 11.8995 1 13.4513 1 15.0741V25.0397C1 26.6747 2.74111 28 4.88889 28H32.1111C34.2589 28 36 26.6747 36 25.0397Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 16.75C13 14.6789 14.6416 13 16.6667 13H20.3333C22.3584 13 24 14.6789 24 16.75V28H13V16.75Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <Item
          href="/support"
          label="Поддержка"
          icon={
            <svg className="w-[24px] sm:w-[26px] md:w-[28px] lg:w-[30px] h-auto" viewBox="0 0 34 27" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32.7857 0H1.21429C0.542634 0 0 0.548437 0 1.22727V25.7727C0 26.4516 0.542634 27 1.21429 27H32.7857C33.4574 27 34 26.4516 34 25.7727V1.22727C34 0.548437 33.4574 0 32.7857 0ZM31.2679 4.24943V24.2386H2.73214V4.24943L1.68482 3.42486L3.17612 1.48807L4.80022 2.7652H29.2036L30.8277 1.48807L32.319 3.42486L31.2679 4.24943ZM29.2036 2.76136L17 12.3494L4.79643 2.76136L3.17232 1.48423L1.68103 3.42102L2.72835 4.2456L15.6908 14.432C16.0636 14.7247 16.5222 14.8836 16.9943 14.8836C17.4664 14.8836 17.925 14.7247 18.2978 14.432L31.2679 4.24943L32.3152 3.42486L30.8239 1.48807L29.2036 2.76136Z" fill="currentColor" />
            </svg>
          }
        />
        <Item
          href="/cart"
          label="Корзина"
          icon={
            <div className="relative">
              <svg className="w-[28px] sm:w-[30px] md:w-[32px] lg:w-[34px] h-auto" viewBox="0 0 39 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 7H22.7059H34.0731C36.3962 7 38.2112 8.53246 37.9801 10.2985L36.8022 19.2985C36.6016 20.8321 34.9124 22 32.8952 22H14.1454C12.2738 22 10.6623 20.9907 10.2952 19.5883L7 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M7 7L5.37874 2.13619C5.15614 1.46845 4.35618 1 3.43844 1H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 28H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M29 28H33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-white text-black text-[10px] leading-none px-1.5 py-0.5 min-w-[18px] text-center">
                  {count}
                </span>
              )}
            </div>
          }
        />
        <Item
          href="/shop"
          label="Каталог"
          icon={
            <svg className="w-[20px] sm:w-[24px] md:w-[26px] lg:w-[28px] h-auto" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7391 0H0.586957C0.26413 0 0 0.26413 0 0.586957V11.7391C0 12.062 0.26413 12.3261 0.586957 12.3261H11.7391C12.062 12.3261 12.3261 12.062 12.3261 11.7391V0.586957C12.3261 0.26413 12.062 0 11.7391 0ZM9.83152 9.83152H2.49457V2.49457H9.83152V9.83152ZM26.413 0H15.2609C14.938 0 14.6739 0.26413 14.6739 0.586957V11.7391C14.6739 12.062 14.938 12.3261 15.2609 12.3261H26.413C26.7359 12.3261 27 12.062 27 11.7391V0.586957C27 0.26413 26.7359 0 26.413 0ZM24.5054 9.83152H17.1685V2.49457H24.5054V9.83152ZM11.7391 14.6739H0.586957C0.26413 14.6739 0 14.938 0 15.2609V26.413C0 26.7359 0.26413 27 0.586957 27H11.7391C12.062 27 12.3261 26.7359 12.3261 26.413V15.2609C12.3261 14.938 12.062 14.6739 11.7391 14.6739ZM9.83152 24.5054H2.49457V17.1685H9.83152V24.5054ZM26.413 14.6739H15.2609C14.938 14.6739 14.6739 14.938 14.6739 15.2609V26.413C14.6739 26.7359 14.938 27 15.2609 27H26.413C26.7359 27 27 26.7359 27 26.413V15.2609C27 14.938 26.7359 14.6739 26.413 14.6739ZM24.5054 24.5054H17.1685V17.1685H24.5054V24.5054Z" fill="currentColor" />
            </svg>
          }
        />
      </div>
    </div>
  )
}
