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
      className="absolute top-3 left-3 px-3 py-1.5 text-[11px] text-white"
      style={{ background: "rgba(183, 177, 177, 0.5)", borderRadius: "30%" }}
    >
      Назад
    </button>
  )
}
