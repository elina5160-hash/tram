"use client"

import { useRouter } from "next/navigation"

export default function BackButton({ href = "/shop" }: { href?: string }) {
  const router = useRouter()
  const onClick = () => {
    router.push(href)
  }

  return (
    <button
      onClick={onClick}
      className="absolute top-4 left-4 z-50 flex items-center gap-1.5 pl-2 pr-3 py-1.5 text-[13px] font-medium text-[#232323] bg-white/80 backdrop-blur-md border border-black/5 rounded-[14px] shadow-sm active:scale-95 transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Назад
    </button>
  )
}
