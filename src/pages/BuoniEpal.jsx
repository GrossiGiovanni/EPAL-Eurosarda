import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatNum } from '../lib/excel'
import { Plus, X, Check, Trash2 } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'

function NuovoBuonoModal({ onClose, onSaved }) {
  const [corrispondenti, setCorrispondenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    corrispondente_id: '', cliente_id: '', quantita: '',
    tipo: 'ricevuto', stato: 'aperto', note: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('corrispondenti').select('id, nome').order('nome').then(({ data }) => setCorrispondenti(data || []))
    supabase.from('clienti').select('id, nome').eq('a_perdere', false).order('nome').then(({ data }) => setClienti(data || []))
  }, [])

  const save = async () => {
    if (!form.quantita) return
    setLoading(true)
    const { error } = await supabase.from('buoni_epal').insert({
      data: form.data,
      corrispondente_id: form.corrispondente_id || null,
      cliente_id: form.cliente_id || null,
      quantita: parseInt(form.quantita),
      tipo: form.tipo,
      stato: form.stato,
      note: form.note || null,
    })
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nuovo Buono EPAL</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Quantità *</label>
            <input className="input" type="number" min="1" placeholder="es. 12" value={form.quantita} onChange={e => setForm({...form, quantita: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option value="ricevuto">Ricevuto</option>
              <option value="emesso">Emesso</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stato</label>
            <select className="input" value={form.stato} onChange={e => setForm({...form, stato: e.target.value})}>
              <option value="aperto">Aperto</option>
              <option value="ritirato">Ritirato fisicamente</option>
              <option value="stornato">Stornato contabilmente</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Corrispondente</label>
          <select className="input" value={form.corrispondente_id} onChange={e => setForm({...form, corrispondente_id: e.target.value})}>
            <option value="">— Seleziona —</option>
            {corrispondenti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Cliente finale</label>
          <select className="input" value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})}>
            <option value="">— Seleziona —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Note</label>
          <input className="input" placeholder="Note opzionali..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
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

export default function BuoniEpal() {
  const [buoni, setBuoni] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtroStato, setFiltroStato] = useState('aperto')
  const { showToast, ToastComponent } = useToast()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('buoni_epal')
      .select('*, corrispondenti(nome), clienti(nome)')
      .order('data', { ascending: false })
    setBuoni(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const aggiornaSato = async (id, stato) => {
    await supabase.from('buoni_epal').update({ stato }).eq('id', id)
    showToast('Stato aggiornato')
    load()
  }

  const elimina = async (id) => {
    if (!confirm('Eliminare questo buono?')) return
    await supabase.from('buoni_epal').delete().eq('id', id)
    load()
  }

  const filtered = buoni.filter(b => filtroStato === 'tutti' || b.stato === filtroStato)
  const totAperto = buoni.filter(b => b.stato === 'aperto').reduce((s, b) => s + (b.quantita || 0), 0)

  return (
    <div>
      {ToastComponent}
      {showModal && <NuovoBuonoModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}

      <div className="page-header">
        <div>
          <div className="page-title">Buoni EPAL</div>
          <div className="page-subtitle">{buoni.filter(b => b.stato === 'aperto').length} buoni aperti · {formatNum(totAperto)} pallet da gestire</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Nuovo buono
        </button>
      </div>

      <div className="tabs">
        {[
          { id: 'aperto', label: `Aperti (${buoni.filter(b => b.stato === 'aperto').length})` },
          { id: 'ritirato', label: 'Ritirati' },
          { id: 'stornato', label: 'Stornati' },
          { id: 'tutti', label: 'Tutti' },
        ].map(t => (
          <button key={t.id} className={`tab ${filtroStato === t.id ? 'active' : ''}`} onClick={() => setFiltroStato(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>Nessun buono in questa categoria</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Quantità</th>
                <th>Tipo</th>
                <th>Corrispondente</th>
                <th>Cliente</th>
                <th>Stato</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td className="mono">{formatDate(b.data)}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatNum(b.quantita)}</td>
                  <td>
                    <span className={`badge ${b.tipo === 'ricevuto' ? 'badge-green' : 'badge-blue'}`}>
                      {b.tipo}
                    </span>
                  </td>
                  <td>{b.corrispondenti?.nome || '—'}</td>
                  <td>{b.clienti?.nome || '—'}</td>
                  <td>
                    <select
                      className="input"
                      value={b.stato}
                      onChange={e => aggiornaSato(b.id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="aperto">Aperto</option>
                      <option value="ritirato">Ritirato</option>
                      <option value="stornato">Stornato</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{b.note || '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => elimina(b.id)}><Trash2 size={11} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
