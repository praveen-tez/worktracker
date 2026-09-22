import type { TrackerData, Task, OsgItem, LogEntry, NotificationItem } from '~/types/tracker'

const defaultProjects = ['Project Alpha', 'Website Redesign', 'Mobile App', 'Infrastructure']
const defaultUsers = ['TEZ', 'John', 'Alex', 'Sarah']
const defaultTags = ['Frontend', 'Backend', 'UI/UX', 'Bug Fix', 'Feature', 'Meeting', 'Refactor']
const defaultNotifications: NotificationItem[] = [
  { id: '1', title: 'System Initialized', message: 'Welcome to your work ecosystem tracker.', time: 'Just now', type: 'info', read: false },
  { id: '2', title: 'Sprint Deadline', message: 'Month-end reports review scheduled for Friday.', time: '2h ago', type: 'warning', read: false }
]

const getInitialLogs = (): LogEntry[] => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const yDate = new Date()
  yDate.setDate(yDate.getDate() - 1)
  const yesterdayStr = yDate.toISOString().slice(0, 10)

  return [
    {
      id: 'demo-log-1',
      date: todayStr,
      user: 'TEZ',
      users: ['TEZ'],
      text: 'Navigation UI Refactor · 1.0h · Project Alpha',
      project: 'Project Alpha',
      task: 'Navigation UI Refactor',
      hours: 1.0,
      startTime: '10:00',
      endTime: '11:00',
      tags: ['Frontend', 'UI/UX']
    },
    {
      id: 'demo-log-2',
      date: todayStr,
      user: 'TEZ, Alex',
      users: ['TEZ', 'Alex'],
      text: 'API Endpoints & Validation · 1.5h · Website Redesign',
      project: 'Website Redesign',
      task: 'API Endpoints & Validation',
      hours: 1.5,
      startTime: '11:30',
      endTime: '13:00',
      tags: ['Backend', 'Bug Fix']
    },
    {
      id: 'demo-log-3',
      date: yesterdayStr,
      user: 'John, TEZ',
      users: ['John', 'TEZ'],
      text: 'Database Query Optimization · 2.0h · Infrastructure',
      project: 'Infrastructure',
      task: 'Database Query Optimization',
      hours: 2.0,
      startTime: '14:00',
      endTime: '16:00',
      tags: ['Backend', 'Refactor']
    }
  ]
}

const initial: TrackerData = {
  tasks: [],
  osg: [],
  logs: getInitialLogs(),
  todos: [],
  feedback: [],
  meetings: [],
  projects: defaultProjects,
  users: defaultUsers,
  tags: defaultTags,
  notifications: defaultNotifications
}

const storageKey = 'monthly-time-tracker-v1'

