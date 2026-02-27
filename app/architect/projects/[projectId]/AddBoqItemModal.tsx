'use client'

import { useState } from 'react'
import { addBoqItem } from './actions'

export default function AddBoqItemModal({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false) // Track the save status

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
      >
        + Add BOQ Item
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        action={async (formData) => {
          setIsPending(true) // Start loading
          try {
            await addBoqItem(projectId, formData)
            setOpen(false)
          } catch (error) {
            alert("Error adding item. Please try again.")
          } finally {
            setIsPending(false) // Stop loading
          }
        }}
        className="bg-white p-6 rounded shadow-xl w-96 space-y-4"
      >
        <h2 className="text-lg font-semibold">Add BOQ Item</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <input
            name="description"
            placeholder="e.g. Interior Wall Painting"
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Unit</label>
          <input
            name="unit"
            placeholder="sqm, nos, kg, etc."
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="w-full border p-2 rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rate (₹)</label>
            <input
              name="architect_rate"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}