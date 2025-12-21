import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"

export default function Support() {
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(7.5rem+env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold mb-4">Поддержка</h1>
      </div>
      <BottomBanner />
    </div>
  )
}
