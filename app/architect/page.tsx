'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  Search,
  Plus,
  UserCircle
} from 'lucide-react'
import Link from 'next/link'
import CreateProjectModal from './CreateProjectModal'
import ProjectRankings from './components/ProjectRankings'
import ProjectBOQ from './components/ProjectBOQ'
import ProjectVendors from './components/ProjectVendors'
import { useRouter } from 'next/navigation'
import styles from './architect-dashboard.module.css'

export default function ArchitectDashboard() {
  const router = useRouter()

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rankings' | 'boq' | 'vendors'>('rankings')
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null)

  async function loadInitialData() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.push('/login')
        return
      }

      const user = session.user

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      setUserInfo({
        name: profile?.name || 'Architect',
        email: user.email || ''
      })

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          boq_items(count),
          project_vendors(count),
          vendor_quotes(count)
        `)
        .eq('architect_id', user.id)
        .order('created_at', { ascending: false })

      if (error) console.error('Project fetch error:', error)

      if (data) {
        const formatted = data.map(p => ({
          ...p,
          vendor_count: p.project_vendors?.[0]?.count || 0,
          submission_count: p.vendor_quotes?.[0]?.count || 0,
          boq_count: p.boq_items?.[0]?.count || 0
        }))

        setProjects(formatted)

        if (formatted.length > 0 && !selectedProjectId) {
          setSelectedProjectId(formatted[0].id)
        }
      }

    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const activeProject = projects.find(p => p.id === selectedProjectId)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className={styles.loadingState}>Loading Dashboard...</div>
  }

  // Portfolio calculations
  const totalVendors = projects.reduce((acc, curr) => acc + (curr.vendor_count || 0), 0)
  const totalSubmissions = projects.reduce((acc, curr) => acc + (curr.submission_count || 0), 0)

  const submissionRate = Math.round(
    (totalSubmissions / Math.max(totalVendors, 1)) * 100
  )

  return (
    <div className={styles.dashboardContainer}>

      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderContent}>
            <h1>Projects</h1>
            <p>{projects.length} active projects</p>
          </div>
          <CreateProjectModal onProjectCreated={loadInitialData} />
        </div>

        <div className={styles.projectsList}>
          {projects.length === 0 && (
            <div className={styles.emptyProjects}>
              <p>No projects found</p>
            </div>
          )}

          <div className={styles.projectsContainer}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`${styles.projectCard} ${
                  selectedProjectId === project.id ? styles.selected : ''
                }`}
              >
                <div className={styles.projectCardHeader}>
                  <span className={styles.projectName}>
                    {project.name}
                  </span>

                  <span className={styles.projectStatus}>
                    {project.status || 'active'}
                  </span>
                </div>

                <div className={styles.projectMeta}>
                  <span className={styles.metaItem}>
                    <Users size={12} /> {project.vendor_count}
                  </span>

                  <span className={styles.metaItem}>
                    <FileText size={12} /> {project.boq_count}
                  </span>
                </div>

                {selectedProjectId === project.id && (
                  <ChevronRight className={styles.chevronIcon} size={16} />
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className={styles.mainContent}>

        {/* TOP USER BAR */}
        <div className={styles.topUserBar}>
          <div className={styles.userProfile}>
            <UserCircle size={32} className={styles.userIcon} />
            <div className={styles.userDetails}>
              <span className={styles.userName}>{userInfo?.name}</span>
              <span className={styles.userEmail}>{userInfo?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className={styles.topLogoutBtn}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {activeProject ? (
          <>
            {/* PROJECT HEADER */}
            <header className={styles.mainHeader}>
              <div className={styles.headerLeft}>
                <h2>{activeProject.name}</h2>

                <div className={styles.tabContainer}>
                  <TabButton
                    id="rankings"
                    label="Rankings"
                    icon={<LayoutDashboard size={16}/>}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />

                  <TabButton
                    id="boq"
                    label="BOQ Items"
                    icon={<FileText size={16}/>}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />

                  <TabButton
                    id="vendors"
                    label="Vendors"
                    icon={<Users size={16}/>}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                </div>
              </div>

              {activeTab === 'rankings' && (
                <Link
                  href={`/architect/projects/${activeProject.id}/compare`}
                  className={styles.viewMatrixButton}
                >
                  <Search size={16} /> View Matrix
                </Link>
              )}
            </header>

            {/* CONTENT AREA */}
            <div className={styles.contentArea}>
              <div className={styles.contentInner}>

                {/* SUMMARY CARDS */}
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Active Projects</p>
                    <div className={styles.summaryValue}>{projects.length}</div>
                    <div className={styles.summaryMeta}>
                      <div className={styles.pulseDot}></div>
                      Live System
                    </div>
                  </div>

                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Total Vendors</p>
                    <div className={styles.summaryValue}>{totalVendors}</div>
                    <p className={styles.summaryMeta}>
                      Invited across all projects
                    </p>
                  </div>

                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Submission Rate</p>
                    <div className={styles.summaryValue}>
                      {submissionRate}%
                    </div>
                    <p className={styles.summaryMeta}>
                      Efficiency Score
                    </p>
                  </div>
                </div>

                {/* TAB CONTENT */}
                <div className={styles.tabContent}>
                  {activeTab === 'rankings' && (
                    <ProjectRankings projectId={activeProject.id} />
                  )}

                  {activeTab === 'boq' && (
                    <ProjectBOQ
                      projectId={activeProject.id}
                      onNext={() => {
                        loadInitialData()
                        setActiveTab('vendors')
                      }}
                    />
                  )}

                  {activeTab === 'vendors' && (
                    <ProjectVendors
                      projectId={activeProject.id}
                      onUpdate={loadInitialData}
                    />
                  )}
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyStateMain}>
            <div className={styles.emptyStateIcon}>
              <Plus size={40} color="#d1d5db" />
            </div>
            <p>Select a project from the sidebar to start</p>
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({ id, label, icon, activeTab, setActiveTab }: any) {
  const isActive = activeTab === id

  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
    >
      {icon} {label}
    </button>
  )
}