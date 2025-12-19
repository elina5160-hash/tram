"use client"
import { useEffect, useMemo, useState } from "react"
import { OrderDetails } from "./OrderDetails"

type OrderRow = {
  id: number
  created_at: string
  updated_at?: string
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
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)

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

  if (selectedOrder) {
    return <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
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

      <div className="rounded-lg border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200 sticky top-0">
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
            {filtered.map((o) => (
              <tr 
                key={o.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedOrder(o)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="text-blue-600 hover:underline">{o.id}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    o.status === 'Оплачен' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {Number(o.total_amount).toLocaleString()} руб.
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{o.customer_info?.name || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{o.customer_info?.phone}</div>
                  <div className="text-gray-500 text-xs">{o.customer_info?.email}</div>
                  <div className="text-gray-500 text-xs truncate max-w-[200px]">{o.customer_info?.address || o.customer_info?.cdek}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {o.promo_code && <div>Promo: {o.promo_code}</div>}
                  {o.ref_code && <div>Ref: {o.ref_code}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {new Date(o.paid_at || o.created_at).toLocaleString("ru-RU", {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

