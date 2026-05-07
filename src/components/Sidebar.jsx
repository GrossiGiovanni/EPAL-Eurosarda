import { LayoutDashboard, Users, Truck, Package, FileSpreadsheet, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clienti', label: 'Clienti', icon: Users },
  { id: 'corrispondenti', label: 'Corrispondenti', icon: Truck },
  { id: 'buoni', label: 'Buoni EPAL', icon: Package },
  { id: 'export', label: 'Esporta / Importa', icon: FileSpreadsheet },
]

export default function Sidebar({ page, setPage }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? 60 : 220,
      minHeight: '100vh',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0
        }}>E</div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>EPAL</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Eurosarda MI</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px 14px' : '10px 12px',
              borderRadius: 8,
              marginBottom: 2,
              background: page === id ? 'rgba(79,142,247,0.12)' : 'transparent',
              color: page === id ? 'var(--accent)' : 'var(--text2)',
              fontSize: 13,
              fontWeight: page === id ? 500 : 400,
              transition: 'all 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: 'none',
              cursor: 'pointer',
            }}
            title={collapsed ? label : ''}
          >
            <Icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            {!collapsed && label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px 8px 16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            padding: '8px 12px', borderRadius: 8,
            background: 'transparent', color: 'var(--text3)',
            fontSize: 12, gap: 6, border: 'none', cursor: 'pointer',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Comprimi</>}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 10, padding: '10px 12px', borderRadius: 8,
            background: 'transparent', color: 'var(--text3)',
            fontSize: 13, border: 'none', cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          title={collapsed ? 'Esci' : ''}
        >
          <LogOut size={15} />
          {!collapsed && 'Esci'}
        </button>
      </div>
    </aside>
  )
}
