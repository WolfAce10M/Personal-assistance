export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type TaskCategory = 'work' | 'business' | 'personal' | 'health' | 'learning'
export type GoalType = 'annual' | 'quarterly' | 'monthly' | 'weekly'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type TrainingStatus = 'scheduled' | 'completed' | 'skipped' | 'modified'
export type PersonalDevType = 'book' | 'course' | 'reflection' | 'learning' | 'other'
export type ChatChannel = 'web' | 'telegram' | 'voice'
export type AutonomyLevel = 1 | 2 | 3 | 4

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  preferences: Record<string, unknown>
  memory: Record<string, unknown>
  autonomy_level: AutonomyLevel
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  category: TaskCategory
  due_date?: string
  goal_id?: string
  estimated_minutes?: number
  completed_at?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  type: GoalType
  status: GoalStatus
  priority: number
  target_date?: string
  progress: number
  parent_goal_id?: string
  children?: Goal[]
  tasks?: Task[]
  created_at: string
  updated_at: string
}

export interface TrainingPlan {
  id: string
  name: string
  goal?: string
  status: string
  start_date?: string
  end_date?: string
  schedule: Record<string, unknown>
  created_at: string
}

export interface Exercise {
  name: string
  sets?: number
  reps?: string
  weight?: string
  duration_minutes?: number
  notes?: string
}

export interface TrainingSession {
  id: string
  plan_id?: string
  name: string
  type?: string
  scheduled_date?: string
  completed_at?: string
  duration_minutes?: number
  exercises: Exercise[]
  notes?: string
  status: TrainingStatus
  created_at: string
}

export interface PersonalDevEntry {
  id: string
  type: PersonalDevType
  title: string
  description?: string
  status: string
  progress: number
  notes?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  google_event_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  is_protected: boolean
  is_all_day: boolean
  location?: string
  calendar_id?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  channel: ChatChannel
  metadata: Record<string, unknown>
  created_at: string
}

export interface DailyPlan {
  id: string
  date: string
  plan: DailyPlanData
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface DailyPlanData {
  summary: string
  time_blocks: TimeBlock[]
  priority_tasks: string[]
  training?: string
  personal_dev?: string
  free_time_minutes?: number
  alerts: string[]
}

export interface TimeBlock {
  start: string
  end: string
  title: string
  type: 'meeting' | 'work' | 'training' | 'break' | 'personal' | 'learning'
  task_id?: string
  event_id?: string
}

export interface AIMemory {
  id: string
  category: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface DashboardData {
  date: string
  daily_plan?: DailyPlan
  upcoming_events: CalendarEvent[]
  priority_tasks: Task[]
  active_goals: Goal[]
  training_today?: TrainingSession
  personal_dev_today?: PersonalDevEntry
  free_time_minutes: number
  alerts: string[]
}
