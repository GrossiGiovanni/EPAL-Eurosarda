import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clienti from './pages/Clienti'
import Corrispondenti from './pages/Corrispondenti'
import BuoniEpal from './pages/BuoniEpal'
import ExportImport from './pages/ExportImport'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span className="spinner" />
    </div>
  )

  if (!session) return <Login />

  const pages = {
    dashboard: <Dashboard setPage={setPage} />,
    clienti: <Clienti />,
    corrispondenti: <Corrispondenti />,
    buoni: <BuoniEpal />,
    export: <ExportImport />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} />
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', minWidth: 0 }}>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  )
}
