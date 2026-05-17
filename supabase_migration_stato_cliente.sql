-- ============================================================
-- MIGRAZIONE: stato movimenti_clienti + link cliente↔corrispondente
--             + alert_note + soglia_max + viste aggiornate
-- Esegui questo script in Supabase > SQL Editor
-- ============================================================

-- 1. Aggiunge colonna stato a movimenti_clienti
--    in_transito = movimento registrato ma non ancora confermato (es. autista non scaricato)
--    confermato  = movimento ufficialmente chiuso (default per movimenti storici)
ALTER TABLE movimenti_clienti
ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'confermato';

UPDATE movimenti_clienti
SET stato = 'confermato'
WHERE stato IS NULL;

-- 2. Aggiunge cliente_id a movimenti_corrispondenti (link anomalia → cliente finale)
ALTER TABLE movimenti_corrispondenti
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clienti(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimenti_corr_cliente_id
ON movimenti_corrispondenti(cliente_id);

-- 3. Aggiunge alert_note e soglia_max a clienti
ALTER TABLE clienti
ADD COLUMN IF NOT EXISTS alert_note TEXT;

ALTER TABLE clienti
ADD COLUMN IF NOT EXISTS soglia_max INTEGER;

-- 4. Dati iniziali alert
UPDATE clienti SET soglia_max = 200 WHERE nome = 'BISI CUSAGO';
UPDATE clienti SET alert_note = 'Mandare bancali' WHERE nome = 'MAGIS CORSICO';

-- 5. Vista saldi_clienti aggiornata:
--    - saldo solo da movimenti 'confermato'
--    - pallet_in_transito = somma affidati 'in_transito'
--    - espone alert_note e soglia_max
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
  c.alert_note,
  c.soglia_max,
  COALESCE(SUM(CASE WHEN m.stato = 'confermato' THEN m.affidati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'confermato' THEN m.consegnati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'confermato' AND m.anomalia IS NOT NULL AND m.anomalia != ''
               THEN m.quantita_anomalia ELSE 0 END), 0) AS saldo,
  ROUND(
    (COALESCE(SUM(CASE WHEN m.stato = 'confermato' THEN m.affidati ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN m.stato = 'confermato' THEN m.consegnati ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN m.stato = 'confermato' AND m.anomalia IS NOT NULL AND m.anomalia != ''
                  THEN m.quantita_anomalia ELSE 0 END), 0))
    * (1 - COALESCE(c.franchigia_pct, 0)),
    2
  ) AS saldo_con_franchigia,
  COUNT(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN 1 END) AS anomalie_aperte,
  COALESCE(SUM(CASE WHEN m.stato = 'in_transito' THEN m.affidati ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.stato = 'in_transito' THEN m.consegnati ELSE 0 END), 0) AS pallet_in_transito
FROM clienti c
LEFT JOIN movimenti_clienti m ON c.id = m.cliente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.a_perdere, c.costo_epal,
         c.franchigia_pct, c.alert_note, c.soglia_max;

GRANT SELECT ON saldi_clienti TO authenticated;
