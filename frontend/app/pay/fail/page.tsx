import Link from "next/link"
import { HoverButton } from "@/components/ui/hover-button"

export default function FailPage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-5xl px-4 pt-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Оплата не прошла</h1>
        <div className="mt-4">
          <Link href="/home" className="inline-block">
            <HoverButton className="rounded-[12px] bg-[#6800E9] text-white px-4 py-2">Вернуться на главную</HoverButton>
          </Link>
        </div>
      </div>
    </div>
  )
}
