import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, AlertTriangle, Package, RefreshCw, Truck, Bell } from 'lucide-react'
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
      supabase.from('movimenti_clienti').select('id').not('anomalia', 'is', null).neq('anomalia', ''),
      supabase.from('inventario').select('*').order('data', { ascending: false }).limit(1),
    ])

    const getSaldo = c => c.saldo_con_franchigia ?? c.saldo ?? 0

    // saldo > 0 = debito nostro (teniamo i loro pallet) → EPAL in circolazione
    const debitoClienti = (saldi_c || [])
      .filter(c => getSaldo(c) > 0)
      .reduce((s, c) => s + getSaldo(c), 0)

    // saldo < 0 = credito nostro (ci devono pallet)
    const creditiClienti = (saldi_c || [])
      .filter(c => getSaldo(c) < 0)
      .reduce((s, c) => s + Math.abs(getSaldo(c)), 0)

    const totaliInTransito = (saldi_k || [])
      .reduce((s, c) => s + (c.pallet_in_transito || 0), 0)

    const inTransitoClienti = (saldi_c || [])
      .reduce((s, c) => s + Math.max(0, c.pallet_in_transito || 0), 0)

    // EPAL in circolazione = pallet presso clienti (debito) + pallet in transito
    const epalInCircolazione = debitoClienti + totaliInTransito + inTransitoClienti

    const anomalieAperte = (anomalie || []).length

    // Alert attivi: clienti con nota o soglia superata
    const alertClienti = (saldi_c || [])
      .filter(c => (c.alert_note && c.alert_note.trim()) || (c.soglia_max != null && getSaldo(c) >= c.soglia_max))
      .map(c => ({
        id: c.id,
        nome: c.nome,
        saldo: getSaldo(c),
        soglia_max: c.soglia_max,
        alert_note: c.alert_note,
        superata: c.soglia_max != null && getSaldo(c) >= c.soglia_max,
      }))
      .sort((a, b) => (b.superata ? 1 : 0) - (a.superata ? 1 : 0))

    const top10 = (saldi_c || [])
      .filter(c => getSaldo(c) > 0)
      .sort((a, b) => getSaldo(b) - getSaldo(a))
      .slice(0, 10)

    const corrData = (saldi_k || []).map(c => ({
      nome: c.nome,
      saldo_lordo: Math.max(0, c.saldo_lordo || 0),
      in_transito: c.pallet_in_transito || 0,
      differenza: c.differenza_totale || 0,
    }))

    setData({
      epalInCircolazione,
      creditiClienti,
      totaliInTransito,
      inTransitoClienti,
      anomalieAperte,
      alertClienti,
      inventario: ultimo_inv?.[0]?.quantita,
      top10,
      corrData,
      totClienti: (saldi_c || []).filter(c => getSaldo(c) > 0).length, // con debito attivo
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
          value={formatNum(data.epalInCircolazione)}
          sub={`${data.totClienti} clienti · transito corrispondenti`}
          color="var(--accent)"
          icon={Package}
          onClick={() => setPage('clienti')}
        />
        <KpiCard
          label="Crediti da clienti"
          value={formatNum(data.creditiClienti)}
          sub="Pallet che ci devono"
          color="var(--green)"
          icon={TrendingUp}
          onClick={() => setPage('clienti')}
        />
        <KpiCard
          label="In transito"
          value={formatNum(data.totaliInTransito + data.inTransitoClienti)}
          sub={`${formatNum(data.totaliInTransito)} corr. · ${formatNum(data.inTransitoClienti)} clienti`}
          color="var(--yellow)"
          icon={Truck}
          onClick={() => setPage('corrispondenti')}
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

      {data.alertClienti.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Bell size={15} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Alert attivi
            </span>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>
              {data.alertClienti.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.alertClienti.map(a => (
              <div key={a.id}
                onClick={() => setPage('clienti')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: a.superata ? 'rgba(239,68,68,0.08)' : 'var(--bg3)',
                  border: `1px solid ${a.superata ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer',
                }}>
                <AlertTriangle size={14} style={{ color: a.superata ? '#ef4444' : 'var(--yellow)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.nome}</div>
                  {a.alert_note && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.alert_note}</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  <div>{formatNum(a.saldo)} pz</div>
                  {a.soglia_max != null && (
                    <div style={{ fontSize: 10, color: a.superata ? '#ef4444' : 'var(--text3)' }}>
                      soglia: {a.soglia_max}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top clienti */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
            Top 10 clienti per credito EPAL
          </div>
          {data.top10.length === 0 ? (
            <div className="empty-state"><p>Nessun dato</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.top10} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="saldo_con_franchigia" radius={[0, 4, 4, 0]}>
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
            Situazione corrispondenti
          </div>
          {data.corrData.length === 0 ? (
            <div className="empty-state"><p>Nessun dato</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.corrData
                .filter(c => c.saldo_lordo > 0 || c.in_transito > 0)
                .sort((a, b) => (b.saldo_lordo + b.in_transito) - (a.saldo_lordo + a.in_transito))
                .map(c => {
                  const totale = c.saldo_lordo + c.in_transito
                  const maxVal = 200
                  return (
                    <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>{c.nome}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        {c.saldo_lordo > 0 && (
                          <div style={{
                            height: '100%',
                            background: 'var(--accent)',
                            width: `${Math.min(100, c.saldo_lordo / maxVal * 100)}%`,
                          }} title={`Saldo: ${formatNum(c.saldo_lordo)}`} />
                        )}
                        {c.in_transito > 0 && (
                          <div style={{
                            height: '100%',
                            background: 'var(--yellow)',
                            width: `${Math.min(100 - Math.min(100, c.saldo_lordo / maxVal * 100), c.in_transito / maxVal * 100)}%`,
                          }} title={`In transito: ${formatNum(c.in_transito)}`} />
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', width: 70, textAlign: 'right', color: 'var(--text2)' }}>
                        {c.in_transito > 0 && <span style={{ color: 'var(--yellow)' }}>{formatNum(c.in_transito)}↑ </span>}
                        {c.saldo_lordo > 0 && <span>{formatNum(c.saldo_lordo)}</span>}
                      </div>
                    </div>
                  )
                })}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 12 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', borderRadius: 2, marginRight: 4 }} />Saldo scaricato</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--yellow)', borderRadius: 2, marginRight: 4 }} />In transito</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
