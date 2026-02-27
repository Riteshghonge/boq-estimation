//this file is responsible for rendering the modal that allows users to create a new project.
//  It includes a button to trigger the modal, an input field for the project name, 
// and buttons to cancel or confirm the creation of the project.
//  The component also handles the logic for inserting a new project into the 
// database using Supabase and provides feedback to the user during the creation process.  


'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, X } from 'lucide-react'
import styles from './create-project-modal.module.css'

interface CreateProjectModalProps {
  onProjectCreated?: () => void;
}

export default function CreateProjectModal({ onProjectCreated }: CreateProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          architect_id: user.id,
          status: 'active'
        })

      if (error) throw error

      setIsOpen(false)
      setName('')
      
      if (onProjectCreated) {
        onProjectCreated()
      }

    } catch (err: any) {
      alert('Error creating project: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={styles.triggerButton}
      >
        <Plus size={16} /> New Project
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Project</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Skyline Apartments"
                  className={styles.input}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) handleCreate()
                  }}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  onClick={() => setIsOpen(false)}
                  className={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !name.trim()}
                  className={styles.createButton}
                >
                  {loading ? (
                    <span className={styles.loadingText}>Creating...</span>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}