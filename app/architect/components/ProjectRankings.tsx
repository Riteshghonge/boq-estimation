'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Download,
  CheckCircle,
  ShieldCheck,
  Eye,
  X,
  Info,
  Check
} from 'lucide-react'

import styles from './project-rankings.module.css'

interface RankingItem {
  vendor_id: string
  vendor_name: string
  company_name: string
  basic_amount: number
  gross_amount: number
  submitted_at: string
  rank: number
  variance: number
  revision_status: string
  submitted: boolean
}

export default function ProjectRankings({ projectId }: { projectId: string }) {
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])
  
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [vendorBoq, setVendorBoq] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const [stats, setStats] = useState({
    totalBids: 0,
    lowestGross: 0,
    averageGross: 0
  })

  useEffect(() => {
    if (projectId) loadRankings()
  }, [projectId])

  // 🟢 Fetch Rankings and Calculate GST Totals
  async function loadRankings() {
    setLoading(true)
    try {
      const { data: boqItems } = await supabase
        .from('boq_items')
        .select('id, quantity, gst_percentage')
        .eq('project_id', projectId)

      const itemMetaMap = new Map(
        boqItems?.map(i => [i.id, { qty: i.quantity, gst: i.gst_percentage || 0 }]) || []
      )

      const { data: quotes, error } = await supabase
        .from('vendor_quotes')
        .select(`
          vendor_id,
          submitted,
          revision_status,
          updated_at,
          profiles:vendor_id (name, company_name),
          items:vendor_quote_items (boq_item_id, rate)
        `)
        .eq('project_id', projectId)

      if (error) throw error

      const activeQuotes = quotes?.filter(q => q.submitted || q.revision_status === 'approved') || []

      const calculated = activeQuotes.map(quote => {
        let basicTotal = 0
        let grossTotal = 0

        quote.items.forEach((item: any) => {
          const meta = itemMetaMap.get(item.boq_item_id)
          if (meta) {
            const basic = (item.rate || 0) * meta.qty
            const tax = basic * (meta.gst / 100)
            basicTotal += basic
            grossTotal += basic + tax
          }
        })

        const profileData: any = Array.isArray(quote.profiles) ? quote.profiles[0] : quote.profiles

        return {
          vendor_id: quote.vendor_id,
          vendor_name: profileData?.name || 'Unknown Vendor',
          company_name: profileData?.company_name || 'N/A',
          basic_amount: basicTotal,
          gross_amount: grossTotal,
          submitted_at: quote.updated_at,
          revision_status: quote.revision_status || 'none',
          submitted: quote.submitted,
          rank: 0,
          variance: 0
        }
      })

      calculated.sort((a, b) => a.gross_amount - b.gross_amount)
      const lowest = calculated[0]?.gross_amount || 0

      const finalRankings = calculated.map((item, index) => ({
        ...item,
        rank: index + 1,
        variance: lowest > 0 ? ((item.gross_amount - lowest) / lowest) * 100 : 0
      }))

      setRankings(finalRankings)
      setStats({
        totalBids: finalRankings.length,
        lowestGross: lowest,
        averageGross: finalRankings.length > 0 
          ? finalRankings.reduce((a, b) => a + b.gross_amount, 0) / finalRankings.length 
          : 0
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const toggleSelection = (vendorId: string) => {
    setSelectedForComparison(prev =>
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    )
  }

  async function handleApproveRevision(vendorId: string, vendorName: string) {
    if (!confirm(`Allow ${vendorName} to modify their quote?`)) return
    const { error } = await supabase
      .from('vendor_quotes')
      .update({ submitted: false, revision_status: 'approved' })
      .eq('project_id', projectId)
      .eq('vendor_id', vendorId)

    if (error) return
    loadRankings()
  }

  async function openVendorEstimate(vendor: any) {
    setSelectedVendor(vendor)
    setModalLoading(true)
    try {
      const { data: quote } = await supabase
        .from('vendor_quotes')
        .select('id')
        .eq('project_id', projectId)
        .eq('vendor_id', vendor.vendor_id)
        .single()

      const { data: quoteItems } = await supabase
        .from('vendor_quote_items')
        .select('boq_item_id, rate')
        .eq('vendor_quote_id', quote?.id)

      const { data: boqDetails } = await supabase
        .from('boq_items')
        .select('*')
        .eq('project_id', projectId)

      const merged = boqDetails?.map(item => {
        const rate = quoteItems?.find(q => q.boq_item_id === item.id)?.rate || 0
        const basic = rate * item.quantity
        const tax = basic * ((item.gst_percentage || 0) / 100)
        return { ...item, rate, tax, total: basic + tax }
      })
      setVendorBoq(merged || [])
    } catch (e) { console.error(e) }
    setModalLoading(false)
  }

  if (loading) return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div></div>

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <StatCard title="L1 Quote (Gross)" value={stats.lowestGross} />
        <StatCard title="Bids Received" value={stats.totalBids} isRaw />
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderContent}>
            <h3>Vendor Leaderboard</h3>
            <p>Commercial rankings based on GST-inclusive grand totals.</p>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Select</th>
              <th>Rank</th>
              <th>Vendor / Company</th>
              <th>Basic Total</th>
              <th>Gross (GST Incl.)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map(v => (
              <tr key={v.vendor_id} className={`${v.rank === 1 ? styles.winnerRow : ''}`}>
                <td>
                  <div 
                    className={`${styles.customCheckbox} ${selectedForComparison.includes(v.vendor_id) ? styles.checked : ''}`}
                    onClick={() => toggleSelection(v.vendor_id)}
                  >
                    {selectedForComparison.includes(v.vendor_id) && <Check size={12} />}
                  </div>
                </td>
                <td>{v.rank === 1 ? '🥇' : `L${v.rank}`}</td>
                <td onClick={() => openVendorEstimate(v)} className={styles.clickableVendor}>
                  <div className={styles.vendorNameLink}>{v.vendor_name} <Eye size={12} className="ml-1 opacity-50"/></div>
                  <small className="text-slate-400">{v.company_name}</small>
                </td>
                <td className="font-mono">₹{v.basic_amount.toLocaleString('en-IN')}</td>
                <td className="font-mono font-bold">₹{v.gross_amount.toLocaleString('en-IN')}</td>
                <td>
                  {v.revision_status === 'requested' ? (
                    <button className={styles.approveBtn} onClick={() => handleApproveRevision(v.vendor_id, v.vendor_name)}>Approve Edit</button>
                  ) : v.revision_status === 'approved' ? (
                    <div className={styles.approvedLabel}><CheckCircle size={14}/> Unlocked</div>
                  ) : (
                    <div className={styles.finalizedLabel}><ShieldCheck size={14}/> Finalized</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail View Modal remains same */}
      {selectedVendor && (
        <div className={styles.modalOverlay} onClick={() => setSelectedVendor(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedVendor.vendor_name}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1"><Info size={12}/> Detailed Quote Breakdown</p>
              </div>
              <button onClick={() => setSelectedVendor(null)} className={styles.closeBtn}><X size={22} /></button>
            </div>
            <div className={styles.modalBody}>
              {modalLoading ? <div>Loading...</div> : (
                <table className={styles.boqDetailTable}>
                  <thead>
                    <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {vendorBoq.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.description}</td>
                        <td>{item.quantity} {item.unit}</td>
                        <td>₹{item.rate.toLocaleString('en-IN')}</td>
                        <td className="text-rose-500">₹{item.tax.toLocaleString('en-IN')}</td>
                        <td className="font-bold">₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={4}>Grand Total (Incl. GST)</td>
                      <td>₹{selectedVendor.gross_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, isRaw = false }: any) {
  return (
    <div className={styles.statCard}>
      <span className="text-xs font-bold uppercase text-slate-400">{title}</span>
      <div className="text-2xl font-black text-slate-800">
        {isRaw ? value : `₹${Math.round(value).toLocaleString('en-IN')}`}
      </div>
    </div>
  )
}