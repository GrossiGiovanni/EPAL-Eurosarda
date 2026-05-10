import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatNum } from '../lib/excel'
import { Plus, Search, ChevronDown, ChevronUp, Edit2, Trash2, AlertCircle, X, Check } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'

function MovimentoModal({ clienteId, clienteNome, onClose, onSaved }) {
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], consegnati: '', affidati: '', anomalia: '', quantita_anomalia: '', riferimento: '' })
  const [loading, setLoading] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const save = async () => {
    if (!form.data) return
    setLoading(true)
    const { error } = await supabase.from('movimenti_clienti').insert({
      cliente_id: clienteId,
      data: form.data,
      consegnati: parseInt(form.consegnati) || 0,
      affidati: parseInt(form.affidati) || 0,
      anomalia: form.anomalia || null,
      quantita_anomalia: parseInt(form.quantita_anomalia) || 0,
      riferimento: form.riferimento || null,
    })
    setLoading(false)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {ToastComponent}
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nuovo movimento — {clienteNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Riferimento / Distinta</label>
            <input className="input" placeholder="es. 3215" value={form.riferimento} onChange={e => setForm({...form, riferimento: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Consegnati a noi (resi)</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.consegnati} onChange={e => setForm({...form, consegnati: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Affidati a Eurosarda</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.affidati} onChange={e => setForm({...form, affidati: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Anomalia</label>
            <select className="input" value={form.anomalia} onChange={e => setForm({...form, anomalia: e.target.value})}>
              <option value="">Nessuna</option>
              <option>EPAL ROTTO</option>
              <option>NON-EPAL</option>
              <option>EPAL NON RESO</option>
              <option>EPAL NON CONFORME</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantità anomalia</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.quantita_anomalia} onChange={e => setForm({...form, quantita_anomalia: e.target.value})} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Check size={13} /> Salva</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClienteRow({ cliente, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [movimenti, setMovimenti] = useState([])
  const [showModal, setShowModal] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const loadMovimenti = async () => {
    const { data } = await supabase.from('movimenti_clienti')
      .select('*').eq('cliente_id', cliente.id).order('data', { ascending: false })
    setMovimenti(data || [])
  }

  const toggleOpen = () => {
    if (!open) loadMovimenti()
    setOpen(!open)
  }

  const deleteMovimento = async (id) => {
    if (!confirm('Eliminare questo movimento?')) return
    await supabase.from('movimenti_clienti').delete().eq('id', id)
    loadMovimenti()
    onRefresh()
  }

  const saldo = cliente.saldo || 0
  // credito nostro (saldo < 0) = il cliente ci deve pallet → valore da recuperare/fatturare
  const valoreFatturabile = Math.abs(Math.min(0, saldo)) * (cliente.costo_epal || 10)

  return (
    <>
      {ToastComponent}
      {showModal && (
        <MovimentoModal
          clienteId={cliente.id}
          clienteNome={cliente.nome}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadMovimenti(); onRefresh() }}
        />
      )}
      <tr style={{ cursor: 'pointer' }} onClick={toggleOpen}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            <span style={{ fontWeight: 500 }}>{cliente.nome}</span>
            {(cliente.anomalie_aperte || 0) > 0 && (
              <AlertCircle size={13} style={{ color: 'var(--yellow)' }} />
            )}
          </div>
        </td>
        <td className="mono" style={{ color: 'var(--text3)', fontSize: 12 }}>{cliente.codice || '—'}</td>
        <td className="num">
          <span className={saldo < 0 ? 'positive' : 'neutral'}>
            {saldo > 0 ? '+' : ''}{formatNum(saldo)}
          </span>
        </td>
        <td className="num" style={{ color: 'var(--text2)' }}>
          {saldo < 0 ? `€ ${formatNum(valoreFatturabile)}` : '—'}
        </td>
        <td>
          <span className={`badge ${saldo < 0 ? 'badge-green' : saldo > 0 ? 'badge-blue' : 'badge-gray'}`}>
            {saldo > 0 ? 'Debito nostro' : saldo < 0 ? 'Credito nostro' : 'Pari'}
          </span>
        </td>
        <td onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={12} /> Movimento
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: 'var(--bg3)' }}>
            <div style={{ padding: '12px 20px 16px' }}>
              {cliente.contatto && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  📧 {cliente.contatto}
                </div>
              )}
              {movimenti.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>Nessun movimento registrato</div>
              ) : (
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Rif.</th>
                      <th className="num">Consegnati</th>
                      <th className="num">Affidati</th>
                      <th>Anomalia</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map(m => (
                      <tr key={m.id}>
                        <td className="mono">{formatDate(m.data)}</td>
                        <td style={{ color: 'var(--text3)' }}>{m.riferimento || '—'}</td>
                        <td className="num" style={{ color: m.consegnati > 0 ? 'var(--green)' : 'var(--text3)' }}>
                          {m.consegnati > 0 ? `+${formatNum(m.consegnati)}` : '—'}
                        </td>
                        <td className="num" style={{ color: m.affidati > 0 ? 'var(--accent)' : 'var(--text3)' }}>
                          {m.affidati > 0 ? formatNum(m.affidati) : '—'}
                        </td>
                        <td>
                          {m.anomalia ? (
                            <span className="badge badge-yellow">{m.anomalia} {m.quantita_anomalia > 0 ? `(${m.quantita_anomalia})` : ''}</span>
                          ) : '—'}
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteMovimento(m.id)}>
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Clienti() {
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('attivi')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('saldi_clienti').select('*').order('nome')
    setClienti(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clienti.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase())
    if (tab === 'attivi') return matchSearch && !c.a_perdere && (c.saldo || 0) !== 0
    if (tab === 'tutti') return matchSearch && !c.a_perdere
    if (tab === 'anomalie') return matchSearch && (c.anomalie_aperte || 0) > 0
    if (tab === 'perdere') return matchSearch && c.a_perdere
    return matchSearch
  })

  const totSaldo = clienti.filter(c => !c.a_perdere).reduce((s, c) => s + Math.max(0, c.saldo || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clienti</div>
          <div className="page-subtitle">
            {clienti.filter(c => !c.a_perdere && (c.saldo||0) > 0).length} clienti con saldo attivo · Totale: {formatNum(totSaldo)} pallet
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="input" placeholder="Cerca cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
      </div>

      <div className="tabs">
        {[
          { id: 'attivi', label: 'Saldo attivo' },
          { id: 'tutti', label: 'Tutti' },
          { id: 'anomalie', label: `Anomalie (${clienti.filter(c => c.anomalie_aperte > 0).length})` },
          { id: 'perdere', label: 'A perdere' },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>Nessun cliente trovato</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Codice</th>
                <th className="num">Saldo EPAL</th>
                <th className="num">Valore (€10/pz)</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <ClienteRow key={c.id} cliente={c} onRefresh={load} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
