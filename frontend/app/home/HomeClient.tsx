"use client"
import { useState, useEffect, Suspense, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addToCart, incrementQty } from "@/lib/cart"
import { getPriceValue, splitPrice } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { staticItems } from "@/data/staticItems"

import BottomBanner from "@/components/ui/bottom-banner"
import { ProductCard } from "@/components/ui/product-card"


import LazyVideo from "@/components/ui/lazy-video"

export default function HomeClient() {
  const router = useRouter()
  const { products: fetchedProducts } = useProducts()
  const [adminOpen, setAdminOpen] = useState(false)

  const items = useMemo(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
       const fetchedIds = new Set(fetchedProducts.map((p: any) => p.id))
       const missingStatic = staticItems.filter((s) => !fetchedIds.has(s.id))
       return [...fetchedProducts, ...missingStatic]
    }
    return staticItems
  }, [fetchedProducts])
  const promos = items.filter((it: any) => {
    const priceVal = getPriceValue(it.price)
    const isCheap = priceVal > 0 && priceVal < 1000
    // Check for hardcoded discounted items (IDs 2 and 6 have old prices shown in JSX)
    // Also check title for "акция" keyword
    const isDiscounted = [2, 6].includes(it.id) || it.title.toLowerCase().includes("акция")
    // Keep original manual IDs [6, 8] (8 is cheap, 6 is discounted)
    return isCheap || isDiscounted || [6, 8].includes(it.id)
  })
  const bests = items.filter((it: any) => [1, 7, 3, 4].includes(it.id))
  const novelties = items.filter((it: any) => [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].includes(it.id))
  
  const [qty, setQty] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    items.forEach((it: any) => (initial[it.id] = 0))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [catalogEntered, setCatalogEntered] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  type MenuView = "grid" | "delivery" | "payment" | "contacts" | "reviews" | "returns" | "about" | "offer" | "help" | "stores"
  const [menuView, setMenuView] = useState<MenuView>("grid")
  const menuItems: { label: string; key: MenuView }[] = [
    { label: "Доставка", key: "delivery" },
    { label: "Оплата", key: "payment" },
    { label: "Контакты", key: "contacts" },
    { label: "Отзывы", key: "reviews" },
    { label: "Возврат", key: "returns" },
    { label: "О нас", key: "about" },
    { label: "Оферта", key: "offer" },
    { label: "Помощь", key: "help" },
  ]
  

  

  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const ref = p.get("ref")
      if (ref) {
        window.localStorage.setItem("referral_code", ref)
      }
      
      let finalId = p.get("client_id")

      // Try Telegram WebApp
      if (!finalId && typeof window !== "undefined") {
          const tg = (window as any).Telegram?.WebApp
          if (tg) {
              tg.ready() // Notify Telegram we are ready
              if (tg.initDataUnsafe?.user?.id) {
                  finalId = String(tg.initDataUnsafe.user.id)
              }
          }
      }

      if (!finalId) {
          finalId = window.localStorage.getItem("user_id")
      }

      if (finalId) {
        setClientId(finalId)
        window.localStorage.setItem("user_id", finalId)
      }
    } catch {}
  }, [])

  const [adminClicks, setAdminClicks] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  // ...
  
  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex flex-col justify-start relative pb-56">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 
            className="text-xl font-semibold cursor-pointer active:opacity-70 select-none"
            onClick={() => setAdminOpen(true)}
          >
            ЭТРА
          </h1>
          <div className="flex items-center gap-2">
            <button
              aria-label="Меню"
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-[12px] bg-white border border-gray-300 flex items-center justify-center"
            >
              <Image src="/Vector.png" alt="Меню" width={24} height={24} />
            </button>
          </div>
        </div>
        <div
          aria-label="Баннер"
          className="mt-3 h-[220px] relative rounded-[20px] overflow-hidden cursor-pointer"
          onClick={() => {
              // Secret tap zone for admin (top right corner, 20% width/height)
              // But now the main action is redirect to bot
              // We'll keep admin access via long press or specific zone later if needed
              // For now, let's just check if the click was in the top right corner for admin
              // Or just add a hidden button elsewhere.
              // Given the request "img при нажатии на главную плашку давай будет переадрессация сюда @KonkursEtraBot",
              // we will prioritize the link.
              // To preserve admin access, we can add a small invisible button or just use a specific area.
              // Let's make the whole image a link, but keep a small invisible div for admin.
          }}
        >
          <a href="https://t.me/KonkursEtraBot" target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
            <Image src="/нг.png" alt="Афиша" fill className="object-contain rounded-[20px]" priority />
          </a>
        </div>

        <div className="mt-2 -mx-4 h-[34px] relative overflow-hidden bg-[#F6F6F6]">
          <div className="absolute inset-0 overflow-hidden flex items-center">
            <div className="marquee-track h-full flex items-center whitespace-nowrap" style={{ animationDuration: "12s" }}>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-[#353535] text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
            </div>
          </div>
        </div>

 

        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Скидки и акции</h2>
            <Link href="/catalog" className="text-[13px]" style={{ color: "#267A2D" }}>Смотреть все</Link>
          </div>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {promos.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                />
              </div>
            ))}
          </div>
        </section>

        
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">Выбор покупателей</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {bests.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">Новинки</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {novelties.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                  showBadge
                />
              </div>
            ))}
          </div>
        </section>
        <div className="h-24 w-full" />
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className={menuView === "grid"
            ? "relative h-full w-[66vw] bg-white rounded-[20px] p-4 overflow-y-auto flex flex-col"
            : "relative h-full w-[66vw] bg-white p-4 overflow-y-auto flex flex-col"
          }>
            {menuView === "grid" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button
                    aria-label="Назад"
                    onClick={() => {
                      setMenuOpen(false)
                      router.push("/home")
                    }}
                    className="px-3 py-2 rounded-[12px] bg-white border border-gray-300 text-[13px]"
                  >
                    Назад
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 content-start">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      className="w-full rounded-[16px] bg-[#F1F1F1] px-3 py-2 text-[#232323] text-[13px] text-center"
                      onClick={() => setMenuView(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    className="w-full rounded-[16px] bg-[#F1F1F1] px-3 py-3 text-[#232323] text-[14px] text-center"
                    onClick={() => setMenuView("stores")}
                  >
                    Адреса офлайн-магазинов
                  </button>
                </div>
                <div className="mt-6">
                  <div className="text-[13px] font-semibold text-center" style={{ color: "#000000" }}>Мы в соцсетях</div>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Telegram"
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => window.open("https://t.me/etraproject_official", "_blank")}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#232323] border border-gray-300 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                          <path fillRule="evenodd" clipRule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM12.43 8.85893C11.2629 9.3444 8.93015 10.3492 5.43191 11.8733C4.86385 12.0992 4.56628 12.3202 4.53919 12.5363C4.4934 12.9015 4.95073 13.0453 5.57349 13.2411C5.6582 13.2678 5.74598 13.2954 5.83596 13.3246C6.44866 13.5238 7.27284 13.7568 7.70131 13.766C8.08996 13.7744 8.52375 13.6142 9.00266 13.2853C12.2712 11.079 13.9584 9.96381 14.0643 9.93977C14.1391 9.92281 14.2426 9.90148 14.3128 9.96385C14.3829 10.0262 14.3761 10.1443 14.3686 10.176C14.3233 10.3691 12.5281 12.0381 11.5991 12.9018C11.3095 13.171 11.1041 13.362 11.0621 13.4056C10.968 13.5034 10.8721 13.5958 10.78 13.6846C10.2108 14.2333 9.78393 14.6448 10.8036 15.3168C11.2937 15.6397 11.6858 15.9067 12.077 16.1731C12.5042 16.4641 12.9303 16.7543 13.4816 17.1157C13.6221 17.2078 13.7562 17.3034 13.8869 17.3965C14.3841 17.751 14.8308 18.0694 15.3826 18.0186C15.7033 17.9891 16.0345 17.6876 16.2027 16.7884C16.6002 14.6632 17.3816 10.0585 17.5622 8.16098C17.5781 7.99473 17.5582 7.78197 17.5422 7.68858C17.5262 7.59518 17.4928 7.46211 17.3714 7.3636C17.2276 7.24694 17.0057 7.22234 16.9064 7.22408C16.455 7.23204 15.7626 7.47282 12.43 8.85893Z" fill="white" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#232323]">Telegram</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="YouTube"
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => window.open("https://www.youtube.com/@KirillSerebrjansky", "_blank")}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#232323] border border-gray-300 flex items-center justify-center">
                        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                          <path d="M23.4994 2.51077C23.3672 2.03162 23.1033 1.59354 22.7342 1.24045C22.365 0.887358 21.9036 0.631669 21.3961 0.499009C19.5182 0.00488856 11.9939 0.00488843 11.9939 0.00488843C8.85647 -0.0305416 5.7199 0.126649 2.60425 0.475479C2.0966 0.617829 1.63593 0.879408 1.26573 1.23553C0.895536 1.59164 0.628022 2.03053 0.488446 2.51077C0.151841 4.32482 -0.0115629 6.16355 0.000183311 8.00485C-0.0123684 9.84625 0.151042 11.685 0.488446 13.499C0.625149 13.9779 0.892086 14.4152 1.26304 14.768C1.63399 15.1207 2.09619 15.3766 2.60425 15.5107C4.50723 16.0048 11.9939 16.0048 11.9939 16.0048C15.1355 16.0403 18.2763 15.8831 21.3961 15.5342C21.9036 15.4016 22.365 15.1459 22.7342 14.7928C23.1033 14.4397 23.3672 14.0016 23.4994 13.5225C23.8446 11.7093 24.0122 9.87035 24.0002 8.02845C24.0261 6.17825 23.8583 4.33012 23.4994 2.51077ZM9.60269 11.4284V4.58136L15.8625 8.00485L9.60269 11.4284Z" fill="white" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#232323]">YouTube</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <button
                    aria-label="Назад"
                    onClick={() => setMenuView("grid")}
                    className="px-3 py-2 rounded-[12px] bg-white border border-gray-300 text-[13px]"
                  >
                    Назад
                  </button>
                </div>
                <div className="rounded-[20px] bg-[#F1F1F1] p-4 text-[#232323] text-[13px] leading-relaxed">
                  {menuView === "delivery" && (
                    <>
                      <p>Мы делаем доставку через СДЕК. Доставляем нашу продукцию по России и всему СНГ. Обращаем ваше внимание, доставка в СДЕК оплачивается отдельно и зависит от региона доставки и объема посылки.</p>
                      <p className="mt-2">Если разные продукты должны отправится по разным адресам — укажите нужный адрес для каждого.</p>
                      <p className="mt-2">Пожалуйста, заполните <strong>ВСЕ</strong> запрашиваемые данные, чтобы заказ пришел к вам как можно скорее.</p>
                      <p className="mt-2">В период от трех до пяти дней вам будет направлено уведомление с вашим трек-номером, по которому можно отслеживать статус доставки (проверьте смс, Telegram, Vkontakte, электронную почту). <strong>ВАЖНО!</strong> В период высокого сезона отправка продукции, а соответственно и трек номера может достигать двух-трех недель.</p>
                      <p className="mt-2">Если вам долго не идет трек-номер, пожалуйста, ознакомьтесь с информацией <a href="https://telegra.ph/Davno-zakazali-a-dostavki-vsyo-net-08-13" target="_blank" rel="noopener noreferrer" className="underline">здесь</a>.</p>
                      <p className="mt-2">Самовывоз возможен по адресу: г. Сочи, Центральный район, Транспортная 17А (пункт выдачи СДЕК). <strong>ВАЖНО!</strong> Необходим предзаказ через бота. Когда ваша посылка будет готова к выдаче, вам сообщат наши коллеги из СДЕК.</p>
                      <p className="mt-2">Доставка в другие страны возможна через Почту России. У нас много успешных примеров доставки за рубеж. Однако всегда есть вероятность того, что посылка не пройдет таможню. Этот риск покупатель берет на себя. Кроме того, цена непосредственно доставки составит <strong>от 50 евро</strong>.</p>
                    </>
                  )}
                  {menuView === "payment" && (
                    <>
                      <p><strong>Оплата:</strong> оформление корзины в приложении через официальных партнёров Т Банк / Робокасса.</p>
                      <p className="mt-2">Оплата картой: онлайн по указанным реквизитам в уведомлении заказа.</p>
                      <p className="mt-2">Наличными: при самовывозе со склада.</p>
                      <p className="mt-2">Можете написать нашей службе поддержки и уточнить актуальную информацию об оплате.</p>
                      <p className="mt-2"><a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">Нажмите, чтобы написать нам (@avatime_cosmetics_income)</a></p>
                    </>
                  )}
                  {menuView === "contacts" && (
                    <>
                      <p><strong>Контакты:</strong> Поддержка на связи каждый будний день. В нашем сообществе ответ можно получить в любое время дня и ночи.</p>
                      <p className="mt-2">Служба поддержки <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                      <p className="mt-2">Дружелюбное сообщество <a href="http://t.me/enzyme_trend_russia" target="_blank" rel="noopener noreferrer" className="underline">http://t.me/enzyme_trend_russia</a></p>
                      <p className="mt-2"><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                    </>
                  )}
                  {menuView === "reviews" && (
                    <>
                      <p>Отзывы: <a href="https://t.me/enzyme_trend_russia/5052" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/enzyme_trend_russia/5052</a></p>
                    </>
                  )}
                  {menuView === "returns" && (
                    <>
                      <p><strong>Условия возврата и обмена товаров</strong></p>
                      <p className="mt-2">Интернет-магазин Энзимов ЭТРА руководствуется законодательством Российской Федерации при оформлении возврата и обменов.</p>
                      <p className="mt-2">Пищевая продукция, относящаяся к товарам надлежащего качества, не подлежит возврату или обмену, если была в употреблении и нарушена целостность упаковки, в связи с санитарно-гигиеническими требованиями.</p>
                      <p className="mt-2">Возврату и обмену подлежат только товары <strong>ненадлежащего качества</strong> (например, производственный брак, повреждение, нарушение целостности упаковки, выявленные при получении товара).</p>
                      <p className="mt-2">Покупатель имеет право в течение <strong>10 календарных дней</strong> с момента получения товара обратиться с требованием о возврате или обмене товара ненадлежащего качества. Претензии по качеству товара принимаются в установленные сроки при условии подтверждения дефекта.</p>
                      <p className="mt-2">Для оформления возврата или обмена необходимо связаться с продавцом и предоставить подтверждающие документы и сведения о выявленном дефекте.</p>
                      <p className="mt-2">Решение о возврате денежных средств или замене товара принимается продавцом в течение <strong>10 календарных дней</strong> с момента получения обращения покупателя.</p>
                      <p className="mt-2">Возврат денежных средств осуществляется в срок, не превышающий <strong>10 календарных дней</strong> после принятия решения о возврате.</p>
                      <p className="mt-2">В случае возврата товара ненадлежащего качества расходы по доставке товара обратно к продавцу и повторной доставке товара покупателю возмещаются продавцом.</p>
                      <p className="mt-2">По любым вопросам обращайтесь в поддержку: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "about" && (
                    <>
                      <div className="relative w-full h-48 rounded-[16px] overflow-hidden mb-3">
                        <Image src="/мужик.png" alt="Кирилл Серебрянский" fill className="object-cover" />
                      </div>
                      <p><strong>Здравствуй, дорогой друг!</strong></p>
                      <p className="mt-2">Меня зовут Кирилл Серебрянский, я основатель компании ЭТРА.</p>
                      <p className="mt-2">Я устал видеть людей, которые не доверяют своему организму. Которые ходят к врачам, пьют таблетки, но ничего не меняется. Потому что никто не объясняет им, как это работает. Болезни, усталость и хронические проблемы становятся серьёзными барьерами, которые трудно преодолеть в одиночку.</p>
                      <p className="mt-2">ЭТРА помогает избавиться от этого груза — токсинов, патогенов и устаревших пищевых привычек. Мы хотим показать тебе истинную природу твоего организма: сильного и гармоничного.</p>
                      <p className="mt-2">ЭТРА — это напитки с подтверждёнными клиническими результатами, направленные на восстановление микробиома. Эффект становится заметным всего за <strong>14 дней</strong>, повышая качество жизни и эффективно устраняя источники ваших проблем с энергией и самочувствием.</p>
                      <p className="mt-2">Приглашаем вас в мир, полный энергии, счастья и здоровья!</p>
                      <p className="mt-2">📱 Сообщество в Telegram <a href="http://t.me/enzyme_trend_russia" target="_blank" rel="noopener noreferrer" className="underline">http://t.me/enzyme_trend_russia</a></p>
                      <p className="mt-2">📱 Канал в Telegram <a href="https://t.me/etraproject_official" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/etraproject_official</a></p>
                      <p className="mt-2">📱 Эфиры в Telegram <a href="https://t.me/ETRA_EFIR" target="_blank" rel="noopener noreferrer" className="underline">https://t.me/ETRA_EFIR</a></p>
                      <p className="mt-2">📱 YouTube канал Этра <a href="https://www.youtube.com/@KirillSerebrjansky" target="_blank" rel="noopener noreferrer" className="underline">https://www.youtube.com/@KirillSerebrjansky</a></p>
                      <p className="mt-2">📱 YouTube канал Кирилл Серебрянский <a href="https://youtube.com/@kirillserebrjansky" target="_blank" rel="noopener noreferrer" className="underline">https://youtube.com/@kirillserebrjansky</a></p>
                      <p className="mt-2"><strong>Наше производство:</strong> Краснодарский край, Сочи, Пластунская улица, 102Б</p>
                      <p className="mt-2"><strong>Контакты и адреса партнёров:</strong></p>
                      <ul className="mt-2 list-disc pl-5">
                        <li>Сочи, пгт Красная Поляна, Вознесенская улица, 36, «Гранат» — +7 (963) 160-10-75</li>
                        <li>Сочи, пгт Красная Поляна, улица ГЭС, 49А, «Sunsvet” — +7 (938) 469-03-69</li>
                        <li>Сочи, улица Островского, 1, Кафе «Я люблю тебя» — +7 (962) 888-86-56</li>
                        <li>Сочи, Параллельная улица, 9лит5, ЖК Остров Мечты, этаж 1, «PROПитание» — +7 (988) 401-00-50</li>
                        <li>Сочи, микрорайон Центральный, Морской переулок, 2, Магазин «Птичка» — +7 (981) 244-65-74</li>
                        <li>Сочи, Пластунская улица, 102Б, Оздоровительный центр «Зеркала Козырева Сфера» — +7 (962) 888-10-81</li>
                      </ul>
                      <p className="mt-2"><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                      <p className="mt-2">Наша дружелюбная поддержка ответит на все ваши вопросы: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "offer" && (
                    <>
                      <p>Оферта: <a href="https://disk.yandex.ru/d/r7SXu-Tn9lx7OA" target="_blank" rel="noopener noreferrer" className="underline">https://disk.yandex.ru/d/r7SXu-Tn9lx7OA</a></p>
                    </>
                  )}
                  {menuView === "help" && (
                    <>
                      <p>Помощь: <a href="https://t.me/avatime_cosmetics_income" target="_blank" rel="noopener noreferrer" className="underline">@avatime_cosmetics_income</a></p>
                    </>
                  )}
                  {menuView === "stores" && (
                    <>
                      <p><strong>У нас нет официального сайта</strong> и нашу оригинальную продукцию нельзя купить на маркетплейсах. Остерегайтесь подделок!</p>
                      <p className="mt-2"><strong>Самовывоз возможен со склада:</strong> г. Сочи, Центральный район, Транспортная 17А (пункт выдачи СДЕК). <strong>Необходим предзаказ!</strong> Когда ваша посылка будет готова к выдаче, мы вам сообщим.</p>
                      <p className="mt-2"><strong>Наша продукция представлена на витринах наших партнёров:</strong></p>
                      <ul className="mt-2 list-disc pl-5">
                        <li>Сочи, пгт Красная Поляна, Вознесенская улица, 36, «Гранат» — +7 (963) 160-10-75</li>
                        <li>Сочи, пгт Красная Поляна, улица ГЭС, 49А, «Sunsvet” — +7 (938) 469-03-69</li>
                        <li>Сочи, улица Островского, 1 Кафе «Я люблю тебя» — +7 (962) 888-86-56</li>
                        <li>Сочи, Параллельная улица, 9лит5  ЖК Остров Мечты, этаж 1, «PROПитание» — +7 (988) 401-00-50</li>
                        <li>Сочи, микрорайон Центральный, Морской переулок, 2, Магазин «Птичка» — +7 (981) 244-65-74</li>
                        <li>Сочи, Пластунская улица, 102Б, Оздоровительный центр «Зеркала Козырева Сфера» — +7 (962) 888-10-81</li>
                      </ul>
                    </>
                  )}
                </div>
                
              </div>
            )}
          </div>
        </div>
      )}

      <BottomBanner />
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  )
}
