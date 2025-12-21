import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"

export default function Support() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-56 pt-[calc(5rem+env(safe-area-inset-top))]">
      <BackButton />
      <div className="flex-1 w-full flex items-center justify-center">
        <h1 className="text-xl">Поддержка</h1>
      </div>
      <BottomBanner />
    </div>
  )
}
