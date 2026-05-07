-- ============================================================
-- SCHEMA EPAL EUROSARDA
-- Esegui questo script in Supabase > SQL Editor
-- ============================================================

-- ANAGRAFICA CLIENTI
CREATE TABLE clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codice INTEGER,
  contatto TEXT,
  a_perdere BOOLEAN DEFAULT FALSE,
  costo_epal NUMERIC DEFAULT 10,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOVIMENTI CLIENTI
CREATE TABLE movimenti_clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clienti(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  consegnati INTEGER DEFAULT 0,      -- resi dal cliente a noi
  affidati INTEGER DEFAULT 0,        -- affidati a Eurosarda (noi li abbiamo)
  anomalia TEXT,
  quantita_anomalia INTEGER DEFAULT 0,
  riferimento TEXT,
  fatturato BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANAGRAFICA CORRISPONDENTI
CREATE TABLE corrispondenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codice INTEGER,
  contatto TEXT,
  franchigia_pct NUMERIC DEFAULT 0,  -- 0 o 5
  tipo TEXT DEFAULT 'corrispondente', -- 'corrispondente' | 'trazionista'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOVIMENTI CORRISPONDENTI
CREATE TABLE movimenti_corrispondenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrispondente_id UUID REFERENCES corrispondenti(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  distinta TEXT,
  affidati INTEGER DEFAULT 0,         -- affidati al corrispondente
  ricevuti INTEGER DEFAULT 0,         -- ritornati a Eurosarda MI
  riscontro_scarico INTEGER,          -- verificato allo scarico
  differenza INTEGER DEFAULT 0,
  anomalia TEXT,
  riferimento TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUONI EPAL
CREATE TABLE buoni_epal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  corrispondente_id UUID REFERENCES corrispondenti(id),
  cliente_id UUID REFERENCES clienti(id),
  quantita INTEGER NOT NULL,
  tipo TEXT DEFAULT 'ricevuto',       -- 'ricevuto' | 'emesso'
  stato TEXT DEFAULT 'aperto',        -- 'aperto' | 'ritirato' | 'stornato'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EPAL A PERDERE (tracking separato)
CREATE TABLE epal_a_perdere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  cliente_nome TEXT NOT NULL,
  quantita INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTARIO SETTIMANALE
CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  quantita INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (abilita autenticazione)
-- ============================================================
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimenti_clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrispondenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimenti_corrispondenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE buoni_epal ENABLE ROW LEVEL SECURITY;
ALTER TABLE epal_a_perdere ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

-- Policy: accesso solo utenti autenticati
CREATE POLICY "Autenticati leggono tutto" ON clienti FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON movimenti_clienti FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON corrispondenti FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON movimenti_corrispondenti FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON buoni_epal FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON epal_a_perdere FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticati leggono tutto" ON inventario FOR ALL TO authenticated USING (true);

-- ============================================================
-- VISTE UTILI
-- ============================================================

-- Saldo corrente per cliente
CREATE OR REPLACE VIEW saldi_clienti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.a_perdere,
  c.costo_epal,
  COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(m.consegnati), 0) AS saldo,
  COUNT(CASE WHEN m.anomalia IS NOT NULL AND m.anomalia != '' THEN 1 END) AS anomalie_aperte
FROM clienti c
LEFT JOIN movimenti_clienti m ON c.id = m.cliente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.a_perdere, c.costo_epal;

-- Saldo corrente per corrispondente
CREATE OR REPLACE VIEW saldi_corrispondenti AS
SELECT
  c.id,
  c.nome,
  c.codice,
  c.contatto,
  c.franchigia_pct,
  c.tipo,
  COALESCE(SUM(m.affidati), 0) - COALESCE(SUM(COALESCE(m.riscontro_scarico, m.ricevuti)), 0) AS saldo_lordo,
  COALESCE(SUM(m.differenza), 0) AS differenza_totale
FROM corrispondenti c
LEFT JOIN movimenti_corrispondenti m ON c.id = m.corrispondente_id
GROUP BY c.id, c.nome, c.codice, c.contatto, c.franchigia_pct, c.tipo;

-- ============================================================
-- DATI INIZIALI — CORRISPONDENTI
-- ============================================================
INSERT INTO corrispondenti (nome, codice, contatto, franchigia_pct, tipo) VALUES
  ('TMD', 8386, 'amministrazione@tmdlogistics.it', 0, 'corrispondente'),
  ('STM', 118, 'operativo@stmweb.eu', 0, 'corrispondente'),
  ('DM', 8687, 'info@dmtrasporti.it', 0, 'corrispondente'),
  ('ITEX', 8782, 'domenico@itexline.it', 0, 'corrispondente'),
  ('SAVISE RG', 7793, 'milena.tumino@saviseexpress.it', 5, 'corrispondente'),
  ('SAVISE PA', 7797, 'beppe.lonigro@saviseexpress.it', 5, 'corrispondente'),
  ('SAVISE CT', 7798, 'operativoct@saviseexpress.it', 5, 'corrispondente'),
  ('SAVISE CL', 7795, 'comunicazionicl@saviseexpress.it', 5, 'corrispondente'),
  ('CANNONE', 8256, 'italtrasporti@cannone.info', 0, 'trazionista'),
  ('SALAMONE', NULL, 'bollettazione@salamonegroup.it', 0, 'trazionista'),
  ('CAGLIARI', NULL, NULL, 0, 'corrispondente'),
  ('SASSARI', NULL, 'paolo.muresu@gelogistica.it', 0, 'corrispondente'),
  ('OLBIA', NULL, NULL, 0, 'corrispondente');

-- ============================================================
-- DATI INIZIALI — CLIENTI (saldi al 07/05/2026)
-- ============================================================
INSERT INTO clienti (nome, codice, contatto, a_perdere, costo_epal) VALUES
  ('ANGELO FINESSO', 5970, 'mi.bancali@finesso.it', false, 10),
  ('ARCADIA SETTALA', 7046, NULL, false, 10),
  ('ART PLAST', 6477, NULL, false, 10),
  ('AVS', 7036, NULL, false, 10),
  ('BERTONI', 5764, 'aleandro.novelli@autotrasportibertoni.com', false, 10),
  ('BISI CUSAGO', 6972, 'assistenza@bisilogistica.it', false, 10),
  ('CARTIERA DI VARESE', 6989, NULL, false, 10),
  ('CEVA LOGISTICS', NULL, 'Franceschina.Frascolla@Cevalogistics.com', false, 10),
  ('CLO', 6899, NULL, false, 10),
  ('COLUMBUS', 7106, 'g.nicolini@columbuslogistics.it', false, 10),
  ('CRAM', 6958, 'alice@cram.it', false, 10),
  ('CUGINI SPA', 6964, NULL, false, 10),
  ('DAILA', 7040, 'ordini@daila.it', false, 10),
  ('DEBOX SRL', 6993, NULL, false, 10),
  ('DI.MO', 5049, 'logistica@dimocommerciale.it', false, 10),
  ('EDILCHIMICA', 7060, NULL, false, 10),
  ('FAS SPA', 6176, NULL, false, 10),
  ('GIACOMINI SPA', 7019, NULL, false, 10),
  ('GRUPPO DESA', NULL, NULL, false, 10),
  ('IDROSTILE', 6948, NULL, false, 10),
  ('IDROTEC SRL', 7080, NULL, false, 10),
  ('INTERTRANSPORT', 5623, NULL, false, 10),
  ('ITALMONDO', 7087, NULL, false, 10),
  ('ITALSILVA', 6251, NULL, false, 10),
  ('LOGICGREEN', NULL, NULL, false, 10),
  ('MAGIS CORSICO', 6963, 'giovanni.pelizzola@magisspa.it', false, 10),
  ('MAGIS PAVIA', 6944, 'cosimo.vitrugno@magisspa.it', false, 10),
  ('MARISTELLA SRL', 7062, NULL, false, 10),
  ('MOIA', 7085, NULL, false, 10),
  ('MP GROUP', 7077, 'logistica@versele.it', false, 10),
  ('NATYS SRL', 7027, NULL, false, 10),
  ('NIMEX SRL', 5924, NULL, false, 10),
  ('OPAC', 7006, 'Giorgio.Dotti@opac.it', false, 10),
  ('ORLANDI', 6937, 'paolo_cervini@orlandispa.it', false, 10),
  ('ORVITAL', 7042, NULL, false, 10),
  ('PARTIAUTO', 5929, NULL, false, 10),
  ('POLY POOL', 6934, 'LucaTironi@polypool.it', false, 10),
  ('RAUCH', 6807, NULL, false, 10),
  ('REAL CHIMICA', 6255, 'loredana.suardi@realchimica.com', false, 10),
  ('RODOLFI', 7008, 'alice.rolli@rodolfimansueto.com', false, 10),
  ('SABOR', NULL, NULL, false, 10),
  ('SALGAR', 6958, 'info@salgar.it', false, 10),
  ('SIA', 70781, NULL, false, 10),
  ('SIFTE BERTI', 5804, NULL, false, 10),
  ('SILC', 6677, 'luigifranco@fastwebnet.it', false, 10),
  ('SPEDI EXPRESS', 6365, 'contabilita@spediexpress.com', false, 10),
  ('SUAREZ', 7013, 'laura.romeo@suarezcompany.it', false, 10),
  ('T&T', 7102, NULL, false, 10),
  ('TECHMA', 6988, NULL, false, 10),
  ('TECOM', 7024, NULL, false, 10),
  ('TRANSMART', 7099, 'amministrazione@transmart.it', false, 10),
  ('VITA VIGOR', 7000, 'vitavigor@vitavigor.com', false, 10),
  ('WORLDCART', 6966, 'maurizio.codazzi@worldcart.it', false, 10),
  ('ZAMBONI', 6018, NULL, false, 10),
  -- A PERDERE
  ('AB.M', NULL, NULL, true, 10),
  ('AGRINDUST. PLAST', NULL, NULL, true, 10),
  ('ANDRONI', NULL, NULL, true, 10),
  ('BAMPI SPA', NULL, NULL, true, 10),
  ('BREMBOFLEX', NULL, NULL, true, 10),
  ('CFB', NULL, NULL, true, 10),
  ('CODOGNOTTO', NULL, NULL, true, 10),
  ('DSV', NULL, NULL, true, 10),
  ('EFFE C', NULL, NULL, true, 10),
  ('ERMETI', NULL, NULL, true, 10),
  ('EUROBLU SRL', NULL, NULL, true, 10),
  ('FABE', NULL, NULL, true, 10),
  ('FAVARO SERVIZI', NULL, NULL, true, 10),
  ('FLORENTER SRL', NULL, NULL, true, 10),
  ('FORNERO SRL', NULL, NULL, true, 10),
  ('GHILARDI AUTOTR', NULL, NULL, true, 10),
  ('GIERRE DI TURCO', NULL, NULL, true, 10),
  ('GRUPPO DIMENSIO', NULL, NULL, true, 10),
  ('IDRO BRIC SPA', NULL, NULL, true, 10),
  ('IPAE-PROGARDEN', NULL, NULL, true, 10),
  ('ITALTRADE SRL', NULL, NULL, true, 10),
  ('K FLEX', NULL, NULL, true, 10),
  ('KILTON SRL', NULL, NULL, true, 10),
  ('LSH ITALIA', NULL, NULL, true, 10),
  ('MANIFATTURA CAT', NULL, NULL, true, 10),
  ('MILANO HOLDING', NULL, NULL, true, 10),
  ('MODELCHEM', NULL, NULL, true, 10),
  ('SFA ITALIA SPA', NULL, NULL, true, 10),
  ('TECNASFALTI', NULL, NULL, true, 10),
  ('TERRANEO SRL', NULL, NULL, true, 10);
