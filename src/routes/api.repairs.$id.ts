import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'
import type { RepairRecord } from './api.repairs'

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

function getRepairStore() {
  return getStore({ name: 'repair-records', consistency: 'strong' })
}

export const Route = createFileRoute('/api/repairs/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const store = getRepairStore()
        const record = await store.get(params.id, { type: 'json' })
        if (!record) return json({ error: 'Not found' }, { status: 404 })
        return json(record)
      },

      PUT: async ({ request, params }) => {
        const store = getRepairStore()
        const existing = await store.get<RepairRecord>(params.id, {
          type: 'json',
        })
        if (!existing) return json({ error: 'Not found' }, { status: 404 })
        const body = (await request.json()) as Partial<RepairRecord>
        const updated: RepairRecord = {
          ...existing,
          firstName: body.firstName?.trim() ?? existing.firstName,
          lastName: body.lastName?.trim() ?? existing.lastName,
          phoneNumber: body.phoneNumber?.trim() ?? existing.phoneNumber,
          deviceDescription:
            body.deviceDescription?.trim() ?? existing.deviceDescription,
          pickupDate: body.pickupDate ?? existing.pickupDate,
          status: body.status ?? existing.status,
        }
        await store.setJSON(params.id, updated)
        return json(updated)
      },

      DELETE: async ({ params }) => {
        const store = getRepairStore()
        await store.delete(params.id)
        return json({ success: true })
      },
    },
  },
})
