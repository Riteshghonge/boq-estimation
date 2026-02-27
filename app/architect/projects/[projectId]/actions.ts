'use server'

import { supabaseServer } from '../../../lib/supabase/server' 
import { revalidatePath } from 'next/cache'

export async function addBoqItem(
  projectId: string,
  formData: FormData
) {
  // ✅ This is where the value is "read" and used
  const supabase = await supabaseServer()

  const description = formData.get('description') as string
  const unit = formData.get('unit') as string
  const quantity = Number(formData.get('quantity'))
  const architectRate = Number(formData.get('architect_rate'))

  // Validation
  if (!description || !unit || quantity <= 0 || architectRate <= 0) {
    throw new Error('All fields are required and must be greater than zero.')
  }

  // 1️⃣ Using the 'supabase' variable reads the imported value
  const { error } = await supabase.from('boq_items').insert({
    project_id: projectId,
    description,
    unit,
    quantity,
    architect_rate: architectRate,
  })

  if (error) {
    console.error("Database Error:", error.message)
    throw error
  }

  // 2️⃣ Refresh the page to show the new item
  revalidatePath(`/architect/projects/${projectId}`)
}