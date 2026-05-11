import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatNum } from '../lib/excel'
import { Plus, ChevronDown, ChevronUp, Trash2, X, Check, AlertTriangle, Edit2 } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'

// Corrispondenti che non mandano il verbale di scarico
const NESSUN_VERBALE = new Set(['DM', 'ITEX', 'CAGLIARI', 'SASSARI', 'OLBIA'])

const ANOMALIE = ['EPAL ROTTO', 'NON-EPAL', 'EPAL NON RESO', 'EPAL NON CONFORME']

// Modal fase 1: carico in uscita → stato in_transito
function NuovoCaricaModal({ corrId, corrNome, onClose, onSaved }) {
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    distinta: '', affidati: '',
  })
  const [loading, setLoading] = useState(false)

  const save = async () => {
    const aff = parseInt(form.affidati)
    if (!aff || aff <= 0) return
    setLoading(true)
    const { error } = await supabase.from('movimenti_corrispondenti').insert({
      corrispondente_id: corrId,
      data: form.data,
      distinta: form.distinta || null,
      affidati: aff,
      ricevuti: 0,
      differenza: 0,
      stato: 'in_transito',
    })
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Carico in uscita — {corrNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Distinta / Targa</label>
            <input className="input" placeholder="es. 3215" value={form.distinta} onChange={e => setForm({ ...form, distinta: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Pallet affidati *</label>
          <input className="input" type="number" min="1" step="1" placeholder="0"
            value={form.affidati} onChange={e => setForm({ ...form, affidati: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Check size={13} /> Registra carico</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal fase 2: registra scarico → in_transito → scaricato
function ScaricaModal({ movimento, corrNome, onClose, onSaved }) {
  const [riscontro, setRiscontro] = useState('')
  const [anomalia, setAnomalia] = useState('')
  const [loading, setLoading] = useState(false)

  const diff = parseInt(movimento.affidati) - (parseInt(riscontro) || 0)

  const save = async () => {
    if (riscontro === '') return
    setLoading(true)
    const { error } = await supabase.from('movimenti_corrispondenti').update({
      riscontro_scarico: parseInt(riscontro),
      differenza: diff,
      anomalia: anomalia || null,
      stato: 'scaricato',
    }).eq('id', movimento.id)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Registra scarico — {corrNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Movimento del {formatDate(movimento.data)}</div>
          <div>Affidati: <strong>{formatNum(movimento.affidati)}</strong> · Distinta: <strong>{movimento.distinta || '—'}</strong></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Riscontro allo scarico *</label>
            <input className="input" type="number" min="0" step="1" placeholder="0"
              value={riscontro} onChange={e => setRiscontro(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Differenza (calcolata)</label>
            <input className="input" readOnly value={riscontro !== '' ? diff : '—'}
              style={{ color: diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text3)' }} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Anomalia</label>
          <select className="input" value={anomalia} onChange={e => setAnomalia(e.target.value)}>
            <option value="">Nessuna</option>
            {ANOMALIE.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={save} disabled={loading || riscontro === ''}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Check size={13} /> Conferma scarico</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal: modifica scarico già registrato
function ModificaScaricatoModal({ movimento, corrNome, onClose, onSaved }) {
  const [riscontro, setRiscontro] = useState(String(movimento.riscontro_scarico ?? ''))
  const [anomalia, setAnomalia] = useState(movimento.anomalia || '')
  const [loading, setLoading] = useState(false)

  const diff = parseInt(movimento.affidati) - (parseInt(riscontro) || 0)

  const save = async () => {
    setLoading(true)
    const { error } = await supabase.from('movimenti_corrispondenti').update({
      riscontro_scarico: parseInt(riscontro) || 0,
      differenza: diff,
      anomalia: anomalia || null,
    }).eq('id', movimento.id)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Modifica scarico — {corrNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Movimento del {formatDate(movimento.data)}</div>
          <div>Affidati: <strong>{formatNum(movimento.affidati)}</strong> · Distinta: <strong>{movimento.distinta || '—'}</strong></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Riscontro scarico</label>
            <input className="input" type="number" min="0" step="1"
              value={riscontro} onChange={e => setRiscontro(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Differenza (calcolata)</label>
            <input className="input" readOnly value={riscontro !== '' ? diff : '—'}
              style={{ color: diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text3)' }} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Anomalia</label>
          <select className="input" value={anomalia} onChange={e => setAnomalia(e.target.value)}>
            <option value="">Nessuna</option>
            {ANOMALIE.map(a => <option key={a}>{a}</option>)}
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
  const [modal, setModal] = useState(null) // null | 'carico' | { type: 'scarica'|'modifica', mov }
  const { showToast, ToastComponent } = useToast()

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

  const afterSave = () => {
    setModal(null)
    loadMov()
    onRefresh()
    showToast('Salvato con successo!', 'success')
  }

  const saldo = corr.saldo_con_franchigia ?? corr.saldo_lordo ?? 0
  const diff = corr.differenza_totale || 0
  const franchigia = corr.franchigia_pct || 0
  const inTransito = corr.pallet_in_transito || 0
  const nessunVerbale = NESSUN_VERBALE.has(corr.nome)
  const sogliaAlert = franchigia > 0 && Math.abs(diff) > (saldo * franchigia) && saldo > 0

  return (
    <>
      {ToastComponent}
      {modal === 'carico' && (
        <NuovoCaricaModal corrId={corr.id} corrNome={corr.nome} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.type === 'scarica' && (
        <ScaricaModal movimento={modal.mov} corrNome={corr.nome} onClose={() => setModal(null)} onSaved={afterSave} />
      )}
      {modal?.type === 'modifica' && (
        <ModificaScaricatoModal movimento={modal.mov} corrNome={corr.nome} onClose={() => setModal(null)} onSaved={afterSave} />
      )}

      <tr style={{ cursor: 'pointer' }} onClick={toggleOpen}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            <span style={{ fontWeight: 500 }}>{corr.nome}</span>
            {nessunVerbale && <span className="badge badge-gray" style={{ fontSize: 10 }}>Nessun verbale</span>}
            {sogliaAlert && <AlertTriangle size={13} style={{ color: 'var(--red)' }} title="Differenza sopra franchigia" />}
          </div>
        </td>
        <td>
          <span className={`badge ${corr.tipo === 'trazionista' ? 'badge-purple' : 'badge-blue'}`}>
            {corr.tipo}
          </span>
        </td>
        <td className="num">
          <span className={saldo > 0 ? 'negative' : saldo < 0 ? 'positive' : 'neutral'}>
            {saldo !== 0 ? (saldo > 0 ? '+' : '') + formatNum(saldo) : '—'}
          </span>
        </td>
        <td className="num">
          {inTransito > 0
            ? <span style={{ color: 'var(--yellow)', fontWeight: 500 }}>{formatNum(inTransito)}</span>
            : <span style={{ color: 'var(--text3)' }}>—</span>
          }
        </td>
        <td className="num">
          <span style={{ color: diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text3)' }}>
            {diff !== 0 ? (diff > 0 ? '+' : '') + formatNum(diff) : '—'}
          </span>
        </td>
        <td>
          <span className={`badge ${franchigia > 0 ? 'badge-yellow' : 'badge-gray'}`}>
            {franchigia > 0 ? `${(franchigia * 100).toFixed(0)}%` : '0%'}
          </span>
        </td>
        <td onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('carico')}>
            <Plus size={12} /> Carico
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} style={{ padding: 0, background: 'var(--bg3)' }}>
            <div style={{ padding: '12px 20px 16px' }}>
              {corr.contatto && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>📧 {corr.contatto}</div>}
              {movimenti.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>Nessun movimento registrato</div>
              ) : (
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Stato</th>
                      <th>Data</th>
                      <th>Distinta</th>
                      <th className="num">Affidati</th>
                      <th className="num">Riscontro</th>
                      <th className="num">Diff.</th>
                      <th>Anomalia</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map(m => (
                      <tr key={m.id}>
                        <td>
                          {m.stato === 'in_transito'
                            ? <span className="badge badge-yellow" style={{ fontSize: 10 }}>In transito</span>
                            : <span className="badge badge-green" style={{ fontSize: 10 }}>Scaricato</span>
                          }
                        </td>
                        <td className="mono">{formatDate(m.data)}</td>
                        <td style={{ color: 'var(--text3)' }}>{m.distinta || '—'}</td>
                        <td className="num">{formatNum(m.affidati)}</td>
                        <td className="num">{m.riscontro_scarico != null ? formatNum(m.riscontro_scarico) : '—'}</td>
                        <td className="num">
                          {m.stato === 'scaricato'
                            ? <span style={{ color: (m.differenza || 0) > 0 ? 'var(--red)' : (m.differenza || 0) < 0 ? 'var(--green)' : 'var(--text3)' }}>
                              {(m.differenza || 0) !== 0 ? ((m.differenza || 0) > 0 ? '+' : '') + formatNum(m.differenza) : '—'}
                            </span>
                            : <span style={{ color: 'var(--text3)' }}>—</span>
                          }
                        </td>
                        <td>
                          {m.anomalia ? <span className="badge badge-yellow">{m.anomalia}</span> : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {m.stato === 'in_transito' && !nessunVerbale && (
                              <button className="btn btn-ghost btn-sm"
                                style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}
                                onClick={() => setModal({ type: 'scarica', mov: m })}>
                                Scarica
                              </button>
                            )}
                            {m.stato === 'scaricato' && (
                              <button className="btn btn-ghost btn-sm"
                                onClick={() => setModal({ type: 'modifica', mov: m })}>
                                <Edit2 size={11} />
                              </button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => deleteMov(m.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
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
                <th className="num">In transito</th>
                <th className="num">Differenza</th>
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
