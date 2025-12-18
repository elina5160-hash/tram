"use client"
import { useState, useEffect } from "react"

interface Participant {
  id: number
  created_at: string
  user_id: string
  ticket_numbers: string[]
  tickets: number
  status: string
  contact_info: {
    first_name: string
    username: string
  }
}

export function ContestTable() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    try {
      const res = await fetch("/api/admin/contest")
      const data = await res.json()
      if (Array.isArray(data)) {
        setParticipants(data)
      }
    } catch (e) {
      console.error("Failed to load participants", e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = participants.filter(p => {
    const search = filter.toLowerCase()
    return (
      p.user_id?.toLowerCase().includes(search) ||
      p.ticket_numbers?.some(t => t.includes(search)) ||
      p.status?.toLowerCase().includes(search) ||
      p.contact_info?.first_name?.toLowerCase().includes(search) ||
      p.contact_info?.username?.toLowerCase().includes(search)
    )
  })

  const exportCSV = () => {
    const headers = ["ID", "User ID", "Name", "Username", "Status", "Tickets Count", "Tickets", "Created At"]
    const rows = filtered.map(p => [
      p.id,
      p.user_id,
      p.contact_info?.first_name || '',
      p.contact_info?.username || '',
      p.status,
      p.tickets,
      (p.ticket_numbers || []).join("; "),
      new Date(p.created_at).toLocaleString("ru-RU")
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "contest_participants.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Поиск по ID, билетам..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={exportCSV}
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
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Билеты</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{p.id}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{p.contact_info?.first_name || 'Без имени'}</span>
                    <span className="text-xs text-gray-500">@{p.contact_info?.username || '-'}</span>
                    <span className="text-xs text-gray-400">ID: {p.user_id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-gray-800">{p.tickets} шт.</span>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(p.ticket_numbers || []).slice(0, 5).map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                          {t}
                        </span>
                      ))}
                      {(p.ticket_numbers || []).length > 5 && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">
                          +{p.ticket_numbers.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {p.status === 'active' ? 'Активен' : 'Зарегистрирован'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(p.created_at).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Нет участников
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
