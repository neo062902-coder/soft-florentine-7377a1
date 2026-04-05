import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Wrench,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import type { RepairRecord } from './api.repairs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
)

export const Route = createFileRoute('/')({
  component: Home,
})

const STATUS_LABELS: Record<RepairRecord['status'], string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
}

const STATUS_COLORS: Record<RepairRecord['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  deviceDescription: '',
  pickupDate: '',
  status: 'pending' as RepairRecord['status'],
}

function Home() {
  const [records, setRecords] = useState<RepairRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RepairRecord | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs')
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchRecords()
  }, [fetchRecords])

  function openAddModal() {
    setEditingRecord(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEditModal(record: RepairRecord) {
    setEditingRecord(record)
    setForm({
      firstName: record.firstName,
      lastName: record.lastName,
      phoneNumber: record.phoneNumber,
      deviceDescription: record.deviceDescription,
      pickupDate: record.pickupDate,
      status: record.status,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingRecord(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingRecord) {
        const res = await fetch(`/api/repairs/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error('Failed to update')
        const updated = await res.json()
        setRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        )
      } else {
        const res = await fetch('/api/repairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error('Failed to create')
        const created = await res.json()
        setRecords((prev) => [created, ...prev])
      }
      closeModal()
    } catch {
      setError('Failed to save record. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/repairs/${id}`, { method: 'DELETE' })
      setRecords((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirm(null)
    } catch {
      setError('Failed to delete record.')
    }
  }

  // Stats
  const total = records.length
  const pending = records.filter((r) => r.status === 'pending').length
  const inProgress = records.filter((r) => r.status === 'in-progress').length
  const completed = records.filter((r) => r.status === 'completed').length

  // Chart: devices checked in last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const dailyCounts = last7Days.map(
    (day) => records.filter((r) => r.pickupDate === day).length,
  )
  const dailyLabels = last7Days.map((d) => {
    const [, m, dd] = d.split('-')
    return `${m}/${dd}`
  })

  const barData = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Devices Received',
        data: dailyCounts,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 6,
      },
    ],
  }

  const doughnutData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        data: [pending, inProgress, completed],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  }

  const stats = [
    {
      title: 'Total Devices',
      value: total,
      icon: Wrench,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending',
      value: pending,
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      title: 'In Progress',
      value: inProgress,
      icon: Users,
      color: 'bg-violet-500',
    },
    {
      title: 'Completed',
      value: completed,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Repair Desk Dashboard
          </h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4"
            >
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {mounted && total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Devices Received (Last 7 Days)
              </h2>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Status Breakdown
              </h2>
              <div className="max-w-xs mx-auto">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Client & Device Records
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Loading records…
            </div>
          ) : records.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No repair records yet.</p>
              <button
                onClick={openAddModal}
                className="mt-3 text-blue-600 hover:underline text-sm font-medium"
              >
                Add the first record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Client</th>
                    <th className="px-6 py-3 text-left">Phone</th>
                    <th className="px-6 py-3 text-left">Device</th>
                    <th className="px-6 py-3 text-left">Pickup Date</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {record.firstName} {record.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {record.phoneNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {record.deviceDescription}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {record.pickupDate || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}
                        >
                          {STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === record.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(record.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRecord ? 'Edit Record' : 'Add Repair Record'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Description
                </label>
                <input
                  required
                  type="text"
                  value={form.deviceDescription}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      deviceDescription: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. iPhone 15 – cracked screen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup / Received Date
                </label>
                <input
                  required
                  type="date"
                  value={form.pickupDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pickupDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as RepairRecord['status'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingRecord ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
