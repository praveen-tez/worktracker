import type { TrackerData, Task, OsgItem, LogEntry, NotificationItem } from '~/types/tracker'

const defaultProjects = ['Project Alpha', 'Website Redesign', 'Mobile App', 'Infrastructure']
const defaultUsers = ['TEZ', 'John', 'Alex', 'Sarah']
const defaultNotifications: NotificationItem[] = [
  { id: '1', title: 'System Initialized', message: 'Welcome to your work ecosystem tracker.', time: 'Just now', type: 'info', read: false },
  { id: '2', title: 'Sprint Deadline', message: 'Month-end reports review scheduled for Friday.', time: '2h ago', type: 'warning', read: false }
]

const initial: TrackerData = {
  tasks: [],
  osg: [],
  logs: [],
  todos: [],
  feedback: [],
  meetings: [],
  projects: defaultProjects,
  users: defaultUsers,
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
          data.value = {
            ...initial,
            ...parsed,
            todos: parsed.todos || [],
            feedback: parsed.feedback || [],
            meetings: parsed.meetings || [],
            projects: parsed.projects && parsed.projects.length ? parsed.projects : defaultProjects,
            users: parsed.users && parsed.users.length ? parsed.users : defaultUsers,
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

  const addUser = (userName: string) => {
    const trimmed = userName.trim()
    if (trimmed && !data.value.users.includes(trimmed)) {
      data.value.users.push(trimmed)
      save()
    }
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
    addUser,
    updateTask,
    removeTask,
    addNotification,
    markNotificationRead,
    clearNotifications,
    syncSheets,
    hasSheets: computed(() => Boolean(config.public.sheetsEndpoint))
  }
}


