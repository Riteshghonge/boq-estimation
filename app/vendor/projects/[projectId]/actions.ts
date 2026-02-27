'use server'

import { supabaseServer } from '../../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * VENDOR ACTIONS
 */

// 1. Save individual BOQ item rates
export async function saveVendorRates(
  projectId: string,
  items: { boqItemId: string; rate: number }[]
) {
  const supabase = await supabaseServer()

  for (const item of items) {
    if (!item.rate || item.rate <= 0) continue

    await supabase.from('vendor_quote_items').upsert({
      boq_item_id: item.boqItemId,
      rate: item.rate,
    })
  }

  revalidatePath(`/vendor/projects/${projectId}`)
}

// 2. Finalize and Lock the Quote
export async function submitVendorQuote(projectId: string) {
  const supabase = await supabaseServer()

  const { data: quote } = await supabase
    .from('vendor_quotes')
    .select('id')
    .eq('project_id', projectId)
    .single()

  if (!quote) throw new Error("Quote record not found")

  await supabase
    .from('vendor_quotes')
    .update({ 
      submitted: true,
      submitted_at: new Date().toISOString() 
    })
    .eq('id', quote.id)

  revalidatePath('/vendor')
  revalidatePath(`/vendor/projects/${projectId}`)
}

// 3. Vendor requests permission to edit a submitted quote
export async function requestRevision(projectId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from('vendor_quotes')
    .update({ 
      revision_status: 'requested',
      revision_requested_at: new Date().toISOString()
    })
    .eq('project_id', projectId)
    .eq('vendor_id', user.id)

  if (error) throw error
  revalidatePath(`/vendor/projects/${projectId}`)
}

/**
 * ARCHITECT ACTIONS
 */

// 4. Architect unlocks the BOQ for a specific vendor
export async function approveRevision(projectId: string, vendorId: string) {
  const supabase = await supabaseServer()

  const { error } = await supabase
    .from('vendor_quotes')
    .update({ 
      submitted: false, // Unlocks the UI for the vendor
      revision_status: 'approved' 
    })
    .eq('project_id', projectId)
    .eq('vendor_id', vendorId)

  if (error) throw error
  
  // Revalidate both paths so both users see the status change
  revalidatePath(`/architect/projects/${projectId}`)
  revalidatePath(`/vendor/projects/${projectId}`)
}