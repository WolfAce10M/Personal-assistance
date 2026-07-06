export type CompanyStatus = 'active' | 'paused' | 'archived'
export type AgentRole = 'director' | 'reviewer' | 'specialist'
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'reviewing' | 'error'
export type MissionStatus = 'planning' | 'running' | 'completed' | 'failed' | 'cancelled'
export type JobStatus = 'queued' | 'running' | 'reviewing' | 'revision' | 'completed' | 'failed'
export type JobComplexity = 'simple' | 'standard' | 'complex'
export type ReviewVerdict = 'approved' | 'rejected' | 'approved_with_notes'
export type ActivityType =
  | 'system'
  | 'thought'
  | 'delegation'
  | 'work'
  | 'output'
  | 'review'
  | 'revision'
  | 'result'
  | 'error'

export interface Company {
  id: string
  name: string
  description?: string
  mission?: string
  template: string
  status: CompanyStatus
  auto_mode: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  agents?: Agent[]
  agent_count?: number
  running_missions?: number
}

export interface Agent {
  id: string
  company_id: string
  role: AgentRole
  specialty: string
  name: string
  icon: string
  color: string
  description?: string
  system_prompt: string
  model_policy: string
  status: AgentStatus
  current_job_id?: string | null
  jobs_completed: number
  tokens_used: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  company_id: string
  objective: string
  status: MissionStatus
  plan: { summary?: string; jobs?: PlannedJob[] }
  result?: string
  summary?: string
  error?: string
  total_tokens: number
  auto_generated: boolean
  auto_chain: number
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
  jobs?: AgentJob[]
}

export interface PlannedJob {
  specialty: string
  title: string
  description: string
  complexity: JobComplexity
  phase: number
  deliverable?: string
}

export interface AgentJob {
  id: string
  mission_id: string
  company_id: string
  agent_id?: string | null
  phase: number
  title: string
  description?: string
  deliverable?: string
  complexity: JobComplexity
  model?: string
  status: JobStatus
  output?: string
  review_verdict?: ReviewVerdict
  review_notes?: string
  attempts: number
  tokens_used: number
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
  agent?: Pick<Agent, 'id' | 'name' | 'specialty' | 'icon' | 'color' | 'role'>
}

export interface AgentActivity {
  id: string
  company_id: string
  mission_id?: string | null
  job_id?: string | null
  agent_id?: string | null
  type: ActivityType
  content: string
  meta: { model?: string; tokens?: number; [key: string]: unknown }
  created_at: string
  agent?: Pick<Agent, 'id' | 'name' | 'specialty' | 'icon' | 'color' | 'role'>
}

export interface CompanyState {
  company: Company
  agents: Agent[]
  missions: Mission[]
  active_mission?: Mission | null
  jobs: AgentJob[]
  activities: AgentActivity[]
}
