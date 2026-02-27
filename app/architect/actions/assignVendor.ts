'use server'

// ✅ FIX 1: Use the correct relative path and function name
import { supabaseServer } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignVendorToProject(
  projectId: string,
  vendorId: string
) {
  // ✅ FIX 2: Call the correct async function
  const supabase = await supabaseServer()

  // 1️⃣ Auth check
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  // 2️⃣ Role check (architect only)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'architect') {
    throw new Error('Only architect can assign vendors')
  }

  // 3️⃣ Prevent duplicate assignment
  const { data: existing } = await supabase
    .from('project_vendors')
    .select('id')
    .eq('project_id', projectId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existing) {
    throw new Error('Vendor already assigned to this project')
  }

  // 4️⃣ Assign vendor to project (Permission Layer)
  const { error: assignError } = await supabase
    .from('project_vendors')
    .insert({
      project_id: projectId,
      vendor_id: vendorId
    })

  if (assignError) {
    throw new Error(assignError.message)
  }

  // 5️⃣ Create vendor quote shell (Answer Sheet)
  const { error: quoteError } = await supabase
    .from('vendor_quotes')
    .insert({
      project_id: projectId,
      vendor_id: vendorId,
      submitted: false
    })

  if (quoteError) {
    throw new Error(quoteError.message)
  }

  // 6️⃣ Refresh data
  revalidatePath('/architect')
  revalidatePath(`/architect/projects/${projectId}`)

  return { success: true }
}