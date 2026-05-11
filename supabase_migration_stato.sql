-- ============================================================
-- MIGRAZIONE: stato movimenti_corrispondenti + viste aggiornate
-- Esegui questo script in Supabase > SQL Editor
-- ============================================================

-- 1. Aggiunge colonna stato a movimenti_corrispondenti
ALTER TABLE movimenti_corrispondenti
ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'in_transito';

-- 2. Aggiorna i movimenti esistenti: se hanno riscontro_scarico → scaricato
UPDATE movimenti_corrispondenti
SET stato = 'scaricato'
WHERE riscontro_scarico IS NOT NULL AND stato = 'in_transito';

-- 3. Normalizza franchigia_pct corrispondenti da intero (5) a decimale (0.05)
UPDATE corrispondenti
SET franchigia_pct = franchigia_pct / 100
WHERE franchigia_pct > 1;

-- 4. Vista saldi_corrispondenti: saldo solo su movimenti scaricati + pallet_in_transito
DROP VIEW IF EXISTS saldi_corrispondenti;
CREATE VIEW saldi_corrispondenti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.franchigia_pct,
  c.tipo,
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.affidati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN COALESCE(m.riscontro_scarico, m.ricevuti) ELSE 0 END), 0) AS saldo_lordo,
  ROUND(
    (COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.affidati ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN COALESCE(m.riscontro_scarico, m.ricevuti) ELSE 0 END), 0))
    * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  COALESCE(SUM(CASE WHEN m.stato = 'scaricato' THEN m.differenza ELSE 0 END), 0) AS differenza_totale,
  COALESCE(SUM(CASE WHEN m.stato = 'in_transito' THEN m.affidati ELSE 0 END), 0) AS pallet_in_transito
FROM corrispondenti c
LEFT JOIN movimenti_corrispondenti m ON c.id = m.corrispondente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.franchigia_pct, c.tipo;

GRANT SELECT ON saldi_corrispondenti TO authenticated;

-- 5. Vista saldi_clienti: include detrazioni quantita_anomalia
DROP VIEW IF EXISTS saldi_clienti;
CREATE VIEW saldi_clienti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.a_perdere,
  c.costo_epal,
  c.franchigia_pct,
  COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(m.consegnati), 0) -
  COALESCE(SUM(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN m.quantita_anomalia ELSE 0 END), 0) AS saldo,
  ROUND(
    (COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(m.consegnati), 0) -
     COALESCE(SUM(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN m.quantita_anomalia ELSE 0 END), 0))
    * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  COUNT(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN 1 END) AS anomalie_aperte
FROM clienti c
LEFT JOIN movimenti_clienti m ON c.id = m.cliente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.a_perdere, c.costo_epal, c.franchigia_pct;

GRANT SELECT ON saldi_clienti TO authenticated;
