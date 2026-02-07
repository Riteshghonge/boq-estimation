'use client'

import { useState, useEffect, useActionState } from 'react'
import { createProject } from './actions'

const initialState = {
  success: false,
  error: undefined as string | undefined,
}

export default function CreateProjectModal() {
  const [open, setOpen] = useState(false)

  const [state, formAction] = useActionState(
    createProject,
    initialState
  )

  // ✅ Close modal on success
  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  return (
    <>
      <button onClick={() => setOpen(true)}>
        + Create Project
      </button>

      {open && (
        <div style={overlay}>
          <div style={modal}>
            <h3>Create New Project</h3>

            <form action={formAction}>
              <input
                name="name"
                placeholder="Project name"
                required
              />

              {state.error && (
                <p style={{ color: 'red', marginTop: 8 }}>
                  {state.error}
                </p>
              )}

              <div style={{ marginTop: 12 }}>
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const overlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const modal = {
  background: '#fff',
  padding: 20,
  borderRadius: 6,
  width: 300,
}
