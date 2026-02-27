'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserPlus, Briefcase, CheckCircle, Clock, Trash2 } from 'lucide-react'
import styles from './project-vendors.module.css'

export default function ProjectVendors({ 
  projectId, 
  onUpdate 
}: { 
  projectId: string, 
  onUpdate?: () => void 
}) {
  const [vendors, setVendors] = useState<any[]>([]) 
  const [availableVendors, setAvailableVendors] = useState<any[]>([]) 
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [projectId])

  async function loadData() {
    const { data: assigned, error: viewError } = await supabase
      .from('project_vendor_comparison')
      .select('*')
      .eq('project_id', projectId)

    if (viewError) console.error("View Error:", viewError.message)
    setVendors(assigned || [])

    const { data: allVendors, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, company_name')
      .eq('role', 'vendor')

    if (profileError) console.error("Profile Error:", profileError.message)

    const assignedIds = assigned?.map(a => a.vendor_id) || []
    const unassigned = allVendors?.filter(v => !assignedIds.includes(v.id)) || []
    
    setAvailableVendors(unassigned)
  }

  // 🟢 NEW: Approve Revision Function
  async function handleApproveRevision(vendorId: string) {
    const { error } = await supabase
      .from('vendor_quotes')
      .update({ 
        submitted: false, 
        revision_status: 'approved' 
      })
      .eq('project_id', projectId)
      .eq('vendor_id', vendorId)

    if (!error) {
      loadData()
      alert("Vendor quote unlocked for modification.")
      if (onUpdate) onUpdate()
    } else {
      alert("Error unlocking quote: " + error.message)
    }
  }

  async function handleAssign() {
    if (!selectedVendorId) return
    setLoading(true)
    
    const { error } = await supabase
      .from('project_vendors')
      .insert({ project_id: projectId, vendor_id: selectedVendorId })
      
    if (error) {
      alert('Error assigning vendor: ' + error.message)
    } else {
      setSelectedVendorId('')
      loadData()
      if (onUpdate) onUpdate() 
    }
    setLoading(false)
  }

  async function handleRemove(vendorId: string) {
    if(!confirm("Remove this vendor from the project?")) return;

    const { error } = await supabase
      .from('project_vendors')
      .delete()
      .eq('project_id', projectId)
      .eq('vendor_id', vendorId)

    if (!error) {
      loadData()
      if (onUpdate) onUpdate()
    }
  }

  return (
    <div className={styles.container}>
      
      {/* Assign Section */}
      <div className={styles.assignSection}>
        <h3 className={styles.assignTitle}>
          <UserPlus size={20} /> Assign New Vendor
        </h3>
        <div className={styles.assignForm}>
          <div className={styles.selectWrapper}>
            <Briefcase className={styles.selectIcon} size={16} />
            <select
              className={styles.select}
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
            >
              <option value="">Select a vendor to invite...</option>
              {availableVendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.company_name ? `(${v.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAssign}
            disabled={!selectedVendorId || loading}
            className={styles.assignButton}
          >
            {loading ? 'Adding...' : 'Add Vendor'}
          </button>
        </div>
        {availableVendors.length === 0 && (
          <p className={styles.noVendorsMessage}>
            * All available vendors are already assigned.
          </p>
        )}
      </div>

      {/* List Section */}
      <div className={styles.listSection}>
        <h4 className={styles.listHeader}>
          Currently Assigned ({vendors.length})
        </h4>
        
        <div className={styles.vendorsList}>
          {vendors.length === 0 && (
            <div className={styles.emptyMessage}>No vendors assigned yet.</div>
          )}

          {vendors.map(v => (
            <div key={v.vendor_id} className={styles.vendorCard}>
              <div className={styles.vendorInfo}>
                <div className={styles.vendorAvatar}>
                  {v.vendor_name?.charAt(0).toUpperCase() || 'V'}
                </div>
                <div className={styles.vendorDetails}>
                  <div className={styles.vendorName}>{v.vendor_name}</div>
                  <div className={styles.vendorId}>ID: {v.vendor_id.slice(0,8)}...</div>
                </div>
              </div>

              {/* 🟢 UPDATED: Actions Area with Revision logic */}
              <div className={styles.vendorActions}>
                <div className="flex flex-col items-end gap-2">
                  {v.submitted ? (
                    <>
                      <span className={`${styles.statusBadge} ${styles.statusSubmitted}`}>
                        <CheckCircle size={12} /> Submitted
                      </span>
                      
                      {/* Revision Approval UI */}
                      {v.revision_status === 'requested' && (
                        <button 
                          onClick={() => handleApproveRevision(v.vendor_id)}
                          className={styles.approveRevisionBtn}
                        >
                          Approve Modification
                        </button>
                      )}
                    </>
                  ) : (
                    <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                      <Clock size={12} /> Pending Quote
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => handleRemove(v.vendor_id)}
                  className={styles.removeButton}
                  title="Remove Vendor"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}