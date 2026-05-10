import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Package, RefreshCw } from 'lucide-react'
import { formatNum } from '../lib/excel'

function KpiCard({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
        </div>
        {Icon && <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 8 }}>
          <Icon size={18} style={{ color: color || 'var(--text2)' }} />
        </div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatNum(payload[0].value)} pallet</div>
    </div>
  )
}

export default function Dashboard({ setPage }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [{ data: saldi_c }, { data: saldi_k }, { data: anomalie }, { data: ultimo_inv }] = await Promise.all([
      supabase.from('saldi_clienti').select('*').eq('a_perdere', false),
      supabase.from('saldi_corrispondenti').select('*'),
      supabase.from('movimenti_clienti').select('*').not('anomalia', 'is', null).neq('anomalia', ''),
      supabase.from('inventario').select('*').order('data', { ascending: false }).limit(1),
    ])

    const totalePallet = (saldi_c || []).reduce((s, c) => s + Math.max(0, c.saldo || 0), 0)
    const creditiClienti = (saldi_c || []).filter(c => (c.saldo || 0) < 0).reduce((s, c) => s + (c.saldo || 0), 0)
    const anomalieAperte = (anomalie || []).length
    const top10 = (saldi_c || [])
      .filter(c => (c.saldo || 0) > 0)
      .sort((a, b) => (b.saldo || 0) - (a.saldo || 0))
      .slice(0, 10)

    const corrData = (saldi_k || []).map(c => ({
      nome: c.nome,
      differenza: c.differenza_totale || 0,
      saldo: c.saldo_lordo || 0,
    }))

    setData({
      totalePallet,
      creditiClienti: Math.abs(creditiClienti),
      anomalieAperte,
      inventario: ultimo_inv?.[0]?.quantita,
      top10,
      corrData,
      totClienti: (saldi_c || []).filter(c => (c.saldo || 0) !== 0).length,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Riepilogo situazione EPAL in tempo reale</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={13} /> Aggiorna
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard
          label="EPAL in circolazione"
          value={formatNum(data.totalePallet)}
          sub={`${data.totClienti} clienti attivi`}
          color="var(--accent)"
          icon={Package}
          onClick={() => setPage('clienti')}
        />
        <KpiCard
          label="Crediti da clienti"
          value={formatNum(data.creditiClienti)}
          sub="Pallet da ricevere"
          color="var(--green)"
          icon={TrendingUp}
        />
        <KpiCard
          label="Anomalie aperte"
          value={data.anomalieAperte}
          sub="Da risolvere"
          color={data.anomalieAperte > 0 ? 'var(--yellow)' : 'var(--green)'}
          icon={AlertTriangle}
          onClick={() => setPage('clienti')}
        />
        {data.inventario !== undefined && (
          <KpiCard
            label="Inventario magazzino"
            value={formatNum(data.inventario)}
            sub="Ultimo rilevamento"
            color="var(--purple)"
            icon={Package}
          />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top clienti */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
            Top 10 clienti per saldo EPAL
          </div>
          {data.top10.length === 0 ? (
            <div className="empty-state"><p>Nessun dato</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.top10} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="saldo" radius={[0, 4, 4, 0]}>
                  {data.top10.map((_, i) => (
                    <Cell key={i} fill={`rgba(79,142,247,${1 - i * 0.07})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Corrispondenti */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
            Differenze con corrispondenti
          </div>
          {data.corrData.length === 0 ? (
            <div className="empty-state"><p>Nessun dato</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.corrData.sort((a, b) => Math.abs(b.differenza) - Math.abs(a.differenza)).map(c => (
                <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>{c.nome}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: c.differenza > 0 ? 'var(--green)' : c.differenza < 0 ? 'var(--red)' : 'var(--border)',
                      width: `${Math.min(100, Math.abs(c.differenza) / 50 * 100)}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)', width: 50, textAlign: 'right',
                    color: c.differenza > 0 ? 'var(--green)' : c.differenza < 0 ? 'var(--red)' : 'var(--text3)'
                  }}>
                    {c.differenza > 0 ? '+' : ''}{formatNum(c.differenza)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
