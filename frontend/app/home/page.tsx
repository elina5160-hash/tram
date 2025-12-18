import { Suspense } from "react"
import HomeClient from "./HomeClient"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">Загрузка...</div>}>
      <HomeClient />
    </Suspense>
  )
}
