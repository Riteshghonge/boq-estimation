import { supabaseServer } from '../lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateProjectModal from './CreateProjectModal'

export default async function ArchitectDashboard() {
  const supabase = await supabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, status, created_at')
    .eq('architect_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return <div>Error loading projects</div>
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Architect Dashboard</h1>

      <CreateProjectModal />

      {projects.length === 0 && <p>No projects yet</p>}

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
  <a href={`/architect/projects/${project.id}`}>
    <strong>{project.name}</strong>
  </a>
</li>

        ))}
      </ul>
    </main>
  )
}
