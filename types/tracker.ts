export type TaskStatus = 'In Progress' | 'Clarification' | 'Completed'
export type Priority = 'High' | 'Medium' | 'Low'
export interface Task { id: string; month: string; project: string; category: string; task: string; owner: string; hours: number; status: TaskStatus; priority: Priority }
export interface OsgItem { id: string; title: string; category: 'Operational' | 'Safety' | 'Governance'; owner: string; due: string; status: 'Open' | 'In Progress' | 'Closed' }
export interface LogEntry { id: string; date: string; user: string; text: string }
export interface Todo { id: string; title: string; detail: string; due: string; status: 'Pending' | 'In Progress' | 'Completed'; priority: Priority }
export interface Feedback { id: string; date: string; author: string; context: string; text: string; status: 'Open' | 'Actioned' }
export interface Meeting { id: string; date: string; title: string; attendees: string; notes: string; followUp: string }
export interface TrackerData { tasks: Task[]; osg: OsgItem[]; logs: LogEntry[]; todos: Todo[]; feedback: Feedback[]; meetings: Meeting[] }
