import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportClientiExcel, exportCorrispondentiExcel, importExcelClienti } from '../lib/excel'
import { Download, Upload, Package, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useToast } from '../hooks/useToast.jsx'
import { formatDate, formatNum } from '../lib/excel'

export default function ExportImport() {
  const [loading, setLoading] = useState({})
  const [inventario, setInventario] = useState([])
  const [nuovoInv, setNuovoInv] = useState({ data: new Date().toISOString().split('T')[0], quantita: '', note: '' })
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    supabase.from('inventario').select('*').order('data', { ascending: false }).limit(10)
      .then(({ data }) => setInventario(data || []))
  }, [])

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  const handleExportClienti = async () => {
    setLoad('clienti', true)
    try {
      const [{ data: clienti }, { data: movimenti }] = await Promise.all([
        supabase.from('saldi_clienti').select('*').order('nome'),
        supabase.from('movimenti_clienti').select('*'),
      ])
      exportClientiExcel(clienti || [], movimenti || [])
      showToast('Export clienti completato!')
    } catch (e) { showToast('Errore export: ' + e.message, 'error') }
    setLoad('clienti', false)
  }

  const handleExportCorrispondenti = async () => {
    setLoad('corr', true)
    try {
      const [{ data: corr }, { data: movimenti }] = await Promise.all([
        supabase.from('saldi_corrispondenti').select('*').order('nome'),
        supabase.from('movimenti_corrispondenti').select('*'),
      ])
      exportCorrispondentiExcel(corr || [], movimenti || [])
      showToast('Export corrispondenti completato!')
    } catch (e) { showToast('Errore export: ' + e.message, 'error') }
    setLoad('corr', false)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoad('import', true)
    try {
      const result = await importExcelClienti(file)
      showToast(`Importati ${result.movimenti.length} movimenti da ${result.clienti.length} clienti. Verifica i dati prima di procedere.`, 'success')
    } catch (err) {
      showToast('Errore importazione: ' + err.message, 'error')
    }
    setLoad('import', false)
    e.target.value = ''
  }

  const salvaInventario = async () => {
    if (!nuovoInv.quantita) return
    const { error } = await supabase.from('inventario').insert({
      data: nuovoInv.data,
      quantita: parseInt(nuovoInv.quantita),
      note: nuovoInv.note || null,
    })
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    showToast('Inventario salvato!')
    setNuovoInv({ data: new Date().toISOString().split('T')[0], quantita: '', note: '' })
    const { data } = await supabase.from('inventario').select('*').order('data', { ascending: false }).limit(10)
    setInventario(data || [])
  }

  return (
    <div>
      {ToastComponent}
      <div className="page-header">
        <div>
          <div className="page-title">Esporta / Importa</div>
          <div className="page-subtitle">Gestione file Excel e inventario settimanale</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Export */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Download size={18} style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Esporta Excel</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
            Scarica i file Excel aggiornati con tutti i dati del database. Stessa struttura dei file originali.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleExportClienti} disabled={loading.clienti}
              style={{ justifyContent: 'center' }}>
              {loading.clienti ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generazione...</> : <><Download size={14} /> EPAL_CLIENTI.xlsx</>}
            </button>
            <button className="btn btn-ghost" onClick={handleExportCorrispondenti} disabled={loading.corr}
              style={{ justifyContent: 'center' }}>
              {loading.corr ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generazione...</> : <><Download size={14} /> EPAL_CORRISPONDENTI.xlsx</>}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Upload size={18} style={{ color: 'var(--green)' }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Importa da Excel</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
            Carica un file Excel aggiornato. I dati vengono analizzati e mostrati per verifica prima dell'importazione.
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="btn btn-ghost" style={{ justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => document.getElementById('file-import').click()}>
              {loading.import ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Analisi in corso...</> : <><Upload size={14} /> Seleziona file Excel</>}
            </div>
            <input id="file-import" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 6, fontSize: 12, color: 'var(--text3)' }}>
            ⚠️ Funzionalità in sviluppo — verifica sempre i dati prima di confermare l'importazione
          </div>
        </div>

        {/* Inventario */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={18} style={{ color: 'var(--purple)' }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Inventario settimanale</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
            Registra il conteggio fisico dei pallet in magazzino ogni settimana.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="input" type="date" value={nuovoInv.data}
              onChange={e => setNuovoInv({...nuovoInv, data: e.target.value})} style={{ flex: 1 }} />
            <input className="input" type="number" min="0" placeholder="Quantità" value={nuovoInv.quantita}
              onChange={e => setNuovoInv({...nuovoInv, quantita: e.target.value})} style={{ flex: 1 }} />
          </div>
          <input className="input" placeholder="Note (opzionale)" value={nuovoInv.note}
            onChange={e => setNuovoInv({...nuovoInv, note: e.target.value})} style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" onClick={salvaInventario} style={{ width: '100%', justifyContent: 'center' }}>
            <CheckCircle size={14} /> Salva inventario
          </button>

          {inventario.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Ultimi rilevamenti
              </div>
              {inventario.slice(0, 5).map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{formatDate(inv.data)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{formatNum(inv.quantita)} pz</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
