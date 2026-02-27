'use client'

import { useState } from 'react'
import AssignVendorModal from './AssignVendorModal'

export default function AssignVendorButton({
  projectId,
}: {
  projectId: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border px-3 py-1"
      >
        Assign Vendor
      </button>

      {open && (
        <AssignVendorModal
          projectId={projectId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
