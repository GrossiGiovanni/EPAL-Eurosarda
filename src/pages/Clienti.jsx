import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatNum } from '../lib/excel'
import { Plus, Search, ChevronDown, ChevronUp, Edit2, Trash2, AlertCircle, X, Check, AlertTriangle, Truck } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'

const ANOMALIE = ['EPAL ROTTO', 'NON-EPAL', 'EPAL NON RESO', 'EPAL NON CONFORME']

function MovimentoModal({ clienteId, clienteNome, movimento, onClose, onSaved }) {
  const isEdit = !!movimento
  const [form, setForm] = useState(isEdit ? {
    data: movimento.data,
    consegnati: String(movimento.consegnati || ''),
    affidati: String(movimento.affidati || ''),
    anomalia: movimento.anomalia || '',
    quantita_anomalia: String(movimento.quantita_anomalia || ''),
    riferimento: movimento.riferimento || '',
    stato: movimento.stato || 'confermato',
  } : {
    data: new Date().toISOString().split('T')[0],
    consegnati: '', affidati: '', anomalia: '', quantita_anomalia: '', riferimento: '',
    stato: 'confermato',
  })
  const [loading, setLoading] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const save = async () => {
    if (!form.data) return
    setLoading(true)
    const payload = {
      data: form.data,
      consegnati: parseInt(form.consegnati) || 0,
      affidati: parseInt(form.affidati) || 0,
      anomalia: form.anomalia || null,
      quantita_anomalia: parseInt(form.quantita_anomalia) || 0,
      riferimento: form.riferimento || null,
      stato: form.stato,
    }
    const { error } = isEdit
      ? await supabase.from('movimenti_clienti').update(payload).eq('id', movimento.id)
      : await supabase.from('movimenti_clienti').insert({ ...payload, cliente_id: clienteId })
    setLoading(false)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {ToastComponent}
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{isEdit ? 'Modifica movimento' : 'Nuovo movimento'} — {clienteNome}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Riferimento / Distinta</label>
            <input className="input" placeholder="es. 3215" value={form.riferimento} onChange={e => setForm({ ...form, riferimento: e.target.value })} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Consegnati a noi (resi)</label>
            <input className="input" type="number" min="0" step="1" placeholder="0"
              value={form.consegnati} onChange={e => setForm({ ...form, consegnati: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Affidati a Eurosarda</label>
            <input className="input" type="number" min="0" step="1" placeholder="0"
              value={form.affidati} onChange={e => setForm({ ...form, affidati: e.target.value })} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Anomalia</label>
            <select className="input" value={form.anomalia} onChange={e => setForm({ ...form, anomalia: e.target.value })}>
              <option value="">Nessuna</option>
              {ANOMALIE.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantità anomalia</label>
            <input className="input" type="number" min="0" step="1" placeholder="0"
              value={form.quantita_anomalia} onChange={e => setForm({ ...form, quantita_anomalia: e.target.value })} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Stato</label>
            <select className="input" value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}>
              <option value="confermato">Confermato (incluso nel saldo)</option>
              <option value="in_transito">In transito (escluso dal saldo)</option>
            </select>
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
  const [modal, setModal] = useState(null) // null | 'nuovo' | movimento (per edit)
  const [editingAlert, setEditingAlert] = useState(false)
  const [alertNote, setAlertNote] = useState(cliente.alert_note || '')
  const [sogliaMax, setSogliaMax] = useState(cliente.soglia_max ?? '')
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

  const afterSave = () => {
    setModal(null)
    loadMovimenti()
    onRefresh()
    showToast('Salvato con successo!', 'success')
  }

  const saldo = cliente.saldo_con_franchigia ?? cliente.saldo ?? 0
  const euroEpal = cliente.costo_epal || 1
  // saldo < 0: il cliente ci deve pallet (credito nostro) → valore fatturabile
  const valoreFatturabile = Math.abs(Math.min(0, saldo)) * euroEpal
  const pallInTransito = cliente.pallet_in_transito || 0
  const sogliaSuperata = cliente.soglia_max && saldo >= cliente.soglia_max
  const hasAlert = (cliente.alert_note && cliente.alert_note.trim()) || sogliaSuperata

  const saveAlert = async () => {
    const { error } = await supabase.from('clienti').update({
      alert_note: alertNote.trim() || null,
      soglia_max: sogliaMax === '' ? null : parseInt(sogliaMax),
    }).eq('id', cliente.id)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    setEditingAlert(false)
    onRefresh()
    showToast('Alert aggiornato', 'success')
  }

  return (
    <>
      {ToastComponent}
      {modal === 'nuovo' && (
        <MovimentoModal
          clienteId={cliente.id}
          clienteNome={cliente.nome}
          onClose={() => setModal(null)}
          onSaved={afterSave}
        />
      )}
      {modal && modal !== 'nuovo' && (
        <MovimentoModal
          clienteId={cliente.id}
          clienteNome={cliente.nome}
          movimento={modal}
          onClose={() => setModal(null)}
          onSaved={afterSave}
        />
      )}
      <tr style={{ cursor: 'pointer' }} onClick={toggleOpen}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            <span style={{ fontWeight: 500 }}>{cliente.nome}</span>
            {sogliaSuperata && (
              <AlertTriangle size={13} style={{ color: 'var(--red, #ef4444)' }} title={`Soglia superata: ${cliente.soglia_max}`} />
            )}
            {hasAlert && !sogliaSuperata && (
              <AlertCircle size={13} style={{ color: 'var(--yellow)' }} title={cliente.alert_note} />
            )}
            {(cliente.anomalie_aperte || 0) > 0 && (
              <AlertCircle size={13} style={{ color: 'var(--yellow)' }} />
            )}
            {pallInTransito > 0 && (
              <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Truck size={10} /> {formatNum(pallInTransito)} in transito
              </span>
            )}
          </div>
        </td>
        <td className="mono" style={{ color: 'var(--text3)', fontSize: 12 }}>{cliente.codice || '—'}</td>
        <td className="num">
          <span className={saldo < 0 ? 'positive' : saldo > 0 ? 'neutral' : 'neutral'}>
            {saldo !== 0 ? (saldo > 0 ? '+' : '') + formatNum(saldo) : '—'}
          </span>
        </td>
        <td className="num" style={{ color: 'var(--text2)' }}>
          {saldo < 0 ? `€ ${formatNum(valoreFatturabile)}` : saldo > 0 ? `${formatNum(saldo)} pz` : '—'}
        </td>
        <td>
          {sogliaSuperata ? (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠ Soglia {cliente.soglia_max}
            </span>
          ) : (
            <span className={`badge ${saldo > 0 ? 'badge-blue' : saldo < 0 ? 'badge-green' : 'badge-gray'}`}>
              {saldo > 0 ? 'Debito nostro' : saldo < 0 ? 'Credito nostro' : 'Pari'}
            </span>
          )}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('nuovo')}>
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

              {/* Alert / soglia editor */}
              <div style={{
                background: hasAlert ? 'rgba(239,68,68,0.06)' : 'var(--bg2)',
                border: `1px solid ${hasAlert ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }}>
                {!editingAlert ? (
                  <>
                    <AlertTriangle size={14} style={{ color: hasAlert ? '#ef4444' : 'var(--text3)' }} />
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>
                      {cliente.alert_note ? (
                        <span><b>Nota:</b> {cliente.alert_note}</span>
                      ) : (
                        <span style={{ color: 'var(--text3)' }}>Nessuna nota</span>
                      )}
                      {cliente.soglia_max != null && (
                        <span style={{ marginLeft: 12, color: 'var(--text3)' }}>
                          · Soglia max: <b style={{ color: sogliaSuperata ? '#ef4444' : 'var(--text2)' }}>{cliente.soglia_max}</b>
                        </span>
                      )}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingAlert(true)}>
                      <Edit2 size={11} /> Modifica
                    </button>
                  </>
                ) : (
                  <>
                    <input className="input" placeholder="Nota alert (es. Mandare bancali)" value={alertNote}
                      onChange={e => setAlertNote(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                    <input className="input" type="number" placeholder="Soglia" value={sogliaMax}
                      onChange={e => setSogliaMax(e.target.value)} style={{ width: 100 }} />
                    <button className="btn btn-primary btn-sm" onClick={saveAlert}>
                      <Check size={11} /> Salva
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setAlertNote(cliente.alert_note || ''); setSogliaMax(cliente.soglia_max ?? ''); setEditingAlert(false)
                    }}>
                      <X size={11} />
                    </button>
                  </>
                )}
              </div>

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
                      <th>Stato</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map(m => (
                      <tr key={m.id} style={m.stato === 'in_transito' ? { background: 'rgba(245,200,66,0.04)' } : undefined}>
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
                          {m.stato === 'in_transito' ? (
                            <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Truck size={10} /> In transito
                            </span>
                          ) : (
                            <span className="badge badge-gray">Confermato</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(m)}>
                              <Edit2 size={11} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteMovimento(m.id)}>
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

  const getSaldo = c => c.saldo_con_franchigia ?? c.saldo ?? 0

  const filtered = clienti.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase())
    if (tab === 'attivi') return matchSearch && !c.a_perdere && getSaldo(c) !== 0
    if (tab === 'tutti') return matchSearch && !c.a_perdere
    if (tab === 'anomalie') return matchSearch && (c.anomalie_aperte || 0) > 0
    if (tab === 'perdere') return matchSearch && c.a_perdere
    return matchSearch
  })

  const totSaldo = clienti.filter(c => !c.a_perdere).reduce((s, c) => s + Math.max(0, getSaldo(c)), 0)
  // clienti con saldo attivo (debito nostro > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clienti</div>
          <div className="page-subtitle">
            {clienti.filter(c => !c.a_perdere && getSaldo(c) > 0).length} clienti con saldo attivo · Totale: {formatNum(totSaldo)} pallet in debito
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="input" placeholder="Cerca cliente..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
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
                <th className="num">Valore / Quantità</th>
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
