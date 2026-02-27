'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

export default function ComparisonMatrixPage() {
  const { projectId } = useParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [boqItems, setBoqItems] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({}) // Map: "itemId_vendorId" -> Amount

  useEffect(() => {
    async function fetchData() {
      // 1. Get BOQ Items (Rows)
      const { data: items } = await supabase
        .from('boq_items')
        .select('*')
        .eq('project_id', projectId)
        .order('id')

      // 2. Get Submitted Vendors (Columns)
      const { data: vendorQuotes } = await supabase
        .from('vendor_quotes')
        .select(`
          id, 
          vendor_id, 
          profiles (name)
        `)
        .eq('project_id', projectId)
        .eq('submitted', true) // Only compare submitted

      // 3. Get All Rates (Cells)
      const { data: quoteItems } = await supabase
        .from('vendor_quote_items')
        .select('boq_item_id, vendor_quote_id, rate')
        .in('vendor_quote_id', vendorQuotes?.map(v => v.id) || [])

      // 4. Pivot Data for Fast Lookup
      const rateMap: Record<string, number> = {}
      quoteItems?.forEach((qi) => {
        // Key = "boqItemId_vendorQuoteId"
        rateMap[`${qi.boq_item_id}_${qi.vendor_quote_id}`] = qi.rate
      })

      setBoqItems(items || [])
      setVendors(vendorQuotes || [])
      setRates(rateMap)
      setLoading(false)
    }

    if (projectId) fetchData()
  }, [projectId])

  if (loading) return <div className="p-10 text-center">Building Comparison Matrix...</div>

  return (
    <div className="p-6 max-w-[95%] mx-auto font-sans">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detailed Comparison Matrix</h1>
        <button 
          onClick={() => router.back()}
          className="text-sm bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="border rounded-xl shadow-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              {/* FIXED COLUMNS */}
              <th className="p-4 min-w-[300px] border-r sticky left-0 bg-gray-50 z-10">Description</th>
              <th className="p-4 text-center w-20 border-r">Unit</th>
              <th className="p-4 text-center w-20 border-r">Qty</th>

              {/* DYNAMIC VENDOR COLUMNS */}
              {vendors.map((v) => (
                <th key={v.id} className="p-4 text-right min-w-[150px] border-r">
                  <div className="font-bold text-gray-900">{v.profiles?.name || 'Unknown'}</div>
                  <div className="text-[10px] text-gray-500 font-mono">ID: {v.vendor_id.slice(0, 4)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {boqItems.map((item) => {
              
              // STEP 3.5: FIND CHEAPEST (UI ONLY)
              // Calculate amount for each vendor for this specific item
              const rowAmounts = vendors.map(v => {
                 const rate = rates[`${item.id}_${v.id}`]
                 return rate ? rate * item.quantity : null
              }).filter(val => val !== null) as number[]

              const minAmount = rowAmounts.length > 0 ? Math.min(...rowAmounts) : -1

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  {/* Fixed Columns */}
                  <td className="p-4 border-r font-medium sticky left-0 bg-white z-10">{item.description}</td>
                  <td className="p-4 text-center text-gray-500 border-r">{item.unit}</td>
                  <td className="p-4 text-center text-gray-500 border-r">{item.quantity}</td>

                  {/* Dynamic Vendor Cells */}
                  {vendors.map((v) => {
                    const rate = rates[`${item.id}_${v.id}`]
                    const amount = rate ? rate * item.quantity : null
                    
                    // Highlight Logic: Is this the cheapest in the row?
                    const isCheapest = amount !== null && amount === minAmount && minAmount > 0
                    
                    // Highlight Logic: Is this the costliest? (Optional, good for visuals)
                    const maxAmount = Math.max(...rowAmounts)
                    const isCostliest = amount !== null && amount === maxAmount && rowAmounts.length > 1

                    return (
                      <td 
                        key={v.id} 
                        className={`p-4 text-right border-r font-mono text-sm ${
                          isCheapest ? 'bg-green-100 text-green-800 font-bold' : 
                          isCostliest ? 'bg-red-50 text-red-800' : ''
                        }`}
                      >
                        {amount ? (
                          <div className="flex flex-col">
                            <span>₹{amount.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              @{rate?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}