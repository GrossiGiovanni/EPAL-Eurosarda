import * as XLSX from 'xlsx'

export function exportClientiExcel(clienti, movimenti) {
  const wb = XLSX.utils.book_new()

  // Foglio INDICE
  const indiceData = [
    ['', 'CLIENTI', 'SALDO'],
    ...clienti.map(c => ['', c.nome, c.a_perdere ? 'A PERDERE' : (c.saldo ?? 0)])
  ]
  const wsIndice = XLSX.utils.aoa_to_sheet(indiceData)
  XLSX.utils.book_append_sheet(wb, wsIndice, 'INDICE')

  // Un foglio per ogni cliente
  clienti.filter(c => !c.a_perdere).forEach(cliente => {
    const movCliente = movimenti.filter(m => m.cliente_id === cliente.id)
      .sort((a, b) => new Date(a.data) - new Date(b.data))

    const saldoLordo = cliente.saldo ?? 0
    const franchigia = cliente.franchigia_pct ?? 0
    const saldoCF = Math.round(saldoLordo * (1 - franchigia) * 100) / 100
    const rows = [
      [' DATA', `CONSEGNATI A ${cliente.nome}`, 'AFFIDATI AD EUROSARDA', 'ANOMALIA', 'N.', 'RIF.', 'FATTURATO'],
      ...movCliente.map(m => [
        m.data,
        m.consegnati || null,
        m.affidati || null,
        m.anomalia || null,
        m.quantita_anomalia || null,
        m.riferimento || null,
        m.fatturato ? 'SI' : null
      ]),
      [],
      ['', '', '', '', '', '', '', '', '', 'CODICE', cliente.codice || '', '', 'BACK', null],
      ['', '', '', '', '', '', '', '', '', 'SALDO', saldoLordo, '', 'CONTATTO', cliente.contatto || ''],
      ['', '', '', '', '', '', '', '', '', 'FRANCHIGIA', franchigia || null],
      ['', '', '', '', '', '', '', '', '', 'EURO/EPAL', cliente.costo_epal || null],
      ['', '', '', '', '', '', '', '', '', 'POLMONE', null],
      ['', '', '', '', '', '', '', '', '', 'SALDO CON FRANCHIGIA', saldoCF],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const sheetName = cliente.nome.substring(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  XLSX.writeFile(wb, `EPAL_CLIENTI_${formatDateFile()}.xlsx`)
}

export function exportCorrispondentiExcel(corrispondenti, movimenti) {
  const wb = XLSX.utils.book_new()

  // Foglio INDICE
  const corrList = corrispondenti.filter(c => c.tipo === 'corrispondente')
  const trazList = corrispondenti.filter(c => c.tipo === 'trazionista')
  const maxLen = Math.max(corrList.length, trazList.length)

  const indiceRows = [['', 'CORRISPONDENTI', 'SALDO', '', '', '', '', '', 'TRAZIONISTI', 'SALDO']]
  for (let i = 0; i < maxLen; i++) {
    indiceRows.push([
      '',
      corrList[i]?.nome || '',
      corrList[i]?.saldo ?? '',
      '', '', '', '', '',
      trazList[i]?.nome || '',
      trazList[i]?.saldo ?? ''
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(indiceRows), 'INDICE')

  corrispondenti.forEach(corr => {
    const movCorr = movimenti.filter(m => m.corrispondente_id === corr.id)
      .sort((a, b) => new Date(a.data) - new Date(b.data))

    const rows = [
      ['DATA', 'TARGA/DISTINTA', `AFFIDATI A ${corr.nome}`, 'RICEVUTI A EUROSARDA MI', 'RISCONTRO ALLO SCARICO', 'DIFFERENZA', '', '', 'CODICE', corr.codice || '', '', 'CONTATTO', corr.contatto || ''],
      ...movCorr.map(m => [
        m.data, m.distinta || null, m.affidati || null,
        m.ricevuti || null, m.riscontro_scarico || null,
        m.differenza || null
      ]),
      [],
      ['', '', '', '', '', '', '', 'SALDO', corr.saldo ?? 0]
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, corr.nome.substring(0, 31))
  })

  XLSX.writeFile(wb, `EPAL_CORRISPONDENTI_${formatDateFile()}.xlsx`)
}

export function importExcelClienti(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const result = { clienti: [], movimenti: [] }

        wb.SheetNames.filter(n => n !== 'INDICE' && n !== 'EPALAPERDERE').forEach(sheetName => {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

          let saldo = null, codice = null, contatto = null, franchigia = null, euroEpal = null
          const movimenti = []

          rows.forEach(row => {
            if (!row) return
            // Leggi tutti i campi metadata cercando le chiavi nella riga
            for (let i = 0; i < row.length; i++) {
              if (row[i] === 'SALDO' && row[i + 1] != null) saldo = row[i + 1]
              if (row[i] === 'CODICE' && row[i + 1] != null) codice = row[i + 1]
              if (row[i] === 'CONTATTO' && row[i + 1] != null) contatto = row[i + 1]
              if (row[i] === 'FRANCHIGIA' && row[i + 1] != null) franchigia = row[i + 1]
              if (row[i] === 'EURO/EPAL' && row[i + 1] != null) euroEpal = row[i + 1]
            }

            // Riga dati: ha una data (Date o stringa con anno) nella prima colonna
            const isDate = row[0] instanceof Date ||
              (typeof row[0] === 'string' && row[0].match(/^\d{4}-\d{2}-\d{2}/))
            if (isDate) {
              const data = row[0] instanceof Date ? row[0].toISOString().split('T')[0] : row[0]
              const consegnati = Number(row[1]) || 0
              const affidati = Number(row[2]) || 0
              if (data && (consegnati > 0 || affidati > 0)) {
                movimenti.push({
                  data,
                  consegnati,
                  affidati,
                  anomalia: row[3] || null,
                  quantita_anomalia: Number(row[4]) || 0,
                  riferimento: row[5] ? String(row[5]) : null,
                })
              }
            }
          })

          result.clienti.push({
            nome: sheetName,
            codice: codice != null ? Number(codice) : null,
            contatto: contatto != null ? String(contatto) : null,
            franchigia_pct: franchigia != null ? Number(franchigia) : null,
            costo_epal: euroEpal != null ? Number(euroEpal) : null,
            saldo_importato: saldo,
          })
          result.movimenti.push(...movimenti.map(m => ({ ...m, _cliente: sheetName })))
        })

        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function formatDateFile() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatNum(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('it-IT')
}
