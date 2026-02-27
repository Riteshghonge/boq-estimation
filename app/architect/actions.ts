'use server'

import { supabaseServer } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation' // 🟢 Added for navigation

type State = {
  success: boolean
  error?: string
}

export async function createProject(
  prevState: State,
  formData: FormData
): Promise<State> {
  const name = formData.get('name') as string

  if (!name || name.trim().length < 3) {
    return { success: false, error: 'Project name too short' }
  }

  const supabase = await supabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data, error } = await supabase.from('projects').insert({
    name,
    architect_id: user.id,
    status: 'draft',
  }).select().single() // 🟢 Select the new project to confirm it exists

  if (error) {
    return { success: false, error: error.message }
  }

  // 🟢 Force Next.js to dump the cache for the dashboard
  revalidatePath('/architect', 'page') 
  revalidatePath('/architect', 'layout')

  // 🟢 If you want the screen to move to the new project immediately:
  // redirect(`/architect/projects/${data.id}`)

  return { success: true }
}