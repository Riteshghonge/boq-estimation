'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { ArrowLeft, Send, Save, Lock, Download, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import styles from './vendor-project-page.module.css'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function VendorProjectPage() {

  const params = useParams()
  const router = useRouter()

  const projectId = useMemo(() => {
    const rawId = params?.projectId || params?.id
    return Array.isArray(rawId) ? rawId[0] : rawId
  }, [params])

  const [project, setProject] = useState<any>(null)
  const [boqItems, setBoqItems] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [revisionStatus, setRevisionStatus] = useState<'none' | 'requested' | 'approved'>('none')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!projectId) return

    async function loadProjectData() {

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // Project
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      setProject(proj)

      // BOQ with GST
      const { data: items } = await supabase
        .from('boq_items')
        .select('id, description, unit, quantity, gst_percentage')
        .eq('project_id', projectId)

      setBoqItems(items || [])

      // Existing Quote
      const { data: existingQuote } = await supabase
        .from('vendor_quotes')
        .select('*, vendor_quote_items(boq_item_id, rate)')
        .eq('project_id', projectId)
        .eq('vendor_id', user.id)
        .maybeSingle()

      if (existingQuote) {
        setHasSubmitted(existingQuote.submitted)
        setRevisionStatus(existingQuote.revision_status || 'none')

        const savedRates: Record<string, number> = {}
        existingQuote.vendor_quote_items?.forEach((item: any) => {
          savedRates[item.boq_item_id] = item.rate
        })
        setRates(savedRates)
      }

      setLoading(false)
    }

    loadProjectData()

  }, [projectId, router])


  // =========================
  // CALCULATIONS
  // =========================

  const subTotal = boqItems.reduce(
    (sum, item) => sum + ((rates[item.id] || 0) * item.quantity),
    0
  )

  const grandTotal = boqItems.reduce((sum, item) => {
    const basic = (rates[item.id] || 0) * item.quantity
    return sum + basic + (basic * (item.gst_percentage / 100))
  }, 0)

  const isComplete =
    boqItems.length > 0 &&
    boqItems.every(item => (rates[item.id] || 0) > 0)


  // =========================
  // PDF DOWNLOAD
  // =========================

  const downloadQuotation = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("Official Vendor Quotation", 14, 15)

    doc.setFontSize(11)
    doc.text(`Project: ${project?.name}`, 14, 22)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28)

    const tableData = boqItems.map((item, i) => {
      const rate = rates[item.id] || 0
      const basic = rate * item.quantity
      const total = basic + (basic * (item.gst_percentage / 100))

      return [
        i + 1,
        item.description,
        item.quantity + ' ' + item.unit,
        item.gst_percentage + '%',
        `₹ ${rate}`,
        `₹ ${total.toFixed(2)}`
      ]
    })

    autoTable(doc, {
      startY: 35,
      head: [["#", "Description", "Qty", "GST", "Rate", "Total (Incl GST)"]],
      body: tableData
    })

    const finalY = (doc as any).lastAutoTable.finalY

    doc.text(
      `Grand Total: ₹ ${grandTotal.toLocaleString('en-IN')}`,
      14,
      finalY + 10
    )

    doc.save(`Quotation_${project?.name}.pdf`)
  }


  // =========================
  // SAVE / SUBMIT
  // =========================

  const handleSubmit = async (submitFinal: boolean) => {

    if (submitFinal && !isComplete) {
      alert("Please fill all rates before submitting.")
      return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: quote } = await supabase
      .from('vendor_quotes')
      .upsert({
        project_id: projectId,
        vendor_id: user?.id,
        submitted: false
      }, { onConflict: 'project_id, vendor_id' })
      .select()
      .single()

    const quoteItems = boqItems.map(item => ({
      vendor_quote_id: quote.id,
      boq_item_id: item.id,
      rate: rates[item.id] || 0
    }))

    await supabase
      .from('vendor_quote_items')
      .upsert(quoteItems, { onConflict: 'vendor_quote_id, boq_item_id' })

    if (submitFinal) {
      await supabase
        .from('vendor_quotes')
        .update({ submitted: true, revision_status: 'none' })
        .eq('id', quote.id)

      setHasSubmitted(true)
      alert("Quote Submitted Successfully!")
    } else {
      alert("Draft Saved!")
    }

    setSubmitting(false)
  }


  // =========================
  // REQUEST REVISION
  // =========================

  const handleRequestRevision = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('vendor_quotes')
      .update({ revision_status: 'requested' })
      .eq('project_id', projectId)
      .eq('vendor_id', user?.id)

    setRevisionStatus('requested')
  }


  if (loading) return <div className={styles.loading}>Loading Project...</div>


  return (
    <div className={styles.pageContainer}>

      <header className={styles.header}>
        <Link href="/vendor"><ArrowLeft size={20} /></Link>
        <h1>{project?.name}</h1>

        {hasSubmitted && (
          <button onClick={downloadQuotation} className={styles.downloadBtn}>
            <Download size={18}/> Download PDF
          </button>
        )}
      </header>


      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Qty</th>
            <th>GST</th>
            <th>Rate</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {boqItems.map((item, i) => {

            const rate = rates[item.id] || 0
            const basic = rate * item.quantity
            const total = basic + (basic * (item.gst_percentage / 100))

            return (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.description}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{item.gst_percentage}%</td>
                <td>
                  <input
                    disabled={hasSubmitted}
                    type="number"
                    value={rates[item.id] || ''}
                    onChange={(e) =>
                      setRates(prev => ({
                        ...prev,
                        [item.id]: Number(e.target.value)
                      }))
                    }
                  />
                </td>
                <td>₹ {total.toLocaleString('en-IN')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>


      <div className={styles.summaryBar}>
        <div>Sub Total: ₹ {subTotal.toLocaleString('en-IN')}</div>
        <div>Grand Total: ₹ {grandTotal.toLocaleString('en-IN')}</div>
      </div>


      {!hasSubmitted ? (
        <div className={styles.actions}>

          {!isComplete &&
            <span className={styles.warning}>
              <AlertCircle size={14}/> Fill all rates to submit
            </span>
          }

          <button onClick={() => handleSubmit(false)} disabled={submitting}>
            <Save size={16}/> Save Draft
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={!isComplete || submitting}
          >
            <Send size={16}/> Submit Quote
          </button>

        </div>
      ) : (
        <div className={styles.locked}>
          <Lock size={16}/> Quote Locked

          {revisionStatus === 'none' && (
            <button onClick={handleRequestRevision}>
              Request Edit
            </button>
          )}

          {revisionStatus === 'requested' && (
            <span>Approval Pending...</span>
          )}
        </div>
      )}

    </div>
  )
}
