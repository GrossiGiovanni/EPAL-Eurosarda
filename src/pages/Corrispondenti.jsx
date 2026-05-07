import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatNum } from '../lib/excel'
import { Plus, ChevronDown, ChevronUp, Trash2, X, Check, AlertTriangle } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'

function MovCorriModal({ corrId, corrNome, onClose, onSaved }) {
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    distinta: '', affidati: '', ricevuti: '',
    riscontro_scarico: '', differenza: '', anomalia: '', riferimento: ''
  })
  const [loading, setLoading] = useState(false)

  const calcDiff = (aff, ris) => {
    const a = parseInt(aff) || 0
    const r = parseInt(ris) || 0
    return a - r
  }

  const save = async () => {
    setLoading(true)
    const diff = calcDiff(form.affidati, form.riscontro_scarico || form.ricevuti)
    const { error } = await supabase.from('movimenti_corrispondenti').insert({
      corrispondente_id: corrId,
      data: form.data,
      distinta: form.distinta || null,
      affidati: parseInt(form.affidati) || 0,
      ricevuti: parseInt(form.ricevuti) || 0,
      riscontro_scarico: form.riscontro_scarico ? parseInt(form.riscontro_scarico) : null,
      differenza: diff,
      anomalia: form.anomalia || null,
      riferimento: form.riferimento || null,
    })
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nuovo movimento — {corrNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Distinta / Targa</label>
            <input className="input" placeholder="es. 3215" value={form.distinta} onChange={e => setForm({...form, distinta: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Affidati al corrispondente</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.affidati} onChange={e => setForm({...form, affidati: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Ricevuti da Eurosarda MI</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.ricevuti} onChange={e => setForm({...form, ricevuti: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Riscontro allo scarico</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.riscontro_scarico} onChange={e => setForm({...form, riscontro_scarico: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Differenza (calcolata)</label>
            <input className="input" readOnly value={calcDiff(form.affidati, form.riscontro_scarico || form.ricevuti)} style={{ color: 'var(--text3)' }} />
          </div>
        </div>

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

function CorrRow({ corr, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [movimenti, setMovimenti] = useState([])
  const [showModal, setShowModal] = useState(false)

  const loadMov = async () => {
    const { data } = await supabase.from('movimenti_corrispondenti')
      .select('*').eq('corrispondente_id', corr.id).order('data', { ascending: false })
    setMovimenti(data || [])
  }

  const toggleOpen = () => {
    if (!open) loadMov()
    setOpen(!open)
  }

  const deleteMov = async (id) => {
    if (!confirm('Eliminare questo movimento?')) return
    await supabase.from('movimenti_corrispondenti').delete().eq('id', id)
    loadMov()
    onRefresh()
  }

  const saldo = corr.saldo_lordo || 0
  const diff = corr.differenza_totale || 0
  const franchigia = corr.franchigia_pct || 0

  // Alert se differenza supera franchigia
  const soglia = saldo * (franchigia / 100)
  const alert = Math.abs(diff) > soglia && saldo > 0

  return (
    <>
      {showModal && (
        <MovCorriModal corrId={corr.id} corrNome={corr.nome} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadMov(); onRefresh() }} />
      )}
      <tr style={{ cursor: 'pointer' }} onClick={toggleOpen}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            <span style={{ fontWeight: 500 }}>{corr.nome}</span>
            {alert && <AlertTriangle size={13} style={{ color: 'var(--red)' }} title="Differenza sopra franchigia" />}
          </div>
        </td>
        <td>
          <span className={`badge ${corr.tipo === 'trazionista' ? 'badge-purple' : 'badge-blue'}`} style={{ color: corr.tipo === 'trazionista' ? 'var(--purple)' : 'var(--accent)' }}>
            {corr.tipo}
          </span>
        </td>
        <td className="num">
          <span className={saldo > 0 ? 'positive' : saldo < 0 ? 'negative' : 'neutral'}>
            {saldo > 0 ? '+' : ''}{formatNum(saldo)}
          </span>
        </td>
        <td className="num">
          <span style={{ color: diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text3)' }}>
            {diff > 0 ? '+' : ''}{formatNum(diff)}
          </span>
        </td>
        <td>
          <span className={`badge ${franchigia > 0 ? 'badge-yellow' : 'badge-gray'}`}>
            {franchigia > 0 ? `${franchigia}%` : '0%'}
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
              {corr.contatto && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>📧 {corr.contatto}</div>}
              {movimenti.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>Nessun movimento registrato</div>
              ) : (
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Distinta</th>
                      <th className="num">Affidati</th>
                      <th className="num">Ricevuti</th>
                      <th className="num">Riscontro</th>
                      <th className="num">Diff.</th>
                      <th>Anomalia</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map(m => (
                      <tr key={m.id}>
                        <td className="mono">{formatDate(m.data)}</td>
                        <td style={{ color: 'var(--text3)' }}>{m.distinta || '—'}</td>
                        <td className="num">{formatNum(m.affidati)}</td>
                        <td className="num">{formatNum(m.ricevuti)}</td>
                        <td className="num">{m.riscontro_scarico != null ? formatNum(m.riscontro_scarico) : '—'}</td>
                        <td className="num">
                          <span style={{ color: (m.differenza||0) > 0 ? 'var(--red)' : (m.differenza||0) < 0 ? 'var(--green)' : 'var(--text3)' }}>
                            {(m.differenza||0) > 0 ? '+' : ''}{formatNum(m.differenza || 0)}
                          </span>
                        </td>
                        <td>
                          {m.anomalia ? <span className="badge badge-yellow">{m.anomalia}</span> : '—'}
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteMov(m.id)}><Trash2 size={11} /></button>
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

export default function Corrispondenti() {
  const [corr, setCorr] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('corrispondente')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('saldi_corrispondenti').select('*').order('nome')
    setCorr(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = corr.filter(c => c.tipo === tab)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Corrispondenti & Trazionisti</div>
          <div className="page-subtitle">Gestione saldi e differenze EPAL</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'corrispondente' ? 'active' : ''}`} onClick={() => setTab('corrispondente')}>
          Corrispondenti ({corr.filter(c => c.tipo === 'corrispondente').length})
        </button>
        <button className={`tab ${tab === 'trazionista' ? 'active' : ''}`} onClick={() => setTab('trazionista')}>
          Trazionisti ({corr.filter(c => c.tipo === 'trazionista').length})
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>Nessun dato</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th className="num">Saldo EPAL</th>
                <th className="num">Differenza cumulata</th>
                <th>Franchigia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => <CorrRow key={c.id} corr={c} onRefresh={load} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
