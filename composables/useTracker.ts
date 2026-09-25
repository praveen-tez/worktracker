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

const oneYearFromNow = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const defaultApiKeys: ApiKey[] = []

const defaultWorkspaceConnections: WorkspaceConnection[] = []

const defaultOfficeIntegration: OfficeIntegrationConfig = {
  enabled: false,
  endpoint: 'https://api.officetimesheets.com/v1/sync',
  apiKey: '',
  autoSync: false,
  lastSynced: null,
  status: 'disconnected'
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
  notifications: defaultNotifications,
  apiKeys: defaultApiKeys,
  officeIntegration: defaultOfficeIntegration,
  workspaceConnections: defaultWorkspaceConnections
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
            return { ...l, startTime: st, endTime: et, officeSynced: l.officeSynced ?? true }
          })

            const legacyDummyIds = new Set(['conn-office', 'conn-figma', 'conn-mcp', 'conn-notion'])
            const legacyDummyKeyIds = new Set(['key-demo-1', 'key-demo-2'])
            const userConnections = Array.isArray(parsed.workspaceConnections)
              ? parsed.workspaceConnections.filter((c: any) => !legacyDummyIds.has(c.id))
              : []
            const userApiKeys = Array.isArray(parsed.apiKeys)
              ? parsed.apiKeys.filter((k: any) => !legacyDummyKeyIds.has(k.id))
              : []
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
              notifications: parsed.notifications || defaultNotifications,
              apiKeys: userApiKeys,
              officeIntegration: parsed.officeIntegration || defaultOfficeIntegration,
              workspaceConnections: userConnections
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
    const isAutoSync = data.value.officeIntegration?.enabled && data.value.officeIntegration?.autoSync
    const newLog: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      officeSynced: isAutoSync ? true : false,
      officeSyncTime: isAutoSync ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
    }
    data.value.logs.push(newLog)
    if (entry.project && !data.value.projects.includes(entry.project)) {
      data.value.projects.push(entry.project)
    }
    if (isAutoSync) {
      addNotification({
        title: 'Q Timesheets Synced',
        message: `Work log "${entry.task || 'Time Entry'}" pushed to Q Timesheets.`,
        time: 'Just now',
        type: 'success',
        read: false
      })
    }
    save()
  }

  const updateLog = (log: LogEntry) => {
    const i = data.value.logs.findIndex(x => x.id === log.id)
    if (i >= 0) {
      const isAutoSync = data.value.officeIntegration?.enabled && data.value.officeIntegration?.autoSync
      data.value.logs[i] = {
        ...log,
        officeSynced: isAutoSync ? true : log.officeSynced,
        officeSyncTime: isAutoSync ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : log.officeSyncTime
      }
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

  const generateApiKey = (name: string, expirationOption: '1year' | '30days' | '90days' | 'never' = '1year', scopes: string[] = ['Read Logs', 'Write Entries']): ApiKey => {
    const randomBytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const keyVal = `mytrk_live_sk_${randomBytes}`
    
    // Calculate Expiry Date (Default 1 year = 365 days)
    let expiryDate: string | undefined = undefined
    const now = new Date()
    if (expirationOption === '1year') {
      now.setFullYear(now.getFullYear() + 1)
      expiryDate = now.toISOString().slice(0, 10)
    } else if (expirationOption === '30days') {
      now.setDate(now.getDate() + 30)
      expiryDate = now.toISOString().slice(0, 10)
    } else if (expirationOption === '90days') {
      now.setDate(now.getDate() + 90)
      expiryDate = now.toISOString().slice(0, 10)
    }

    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Custom API Key',
      key: keyVal,
      createdDate: new Date().toISOString().slice(0, 10),
      expiryDate,
      expirationOption,
      scopes,
      lastUsed: 'Never',
      status: 'active'
    }
    if (!data.value.apiKeys) data.value.apiKeys = []
    data.value.apiKeys.unshift(newKey)
    save()
    return newKey
  }

  const revokeApiKey = (id: string) => {
    if (data.value.apiKeys) {
      const target = data.value.apiKeys.find(k => k.id === id)
      if (target) {
        target.status = 'revoked'
        // Also update linked workspace connection status if exists
        if (data.value.workspaceConnections) {
          const conn = data.value.workspaceConnections.find(c =>
            id === `key-conn-${c.type}` ||
            id === `key-conn-${c.id}` ||
            target.name.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(target.name.toLowerCase())
          )
          if (conn) {
            conn.status = 'disconnected'
          }
        }
        save()
      }
    }
  }

  const deleteApiKey = (id: string) => {
    if (data.value.apiKeys) {
      const keyToDelete = data.value.apiKeys.find(k => k.id === id)
      data.value.apiKeys = data.value.apiKeys.filter(k => k.id !== id)

      // Also remove corresponding workspace connection if exists
      if (keyToDelete && data.value.workspaceConnections) {
        data.value.workspaceConnections = data.value.workspaceConnections.filter(c => {
          const matchesId = id === `key-conn-${c.type}` || id === `key-conn-${c.id}` || id === c.id
          const cleanKeyName = keyToDelete.name.toLowerCase().replace(/connector|key|sync|api/g, '').trim()
          const matchesName = cleanKeyName.length >= 2 && (
            c.name.toLowerCase().includes(cleanKeyName) ||
            cleanKeyName.includes(c.name.toLowerCase())
          )
          const matchesKey = !!c.details?.apiKey && c.details.apiKey === keyToDelete.key
          const shouldDelete = matchesId || matchesName || matchesKey
          if (shouldDelete && (c.type === 'officetimesheets' || c.id === 'conn-office')) {
            if (data.value.officeIntegration) {
              data.value.officeIntegration.enabled = false
              data.value.officeIntegration.status = 'disconnected'
            }
          }
          return !shouldDelete
        })
      }
      save()
    }
  }

  const updateOfficeIntegration = (updated: Partial<OfficeIntegrationConfig>) => {
    data.value.officeIntegration = {
      ...(data.value.officeIntegration || defaultOfficeIntegration),
      ...updated
    }
    save()
  }

  const syncOfficeTimesheets = async () => {
    const officeConn = data.value.workspaceConnections?.find(c => c.type === 'officetimesheets')
    const token = officeConn?.details?.apiKey || data.value.officeIntegration?.apiKey

    if (!token) return { success: false, syncedCount: 0, error: 'No API token found. Please connect Q Timesheets first.' }

    // Set status to syncing in both places
    if (data.value.officeIntegration) data.value.officeIntegration.status = 'syncing'
    if (officeConn) officeConn.status = 'syncing'

    try {
      // Call the real server-side sync route (avoids CORS)
      const result = await $fetch<{
        success: boolean
        pushed: number
        syncedIds: Record<string, string>
        pulled: {
          id: string
          start: string
          end: string | null
          duration: number | null
          description: string
          project?: { id: string; name: string }
          billable: boolean
        }[]
        errors: string[]
      }>('/api/qtimesheets/sync', {
        method: 'POST',
        body: {
          token,
          logs: data.value.logs,
          direction: 'both'
        }
      })

      const nowStr = `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

      // ── Mark pushed logs as synced ──────────────────────────────────────
      let pushCount = 0
      if (result.syncedIds) {
        for (const [localId, remoteId] of Object.entries(result.syncedIds)) {
          const log = data.value.logs.find(l => l.id === localId)
          if (log) {
            log.officeSynced = true
            log.officeSyncId = remoteId
            log.officeSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            pushCount++
          }
        }
      }

      // ── Import pulled entries not already in local logs ─────────────────
      let pullCount = 0
      if (result.pulled?.length) {
        for (const entry of result.pulled) {
          // Skip if already synced (matching by officeSyncId)
          const alreadyHave = data.value.logs.some(l => l.officeSyncId === entry.id)
          if (alreadyHave) continue

          // Skip if no end time (still running timer)
          if (!entry.end) continue

          const startDate = new Date(entry.start)
          const endDate = new Date(entry.end)
          const hours = entry.duration != null
            ? Math.round((entry.duration / 3600) * 10) / 10
            : Math.round(((endDate.getTime() - startDate.getTime()) / 3600000) * 10) / 10

          if (hours <= 0) continue

          const dateStr = startDate.toISOString().split('T')[0]
          const startTime = startDate.toTimeString().substring(0, 5)
          const endTime = endDate.toTimeString().substring(0, 5)

          const newLog = {
            id: `qtms-${entry.id}`,
            date: dateStr,
            user: data.value.users?.[0] || 'Me',
            text: entry.description || 'Time entry from Q Timesheets',
            project: entry.project?.name || '',
            hours,
            startTime,
            endTime,
            officeSynced: true,
            officeSyncId: entry.id,
            officeSyncTime: nowStr
          }
          data.value.logs.unshift(newLog)
          pullCount++
        }
      }

      // ── Update connection status ─────────────────────────────────────────
      if (data.value.officeIntegration) {
        data.value.officeIntegration.status = 'connected'
        data.value.officeIntegration.lastSynced = nowStr
      }
      if (officeConn) {
        officeConn.lastSynced = nowStr
        officeConn.status = 'connected'
      }

      const totalCount = pushCount + pullCount
      const parts = []
      if (pushCount > 0) parts.push(`pushed ${pushCount} log(s) to Q Timesheets`)
      if (pullCount > 0) parts.push(`imported ${pullCount} entry(s) from Q Timesheets`)
      if (result.errors?.length) parts.push(`${result.errors.length} warning(s)`)

      addNotification({
        title: totalCount > 0 ? '✅ Q Timesheets Sync Complete' : 'Q Timesheets: Already up to date',
        message: parts.length ? parts.join(', ') + '.' : 'All logs are already synced.',
        time: 'Just now',
        type: 'success',
        read: false
      })

      save()
      return { success: true, syncedCount: totalCount, pushed: pushCount, pulled: pullCount, errors: result.errors }

    } catch (e: any) {
      const errMsg = e?.data?.message || e?.message || 'Sync failed'
      if (data.value.officeIntegration) data.value.officeIntegration.status = 'error'
      if (officeConn) officeConn.status = 'error'

      addNotification({
        title: '❌ Q Timesheets Sync Failed',
        message: errMsg,
        time: 'Just now',
        type: 'warning',
        read: false
      })

      save()
      return { success: false, syncedCount: 0, error: errMsg }
    }
  }

  const connectWorkspace = (conn: WorkspaceConnection) => {
    if (!data.value.workspaceConnections) {
      data.value.workspaceConnections = []
    }
    const idx = data.value.workspaceConnections.findIndex(c => c.type === conn.type || c.id === conn.id)
    if (idx >= 0) {
      data.value.workspaceConnections[idx] = { ...data.value.workspaceConnections[idx], ...conn }
    } else {
      data.value.workspaceConnections.push(conn)
    }

    if (conn.type === 'officetimesheets') {
      data.value.officeIntegration = {
        enabled: true,
        endpoint: conn.details?.endpoint || 'https://api.officetimesheets.com/v1/sync',
        apiKey: conn.details?.apiKey || '',
        autoSync: conn.autoSync,
        lastSynced: conn.lastSynced || 'Just now',
        status: 'connected'
      }
    }

    // Automatically sync into Manage APIs list
    if (!data.value.apiKeys) data.value.apiKeys = []
    const keyId = `key-conn-${conn.type || conn.id}`
    const existingKeyIdx = data.value.apiKeys.findIndex(k =>
      k.id === keyId ||
      k.name.toLowerCase() === `${conn.name} Connector`.toLowerCase() ||
      k.name.toLowerCase() === conn.name.toLowerCase()
    )
    const secretKeyVal = conn.details?.apiKey || `mytrk_live_sk_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`

    if (existingKeyIdx >= 0) {
      data.value.apiKeys[existingKeyIdx] = {
        ...data.value.apiKeys[existingKeyIdx],
        name: `${conn.name} Connector`,
        key: secretKeyVal,
        status: 'active',
        lastUsed: 'Just now'
      }
    } else {
      data.value.apiKeys.unshift({
        id: keyId,
        name: `${conn.name} Connector`,
        key: secretKeyVal,
        createdDate: new Date().toISOString().slice(0, 10),
        expiryDate: oneYearFromNow(),
        expirationOption: '1year',
        scopes: ['Read Logs', 'Write Entries', 'Auto Sync'],
        lastUsed: 'Just now',
        status: 'active'
      })
    }

    addNotification({
      title: `${conn.name} Connected`,
      message: `Successfully connected ${conn.name} with your workspace.`,
      time: 'Just now',
      type: 'success',
      read: false
    })

    save()
  }

  const disconnectWorkspace = (idOrType: string) => {
    if (!data.value.workspaceConnections) return
    const target = data.value.workspaceConnections.find(c => c.id === idOrType || c.type === idOrType)
    data.value.workspaceConnections = data.value.workspaceConnections.filter(
      c => c.id !== idOrType && c.type !== idOrType
    )
    if (idOrType === 'conn-office' || idOrType === 'officetimesheets' || target?.type === 'officetimesheets') {
      if (data.value.officeIntegration) {
        data.value.officeIntegration.enabled = false
        data.value.officeIntegration.status = 'disconnected'
      }
    }
    // Also remove from apiKeys to keep both tabs perfectly in sync
    if (target && data.value.apiKeys) {
      data.value.apiKeys = data.value.apiKeys.filter(k =>
        k.id !== `key-conn-${target.type}` &&
        k.id !== `key-conn-${target.id}` &&
        k.id !== target.id &&
        k.name.toLowerCase() !== `${target.name} Connector`.toLowerCase() &&
        k.name.toLowerCase() !== target.name.toLowerCase()
      )
    }
    if (target) {
      addNotification({
        title: `${target.name} Disconnected`,
        message: `${target.name} integration has been disconnected and removed from active connections.`,
        time: 'Just now',
        type: 'info',
        read: false
      })
    }
    save()
  }

  const syncWorkspaceConnection = async (idOrType: string) => {
    if (!data.value.workspaceConnections) return { success: false }
    const conn = data.value.workspaceConnections.find(c => c.id === idOrType || c.type === idOrType)
    if (!conn) return { success: false }

    if (conn.type === 'officetimesheets') {
      return await syncOfficeTimesheets()
    }

    conn.status = 'syncing'
    await new Promise(r => setTimeout(r, 600))
    const nowStr = `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    conn.lastSynced = nowStr
    conn.status = 'connected'

    addNotification({
      title: `${conn.name} Synced`,
      message: `Workspace data and logs refreshed for ${conn.name}.`,
      time: 'Just now',
      type: 'success',
      read: false
    })

    save()
    return { success: true }
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
    generateApiKey,
    revokeApiKey,
    deleteApiKey,
    updateOfficeIntegration,
    syncOfficeTimesheets,
    connectWorkspace,
    disconnectWorkspace,
    syncWorkspaceConnection,
    syncSheets,
    hasSheets: computed(() => Boolean(config.public.sheetsEndpoint))
  }
}



