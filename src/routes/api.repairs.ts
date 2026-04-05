import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export interface RepairRecord {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  deviceDescription: string
  pickupDate: string
  status: 'pending' | 'in-progress' | 'completed'
  createdAt: string
}

function getRepairStore() {
  return getStore({ name: 'repair-records', consistency: 'strong' })
}

export const Route = createFileRoute('/api/repairs')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const store = getRepairStore()
          const { blobs } = await store.list()
          const records: RepairRecord[] = await Promise.all(
            blobs.map((b) => store.get(b.key, { type: 'json' })),
          )
          records.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          return json(records)
        } catch {
          return json([])
        }
      },

      POST: async ({ request }) => {
        const body = (await request.json()) as Omit<
          RepairRecord,
          'id' | 'createdAt'
        >
        const record: RepairRecord = {
          id: crypto.randomUUID(),
          firstName: body.firstName?.trim() ?? '',
          lastName: body.lastName?.trim() ?? '',
          phoneNumber: body.phoneNumber?.trim() ?? '',
          deviceDescription: body.deviceDescription?.trim() ?? '',
          pickupDate: body.pickupDate ?? '',
          status: body.status ?? 'pending',
          createdAt: new Date().toISOString(),
        }
        const store = getRepairStore()
        await store.setJSON(record.id, record)
        return json(record, { status: 201 })
      },
    },
  },
})
