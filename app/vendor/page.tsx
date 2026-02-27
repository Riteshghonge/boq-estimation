'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  FileText,
  Calendar,
  ChevronRight,
  LogOut,
  UserCircle,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './vendor-dashboard.module.css'

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function VendorDashboard() {

  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    async function loadDashboardData() {

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 🟢 Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      setUserInfo({
        name: profile?.name || 'Vendor',
        email: user.email || ''
      })

      // 🟢 Fetch Projects + Quote + BOQ Details
      const { data, error } = await supabase
        .from('project_vendors')
        .select(`
          assigned_at,
          projects (
            id,
            name,
            status,
            boq_items (
              id,
              description,
              unit,
              quantity
            ),
            vendor_quotes!left (
              vendor_id,
              submitted,
              revision_status,
              vendor_quote_items (
                boq_item_id,
                rate
              )
            )
          )
        `)
        .eq('vendor_id', user.id)
        .eq('projects.vendor_quotes.vendor_id', user.id)

      if (error) {
        console.error("Error fetching assignments:", error.message)
      } else {

        const formattedProjects = data?.map((item: any) => {

          const quote = item.projects.vendor_quotes?.find(
            (q: any) => q.vendor_id === user.id
          )

          const rates: Record<string, number> = {}

          quote?.vendor_quote_items?.forEach((qi: any) => {
            rates[qi.boq_item_id] = qi.rate
          })

          return {
            ...item.projects,
            assigned_at: item.assigned_at,
            boq_count: item.projects.boq_items?.length || 0,
            hasSubmitted: quote?.submitted ?? false,
            revisionStatus: quote?.revision_status ?? 'none',
            rates
          }
        }) || []

        setProjects(formattedProjects)
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // =========================
  // PDF DOWNLOAD FUNCTION
  // =========================
  const downloadQuotation = (project: any) => {

    if (!project.boq_items?.length) return

    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("Vendor Quotation", 14, 18)

    doc.setFontSize(11)
    doc.text(`Project: ${project.name}`, 14, 26)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32)

    const tableData = project.boq_items.map((item: any, i: number) => {
      const rate = project.rates[item.id] || 0
      const total = rate * item.quantity

      return [
        i + 1,
        item.description,
        item.unit,
        item.quantity,
        `₹ ${rate.toLocaleString('en-IN')}`,
        `₹ ${total.toLocaleString('en-IN')}`
      ]
    })

    const grandTotal = project.boq_items.reduce(
      (sum: number, item: any) =>
        sum + ((project.rates[item.id] || 0) * item.quantity),
      0
    )

    autoTable(doc, {
      startY: 40,
      head: [["#", "Description", "Unit", "Qty", "Rate", "Total"]],
      body: tableData,
    })

    doc.text(
      `Grand Total: ₹ ${grandTotal.toLocaleString('en-IN')}`,
      14,
      (doc as any).lastAutoTable.finalY + 10
    )

    doc.save(`Quotation_${project.name}.pdf`)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your projects...</p>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>

      {/* 🔷 TOP USER BAR */}
      <div className={styles.topUserBar}>
        <UserCircle size={32} />
        <div>
          <div>{userInfo?.name}</div>
          <small>{userInfo?.email}</small>
        </div>
        <button onClick={handleLogout}>
          <LogOut size={18}/>
        </button>
      </div>

      <h1>Vendor Dashboard</h1>

      {projects.length === 0 ? (
        <p>No Projects Assigned</p>
      ) : (
        <div className={styles.projectsGrid}>
          {projects.map(p => {

            const canEdit =
              !p.hasSubmitted || p.revisionStatus === 'approved'

            return (
              <div key={p.id} className={styles.projectCard}>

                <div className={styles.projectCardContent}>
                  <h3>{p.name}</h3>

                  <div>
                    <span>
                      <Calendar size={12}/> Assigned {new Date(p.assigned_at).toLocaleDateString()}
                    </span>

                    <span>
                      <FileText size={12}/> {p.boq_count} BOQ Items
                    </span>
                  </div>
                </div>

                {/* 🟢 STATUS BADGE */}
                {p.hasSubmitted && p.revisionStatus !== 'approved' && (
                  <span className={styles.finalizedBadge}>Finalized</span>
                )}

                {p.revisionStatus === 'approved' && (
                  <span className={styles.editableBadge}>Revision Allowed</span>
                )}

                {/* 🟢 FOOTER */}
                <div className={styles.projectCardFooter}>

                  <Link
                    href={`/vendor/projects/${p.id}`}
                    className={styles.viewButton}
                  >
                    {canEdit ? 'Edit Quote' : 'View Submitted Quote'}
                    <ChevronRight size={16}/>
                  </Link>

                  {p.hasSubmitted && (
                    <button
                      className={styles.downloadBtn}
                      onClick={() => downloadQuotation(p)}
                    >
                      <Download size={16}/> PDF
                    </button>
                  )}

                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
