'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Clock, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import styles from './vendor-boq-table.module.css'

export default function VendorBOQTable({
  items,
  vendorQuoteId,
  locked,
  revisionStatus: initialRevisionStatus
}: any) {

  const router = useRouter()

  const [savingId, setSavingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [revisionStatus, setRevisionStatus] = useState(initialRevisionStatus || 'none')

  // ===============================
  // ✅ UI COMPLETENESS CHECK
  // ===============================
  const isComplete =
    items.length > 0 &&
    items.every(
      (item: any) =>
        item.rate !== null &&
        item.rate !== undefined &&
        Number(item.rate) > 0
    )

  // ===============================
  // ✅ TOTAL CALCULATIONS
  // ===============================
  const subTotal = items.reduce(
    (acc: number, item: any) =>
      acc + ((item.rate || 0) * item.quantity),
    0
  )

  const grandTotal = items.reduce((acc: number, item: any) => {
    const basic = (item.rate || 0) * item.quantity
    const gst = basic * ((item.gst_percentage || 0) / 100)
    return acc + basic + gst
  }, 0)

  // ===============================
  // 1️⃣ SAVE RATE
  // ===============================
  const handleRateChange = async (
    boqItemId: string,
    rateValue: string,
    originalRate: number
  ) => {

    if (locked) return

    const trimmed = rateValue?.trim()
    const rate = parseFloat(trimmed)

    if (!trimmed || isNaN(rate) || rate <= 0) {
      alert("❌ Invalid Entry: Rate must be a number greater than 0.")
      router.refresh()
      return
    }

    if (rate === originalRate) return

    setSavingId(boqItemId)

    const { error } = await supabase
      .from('vendor_quote_items')
      .upsert(
        {
          vendor_quote_id: vendorQuoteId,
          boq_item_id: boqItemId,
          rate: rate
        },
        { onConflict: 'vendor_quote_id,boq_item_id' }
      )

    if (error) {
      alert("Rate could not be saved: " + error.message)
    } else {
      router.refresh()
    }

    setSavingId(null)
  }

  // ===============================
  // 2️⃣ SUBMIT QUOTE
  // ===============================
  const handleSubmit = async () => {

    setSubmitting(true)

    try {

      const { data: quoteItems, error } = await supabase
        .from('vendor_quote_items')
        .select('rate')
        .eq('vendor_quote_id', vendorQuoteId)

      if (error) throw new Error("Could not verify items.")

      if (!quoteItems || quoteItems.length < items.length) {
        const missing = items.length - (quoteItems?.length || 0)
        alert(`❌ Incomplete BOQ: ${missing} items missing rates.`)
        setSubmitting(false)
        return
      }

      const hasInvalid = quoteItems.some(
        (item: any) =>
          !item.rate || Number(item.rate) <= 0
      )

      if (hasInvalid) {
        alert("❌ All rates must be greater than zero.")
        setSubmitting(false)
        return
      }

      if (!window.confirm("Confirm Submission? This will lock your quote.")) {
        setSubmitting(false)
        return
      }

      const { error: submitError } = await supabase
        .from('vendor_quotes')
        .update({
          submitted: true,
          submitted_at: new Date().toISOString(),
          revision_status: 'none'
        })
        .eq('id', vendorQuoteId)

      if (submitError) {
        alert("Submission Error: " + submitError.message)
      } else {
        alert("✅ Quote submitted successfully.")
        router.refresh()
      }

    } catch (err: any) {
      alert(err.message || "Unexpected error occurred.")
    }

    setSubmitting(false)
  }

  // ===============================
  // 3️⃣ REQUEST REVISION
  // ===============================
  const handleRequestRevision = async () => {

    setSubmitting(true)

    const { error } = await supabase
      .from('vendor_quotes')
      .update({
        revision_status: 'requested',
        revision_requested_at: new Date().toISOString()
      })
      .eq('id', vendorQuoteId)

    if (error) {
      alert("Request failed: " + error.message)
    } else {
      setRevisionStatus('requested')
      alert("Revision request sent.")
    }

    setSubmitting(false)
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className={styles.container}>

      {/* TABLE */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th>Description</th>
              <th className="text-center">Unit</th>
              <th className="text-center">Qty</th>
              <th className={styles.rateHeader}>Rate (₹)</th>
              <th className="text-center">GST %</th>
              <th className="text-right">Total (Incl. GST)</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item: any) => {

              const basicAmount = (item.rate || 0) * item.quantity
              const gstAmount = basicAmount * ((item.gst_percentage || 0) / 100)
              const totalWithGst = basicAmount + gstAmount

              return (
                <tr key={item.boq_item_id} className={styles.tableRow}>

                  <td>{item.description}</td>
                  <td className="text-center">{item.unit}</td>
                  <td className="text-center">{item.quantity}</td>

                  <td className={styles.rateCell}>
                    <input
                      key={item.rate ?? 'empty'}
                      type="number"
                      disabled={locked}
                      defaultValue={item.rate ?? ''}
                      placeholder="0.00"
                      onBlur={(e) =>
                        handleRateChange(
                          item.boq_item_id,
                          e.target.value,
                          item.rate
                        )
                      }
                      className={`${styles.rateInput} ${
                        !item.rate && !locked
                          ? styles.inputMissing
                          : ''
                      }`}
                    />

                    {savingId === item.boq_item_id && (
                      <span className={styles.savingText}>Saving...</span>
                    )}
                  </td>

                  <td className="text-center font-semibold text-slate-600">
                    {item.gst_percentage}%
                  </td>

                  <td className="text-right font-mono font-bold">
                    {totalWithGst > 0
                      ? `₹${totalWithGst.toLocaleString('en-IN')}`
                      : '—'}
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* TOTAL SUMMARY */}
      <div className={styles.totalsBar}>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Sub-Total (Basic):</span>
          <span className={styles.totalValue}>
            ₹{subTotal.toLocaleString('en-IN')}
          </span>
        </div>

        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>
            Grand Total (Incl. GST):
          </span>
          <span className={`${styles.totalValue} ${styles.grandTotal}`}>
            ₹{grandTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ACTION SECTION */}
      <div className={styles.actionSection}>

        {!locked ? (
          <div className="flex flex-col items-end gap-3">

            {!isComplete && (
              <div className={styles.incompleteBadge}>
                <AlertCircle size={14} />
                BOQ Incomplete: Rates Missing
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !isComplete || savingId !== null}
              className={`${styles.submitButton} ${
                !isComplete ? styles.disabledBtn : ''
              }`}
            >
              <Send size={18} />
              {submitting ? 'Verifying...' : 'Submit Final Quote'}
            </button>

          </div>
        ) : (
          <div className={styles.statusBox}>

            <div className={styles.lockedInfo}>
              <CheckCircle2 size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-sm">Quote Submitted</p>
                <p className="text-xs text-slate-500">
                  Editing is locked.
                </p>
              </div>
            </div>

            {revisionStatus === 'none' && (
              <button
                onClick={handleRequestRevision}
                disabled={submitting}
                className={styles.modifyBtn}
              >
                Request Modification
              </button>
            )}

            {revisionStatus === 'requested' && (
              <div className={styles.pendingBadge}>
                <Clock size={16} />
                Approval Pending
              </div>
            )}

            {revisionStatus === 'approved' && (
              <div className={styles.approvedMessage}>
                Architect Approved. Please refresh.
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
