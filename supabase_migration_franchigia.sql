-- ============================================================
-- MIGRAZIONE: aggiunta franchigia_pct a clienti + viste aggiornate
-- Esegui questo script in Supabase > SQL Editor
-- ============================================================

-- 1. Aggiungi colonna franchigia_pct alla tabella clienti
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS franchigia_pct NUMERIC DEFAULT 0;

-- 2. Aggiorna default costo_epal (era 10, il valore reale è per lo più 1)
ALTER TABLE clienti ALTER COLUMN costo_epal SET DEFAULT 1;

-- 3. Aggiorna vista saldi_clienti: aggiunge saldo_con_franchigia
CREATE OR REPLACE VIEW saldi_clienti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.a_perdere,
  c.costo_epal,
  c.franchigia_pct,
  COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(m.consegnati), 0) AS saldo,
  ROUND(
    (COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(m.consegnati), 0)) * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  COUNT(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN 1 END) AS anomalie_aperte
FROM clienti c
LEFT JOIN movimenti_clienti m ON c.id = m.cliente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.a_perdere, c.costo_epal, c.franchigia_pct;

-- 4. Aggiorna vista saldi_corrispondenti: aggiunge saldo_con_franchigia
CREATE OR REPLACE VIEW saldi_corrispondenti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.franchigia_pct,
  c.tipo,
  COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(COALESCE(m.riscontro_scarico, m.ricevuti)), 0) AS saldo_lordo,
  ROUND(
    (COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(COALESCE(m.riscontro_scarico, m.ricevuti)), 0)) * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  COALESCE(SUM(m.differenza), 0) AS differenza_totale
FROM corrispondenti c
LEFT JOIN movimenti_corrispondenti m ON c.id = m.corrispondente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.franchigia_pct, c.tipo;
