-- ============================================================
-- FIX: differenza_totale corrispondenti coerente con saldo_lordo
-- Il valore stored in m.differenza poteva essere errato (import Excel)
-- Ora viene ricalcolato dinamicamente: affidati - riscontro
-- Esegui in Supabase > SQL Editor
-- ============================================================

DROP VIEW IF EXISTS saldi_corrispondenti;
CREATE VIEW saldi_corrispondenti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.franchigia_pct,
  c.tipo,
  -- saldo_lordo = somma differenze movimenti scaricati
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.affidati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN COALESCE(m.riscontro_scarico, m.ricevuti) ELSE 0 END), 0) AS saldo_lordo,
  -- saldo_con_franchigia = saldo_lordo * (1 - franchigia)
  ROUND(
    (COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.affidati ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN COALESCE(m.riscontro_scarico, m.ricevuti) ELSE 0 END), 0))
    * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  -- differenza_totale = ricalcolato (NON usa più la colonna m.differenza, che poteva essere sporca)
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.affidati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN COALESCE(m.riscontro_scarico, m.ricevuti) ELSE 0 END), 0) AS differenza_totale,
  COALESCE(SUM(CASE WHEN m.stato = 'in_transito' THEN m.affidati ELSE 0 END), 0) AS pallet_in_transito
FROM corrispondenti c
LEFT JOIN movimenti_corrispondenti m ON c.id = m.corrispondente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.franchigia_pct, c.tipo;

GRANT SELECT ON saldi_corrispondenti TO authenticated;

-- Allinea anche i valori stored in m.differenza con il calcolo corretto
-- (utile per la storia / dettaglio movimento)
UPDATE movimenti_corrispondenti
SET differenza = affidati - COALESCE(riscontro_scarico, ricevuti, 0)
WHERE stato = 'scaricato';
