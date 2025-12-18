"use client"
import { useEffect, useMemo, useState } from "react"

type OrderRow = {
  id: number
  created_at: string
  paid_at?: string
  total_amount: number
  status: string
  customer_info?: any
  promo_code?: string
  ref_code?: string
  items?: any[]
}

export function OrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    let timer: any
    const load = async () => {
      try {
        const res = await fetch("/api/admin/orders")
        const data = await res.json()
        if (Array.isArray(data)) setOrders(data)
      } catch {}
      setLoading(false)
    }
    load()
    timer = setInterval(load, 10000)
    return () => { try { clearInterval(timer) } catch {} }
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return orders.filter((o) => {
      const name = String(o?.customer_info?.name || "").toLowerCase()
      const phone = String(o?.customer_info?.phone || "").toLowerCase()
      const email = String(o?.customer_info?.email || "").toLowerCase()
      const address = String(o?.customer_info?.address || o?.customer_info?.cdek || "").toLowerCase()
      const idMatch = String(o.id).includes(q)
      const custMatch = name.includes(q) || phone.includes(q) || email.includes(q) || address.includes(q)
      const codeMatch = String(o.promo_code || "").toLowerCase().includes(q) || String(o.ref_code || "").toLowerCase().includes(q)
      return idMatch || custMatch || codeMatch
    })
  }, [orders, filter])

  if (loading) return <div className="p-4">Загрузка...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Поиск по ID, имени, телефону, email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            const headers = ["ID", "Статус", "Сумма", "Имя", "Телефон", "Email", "Адрес", "Промокод", "Реферал", "Дата"]
            const rows = filtered.map((o) => [
              o.id,
              o.status,
              o.total_amount,
              String(o?.customer_info?.name || ""),
              String(o?.customer_info?.phone || ""),
              String(o?.customer_info?.email || ""),
              String(o?.customer_info?.address || o?.customer_info?.cdek || ""),
              String(o.promo_code || ""),
              String(o.ref_code || ""),
              new Date(o.paid_at || o.created_at).toLocaleString("ru-RU"),
            ])
            const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '"')}` + `"`).join(","))].join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.setAttribute("download", "orders.csv")
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }}
          className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm hover:bg-green-700"
        >
          Экспорт CSV
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Сумма</th>
              <th className="px-4 py-3">Покупатель</th>
              <th className="px-4 py-3">Контакты</th>
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((o) => {
              const name = String(o?.customer_info?.name || "")
              const phone = String(o?.customer_info?.phone || "")
              const email = String(o?.customer_info?.email || "")
              const address = String(o?.customer_info?.address || o?.customer_info?.cdek || "")
              const codes = [o.promo_code, o.ref_code].filter(Boolean).join(" | ")
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{o.id}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3 font-medium">{Number(o.total_amount).toLocaleString("ru-RU")} руб.</td>
                  <td className="px-4 py-3">{name || ""}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {phone && <div>{phone}</div>}
                      {email && <div>{email}</div>}
                      {address && <div className="text-gray-600">{address}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{codes}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.paid_at || o.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Нет заказов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