export function useTracker() {
  const data = useState<TrackerData>('tracker-data', () => structuredClone(initial))
  const loaded = useState('tracker-loaded', () => false)
  const config = useRuntimeConfig()

  const save = () => {
    if (import.meta.client) {
      localStorage.setItem(storageKey, JSON.stringify(data.value))
    }
  }

  const load = () => {
    if (import.meta.client && !loaded.value) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const rawLogs = parsed.logs && parsed.logs.length ? parsed.logs : getInitialLogs()
          const normalizedLogs = rawLogs.map((l: LogEntry) => {
            let st = l.startTime
            let et = l.endTime
            if (!st) st = '10:00'
            if (!et) {
              const [h, m] = st.split(':').map(Number)
              const endMin = (h || 10) * 60 + (m || 0) + Math.round((Number(l.hours) || 1) * 60)
              const eh = Math.floor(endMin / 60) % 24
              const em = endMin % 60
              et = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
            }
            return { ...l, startTime: st, endTime: et }
          })

          data.value = {
            ...initial,
            ...parsed,
            logs: normalizedLogs,
            todos: parsed.todos || [],
            feedback: parsed.feedback || [],
            meetings: parsed.meetings || [],
            projects: parsed.projects && parsed.projects.length ? parsed.projects : defaultProjects,
            users: parsed.users && parsed.users.length ? parsed.users : defaultUsers,
            tags: parsed.tags && parsed.tags.length ? parsed.tags : defaultTags,
            notifications: parsed.notifications || defaultNotifications
          }
        } catch (e) {
          console.error('Failed to parse tracker storage', e)
        }
      }
      loaded.value = true
    }
  }

  const addTask = (task: Omit<Task, 'id'>) => {
    data.value.tasks.push({ ...task, id: crypto.randomUUID() })
    if (task.project && !data.value.projects.includes(task.project)) {
      data.value.projects.push(task.project)
    }
    save()
  }

  const addOsg = (item: Omit<OsgItem, 'id'>) => {
    data.value.osg.push({ ...item, id: crypto.randomUUID() })
    save()
  }

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    data.value.logs.push({ ...entry, id: crypto.randomUUID() })
    if (entry.project && !data.value.projects.includes(entry.project)) {
      data.value.projects.push(entry.project)
    }
    save()
  }

  const updateLog = (log: LogEntry) => {
    const i = data.value.logs.findIndex(x => x.id === log.id)
    if (i >= 0) {
      data.value.logs[i] = log
      if (log.project && !data.value.projects.includes(log.project)) {
        data.value.projects.push(log.project)
      }
      save()
    }
  }

  const removeLog = (id: string) => {
    data.value.logs = data.value.logs.filter(x => x.id !== id)
    save()
  }

  const addProject = (projectName: string) => {
    const trimmed = projectName.trim()
    if (trimmed && !data.value.projects.includes(trimmed)) {
      data.value.projects.push(trimmed)
      save()
    }
  }

  const removeProject = (projectName: string) => {
    data.value.projects = data.value.projects.filter(p => p !== projectName)
    save()
  }

  const addUser = (userName: string) => {
    const trimmed = userName.trim()
    if (trimmed && !data.value.users.includes(trimmed)) {
      data.value.users.push(trimmed)
      save()
    }
  }

  const removeUser = (userName: string) => {
    data.value.users = data.value.users.filter(u => u !== userName)
    save()
  }

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (!data.value.tags) data.value.tags = [...defaultTags]
    if (trimmed && !data.value.tags.includes(trimmed)) {
      data.value.tags.push(trimmed)
      save()
    }
  }

  const removeTag = (tagName: string) => {
    if (!data.value.tags) data.value.tags = [...defaultTags]
    data.value.tags = data.value.tags.filter(t => t !== tagName)
    save()
  }

  const updateTask = (task: Task) => {
    const i = data.value.tasks.findIndex(x => x.id === task.id)
    if (i >= 0) {
      data.value.tasks[i] = task
      save()
    }
  }

  const removeTask = (id: string) => {
    data.value.tasks = data.value.tasks.filter(x => x.id !== id)
    save()
  }

  const addNotification = (notif: Omit<NotificationItem, 'id'>) => {
    data.value.notifications.unshift({ ...notif, id: crypto.randomUUID() })
    save()
  }

  const markNotificationRead = (id: string) => {
    const target = data.value.notifications.find(n => n.id === id)
    if (target) {
      target.read = true
      save()
    }
  }

  const clearNotifications = () => {
    data.value.notifications = []
    save()
  }

  const syncSheets = async () => {
    if (!config.public.sheetsEndpoint) return false
    await $fetch(config.public.sheetsEndpoint as string, { method: 'POST', body: data.value })
    return true
  }

  return {
    data,
    load,
    save,
    addTask,
    addOsg,
    addLog,
    updateLog,
    removeLog,
    addProject,
    removeProject,
    addUser,
    removeUser,
    addTag,
    removeTag,
    updateTask,
    removeTask,
    addNotification,
    markNotificationRead,
    clearNotifications,
    syncSheets,
    hasSheets: computed(() => Boolean(config.public.sheetsEndpoint))
  }
}


