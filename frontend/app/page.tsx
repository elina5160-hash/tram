"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Index() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10)
    const t2 = setTimeout(() => {
      router.replace("/home")
    }, 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "linear-gradient(40deg, rgb(28,28,28), rgb(64,0,120))" }}>
      <div className={`transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        <div className="flex flex-col items-center justify-center">
          <div className="text-white text-4xl font-bold tracking-widest">ETRA</div>
          <div className="mt-2 text-white/80 text-sm">магазин энзимов</div>
        </div>
      </div>
    </div>
  )
}
