"use client"

import { useRouter } from "next/navigation"

export default function BackButton({ href = "/shop" }: { href?: string }) {
  const router = useRouter()
  const onClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(href)
    }
  }
  return (
    <button
      onClick={onClick}
      className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] left-4 z-50 flex items-center gap-2 pl-3 pr-4 py-2 text-[14px] font-medium text-[#232323] bg-white/90 backdrop-blur-md border border-black/5 rounded-full shadow-md active:scale-95 transition-all hover:bg-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Назад
    </button>
  )
}
