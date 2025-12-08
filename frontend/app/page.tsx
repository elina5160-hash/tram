import BottomBanner from "@/components/ui/bottom-banner"
import { redirect } from "next/navigation"

export default function Index() {
  redirect("/home")
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <BottomBanner />
    </div>
  )
}
