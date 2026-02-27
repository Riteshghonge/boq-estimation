'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { ArrowLeft, Download, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import styles from './architect-matrix.module.css'

export default function ArchitectMatrixPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const rawId = params?.id || params?.projectId
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId

  // ✅ FIXED FILTERING LOGIC
  const idsParam = searchParams.get('ids')

  const selectedIds =
    idsParam && idsParam.trim() !== ''
      ? idsParam.split(',').filter(id => id.trim() !== '')
      : []

  const [matrixData, setMatrixData] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) loadMatrixData()
  }, [projectId, idsParam])

  async function loadMatrixData() {
    try {
      setLoading(true)
      setError(null)

      // 1️⃣ Fetch BOQ Items
      const { data: items, error: boqErr } = await supabase
        .from('boq_items')
        .select('id, description, quantity, unit, architect_rate, gst_percentage')
        .eq('project_id', projectId)
        .order('id')

      if (boqErr) throw boqErr

      // 2️⃣ Fetch Vendor Quotes
      let query = supabase
        .from('vendor_quotes')
        .select(`
          id, vendor_id,
          profiles:vendor_id (name, company_name),
          items:vendor_quote_items (boq_item_id, rate)
        `)
        .eq('project_id', projectId)
        .eq('submitted', true)

      // ✅ APPLY FILTER ONLY IF REAL IDS EXIST
      if (selectedIds.length > 0) {
        query = query.in('vendor_id', selectedIds)
      }

      const { data: quotes, error: quotesErr } = await query

      if (quotesErr) throw quotesErr

      if (!quotes || quotes.length === 0) {
        setError("No submitted quotes found for comparison.")
        setVendors([])
        setMatrixData([])
        return
      }

      // 3️⃣ Vendor List
      const vendorList = quotes.map(q => ({
        id: q.vendor_id,
        name: (q.profiles as any)?.name || 'Vendor',
        company: (q.profiles as any)?.company_name || 'N/A'
      }))

      // 4️⃣ Matrix Processing
      const formattedMatrix = items?.map(item => {
        const archRate = item.architect_rate || 0
        const vendorData: any = {}

        quotes.forEach(quote => {
          const match = quote.items.find((qi: any) => qi.boq_item_id === item.id)
          const rate = match ? match.rate : 0

          const basic = rate * item.quantity
          const tax = basic * ((item.gst_percentage || 0) / 100)
          const totalWithGst = basic + tax

          let varianceLabel = "-"
          let varianceClass = ""

          if (archRate > 0 && rate > 0) {
            const diff = ((rate - archRate) / archRate) * 100
            if (diff > 5) {
              varianceLabel = `+${diff.toFixed(1)}%`
              varianceClass = styles.textRed
            } else if (diff < -5) {
              varianceLabel = `${diff.toFixed(1)}%`
              varianceClass = styles.textOrange
            }
          }

          vendorData[quote.vendor_id] = {
            rate,
            total: totalWithGst,
            varianceLabel,
            varianceClass
          }
        })

        return { ...item, archRate, vendorData }
      })

      setVendors(vendorList)
      setMatrixData(formattedMatrix || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // =========================================
  // PDF EXPORT (UNCHANGED)
  // =========================================
  const downloadPDF = () => {
    const doc = new jsPDF('landscape')
    doc.text("Comparative Analysis Matrix", 14, 15)

    const headRow1: any[] = [
      { content: 'Description', rowSpan: 2 },
      { content: 'Unit', rowSpan: 2 },
      { content: 'Qty', rowSpan: 2 },
      { content: 'Arch. Rate', rowSpan: 2 }
    ]

    const headRow2: any[] = []

    vendors.forEach(v => {
      headRow1.push({ content: v.name, colSpan: 3, styles: { halign: 'center' } })
      headRow2.push('Rate', 'Total', 'Var %')
    })

    const body = matrixData.map(item => {
      const row: any[] = [
        item.description,
        item.unit,
        item.quantity,
        item.archRate
      ]

      vendors.forEach(v => {
        const data = item.vendorData[v.id]
        row.push(`₹${data.rate}`, `₹${data.total}`, data.varianceLabel)
      })

      return row
    })

    autoTable(doc, {
      startY: 25,
      head: [headRow1, headRow2],
      body: body,
      theme: 'grid',
      styles: { fontSize: 7 }
    })

    doc.save("Comparison_Matrix.pdf")
  }

  if (loading) return <div className={styles.loading}>Generating Matrix...</div>

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={40} className={styles.errorIcon}/>
        <div className={styles.errorTitle}>{error}</div>
        <Link href="/architect" className={styles.errorLink}>Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/architect" className={styles.backLink}>
            <ArrowLeft size={16}/> Dashboard
          </Link>
          <h1 className={styles.pageTitle}>Benchmark Comparison</h1>
        </div>

        <button onClick={downloadPDF} className={styles.exportButton}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th rowSpan={2} className={styles.stickyCol}>Item Description</th>
              <th rowSpan={2}>Unit</th>
              <th rowSpan={2}>Qty</th>
              <th rowSpan={2} className={styles.archHeader}>Arch. Rate</th>

              {vendors.map(v => (
                <th key={v.id} colSpan={3} className={styles.vendorHeader}>
                  {v.name}
                  <div className={styles.subCompany}>{v.company}</div>
                </th>
              ))}
            </tr>

            <tr className={styles.subHeaderRow}>
              {vendors.map(v => (
                <React.Fragment key={`sub-${v.id}`}>
                  <th className={styles.subTh}>Rate (₹)</th>
                  <th className={styles.subTh}>Total (₹)</th>
                  <th className={styles.subTh}>Var.</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrixData.map(item => (
              <tr key={item.id} className={styles.tableRow}>
                <td className={styles.stickyCol}>
                  <div className={styles.descText}>{item.description}</div>
                </td>
                <td>{item.unit}</td>
                <td>{item.quantity}</td>
                <td className={styles.archRateCell}>
                  ₹{item.archRate.toLocaleString('en-IN')}
                </td>

                {vendors.map(v => {
                  const data = item.vendorData[v.id]
                  return (
                    <React.Fragment key={v.id}>
                      <td className={styles.rateCell}>
                        ₹{data.rate.toLocaleString('en-IN')}
                      </td>
                      <td className={styles.totalCell}>
                        ₹{data.total.toLocaleString('en-IN')}
                      </td>
                      <td className={`${styles.varCell} ${data.varianceClass}`}>
                        {data.varianceLabel}
                      </td>
                    </React.Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}