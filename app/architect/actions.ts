'use server'

import { supabaseServer } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { error } = await supabase.from('projects').insert({
    name,
    architect_id: user.id,
    status: 'draft',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/architect')

  return { success: true }
}
