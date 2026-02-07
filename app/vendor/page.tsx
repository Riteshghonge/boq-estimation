import { supabaseServer } from '../lib/supabase/server'
import VendorLogoutButton from './VendorLogoutButton'

export default async function VendorDashboard() {
  const supabase = await supabaseServer()

  // Example vendor data fetch (replace later)
  const { data: quotes, error } = await supabase
    .from('vendor_quotes')
    .select('*')

  if (error) {
    console.error(error)
    return <div>Error loading vendor data</div>
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1>Vendor Dashboard</h1>
        <VendorLogoutButton />
      </header>

      {quotes?.length === 0 && <p>No quotes submitted yet</p>}

      <ul>
        {quotes?.map((q) => (
          <li key={q.id}>
            Quote #{q.id} — ₹{q.amount}
          </li>
        ))}
      </ul>
    </main>
  )
}
