'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Trash2, Plus, Package, ArrowRight, CheckCircle } from 'lucide-react'
import styles from './project-boq.module.css'

interface BOQItem {
  id: string
  description: string
  unit: string
  quantity: number
  architect_rate: number
  gst_percentage: number
}

export default function ProjectBOQ({
  projectId,
  onNext
}: {
  projectId: string
  onNext: () => void
}) {
  const [items, setItems] = useState<BOQItem[]>([])

  const [newDesc, setNewDesc] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newGst, setNewGst] = useState('18')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadItems()
  }, [projectId])

  async function loadItems() {
    const { data, error } = await supabase
      .from('boq_items')
      .select('*')
      .eq('project_id', projectId)
      .order('id')

    if (!error && data) {
      setItems(data)
    }
  }

  async function handleAdd() {
    if (!newDesc || !newQty) return

    setAdding(true)

    const { error } = await supabase.from('boq_items').insert({
      project_id: projectId,
      description: newDesc,
      unit: newUnit,
      quantity: parseFloat(newQty),
      architect_rate: parseFloat(newRate) || 0,
      gst_percentage: parseFloat(newGst) || 0
    })

    if (!error) {
      setNewDesc('')
      setNewUnit('')
      setNewQty('')
      setNewRate('')
      setNewGst('18')
      loadItems()
    }

    setAdding(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return

    await supabase.from('boq_items').delete().eq('id', id)
    loadItems()
  }

  const totalAmount = items.reduce((sum, item) => {
    const basic = (item.architect_rate || 0) * (item.quantity || 0)
    const gstAmount = basic * ((item.gst_percentage || 0) / 100)
    return sum + basic + gstAmount
  }, 0)

  return (
    <div className={styles.container}>
      <div className={styles.boqCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Package size={20} /> Bill of Quantities (With GST)
          </h3>
        </div>

        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr className={styles.tableHeadRow}>
              <th className={styles.indexColumn}>#</th>
              <th>Description</th>
              <th className={styles.unitColumn}>Unit</th>
              <th className={styles.qtyColumn}>Qty</th>
              <th className={styles.gstColumn}>GST %</th>
              <th className={styles.rateColumn}>Est. Rate</th>
              <th className={styles.amountColumn}>Total (Incl. GST)</th>
              <th className={styles.actionsColumn}></th>
            </tr>
          </thead>

          <tbody className={styles.tableBody}>
            {items.map((item, idx) => {
              const basic = item.architect_rate * item.quantity
              const totalWithGst =
                basic + basic * (item.gst_percentage / 100)

              return (
                <tr key={item.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.indexCell}`}>
                    {idx + 1}
                  </td>
                  <td className={`${styles.tableCell} ${styles.descriptionCell}`}>
                    {item.description}
                  </td>
                  <td className={`${styles.tableCell} ${styles.unitCell}`}>
                    {item.unit}
                  </td>
                  <td className={`${styles.tableCell} ${styles.qtyCell}`}>
                    {item.quantity}
                  </td>
                  <td className={`${styles.tableCell} ${styles.gstCell}`}>
                    {item.gst_percentage}%
                  </td>
                  <td className={`${styles.tableCell} ${styles.rateCell}`}>
                    {item.architect_rate > 0
                      ? `₹${item.architect_rate.toLocaleString('en-IN')}`
                      : '-'}
                  </td>
                  <td className={`${styles.tableCell} ${styles.amountCell}`}>
                    {item.architect_rate > 0
                      ? `₹${totalWithGst.toLocaleString('en-IN')}`
                      : '-'}
                  </td>
                  <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* Add Row */}
            <tr className={styles.addRow}>
              <td className={`${styles.tableCell} ${styles.addIndexCell}`}>
                +
              </td>
              <td className={styles.inputCell}>
                <input
                  placeholder="Description"
                  className={styles.input}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </td>
              <td className={styles.inputCell}>
                <input
                  placeholder="Unit"
                  className={`${styles.input} ${styles.inputCenter}`}
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                />
              </td>
              <td className={styles.inputCell}>
                <input
                  type="number"
                  placeholder="Qty"
                  className={`${styles.input} ${styles.inputRight}`}
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                />
              </td>
              <td className={styles.inputCell}>
                <select
                  className={styles.selectInput}
                  value={newGst}
                  onChange={(e) => setNewGst(e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </td>
              <td className={styles.inputCell}>
                <input
                  type="number"
                  placeholder="Rate"
                  className={`${styles.input} ${styles.inputRight}`}
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </td>
              <td className={styles.tableCell}></td>
              <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                <button
                  onClick={handleAdd}
                  disabled={adding || !newDesc}
                  className={styles.addButton}
                >
                  <Plus size={16} />
                </button>
              </td>
            </tr>
          </tbody>

          <tfoot className={styles.tableFooter}>
            <tr className={styles.totalRow}>
              <td colSpan={6} className={styles.totalLabelCell}>
                <strong>Project Estimate (Including GST):</strong>
              </td>
              <td className={`${styles.tableCell} ${styles.totalAmountCell}`}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.footer}>
        <button onClick={onNext} className={styles.finishButton}>
          <CheckCircle size={16} className={styles.checkIcon} />
          Finish & Assign Vendors
          <ArrowRight size={16} className={styles.arrowIcon} />
        </button>
      </div>
    </div>
  )
}
