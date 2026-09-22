export type TaskStatus = 'In Progress' | 'Clarification' | 'Completed'
export type Priority = 'High' | 'Medium' | 'Low'

export interface Task {
  id: string
  month: string
  project: string
  category: string
  task: string
  owner: string
  owners?: string[]
  hours: number
  status: TaskStatus
  priority: Priority
  tags?: string[]
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  due?: string
}

export interface OsgItem { id: string; title: string; category: 'Operational' | 'Safety' | 'Governance'; owner: string; due: string; status: 'Open' | 'In Progress' | 'Closed' }

export interface LogEntry {
  id: string
  date: string
  user: string
  users?: string[]
  text: string
  project?: string
  task?: string
  hours?: number
  startTime?: string
  endTime?: string
  tags?: string[]
}

export interface Todo {
  id: string
  title: string
  detail: string
  due: string
  status: 'Pending' | 'In Progress' | 'Completed'
  priority: Priority
  link?: string
  fileName?: string
  fileData?: string
  month?: string
  createdDate?: string
}
export interface Feedback { id: string; date: string; author: string; context: string; text: string; status: 'Open' | 'Actioned' }
export interface Meeting { id: string; date: string; title: string; attendees: string; notes: string; followUp: string }

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'info' | 'success' | 'warning'
  read: boolean
}

export interface TrackerData {
  tasks: Task[]
  osg: OsgItem[]
  logs: LogEntry[]
  todos: Todo[]
  feedback: Feedback[]
  meetings: Meeting[]
  projects: string[]
  users: string[]
  tags?: string[]
  notifications: NotificationItem[]
}

