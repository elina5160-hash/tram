import { HoverButton } from "@/components/ui/hover-button"

export default function FailPage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold">Оплата не удалась</h1>
        <p className="mt-2 text-[13px] text-[#232323]">Попробуйте ещё раз или выберите другой способ.</p>
        <div className="mt-4 flex gap-2">
          <a href="https://t.me/KonkursEtraBot/app" className="inline-block flex-1">
            <HoverButton className="rounded-[12px] bg-white border px-4 py-2 w-full text-center">Вернуться в приложение</HoverButton>
          </a>
        </div>
      </div>
    </div>
  )
}

