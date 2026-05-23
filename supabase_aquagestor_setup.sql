-- ══════════════════════════════════════════════════════════════════
-- AQUAGESTOR PRO + COLABORADOR — Script SQL Supabase
-- Execute este script no SQL Editor do Supabase antes de usar os apps
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Tabela user_data (dados do app principal) ──────────────────
CREATE TABLE IF NOT EXISTS public.user_data (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_key   TEXT         NOT NULL,
  data_value JSONB,
  updated_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, full_key)
);
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_data_select" ON public.user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_data_insert" ON public.user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_data_update" ON public.user_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_data_delete" ON public.user_data FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_user ON public.user_data(user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_user_data_ts()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_user_data_ts ON public.user_data;
CREATE TRIGGER trg_user_data_ts BEFORE UPDATE ON public.user_data FOR EACH ROW EXECUTE FUNCTION update_user_data_ts();

-- ── 2. Login logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_logs (
  id            SERIAL      PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT        NOT NULL DEFAULT '',
  ip_address    TEXT        DEFAULT '',
  user_agent    TEXT        DEFAULT '',
  login_success BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "login_logs_own_select" ON public.login_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "login_logs_own_insert" ON public.login_logs FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON public.login_logs(user_id, created_at DESC);

-- ── 3. Perfis de usuário (admin ou colaborador) ───────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'colaborador' CHECK (role IN ('admin','colaborador')),
  admin_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- Admin vê todos os perfis ligados a ele + seu próprio
CREATE POLICY IF NOT EXISTS "profiles_select" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR auth.uid() = admin_id
    OR EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY IF NOT EXISTS "profiles_insert" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_update" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() = admin_id);

-- ── 4. Configurações de WiFi (administrador configura) ────────────
CREATE TABLE IF NOT EXISTS public.wifi_configs (
  id           BIGSERIAL PRIMARY KEY,
  admin_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  ssid         TEXT DEFAULT '',
  ip_prefix    TEXT NOT NULL, -- ex: "192.168.1" (3 primeiros octetos)
  ativo        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wifi_configs ENABLE ROW LEVEL SECURITY;
-- Admin gerencia; colaboradores só leem (para validar conexão)
CREATE POLICY IF NOT EXISTS "wifi_admin_all" ON public.wifi_configs
  FOR ALL USING (auth.uid() = admin_id);
CREATE POLICY IF NOT EXISTS "wifi_colab_read" ON public.wifi_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.admin_id = wifi_configs.admin_id
    )
  );

-- ── 5. Tratos diários registrados pelos colaboradores ────────────
CREATE TABLE IF NOT EXISTS public.colab_tratos (
  id              BIGSERIAL PRIMARY KEY,
  colaborador_id  UUID REFERENCES auth.users(id),
  admin_id        UUID NOT NULL REFERENCES auth.users(id),
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  tanque_num      TEXT NOT NULL,
  lote_id         TEXT DEFAULT '',
  kg_racao        NUMERIC(10,3) DEFAULT 0,
  tipo_racao      TEXT DEFAULT '',
  hora_trato      TEXT DEFAULT '',
  obs             TEXT DEFAULT '',
  status          TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.colab_tratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tratos_colab_own" ON public.colab_tratos
  FOR ALL USING (auth.uid() = colaborador_id);
CREATE POLICY IF NOT EXISTS "tratos_admin_read" ON public.colab_tratos
  FOR ALL USING (auth.uid() = admin_id);
CREATE INDEX IF NOT EXISTS idx_colab_tratos_admin ON public.colab_tratos(admin_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_colab_tratos_colab ON public.colab_tratos(colaborador_id, data DESC);

-- ── 6. Mortalidade registrada pelos colaboradores ────────────────
CREATE TABLE IF NOT EXISTS public.colab_mortalidade (
  id              BIGSERIAL PRIMARY KEY,
  colaborador_id  UUID REFERENCES auth.users(id),
  admin_id        UUID NOT NULL REFERENCES auth.users(id),
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  tanque_num      TEXT NOT NULL,
  lote_id         TEXT DEFAULT '',
  quantidade      INTEGER NOT NULL DEFAULT 0,
  causa           TEXT DEFAULT '',
  obs             TEXT DEFAULT '',
  status          TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.colab_mortalidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "mort_colab_own" ON public.colab_mortalidade
  FOR ALL USING (auth.uid() = colaborador_id);
CREATE POLICY IF NOT EXISTS "mort_admin_read" ON public.colab_mortalidade
  FOR ALL USING (auth.uid() = admin_id);
CREATE INDEX IF NOT EXISTS idx_colab_mort_admin ON public.colab_mortalidade(admin_id, data DESC);

-- ── 7. Vendas registradas pelos colaboradores ────────────────────
CREATE TABLE IF NOT EXISTS public.colab_vendas (
  id                BIGSERIAL PRIMARY KEY,
  colaborador_id    UUID REFERENCES auth.users(id),
  admin_id          UUID NOT NULL REFERENCES auth.users(id),
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente           TEXT DEFAULT '',
  telefone          TEXT DEFAULT '',
  tanque_origem     TEXT DEFAULT '',
  lote_id           TEXT DEFAULT '',
  kg_vendidos       NUMERIC(10,3) DEFAULT 0,
  valor_kg          NUMERIC(10,2) DEFAULT 0,
  valor_total       NUMERIC(12,2) DEFAULT 0,
  categoria         TEXT DEFAULT '',
  forma_pagamento   TEXT DEFAULT '',
  obs               TEXT DEFAULT '',
  status            TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.colab_vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "vendas_colab_own" ON public.colab_vendas
  FOR ALL USING (auth.uid() = colaborador_id);
CREATE POLICY IF NOT EXISTS "vendas_admin_read" ON public.colab_vendas
  FOR ALL USING (auth.uid() = admin_id);
CREATE INDEX IF NOT EXISTS idx_colab_vendas_admin ON public.colab_vendas(admin_id, data DESC);

-- ══ COMO USAR ══
-- 1. Crie o usuário ADMIN no Supabase Authentication (email/senha)
-- 2. Insira manualmente na tabela user_profiles:
--    INSERT INTO user_profiles(id, nome, role) VALUES ('<seu-uuid>', 'Nome Admin', 'admin');
-- 3. No app ADMIN, vá em Configurações > Gerenciar Colaboradores para criar usuários do app secundário
-- 4. Configure as redes WiFi em Configurações > Redes WiFi Permitidas
