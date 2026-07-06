-- ============================================
-- Sistema de Empresa Multi-Agente (AI Company)
-- ============================================

-- Empresas / estructuras (una por proyecto)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  mission TEXT,
  template TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  auto_mode BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agentes (director, revisor y especialistas)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('director', 'reviewer', 'specialist')),
  specialty TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'bot',
  color TEXT DEFAULT 'indigo',
  description TEXT,
  system_prompt TEXT NOT NULL,
  model_policy TEXT DEFAULT 'auto',
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'thinking', 'working', 'reviewing', 'error')),
  current_job_id UUID,
  jobs_completed INT DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, specialty)
);

-- Misiones (objetivos que el usuario da al director)
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'running', 'completed', 'failed', 'cancelled')),
  plan JSONB DEFAULT '{}',
  result TEXT,
  summary TEXT,
  error TEXT,
  total_tokens BIGINT DEFAULT 0,
  auto_generated BOOLEAN DEFAULT FALSE,
  auto_chain INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trabajos delegados a agentes dentro de una misión
CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  phase INT DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  deliverable TEXT,
  complexity TEXT DEFAULT 'standard' CHECK (complexity IN ('simple', 'standard', 'complex')),
  model TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'reviewing', 'revision', 'completed', 'failed')),
  output TEXT,
  review_verdict TEXT CHECK (review_verdict IN ('approved', 'rejected', 'approved_with_notes')),
  review_notes TEXT,
  attempts INT DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed de actividad en vivo (lo que hace cada bot)
CREATE TABLE IF NOT EXISTS agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES agent_jobs(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'thought', 'delegation', 'work', 'output', 'review', 'revision', 'result', 'error')),
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_missions_company ON missions(company_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_mission ON agent_jobs(mission_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_activities_company ON agent_activities(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activities_mission ON agent_activities(mission_id);

-- Triggers updated_at (reutiliza update_updated_at_column de 001)
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_jobs_updated_at BEFORE UPDATE ON agent_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
