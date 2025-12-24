import { HoverButton } from "@/components/ui/hover-button"

export default function FailPage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold">Оплата не удалась</h1>
        <p className="mt-2 text-[13px] text-[#232323]">Попробуйте ещё раз или выберите другой способ.</p>
        <div className="mt-4 flex gap-2">
            <HoverButton 
                onClick={() => window.location.href = "https://t.me/beautykoreanbot/app"}
                className="rounded-[12px] bg-white border px-4 py-2 w-full text-center"
            >
                Вернуться в приложение
            </HoverButton>
        </div>
      </div>
    </div>
  )
}

