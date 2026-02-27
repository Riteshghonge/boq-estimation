'use client'

import { useEffect, useState } from 'react'
import { assignVendorToProject } from '../actions/assignVendor'
import { supabase } from '../../lib/supabaseClient'

type Vendor = {
  id: string
  name: string | null
  company_name: string | null
}

type AssignedVendor = {
  vendor_id: string
  vendor?: Vendor
}

export default function AssignVendorModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([])
  const [assignedVendors, setAssignedVendors] = useState<AssignedVendor[]>([])
  const [vendorId, setVendorId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    // 1️⃣ Fetch all vendors
    const { data: vendors, error: vErr } = await supabase
      .from('profiles')
      .select('id, name, company_name')
      .eq('role', 'vendor')

    if (vErr || !vendors) {
      console.error(vErr)
      return
    }

    // 2️⃣ Fetch assigned vendor IDs
    const { data: assignments, error: aErr } = await supabase
      .from('project_vendors')
      .select('vendor_id')
      .eq('project_id', projectId)

    if (aErr) {
      console.error(aErr)
      return
    }

    const assignedIds = assignments?.map(a => a.vendor_id) || []

    // 3️⃣ Split vendors
    const assigned = vendors.filter(v => assignedIds.includes(v.id))
    const unassigned = vendors.filter(v => !assignedIds.includes(v.id))

    setAssignedVendors(
      assigned.map(v => ({ vendor_id: v.id, vendor: v }))
    )
    setAvailableVendors(unassigned)
  }

  const handleAssign = async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      await assignVendorToProject(projectId, vendorId)
      await loadData()
      setVendorId('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-96">
        <h2 className="text-lg font-semibold mb-4">Manage Vendors</h2>

        {/* Assigned vendors */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">
            Assigned Vendors
          </p>
          {assignedVendors.length === 0 ? (
            <p className="text-sm text-gray-400 italic">None assigned</p>
          ) : (
            <ul className="space-y-1">
              {assignedVendors.map(v => (
                <li key={v.vendor_id} className="text-sm text-green-700">
                  ✓ {v.vendor?.name ?? 'Unnamed'}{' '}
                  {v.vendor?.company_name
                    ? `(${v.vendor.company_name})`
                    : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Assign new */}
        <div className="border-t pt-4">
          <select
            className="w-full border p-2 mb-3 rounded text-sm"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">Select vendor</option>
            {availableVendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.name ?? 'Unnamed'}
                {v.company_name ? ` (${v.company_name})` : ''}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 border rounded text-sm"
            >
              Close
            </button>
            <button
              onClick={handleAssign}
              disabled={!vendorId || loading}
              className="px-4 py-1 bg-black text-white rounded text-sm disabled:bg-gray-400"
            >
              {loading ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
