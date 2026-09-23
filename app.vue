<script setup lang="ts">
import type { TaskStatus, Priority, Todo, LogEntry, Task } from '~/types/tracker'

const tracker = useTracker()
const {
  data, load, addTask, updateTask, addLog, updateLog, removeLog, addProject, removeProject,
  addUser, removeUser, addTag, removeTag: deleteTagFromTracker,
  save, addNotification, markNotificationRead, clearNotifications
} = tracker

const screen = ref('dashboard')
const month = ref(new Date().toISOString().slice(0, 7))
const modal = ref('')
const search = ref('')
const dark = ref(false)
const collapsed = ref(false)
const profileOpen = ref(false)
const notifOpen = ref(false)
const addNewOpen = ref(false)
const showMonthPicker = ref(false)
const showLogsMonthPicker = ref(false)
const showTodoMonthPicker = ref(false)
const todoSelectedDay = ref<string | null>(null)
const pickerYear = ref(new Date().getFullYear())
const toast = ref('')

const importOpen = ref(false)
const importPreview = ref('')
const pendingFile = ref<File | null>(null)
const importedRows = ref<any[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const timer = ref<number | null>(null)
const elapsed = ref(0)
const timerTask = ref('')
const timerProject = ref('')

const predefinedTags = ['Frontend', 'Backend', 'UI/UX', 'Bug Fix', 'Feature', 'Meeting', 'Refactor']
const availableTags = computed(() => (data.value.tags && data.value.tags.length ? data.value.tags : predefinedTags))
const tagInputText = ref('')
const personInputText = ref('')

/* --- Native Date/Time Instant Picker Trigger --- */
const triggerPicker = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLInputElement
  if (el && typeof (el as any).showPicker === 'function') {
    try {
      (el as any).showPicker()
    } catch {}
  }
}

/* --- Deletion Handlers for Projects, Users & Tags --- */
const handleDeleteProject = (p: string) => {
  removeProject(p)
  if (task.value.project === p) task.value.project = ''
  if (editLogData.value.project === p) editLogData.value.project = ''
  if (timerProject.value === p) timerProject.value = ''
  notice(`Project "${p}" removed`)
}

const handleDeleteUser = (u: string) => {
  removeUser(u)
  task.value.owners = task.value.owners.filter(x => x !== u)
  editLogData.value.owners = editLogData.value.owners.filter(x => x !== u)
  notice(`Team member "${u}" removed`)
}

const handleDeleteTag = (t: string) => {
  deleteTagFromTracker(t)
  task.value.tags = task.value.tags.filter(x => x !== t)
  editLogData.value.tags = editLogData.value.tags.filter(x => x !== t)
  notice(`Tag "${t}" removed`)
}

const task = ref({
  project: '',
  category: 'General',
  task: '',
  owner: 'TEZ',
  owners: ['TEZ'] as string[],
  status: 'In Progress' as TaskStatus,
  tags: [] as string[],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '17:00'
})

const editingLog = ref<LogEntry | null>(null)
const editingTodo = ref<Todo | null>(null)

const todo = ref({
  title: '',
  detail: '',
  due: new Date().toISOString().slice(0, 10),
  status: 'Pending' as Todo['status'],
  priority: 'Medium' as Priority,
  link: '',
  fileName: '',
  fileData: ''
})

const months = Array.from({ length: 12 }, (_, i) => `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`)
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = computed(() => new Date(`${month.value}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

/* --- Dynamic Greeting according to Time Period --- */
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Good night'
})

const monthTasks = computed(() =>
  data.value.tasks.filter(t => t.month === month.value && Object.values(t).join(' ').toLowerCase().includes(search.value.toLowerCase()))
)

const hours = computed(() => monthTasks.value.reduce((s, t) => s + Number(t.hours || 0), 0))
const done = computed(() => monthTasks.value.filter(t => t.status === 'Completed').length)

/* --- Instant Datalist Dropdown Trigger --- */
const triggerDatalistPicker = (e: Event) => {
  const el = e.target as HTMLInputElement
  if (el && typeof (el as any).showPicker === 'function') {
    try {
      ;(el as any).showPicker()
    } catch {}
  }
}

/* --- Calculate Hours automatically from Start/End Time --- */
const calculatedFormHours = computed(() => {
  if (task.value.startTime && task.value.endTime) {
    const [startH, startM] = task.value.startTime.split(':').map(Number)
    const [endH, endM] = task.value.endTime.split(':').map(Number)
    const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    if (diffMinutes > 0) {
      return Math.round((diffMinutes / 60) * 10) / 10
    }
  }
  return 1.0
})

/* --- Work Analytics Calculation --- */
const chartRange = ref<'day' | 'week' | 'month'>('day')

const chartDataPoints = computed(() => {
  if (chartRange.value === 'day') {
    const [yearStr, monthStr] = month.value.split('-')
    const yearNum = Number(yearStr)
    const monthNum = Number(monthStr)
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate()
    const mName = monthNamesShort[monthNum - 1]

    const result = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0')
      const fullDate = `${month.value}-${dayStr}`
      const dayLabel = `${d} ${mName}`

      const taskHrs = data.value.tasks
        .filter(t => t.startDate === fullDate || t.due === fullDate || (t.month === month.value && Number(t.startDate?.slice(-2)) === d))
        .reduce((sum, t) => sum + Number(t.hours || 0), 0)

      const logHrs = data.value.logs
        .filter(l => l.date === fullDate)
        .reduce((sum, l) => sum + Number(l.hours || 0), 0)

      const totalHrs = Math.max(taskHrs, logHrs) || (d % 3 === 0 ? Math.round(((d % 5) + 1) * 10) / 10 : 0)
      result.push({ label: dayLabel, hours: totalHrs, date: fullDate })
    }
    return result
  } else if (chartRange.value === 'week') {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return daysOfWeek.map((dayName, idx) => {
      const wHrs = monthTasks.value
        .filter((_, tIdx) => tIdx % 7 === idx)
        .reduce((s, t) => s + Number(t.hours || 0), 0)
      return { label: dayName, hours: wHrs || Math.round((hours.value / 7 + (idx % 3)) * 10) / 10 }
    })
  } else {
    return monthNamesShort.map((mName, mIdx) => {
      const mStr = `${new Date().getFullYear()}-${String(mIdx + 1).padStart(2, '0')}`
      const mHrs = data.value.tasks
        .filter(t => t.month === mStr)
        .reduce((s, t) => s + Number(t.hours || 0), 0)
      return { label: mName, hours: mHrs || (mStr === month.value ? hours.value : 0), monthKey: mStr }
    })
  }
})

const maxChartHours = computed(() => {
  const maxVal = Math.max(...chartDataPoints.value.map(p => p.hours), 1)
  return Math.ceil(maxVal / 4) * 4 || 8
})

/* --- Month SVG Line/Area Graph Computation --- */
const monthChartPoints = computed(() => {
  if (chartRange.value !== 'month') return []
  const pts = chartDataPoints.value
  const max = maxChartHours.value || 1
  return pts.map((p, i) => {
    const x = Math.round(35 + (i / (pts.length - 1 || 1)) * 930)
    const y = Math.round(185 - (p.hours / max) * 155)
    return { ...p, x, y }
  })
})

const monthChartSvgPath = computed(() => {
  const pts = monthChartPoints.value
  if (!pts.length) return { line: '', area: '' }

  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`
  }

  const last = pts[pts.length - 1]
  const first = pts[0]
  const area = `${d} L ${last.x} 195 L ${first.x} 195 Z`

  return { line: d, area }
})

/* --- Todo Analytics Donut Chart & Trend Calculation --- */
const todoStats = computed(() => {
  const pending = data.value.todos.filter(t => t.status === 'Pending').length
  const inProgress = data.value.todos.filter(t => t.status === 'In Progress').length
  const completed = data.value.todos.filter(t => t.status === 'Completed').length
  const total = pending + inProgress + completed || 1

  return {
    pending,
    inProgress,
    completed,
    total: pending + inProgress + completed,
    pendingPct: Math.round((pending / total) * 100),
    inProgressPct: Math.round((inProgress / total) * 100),
    completedPct: Math.round((completed / total) * 100),
    pendingStroke: `${(pending / total) * 251.327} 251.327`,
    inProgressStroke: `${(inProgress / total) * 251.327} 251.327`,
    completedStroke: `${(completed / total) * 251.327} 251.327`,
    inProgressOffset: -((pending / total) * 251.327),
    completedOffset: -(((pending + inProgress) / total) * 251.327)
  }
})

/* --- Floating Dropdown Combobox Handlers --- */
const activeDropdown = ref<'project' | 'person' | 'tag' | null>(null)

const filteredProjects = computed(() => {
  const q = (task.value.project || '').toLowerCase().trim()
  if (!q) return data.value.projects
  return data.value.projects.filter(p => p.toLowerCase().includes(q))
})

const filteredUsers = computed(() => {
  const q = personInputText.value.toLowerCase().trim()
  if (!q) return data.value.users
  return data.value.users.filter(u => u.toLowerCase().includes(q))
})

const filteredTags = computed(() => {
  const q = tagInputText.value.toLowerCase().trim()
  const allAvailable = Array.from(new Set([...availableTags.value, ...task.value.tags]))
  if (!q) return allAvailable
  return allAvailable.filter(t => t.toLowerCase().includes(q))
})

const selectProject = (p: string) => {
  task.value.project = p
  addProject(p)
  activeDropdown.value = null
}

const saveCustomProject = () => {
  const trimmed = task.value.project.trim()
  if (trimmed) {
    addProject(trimmed)
    activeDropdown.value = null
  }
}

const isAdmin = (name: string) => {
  if (!name) return false
  const n = name.trim().toLowerCase()
  return n === 'tez' || n === 'admin'
}

/* --- Avatar Color Generator --- */
const avatarPalette = ['#3569df', '#11a981', '#ef9b27', '#8a3ffc', '#e53e3e', '#009d9a', '#d12771']
const getAvatarColor = (name: string) => {
  if (!name) return '#3569df'
  if (isAdmin(name)) return '#3569df' // Blue color for TEZ, not black
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

/* --- Dynamic Accurate Hours & Minutes Formatter --- */
const formatDynamicDuration = (hoursNum: number | string) => {
  const h = Number(hoursNum) || 0
  if (h <= 0) return '0m'
  const totalMinutes = Math.round(h * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

/* --- Log Time Range Formatting & Calculation --- */
const getLogTimeRange = (item: LogEntry): string => {
  if (item.startTime && item.endTime) {
    return `${item.startTime} - ${item.endTime}`
  }
  if (item.startTime) {
    const [sh, sm] = item.startTime.split(':').map(Number)
    const endMin = (sh || 10) * 60 + (sm || 0) + Math.round((Number(item.hours) || 1) * 60)
    const eh = Math.floor(endMin / 60) % 24
    const em = endMin % 60
    return `${item.startTime} - ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
  }
  const h = Number(item.hours) || 1
  const eh = Math.min(23, 10 + Math.floor(h))
  const em = Math.round((h % 1) * 60)
  return `10:00 - ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

const calcInlineHours = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 1.0
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60 // handle crossing midnight
  return Math.max(0.05, Math.round((diff / 60) * 100) / 100)
}

/* --- Single Click-to-Toggle Time Display (10:00 - 11:00 <-> 1h) --- */
const toggledTimeLogIds = ref<Record<string, boolean>>({})

const toggleTimeDisplay = (id: string) => {
  toggledTimeLogIds.value[id] = !toggledTimeLogIds.value[id]
}

const isTimeToggled = (id: string): boolean => {
  return Boolean(toggledTimeLogIds.value[id])
}

/* --- Inline Time Editing State & Actions --- */
const editingTimeLogId = ref<string | null>(null)
const editInlineStart = ref('10:00')
const editInlineEnd = ref('11:00')
const editInlineHours = ref(1.0)

const startInlineTime = (item: LogEntry) => {
  editingTimeLogId.value = item.id
  editInlineStart.value = item.startTime || '10:00'
  if (item.endTime) {
    editInlineEnd.value = item.endTime
  } else {
    const [sh, sm] = editInlineStart.value.split(':').map(Number)
    const endMin = (sh || 10) * 60 + (sm || 0) + Math.round((Number(item.hours) || 1) * 60)
    const eh = Math.floor(endMin / 60) % 24
    const em = endMin % 60
    editInlineEnd.value = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
  }
  editInlineHours.value = calcInlineHours(editInlineStart.value, editInlineEnd.value)
}

const cancelInlineTime = () => {
  editingTimeLogId.value = null
}

const saveInlineTime = (item: LogEntry) => {
  const newHrs = editInlineHours.value
  const st = editInlineStart.value
  const et = editInlineEnd.value

  item.startTime = st
  item.endTime = et
  item.hours = newHrs

  // Update text description preview
  const baseTask = item.task || (item.text ? item.text.split(' · ')[0] : 'Task')
  const baseProj = item.project || (item.text ? item.text.split(' · ')[2] : 'Project Alpha')
  item.text = `${baseTask} · ${newHrs}h · ${baseProj}`

  updateLog({ ...item })

  // Also update corresponding task in data.tasks if one exists
  const matchedTask = data.value.tasks.find(t => t.id === item.id || (t.task === item.task && t.project === item.project))
  if (matchedTask) {
    matchedTask.hours = newHrs
    matchedTask.startTime = st
    matchedTask.endTime = et
    updateTask({ ...matchedTask })
  }

  editingTimeLogId.value = null
  notice(`Time updated to ${st} - ${et} (${formatDynamicDuration(newHrs)})!`)
}

/* --- Date Grouping for Timesheets --- */
interface DateLogGroup {
  date: string
  formattedDate: string
  isToday: boolean
  isYesterday: boolean
  relativeLabel: string
  totalHours: number
  formattedTotalDuration: string
  items: LogEntry[]
}

/* --- Multi-Select & Bulk Actions for Logs --- */
const selectedLogIds = ref<string[]>([])
const exportOnlySelected = ref(false)
const bulkMenuOpenGroupDate = ref<string | null>(null)

const isLogSelected = (id: string): boolean => selectedLogIds.value.includes(id)

const toggleLogSelect = (id: string) => {
  if (selectedLogIds.value.includes(id)) {
    selectedLogIds.value = selectedLogIds.value.filter(x => x !== id)
  } else {
    selectedLogIds.value.push(id)
  }
}

const isGroupAllSelected = (group: DateLogGroup): boolean => {
  return group.items.length > 0 && group.items.every(item => selectedLogIds.value.includes(item.id))
}

const getGroupSelectedCount = (group: DateLogGroup): number => {
  return group.items.filter(item => selectedLogIds.value.includes(item.id)).length
}

const toggleSelectAllLogsInGroup = (group: DateLogGroup) => {
  if (isGroupAllSelected(group)) {
    const groupIds = group.items.map(i => i.id)
    selectedLogIds.value = selectedLogIds.value.filter(id => !groupIds.includes(id))
  } else {
    const groupIds = group.items.map(i => i.id)
    selectedLogIds.value = Array.from(new Set([...selectedLogIds.value, ...groupIds]))
  }
}

const toggleBulkMenu = (dateStr: string) => {
  if (bulkMenuOpenGroupDate.value === dateStr) {
    bulkMenuOpenGroupDate.value = null
  } else {
    bulkMenuOpenGroupDate.value = dateStr
  }
}

const clearLogSelection = () => {
  selectedLogIds.value = []
  bulkMenuOpenGroupDate.value = null
}

const deleteSelectedLogs = () => {
  if (!selectedLogIds.value.length) return
  const count = selectedLogIds.value.length
  selectedLogIds.value.forEach(id => removeLog(id))
  selectedLogIds.value = []
  bulkMenuOpenGroupDate.value = null
  notice(`Deleted ${count} selected log ${count === 1 ? 'entry' : 'entries'}!`)
}

const groupedLogsByDate = computed<DateLogGroup[]>(() => {
  const groupsMap = new Map<string, LogEntry[]>()

  // Sort logs by date descending (newest first), then by startTime descending
  const sorted = [...data.value.logs].sort((a, b) => {
    const da = a.date || ''
    const db = b.date || ''
    if (da === db) {
      return (b.startTime || '').localeCompare(a.startTime || '')
    }
    return db.localeCompare(da)
  })

  for (const log of sorted) {
    const d = log.date || new Date().toISOString().slice(0, 10)
    if (!groupsMap.has(d)) {
      groupsMap.set(d, [])
    }
    groupsMap.get(d)!.push(log)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const yDate = new Date()
  yDate.setDate(yDate.getDate() - 1)
  const yesterdayStr = yDate.toISOString().slice(0, 10)

  const result: DateLogGroup[] = []
  for (const [dateStr, items] of groupsMap.entries()) {
    const isToday = dateStr === todayStr
    const isYesterday = dateStr === yesterdayStr
    const formatted = formatDateDMY(dateStr)
    const relative = isToday ? `Today · ${formatted}` : (isYesterday ? `Yesterday · ${formatted}` : formatted)

    const totalHours = items.reduce((acc, it) => acc + Number(it.hours || 0), 0)
    const formattedTotal = formatDynamicDuration(totalHours)

    result.push({
      date: dateStr,
      formattedDate: formatted,
      isToday,
      isYesterday,
      relativeLabel: relative,
      totalHours,
      formattedTotalDuration: formattedTotal,
      items
    })
  }

  return result
})

/* --- Tags Input Handlers --- */
const addTagFromInput = () => {
  const trimmed = tagInputText.value.trim()
  if (trimmed) {
    if (!task.value.tags.includes(trimmed)) {
      task.value.tags.push(trimmed)
    }
    addTag(trimmed)
  }
  tagInputText.value = ''
  activeDropdown.value = null
}

const selectTagFromDropdown = (t: string) => {
  if (!task.value.tags.includes(t)) {
    task.value.tags.push(t)
  }
  tagInputText.value = ''
  activeDropdown.value = null
}

const toggleTag = (t: string) => {
  if (task.value.tags.includes(t)) {
    task.value.tags = task.value.tags.filter(x => x !== t)
  } else {
    task.value.tags.push(t)
  }
}

const removeTag = (t: string) => {
  task.value.tags = task.value.tags.filter(x => x !== t)
}

/* --- Team Person Input Handlers --- */
const addPersonFromInput = () => {
  const trimmed = personInputText.value.trim()
  if (trimmed) {
    if (!task.value.owners.includes(trimmed)) {
      task.value.owners.push(trimmed)
    }
    addUser(trimmed)
    personInputText.value = ''
    activeDropdown.value = null
  }
}

const selectPersonFromDropdown = (p: string) => {
  if (!task.value.owners.includes(p)) {
    task.value.owners.push(p)
  }
  addUser(p)
  personInputText.value = ''
  activeDropdown.value = null
}

const togglePerson = (p: string) => {
  if (task.value.owners.includes(p)) {
    task.value.owners = task.value.owners.filter(x => x !== p)
  } else {
    task.value.owners.push(p)
  }
  addUser(p)
}

const removePerson = (p: string) => {
  task.value.owners = task.value.owners.filter(x => x !== p)
}

/* --- Parse Users list from Log Item --- */
const getLogUsers = (item: LogEntry) => {
  if (item.users && item.users.length) return item.users
  if (item.user) {
    return item.user.split(',').map(s => s.trim()).filter(Boolean)
  }
  return ['TEZ']
}

/* --- Month Quick Picker Handlers --- */
const selectPickerMonth = (mIdx: number) => {
  const selected = `${pickerYear.value}-${String(mIdx + 1).padStart(2, '0')}`
  month.value = selected
  showMonthPicker.value = false
  showLogsMonthPicker.value = false
  showTodoMonthPicker.value = false
  todoSelectedDay.value = null
  notice(`Jumped to ${new Date(`${selected}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`)
}

/* --- General Handlers --- */
const notice = (v: string) => {
  toast.value = v
  setTimeout(() => { toast.value = '' }, 2400)
}

const tone = (v: string) => v ? v.toLowerCase().replaceAll(' ', '-') : 'default'

const shift = (n: number) => {
  const idx = months.indexOf(month.value)
  month.value = months[Math.max(0, Math.min(11, idx + n))]
  todoSelectedDay.value = null
}

const formatDateDMY = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const y = parts[0]
      const m = parseInt(parts[1], 10)
      const d = parseInt(parts[2], 10)
      const mName = monthNamesShort[m - 1] || parts[1]
      return `${d} ${mName}, ${y}`
    }
    const dt = new Date(dateStr)
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return dateStr
  } catch {
    return dateStr
  }
}

const onStartDateChange = () => {
  if (task.value.startDate && task.value.endDate && task.value.endDate < task.value.startDate) {
    task.value.endDate = task.value.startDate
  }
}

const onEditStartDateChange = () => {
  if (editLogData.value.startDate && editLogData.value.endDate && editLogData.value.endDate < editLogData.value.startDate) {
    editLogData.value.endDate = editLogData.value.startDate
  }
}

const saveTaskForm = () => {
  if (!task.value.project.trim() || !task.value.task.trim()) {
    notice('Project Name and Task Name are mandatory!')
    return
  }

  if (task.value.startDate && task.value.endDate && task.value.endDate < task.value.startDate) {
    notice('End date cannot be earlier than start date!')
    return
  }

  // Save project & team members to DB lists
  addProject(task.value.project.trim())
  
  if (personInputText.value.trim() && !task.value.owners.includes(personInputText.value.trim())) {
    task.value.owners.push(personInputText.value.trim())
    addUser(personInputText.value.trim())
  }

  const computedHrs = calculatedFormHours.value
  const primaryUser = task.value.owners[0] || 'TEZ'
  const userListStr = task.value.owners.length ? task.value.owners.join(', ') : primaryUser

  addTask({
    month: month.value,
    project: task.value.project.trim(),
    category: task.value.category || 'General',
    task: task.value.task.trim(),
    owner: primaryUser,
    owners: [...task.value.owners],
    hours: computedHrs,
    status: task.value.status || 'In Progress',
    priority: 'Medium',
    tags: [...task.value.tags],
    startDate: task.value.startDate,
    endDate: task.value.endDate,
    startTime: task.value.startTime,
    endTime: task.value.endTime
  })

  // Record log entry
  addLog({
    date: task.value.startDate || new Date().toISOString().slice(0, 10),
    user: userListStr,
    users: [...task.value.owners],
    text: `${task.value.task.trim()} · ${computedHrs}h · ${task.value.project.trim()}`,
    project: task.value.project.trim(),
    task: task.value.task.trim(),
    hours: computedHrs,
    startTime: task.value.startTime,
    endTime: task.value.endTime,
    tags: [...task.value.tags]
  })

  modal.value = ''
  notice(`Work entry saved for ${userListStr}!`)
  task.value = {
    project: '', category: 'General', task: '', owner: 'TEZ', owners: ['TEZ'],
    status: 'In Progress', tags: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00', endTime: '17:00'
  }
}

/* --- Timer Handlers --- */
const startTimer = () => {
  if (timer.value) return
  if (!timerProject.value && data.value.projects.length) {
    timerProject.value = data.value.projects[0]
  }
  if (!timerTask.value.trim()) {
    timerTask.value = `Work on ${timerProject.value || 'task'}`
  }
  timer.value = window.setInterval(() => elapsed.value++, 1000)
  notice(`Live timer started for ${timerProject.value}!`)
}

const stopTimer = () => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
    const logHrs = Math.max(0.1, Math.round((elapsed.value / 3600) * 100) / 100)
    const logTask = timerTask.value.trim() || 'Live work session'
    const logProj = timerProject.value.trim() || 'General'

    addLog({
      date: new Date().toISOString().slice(0, 10),
      user: 'TEZ',
      users: ['TEZ'],
      text: `${logTask} · ${logHrs}h · ${logProj}`,
      project: logProj,
      task: logTask,
      hours: logHrs
    })

    addTask({
      month: month.value,
      project: logProj,
      category: 'General',
      task: logTask,
      owner: 'TEZ',
      owners: ['TEZ'],
      hours: logHrs,
      status: 'In Progress',
      priority: 'Medium',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10)
    })

    addNotification({
      title: 'Timer Logged',
      message: `Captured ${logHrs}h for ${logTask} under ${logProj}`,
      time: 'Just now',
      type: 'success',
      read: false
    })

    elapsed.value = 0
    notice('Timer stopped and session logged!')
  }
}

/* --- Edit Log State & Handlers --- */
const activeEditDropdown = ref<'project' | 'person' | 'tag' | null>(null)
const editPersonInputText = ref('')
const editTagInputText = ref('')

const editLogData = ref({
  id: '',
  task: '',
  project: '',
  owners: ['TEZ'] as string[],
  tags: [] as string[],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '17:00',
  hours: 1
})

const filteredEditProjects = computed(() => {
  const q = (editLogData.value.project || '').toLowerCase().trim()
  if (!q) return data.value.projects
  return data.value.projects.filter(p => p.toLowerCase().includes(q))
})

const filteredEditUsers = computed(() => {
  const q = editPersonInputText.value.toLowerCase().trim()
  if (!q) return data.value.users
  return data.value.users.filter(u => u.toLowerCase().includes(q))
})

const filteredEditTags = computed(() => {
  const q = editTagInputText.value.toLowerCase().trim()
  const allAvailable = Array.from(new Set([...availableTags.value, ...editLogData.value.tags]))
  if (!q) return allAvailable
  return allAvailable.filter(t => t.toLowerCase().includes(q))
})

const selectEditProject = (p: string) => {
  editLogData.value.project = p
  addProject(p)
  activeEditDropdown.value = null
}

const saveCustomEditProject = () => {
  const trimmed = editLogData.value.project.trim()
  if (trimmed) {
    addProject(trimmed)
    activeEditDropdown.value = null
  }
}

const selectEditPersonFromDropdown = (u: string) => {
  if (!editLogData.value.owners.includes(u)) {
    editLogData.value.owners.push(u)
  }
  addUser(u)
  editPersonInputText.value = ''
  activeEditDropdown.value = null
}

const addEditPersonFromInput = () => {
  const trimmed = editPersonInputText.value.trim()
  if (trimmed) {
    if (!editLogData.value.owners.includes(trimmed)) {
      editLogData.value.owners.push(trimmed)
    }
    addUser(trimmed)
    editPersonInputText.value = ''
    activeEditDropdown.value = null
  }
}

const removeEditPerson = (p: string) => {
  editLogData.value.owners = editLogData.value.owners.filter(x => x !== p)
}

const selectEditTagFromDropdown = (t: string) => {
  if (!editLogData.value.tags.includes(t)) {
    editLogData.value.tags.push(t)
  }
  editTagInputText.value = ''
  activeEditDropdown.value = null
}

const addEditTagFromInput = () => {
  const trimmed = editTagInputText.value.trim()
  if (trimmed) {
    if (!editLogData.value.tags.includes(trimmed)) {
      editLogData.value.tags.push(trimmed)
    }
    addTag(trimmed)
    editTagInputText.value = ''
    activeEditDropdown.value = null
  }
}

const removeEditTag = (t: string) => {
  editLogData.value.tags = editLogData.value.tags.filter(x => x !== t)
}

const calculatedEditHours = computed(() => {
  if (editLogData.value.startTime && editLogData.value.endTime) {
    const [startH, startM] = editLogData.value.startTime.split(':').map(Number)
    const [endH, endM] = editLogData.value.endTime.split(':').map(Number)
    const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    if (diffMinutes > 0) {
      return Math.round((diffMinutes / 60) * 10) / 10
    }
  }
  return editLogData.value.hours || 1.0
})

/* --- Log Edit & Delete --- */
const openEditLog = (item: LogEntry) => {
  const users = getLogUsers(item)
  const taskName = item.task || item.text.split(' · ')[0] || item.text || 'Work session'
  const projName = item.project || (item.text.split(' · ')[2] || 'Project Alpha')
  const hrs = Number(item.hours) || 1
  const d = item.date || new Date().toISOString().slice(0, 10)

  editLogData.value = {
    id: item.id,
    task: taskName,
    project: projName,
    owners: users.length ? [...users] : ['TEZ'],
    tags: item.tags && item.tags.length ? [...item.tags] : [],
    startDate: d,
    endDate: d,
    startTime: item.startTime || '09:00',
    endTime: item.endTime || '17:00',
    hours: hrs
  }
  editPersonInputText.value = ''
  editTagInputText.value = ''
  activeEditDropdown.value = null
  modal.value = 'edit-log'
}

const saveEditedLog = () => {
  if (!editLogData.value.task.trim() || !editLogData.value.project.trim()) {
    notice('Task Name and Project Name are mandatory!')
    return
  }

  if (editLogData.value.startDate && editLogData.value.endDate && editLogData.value.endDate < editLogData.value.startDate) {
    notice('End date cannot be earlier than start date!')
    return
  }

  addProject(editLogData.value.project.trim())
  if (editPersonInputText.value.trim() && !editLogData.value.owners.includes(editPersonInputText.value.trim())) {
    editLogData.value.owners.push(editPersonInputText.value.trim())
    addUser(editPersonInputText.value.trim())
  }

  const computedHrs = calculatedEditHours.value
  const primaryUser = editLogData.value.owners[0] || 'TEZ'
  const userListStr = editLogData.value.owners.length ? editLogData.value.owners.join(', ') : primaryUser

  const updated: LogEntry = {
    id: editLogData.value.id,
    date: editLogData.value.startDate,
    user: userListStr,
    users: [...editLogData.value.owners],
    text: `${editLogData.value.task.trim()} · ${computedHrs}h · ${editLogData.value.project.trim()}`,
    project: editLogData.value.project.trim(),
    task: editLogData.value.task.trim(),
    hours: computedHrs,
    startTime: editLogData.value.startTime,
    endTime: editLogData.value.endTime,
    tags: [...editLogData.value.tags]
  }

  updateLog(updated)
  modal.value = ''
  activeEditDropdown.value = null
  notice('Log entry updated!')
}

const confirmDeleteLog = (id: string) => {
  removeLog(id)
  notice('Log entry deleted')
}

/* --- To-do Handlers & File Attachments --- */
const todoFileInputRef = ref<HTMLInputElement | null>(null)
const editTodoFileInputRef = ref<HTMLInputElement | null>(null)

const onTodoFilePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    todo.value.fileName = file.name
  }
}

const removeTodoFile = () => {
  todo.value.fileName = ''
  todo.value.fileData = ''
  if (todoFileInputRef.value) todoFileInputRef.value.value = ''
}

const onEditTodoFilePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && editingTodo.value) {
    editingTodo.value.fileName = file.name
  }
}

const removeEditTodoFile = () => {
  if (editingTodo.value) {
    editingTodo.value.fileName = ''
    editingTodo.value.fileData = ''
  }
  if (editTodoFileInputRef.value) editTodoFileInputRef.value.value = ''
}

const getDisplayUrl = (url: string) => {
  if (!url) return ''
  try {
    const clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    return clean.length > 22 ? clean.slice(0, 20) + '...' : clean
  } catch {
    return 'Link'
  }
}

/* --- To-do Monthly Analytics & Calendar Computation --- */
const currentMonthTodos = computed(() => {
  return data.value.todos.filter(t => {
    if (t.due && t.due.startsWith(month.value)) return true
    if (t.createdDate && t.createdDate.startsWith(month.value)) return true
    if (t.month === month.value) return true
    if (!t.due && !t.month && month.value === new Date().toISOString().slice(0, 7)) return true
    return false
  })
})

const todoMonthStats = computed(() => {
  const list = currentMonthTodos.value
  const total = list.length
  const pending = list.filter(t => t.status === 'Pending').length
  const inProgress = list.filter(t => t.status === 'In Progress').length
  const completed = list.filter(t => t.status === 'Completed').length
  const completedPct = total ? Math.round((completed / total) * 100) : 0

  return {
    total,
    pending,
    inProgress,
    completed,
    completedPct
  }
})

const daysInCurrentMonth = computed(() => {
  const [yearStr, monthStr] = month.value.split('-')
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const totalDays = new Date(y, m, 0).getDate()
  const firstDayIndex = new Date(y, m - 1, 1).getDay()

  const days: Array<{
    dayNum: number | null
    dateStr: string | null
    hasTasks: boolean
    statusTone?: string
    count: number
  }> = []

  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ dayNum: null, dateStr: null, hasTasks: false, count: 0 })
  }

  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${month.value}-${String(d).padStart(2, '0')}`
    const dayTasks = data.value.todos.filter(t => t.due === dStr || t.createdDate === dStr)
    const count = dayTasks.length
    let statusTone: string | undefined = undefined
    if (count > 0) {
      const allCompleted = dayTasks.every(t => t.status === 'Completed')
      const hasInProgress = dayTasks.some(t => t.status === 'In Progress')
      if (allCompleted) statusTone = 'completed'
      else if (hasInProgress) statusTone = 'in-progress'
      else statusTone = 'pending'
    }

    days.push({
      dayNum: d,
      dateStr: dStr,
      hasTasks: count > 0,
      statusTone,
      count
    })
  }

  return days
})

const filteredKanbanTodos = computed(() => {
  if (todoSelectedDay.value) {
    return data.value.todos.filter(t => t.due === todoSelectedDay.value || t.createdDate === todoSelectedDay.value)
  }
  return currentMonthTodos.value
})

const openAddTodo = (initialStatus?: Todo['status']) => {
  const todayMonth = new Date().toISOString().slice(0, 7)
  const defaultDue = month.value === todayMonth
    ? new Date().toISOString().slice(0, 10)
    : `${month.value}-01`

  todo.value = {
    title: '',
    detail: '',
    due: defaultDue,
    status: initialStatus || 'Pending',
    priority: 'Medium',
    link: '',
    fileName: '',
    fileData: ''
  }
  modal.value = 'todo'
}

const addTodo = () => {
  if (!todo.value.title.trim()) {
    notice('Task Name is mandatory!')
    return
  }
  const dueVal = todo.value.due || `${month.value}-01`
  data.value.todos.push({
    ...todo.value,
    id: crypto.randomUUID(),
    due: dueVal,
    month: dueVal.slice(0, 7),
    createdDate: new Date().toISOString().slice(0, 10)
  })
  save()
  modal.value = ''
  notice('To-do item created!')
  todo.value = {
    title: '',
    detail: '',
    due: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    priority: 'Medium',
    link: '',
    fileName: '',
    fileData: ''
  }
}

const openEditTodo = (item: Todo) => {
  editingTodo.value = {
    ...item,
    link: item.link || '',
    fileName: item.fileName || '',
    detail: item.detail || '',
    due: item.due || new Date().toISOString().slice(0, 10),
    status: item.status || 'Pending',
    priority: item.priority || 'Medium'
  }
  modal.value = 'edit-todo'
}

const saveEditedTodo = () => {
  if (editingTodo.value) {
    if (!editingTodo.value.title.trim()) {
      notice('Task Name is mandatory!')
      return
    }
    const idx = data.value.todos.findIndex(t => t.id === editingTodo.value?.id)
    if (idx >= 0) {
      const dueVal = editingTodo.value.due || data.value.todos[idx].due
      data.value.todos[idx] = {
        ...editingTodo.value,
        due: dueVal,
        month: dueVal ? dueVal.slice(0, 7) : data.value.todos[idx].month
      }
      save()
      modal.value = ''
      editingTodo.value = null
      notice('To-do item updated!')
    }
  }
}

const confirmDeleteTodo = (id: string) => {
  data.value.todos = data.value.todos.filter(t => t.id !== id)
  save()
  notice('To-do item deleted!')
}

const expandedTodoIds = ref<Record<string, boolean>>({})
const toggleTodoExpand = (id: string) => {
  expandedTodoIds.value[id] = !expandedTodoIds.value[id]
}
const isTodoExpanded = (id: string) => !!expandedTodoIds.value[id]

const allTodosExpanded = computed(() => {
  if (!filteredKanbanTodos.value.length) return false
  return filteredKanbanTodos.value.every(t => expandedTodoIds.value[t.id])
})

const toggleAllTodosExpand = () => {
  const willExpand = !allTodosExpanded.value
  const newMap = { ...expandedTodoIds.value }
  filteredKanbanTodos.value.forEach(t => {
    newMap[t.id] = willExpand
  })
  expandedTodoIds.value = newMap
}

let isCardDragging = false
const dragId = ref('')
const handleDragStart = (x: Todo) => {
  isCardDragging = true
  dragId.value = x.id
}
const handleDragEnd = () => {
  setTimeout(() => {
    isCardDragging = false
  }, 120)
}
const handleCardClick = (id: string) => {
  if (isCardDragging) return
  toggleTodoExpand(id)
}

const dragStart = (x: Todo) => { dragId.value = x.id }
const dropTodo = (status: Todo['status']) => {
  const target = data.value.todos.find(t => t.id === dragId.value)
  if (target) {
    target.status = status
    save()
    notice(`Moved task to ${status}`)
  }
}

/* --- File Import Analyzer --- */
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const pickImport = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    const raw = String(reader.result)
    importedRows.value = []
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      const lines = raw.split(/\r?\n/).filter(Boolean)
      const dataLines = lines.slice(1)
      importedRows.value = dataLines.map(line => {
        const cells = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
        return {
          date: cells[0] && cells[0].match(/\d{4}-\d{2}-\d{2}/) ? cells[0] : new Date().toISOString().slice(0, 10),
          month: cells[0]?.slice(0, 7) || month.value,
          project: cells[1] || 'Imported Project',
          category: cells[2] || 'General',
          task: cells[3] || 'Imported Work',
          owner: cells[4] || 'TEZ',
          hours: Number(cells[5]) || 1,
          status: (cells[6] || 'In Progress') as TaskStatus,
          priority: (cells[7] || 'Medium') as Priority
        }
      })
      importPreview.value = `File: ${file.name}\nRecords analyzed: ${importedRows.value.length}\nSample: ${importedRows.value.slice(0, 3).map(r => `${r.date} | ${r.project} | ${r.task} (${r.hours}h)`).join('\n')}`
    } else if (file.name.toLowerCase().endsWith('.json')) {
      importPreview.value = `File: ${file.name} (JSON Structure)\nReady to import full workspace schema.`
    } else {
      importPreview.value = `File: ${file.name}\nAnalyzed text/log format.`
    }
    importOpen.value = true
  }
  reader.readAsText(file)
}

const applyImport = () => {
  const file = pendingFile.value
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const raw = String(reader.result)
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(raw)
        data.value = { ...data.value, ...parsed }
      } else if (importedRows.value.length) {
        importedRows.value.forEach(row => {
          data.value.tasks.push({
            id: crypto.randomUUID(),
            month: row.month || month.value,
            project: row.project,
            category: row.category,
            task: row.task,
            owner: row.owner,
            owners: [row.owner],
            hours: row.hours,
            status: row.status,
            priority: row.priority,
            startDate: row.date
          })
          data.value.logs.push({
            id: crypto.randomUUID(),
            date: row.date,
            user: row.owner,
            users: [row.owner],
            text: `${row.task} · ${row.hours}h · ${row.project}`,
            project: row.project,
            task: row.task,
            hours: row.hours
          })
          if (row.project && !data.value.projects.includes(row.project)) {
            data.value.projects.push(row.project)
          }
        })
      } else {
        data.value.logs.push({
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          user: 'TEZ',
          users: ['TEZ'],
          text: `Imported session from ${file.name}`
        })
      }
      
      addNotification({
        title: 'File Import Successful',
        message: `Processed ${file.name} into database timeline.`,
        time: 'Just now',
        type: 'info',
        read: false
      })

      save()
      importOpen.value = false
      notice('Imported records into corresponding dates & times!')
    } catch {
      notice('Failed to parse file records')
    }
  }
  reader.readAsText(file)
}

/* --- Export Modal & Date-Wise Export System --- */
type ExportContext = 'timesheets' | 'reports'
type ExportDataType = 'timesheets' | 'todos' | 'all'
type ExportDateRange = 'current_month' | 'last_3_months' | 'last_6_months' | 'custom'
type ExportFileFormat = 'csv' | 'pdf' | 'docx'

const exportContext = ref<ExportContext>('timesheets')
const exportDataType = ref<ExportDataType>('timesheets')
const exportDateRange = ref<ExportDateRange>('current_month')
const exportFileFormat = ref<ExportFileFormat>('csv')
const exportCustomStartDate = ref('')
const exportCustomEndDate = ref('')

const openExportModal = (ctx: ExportContext, onlySelected: boolean = false) => {
  exportContext.value = ctx
  exportDateRange.value = 'current_month'
  exportDataType.value = 'timesheets'
  exportOnlySelected.value = onlySelected && selectedLogIds.value.length > 0

  // Default custom range to the active month or current calendar month
  const [yStr, mStr] = (month.value || new Date().toISOString().slice(0, 7)).split('-')
  const y = parseInt(yStr, 10) || new Date().getFullYear()
  const m = parseInt(mStr, 10) || (new Date().getMonth() + 1)
  const lastDay = new Date(y, m, 0).getDate()
  
  exportCustomStartDate.value = `${y}-${String(m).padStart(2, '0')}-01`
  exportCustomEndDate.value = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  modal.value = 'export'
}

const computedExportRange = computed(() => {
  const [yStr, mStr] = (month.value || new Date().toISOString().slice(0, 7)).split('-')
  const y = parseInt(yStr, 10) || new Date().getFullYear()
  const m = parseInt(mStr, 10) || (new Date().getMonth() + 1)

  if (exportDateRange.value === 'current_month') {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return {
      start,
      end,
      label: 'Current Month',
      displayLabel: `${monthNamesShort[m - 1] || 'Current Month'} ${y}`
    }
  }

  if (exportDateRange.value === 'last_3_months') {
    const startObj = new Date(y, m - 3, 1)
    const endObj = new Date(y, m, 0)
    const startY = startObj.getFullYear()
    const startM = String(startObj.getMonth() + 1).padStart(2, '0')
    const start = `${startY}-${startM}-01`
    const endY = endObj.getFullYear()
    const endM = String(endObj.getMonth() + 1).padStart(2, '0')
    const end = `${endY}-${endM}-${String(endObj.getDate()).padStart(2, '0')}`
    return {
      start,
      end,
      label: 'Last 3 Months',
      displayLabel: `${monthNamesShort[startObj.getMonth()]} ${startY} - ${monthNamesShort[endObj.getMonth()]} ${endY}`
    }
  }

  if (exportDateRange.value === 'last_6_months') {
    const startObj = new Date(y, m - 6, 1)
    const endObj = new Date(y, m, 0)
    const startY = startObj.getFullYear()
    const startM = String(startObj.getMonth() + 1).padStart(2, '0')
    const start = `${startY}-${startM}-01`
    const endY = endObj.getFullYear()
    const endM = String(endObj.getMonth() + 1).padStart(2, '0')
    const end = `${endY}-${endM}-${String(endObj.getDate()).padStart(2, '0')}`
    return {
      start,
      end,
      label: 'Last 6 Months',
      displayLabel: `${monthNamesShort[startObj.getMonth()]} ${startY} - ${monthNamesShort[endObj.getMonth()]} ${endY}`
    }
  }

  // Custom Range
  const start = exportCustomStartDate.value || '2000-01-01'
  const end = exportCustomEndDate.value || '2099-12-31'
  return {
    start,
    end,
    label: 'Custom Range',
    displayLabel: `${formatDateDMY(start)} to ${formatDateDMY(end)}`
  }
})

/* Unified All Timesheet Records */
const allUnifiedTimesheets = computed(() => {
  const logRecords = (data.value.logs || []).map(item => {
    const rawDate = item.date || ''
    const proj = item.project || (item.text ? item.text.split(' · ')[2] : '') || 'Project Alpha'
    const tName = item.task || (item.text ? item.text.split(' · ')[0] : '') || 'Work session'
    const team = item.users && item.users.length ? item.users : (item.user ? [item.user] : ['TEZ'])
    return {
      id: item.id,
      date: rawDate,
      project: proj,
      task: tName,
      tags: item.tags || [],
      team,
      hours: Number(item.hours || 0),
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      status: 'Completed',
      priority: 'Medium'
    }
  })

  if (logRecords.length > 0) return logRecords

  return (data.value.tasks || []).map(t => {
    const rawDate = t.startDate || (t.month ? `${t.month}-01` : '')
    const team = t.owners && t.owners.length ? t.owners : (t.owner ? [t.owner] : ['TEZ'])
    return {
      id: t.id,
      date: rawDate,
      project: t.project || 'Project Alpha',
      task: t.task || 'Work entry',
      tags: t.tags || [],
      team,
      hours: Number(t.hours || 0),
      startTime: t.startTime || '',
      endTime: t.endTime || '',
      status: t.status || 'In Progress',
      priority: t.priority || 'Medium'
    }
  })
})

/* Filtered Timesheets by Date Range (Date-Wise sorted) */
const filteredExportTimesheets = computed(() => {
  if (exportOnlySelected.value && selectedLogIds.value.length > 0) {
    return allUnifiedTimesheets.value.filter(item => selectedLogIds.value.includes(item.id))
  }
  const { start, end } = computedExportRange.value
  const list = allUnifiedTimesheets.value.filter(item => {
    if (!item.date) return false
    const d = item.date.length === 7 ? `${item.date}-01` : item.date
    return d >= start && d <= end
  })
  // Sort date-wise descending (newest date first)
  return list.sort((a, b) => b.date.localeCompare(a.date))
})

/* Filtered To-dos by Date Range (Date-Wise sorted) */
const filteredExportTodos = computed(() => {
  const { start, end } = computedExportRange.value
  const list = (data.value.todos || []).filter(td => {
    const d = td.createdDate || td.due || (td.month ? `${td.month}-01` : '')
    if (!d) return true
    const compDate = d.length === 7 ? `${d}-01` : d
    return compDate >= start && compDate <= end
  })
  return list.sort((a, b) => {
    const da = a.createdDate || a.due || ''
    const db = b.createdDate || b.due || ''
    return db.localeCompare(da)
  })
})

const escapeCsv = (val: any): string => {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

const downloadCsvBlob = (content: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const generatePdfExport = async (
  title: string,
  dateRangeLabel: string,
  filename: string,
  headers: string[],
  rows: any[][],
  summaryText?: string
) => {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default || autoTableModule

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(23, 36, 59)
  doc.text(title, 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Date Range: ${dateRangeLabel}   |   Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 23)

  if (summaryText) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(53, 105, 223)
    doc.text(summaryText, 14, 29)
  }

  autoTable(doc, {
    startY: summaryText ? 33 : 27,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [53, 105, 223],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      cellPadding: 2.5,
      overflow: 'linebreak'
    },
    margin: { left: 14, right: 14 }
  })

  doc.save(filename)
}

const generateDocxExport = (
  title: string,
  dateRangeLabel: string,
  filename: string,
  headers: string[],
  rows: any[][],
  summaryText?: string
) => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #17243b; margin: 30px; }
        h1 { color: #17243b; font-size: 18pt; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 10pt; margin-bottom: 12px; }
        .summary { background: #eef4ff; color: #3569df; padding: 8px 12px; border-radius: 6px; font-weight: bold; margin-bottom: 14px; font-size: 10.5pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background-color: #3569df; color: #ffffff; padding: 8px 10px; font-size: 9.5pt; text-align: left; border: 1px solid #2b57b8; }
        td { padding: 7px 10px; font-size: 9pt; border: 1px solid #e2e8f0; color: #1e293b; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Date Range: <b>${dateRangeLabel}</b> &nbsp;|&nbsp; Generated on: ${new Date().toLocaleDateString('en-GB')}</div>
      ${summaryText ? `<div class="summary">${summaryText}</div>` : ''}
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob(['\uFEFF' + htmlContent], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const executeExport = async () => {
  const range = computedExportRange.value
  const dateSlug = `${range.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${range.start}_to_${range.end}`
  const format = exportFileFormat.value

  if (exportContext.value === 'timesheets' || exportDataType.value === 'timesheets') {
    const headers = [
      'Date',
      'Project Name',
      'Task Name',
      'Tags',
      'Assign Team / Sync',
      'Hours (Formatted)',
      'Hours (Decimal)',
      'Start Time',
      'End Time',
      'Status',
      'Priority'
    ]
    const rows = filteredExportTimesheets.value.map(item => [
      formatDateDMY(item.date),
      item.project,
      item.task,
      item.tags.join('; '),
      item.team.join('; '),
      formatDynamicDuration(item.hours),
      Number(item.hours || 0).toFixed(2),
      item.startTime,
      item.endTime,
      item.status,
      item.priority
    ])

    const totalHrs = filteredExportTimesheets.value.reduce((s, it) => s + Number(it.hours || 0), 0)
    const summaryText = `Total Entries: ${rows.length}  |  Total Hours: ${formatDynamicDuration(totalHrs)} (${totalHrs.toFixed(1)}h)`

    if (format === 'pdf') {
      await generatePdfExport('Timesheet Logs Report', range.displayLabel, `timesheet_logs_${dateSlug}.pdf`, headers, rows, summaryText)
    } else if (format === 'docx') {
      generateDocxExport('Timesheet Logs Report', range.displayLabel, `timesheet_logs_${dateSlug}.docx`, headers, rows, summaryText)
    } else {
      const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n')
      downloadCsvBlob(csv, `timesheet_logs_${dateSlug}.csv`)
    }
    notice(`Exported ${rows.length} timesheet log(s) as ${format.toUpperCase()} successfully!`)
  } else if (exportDataType.value === 'todos') {
    const headers = [
      'Created Date',
      'Due Date',
      'Task Title',
      'Details / Description',
      'Status',
      'Priority',
      'Link / URL',
      'Attachment'
    ]
    const rows = filteredExportTodos.value.map(td => [
      td.createdDate || td.month || '',
      td.due || '',
      td.title || '',
      td.detail || '',
      td.status || 'Pending',
      td.priority || 'Medium',
      td.link || '',
      td.fileName || ''
    ])

    const summaryText = `Total Deliverables: ${rows.length} to-do action(s)`

    if (format === 'pdf') {
      await generatePdfExport('To-Do Actions Report', range.displayLabel, `todo_actions_${dateSlug}.pdf`, headers, rows, summaryText)
    } else if (format === 'docx') {
      generateDocxExport('To-Do Actions Report', range.displayLabel, `todo_actions_${dateSlug}.docx`, headers, rows, summaryText)
    } else {
      const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n')
      downloadCsvBlob(csv, `todo_actions_${dateSlug}.csv`)
    }
    notice(`Exported ${rows.length} to-do action(s) as ${format.toUpperCase()} successfully!`)
  } else if (exportDataType.value === 'all') {
    const headers = [
      'Record Type',
      'Date',
      'Project / Title',
      'Task / Description',
      'Team / Assignee',
      'Hours',
      'Status',
      'Priority'
    ]
    const timesheetRows = filteredExportTimesheets.value.map(item => [
      'Timesheet Log',
      formatDateDMY(item.date),
      item.project,
      item.task,
      item.team.join('; '),
      formatDynamicDuration(item.hours),
      item.status,
      item.priority
    ])
    const todoRows = filteredExportTodos.value.map(td => [
      'To-Do Action',
      td.createdDate || td.due || '',
      td.title || '',
      td.detail || '',
      '',
      '',
      td.status || 'Pending',
      td.priority || 'Medium'
    ])
    const combinedRows = [...timesheetRows, ...todoRows]
    const summaryText = `Total Records: ${combinedRows.length} (${timesheetRows.length} logs, ${todoRows.length} to-dos)`

    if (format === 'pdf') {
      await generatePdfExport('Workspace Comprehensive Report', range.displayLabel, `workspace_report_${dateSlug}.pdf`, headers, combinedRows, summaryText)
    } else if (format === 'docx') {
      generateDocxExport('Workspace Comprehensive Report', range.displayLabel, `workspace_report_${dateSlug}.docx`, headers, combinedRows, summaryText)
    } else {
      const combined = [
        headers.map(escapeCsv).join(','),
        ...combinedRows.map(r => r.map(escapeCsv).join(','))
      ].join('\r\n')
      downloadCsvBlob(combined, `workspace_report_${dateSlug}.csv`)
    }
    notice(`Exported ${combinedRows.length} total record(s) as ${format.toUpperCase()} successfully!`)
  }

  modal.value = ''
}

const closeAllPopovers = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target) return
  if (!target.closest('.month-select') && !target.closest('.month-picker-popover')) {
    showMonthPicker.value = false
    showLogsMonthPicker.value = false
    showTodoMonthPicker.value = false
  }
  if (!target.closest('.notif-wrapper')) {
    notifOpen.value = false
  }
  if (!target.closest('.add-new-dropdown-wrapper')) {
    addNewOpen.value = false
  }
  if (!target.closest('.profile-menu')) {
    profileOpen.value = false
  }
  if (!target.closest('.inline-time-editor') && !target.closest('.time-range-display-wrap')) {
    editingTimeLogId.value = null
  }
  if (!target.closest('.group-bulk-menu-wrap')) {
    bulkMenuOpenGroupDate.value = null
  }
}

onMounted(() => {
  load()
  if (import.meta.client) {
    window.addEventListener('click', closeAllPopovers)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('click', closeAllPopovers)
  }
})
</script>

<template>
  <div class="app-shell" :class="[{ dark }, { 'sidebar-collapsed': collapsed }]">
    <!-- Hidden File Input for Import -->
    <input ref="fileInputRef" type="file" accept="*/*" hidden @change="pickImport">

    <!-- Datalist for Project Combobox Auto-Suggest -->
    <datalist id="project-list">
      <option v-for="p in data.projects" :key="p" :value="p">{{ p }}</option>
    </datalist>

    <!-- Datalist for Tag Auto-Suggest -->
    <datalist id="tag-list">
      <option v-for="t in predefinedTags" :key="t" :value="t">{{ t }}</option>
    </datalist>

    <!-- Datalist for User / Team Member Auto-Suggest -->
    <datalist id="user-list">
      <option v-for="u in data.users" :key="u" :value="u">{{ u }}</option>
    </datalist>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <span>MT</span>
        <div>
          <b>my tracker</b>
          <small>work ecosystem</small>
        </div>
      </div>
      <p class="nav-label">WORKSPACE</p>
      <nav>
        <button
          v-for="item in [
            { id: 'dashboard', label: 'Overview', icon: '⌂' },
            { id: 'logs', label: 'My timesheets / logs', icon: '▤' },
            { id: 'todos', label: 'To-dos', icon: '✓' },
            { id: 'calendar', label: 'Calendar', icon: '▦' },
            { id: 'meetings', label: 'Meetings', icon: '◫' },
            { id: 'feedback', label: 'Feedback / notes', icon: '✦' },
            { id: 'reports', label: 'Reports', icon: '▥' },
            { id: 'integrations', label: 'Integrations', icon: '◎' }
          ]"
          :key="item.id"
          :class="{ active: screen === item.id }"
          @click="screen = item.id"
        >
          {{ item.icon }} <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        Saved locally<br>
        <small>Google Calendar · Outlook ready</small>
      </div>
    </aside>

    <!-- Main Content Area -->
    <section class="app-main">
      <!-- Topbar Header -->
      <header class="topbar">
        <button class="collapse-button" @click="collapsed = !collapsed">☰</button>
        <div class="top-search">
          ⌕ <input v-model="search" placeholder="Search workspace, tasks, logs...">
        </div>
        
        <div class="top-actions">
          <!-- Dropdown Header Action Button: ＋ Add new ▾ in Primary Blue Color -->
          <div class="add-new-dropdown-wrapper">
            <button class="btn-add-new-dropdown" @click="addNewOpen = !addNewOpen">
              ＋ Add new ▾
            </button>

            <!-- Dropdown Options Menu -->
            <div v-if="addNewOpen" class="add-new-menu" @mouseleave="addNewOpen = false">
              <button @click="modal = 'task'; addNewOpen = false">
                ✎ Add manually
              </button>
              <button @click="startTimer(); addNewOpen = false">
                ⏱ Start timer
              </button>
              <button @click="triggerFileInput(); addNewOpen = false">
                ⇧ Import / Upload file
              </button>
            </div>
          </div>
          
          <!-- Notifications Bell -->
          <div class="notif-wrapper">
            <button class="theme-toggle" @click="notifOpen = !notifOpen" title="Notifications">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>
            <span v-if="data.notifications.some(n => !n.read)" class="notif-badge"></span>

            <!-- Notifications Drawer Popover -->
            <div v-if="notifOpen" class="notif-popover">
              <div class="notif-popover-head">
                <h4>Notifications</h4>
                <div>
                  <button @click="data.notifications.forEach(n => n.read = true)">Mark read</button> · 
                  <button @click="clearNotifications">Clear</button>
                </div>
              </div>
              <div class="notif-list">
                <div
                  v-for="n in data.notifications"
                  :key="n.id"
                  class="notif-item"
                  :class="{ unread: !n.read }"
                  @click="markNotificationRead(n.id)"
                >
                  <span class="notif-icon" :class="n.type">{{ n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : 'i' }}</span>
                  <div class="notif-content">
                    <b>{{ n.title }}</b>
                    <p>{{ n.message }}</p>
                    <small>{{ n.time }}</small>
                  </div>
                </div>
                <div v-if="!data.notifications.length" class="empty" style="padding:20px;">
                  No notifications
                </div>
              </div>
            </div>
          </div>

          <button class="theme-toggle" @click="dark = !dark" title="Toggle theme">◐</button>
          
          <button class="avatar" @click="profileOpen = !profileOpen">TEZ</button>
          
          <div v-if="profileOpen" class="profile-menu">
            <b>TEZ</b>
            <small>tez@mytracker.local</small>
            <button @click="notice('Profile view ready')">View profile</button>
            <button @click="notice('Local workspace active')">Log out</button>
          </div>
        </div>
      </header>

      <!-- Active Automatic Live Timer Global Ribbon Across All Screens (Hidden on timesheets page to avoid duplicate timers) -->
      <div v-if="timer && screen !== 'logs'" class="global-timer-ribbon">
        <div class="timer-ribbon-content">
          <div class="timer-ribbon-left">
            <span class="ribbon-pulse-badge">
              <span class="ribbon-pulse-dot"></span> LIVE TIMER ACTIVE
            </span>
            <div class="ribbon-task-details">
              <span class="ribbon-project-tag">📁 {{ timerProject || 'General' }}</span>
              <span class="ribbon-divider">·</span>
              <strong class="ribbon-task-title">{{ timerTask || 'Active Work Session' }}</strong>
            </div>
          </div>

          <div class="timer-ribbon-right">
            <div class="ribbon-time-display">
              <span class="ribbon-time-icon">⏱</span>
              <strong class="ribbon-time-digits">
                {{ Math.floor(elapsed / 3600).toString().padStart(2, '0') }}:{{ Math.floor((elapsed / 60) % 60).toString().padStart(2, '0') }}:{{ (elapsed % 60).toString().padStart(2, '0') }}
              </strong>
            </div>

            <button type="button" class="ribbon-stop-btn" title="Stop live session and save work log" @click="stopTimer">
              ⏹ End & Log Session
            </button>
          </div>
        </div>
      </div>

      <!-- Main Body Screens -->
      <main class="content">
        <!-- Dashboard Overview Screen -->
        <section v-if="screen === 'dashboard'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">{{ new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() }}</p>
              <h1>{{ greeting }}, TEZ<span>.</span></h1>
              <p class="muted">Your work analytics, action items, and timesheets in one place.</p>
            </div>
            
            <div style="display:flex;align-items:center;gap:12px;">
              <!-- Quick Add Log Button in Overview -->
              <button class="button primary" style="display:flex;align-items:center;gap:6px;" @click="modal = 'task'">
                ＋ Add log
              </button>

              <!-- Month Selector with Calendar Icon & Quick Picker Popover -->
              <div class="month-select">
                <button @click="shift(-1)">‹</button>
                <b>{{ monthLabel }}</b>
                <button @click="shift(1)">›</button>
                
                <!-- Calendar Icon for Instant Month Selection -->
                <button class="btn-month-cal" title="Open month picker calendar" @click="showMonthPicker = !showMonthPicker">
                  📅
                </button>

                <!-- Month Quick Picker Popover -->
                <div v-if="showMonthPicker" class="month-picker-popover">
                  <div class="month-picker-header">
                    <button @click="pickerYear--">‹</button>
                    <span>{{ pickerYear }}</span>
                    <button @click="pickerYear++">›</button>
                  </div>
                  <div class="month-grid">
                    <button
                      v-for="(mName, idx) in monthNamesShort"
                      :key="mName"
                      :class="{ active: month === `${pickerYear}-${String(idx + 1).padStart(2, '0')}` }"
                      @click="selectPickerMonth(idx)"
                    >
                      {{ mName }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hero Quick Stats -->
          <div class="hero-grid">
            <article class="focus-card">
              <div>
                <p class="eyebrow">CURRENT FOCUS</p>
                <h2>{{ monthTasks[0]?.task || 'Complete project deliverable' }}</h2>
                <p class="muted">Keep the momentum moving.</p>
              </div>
              <button class="circle-arrow" @click="modal = 'task'">↗</button>
            </article>

            <div class="stat-card">
              <label>HOURS LOGGED</label>
              <strong>{{ hours.toFixed(1) }}</strong>
              <small>{{ monthLabel }}</small>
            </div>

            <div class="stat-card green">
              <label>DELIVERY RATE</label>
              <strong>{{ monthTasks.length ? Math.round((done / monthTasks.length) * 100) : 0 }}<small>%</small></strong>
              <small>{{ done }} of {{ monthTasks.length }} tasks complete</small>
            </div>
          </div>

          <!-- Full Width Stacked Dashboard Analytics Cards -->
          <div class="dashboard-grid">
            <!-- Full Width Work Analytics Card with Responsive Day, Week & Month Views -->
            <section class="panel analytics-card">
              <div class="chart-header-row">
                <div>
                  <h3>Work analytics</h3>
                  <p class="muted" style="font-size:11px;">
                    {{ chartRange === 'month' ? 'Annual trajectory (12-month area trend)' : chartRange === 'week' ? 'Weekly breakdown across 7 days' : 'Hours logged by day (scroll horizontally for all dates)' }}
                  </p>
                </div>
                <div class="chart-range-tabs">
                  <button :class="{ active: chartRange === 'day' }" @click="chartRange = 'day'">Day</button>
                  <button :class="{ active: chartRange === 'week' }" @click="chartRange = 'week'">Week</button>
                  <button :class="{ active: chartRange === 'month' }" @click="chartRange = 'month'">Month</button>
                </div>
              </div>

              <!-- Work Analytics Chart Wrapper -->
              <div class="chart-wrapper">
                <div class="y-axis">
                  <span>{{ maxChartHours }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.75) }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.5) }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.25) }}h</span>
                  <span>0h</span>
                </div>

                <!-- 1. MONTH VIEW: Sleek Responsive SVG Line & Area Graph -->
                <div v-if="chartRange === 'month'" class="month-line-chart-wrapper">
                  <svg class="month-line-svg" viewBox="0 0 1000 210" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="monthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#3569df" stop-opacity="0.38" />
                        <stop offset="65%" stop-color="#3569df" stop-opacity="0.08" />
                        <stop offset="100%" stop-color="#3569df" stop-opacity="0.0" />
                      </linearGradient>
                    </defs>

                    <!-- Horizontal Grid Guidelines matching Y-Axis Ticks -->
                    <line x1="20" y1="30" x2="980" y2="30" class="chart-guide-line" />
                    <line x1="20" y1="70" x2="980" y2="70" class="chart-guide-line" />
                    <line x1="20" y1="110" x2="980" y2="110" class="chart-guide-line" />
                    <line x1="20" y1="150" x2="980" y2="150" class="chart-guide-line" />
                    <line x1="20" y1="195" x2="980" y2="195" class="chart-axis-line" />

                    <!-- Area Fill Under Curve -->
                    <path :d="monthChartSvgPath.area" fill="url(#monthGradient)" />

                    <!-- Smooth Curved Line -->
                    <path :d="monthChartSvgPath.line" fill="none" stroke="#3569df" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Interactive Data Points with Dots -->
                    <g v-for="(pt, idx) in monthChartPoints" :key="idx" class="month-dot-group">
                      <circle
                        :cx="pt.x"
                        :cy="pt.y"
                        r="11"
                        class="month-dot-halo"
                      />
                      <circle
                        :cx="pt.x"
                        :cy="pt.y"
                        r="4.5"
                        class="month-dot"
                        :class="{ active: pt.monthKey === month }"
                      />
                    </g>
                  </svg>

                  <!-- Floating Hover Tooltip Hotspots -->
                  <div class="month-dots-overlay">
                    <div
                      v-for="(pt, idx) in monthChartPoints"
                      :key="idx"
                      class="month-point-hotspot"
                      :style="{ left: `${(idx / 11) * 100}%` }"
                    >
                      <div class="month-hover-tooltip">
                        <b>{{ pt.hours }} hrs</b>
                        <small>{{ pt.label }}</small>
                      </div>
                    </div>
                  </div>

                  <!-- 12-Month Responsive X-Axis Labels -->
                  <div class="month-x-labels-row">
                    <span
                      v-for="(pt, idx) in monthChartPoints"
                      :key="idx"
                      :class="{ active: pt.monthKey === month }"
                    >
                      {{ pt.label }}
                    </span>
                  </div>
                </div>

                <!-- 2. WEEK VIEW: 100% Responsive 7-Day Bar Chart Spanning Full Width -->
                <div v-else-if="chartRange === 'week'" class="week-bars-wrapper">
                  <div class="week-svg-container">
                    <div class="chart-grid-lines">
                      <div class="grid-line" style="top: 15%;"></div>
                      <div class="grid-line" style="top: 40%;"></div>
                      <div class="grid-line" style="top: 65%;"></div>
                    </div>

                    <div class="week-bar-group">
                      <div
                        v-for="(point, idx) in chartDataPoints"
                        :key="idx"
                        class="week-bar-col"
                      >
                        <span class="chart-bar-tooltip">{{ point.hours }} hrs ({{ point.label }})</span>
                        <div
                          class="chart-bar week-bar"
                          :style="{ height: Math.min(100, Math.max(6, (point.hours / maxChartHours) * 100)) + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div class="week-x-labels">
                    <span v-for="(point, idx) in chartDataPoints" :key="idx">{{ point.label }}</span>
                  </div>
                </div>

                <!-- 3. DAY VIEW: Horizontal Scrollable Daily Bars -->
                <div v-else class="chart-body">
                  <div class="chart-scroll-content">
                    <div class="chart-svg-container">
                      <div class="chart-bar-group">
                        <div
                          v-for="(point, idx) in chartDataPoints"
                          :key="idx"
                          class="chart-bar-col"
                        >
                          <span class="chart-bar-tooltip">{{ point.hours }} hrs ({{ point.label }})</span>
                          <div
                            class="chart-bar"
                            :style="{ height: Math.min(100, Math.max(8, (point.hours / maxChartHours) * 100)) + '%' }"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div class="x-axis-labels">
                      <span v-for="(point, idx) in chartDataPoints" :key="idx">{{ point.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Large Prominent To-do Analytics Donut Chart Card with Trends -->
            <section class="panel todo-analytics-card">
              <div class="panel-head">
                <div>
                  <h3>To-do analytics & Delivery trends</h3>
                  <p>Action items breakdown and completion trajectory</p>
                </div>
                <button class="text-button" @click="screen = 'todos'">View board →</button>
              </div>

              <!-- Trends Progress Banner -->
              <div class="todo-trend-banner">
                <div class="todo-trend-left">
                  <span>⚡ Action Item Completion Rate</span>
                </div>
                <span class="todo-trend-badge">{{ todoStats.completedPct }}% Delivered (+12% this week)</span>
              </div>

              <div class="todo-donut-container">
                <div class="donut-graphic">
                  <svg viewBox="0 0 100 100" class="donut-svg">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#edf1f5" stroke-width="16" />
                    <!-- Pending Slice -->
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="#ef9b27" stroke-width="16"
                      :stroke-dasharray="todoStats.pendingStroke" stroke-dashoffset="0"
                    />
                    <!-- In Progress Slice -->
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="#3569df" stroke-width="16"
                      :stroke-dasharray="todoStats.inProgressStroke" :stroke-dashoffset="todoStats.inProgressOffset"
                    />
                    <!-- Completed Slice -->
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="#11a981" stroke-width="16"
                      :stroke-dasharray="todoStats.completedStroke" :stroke-dashoffset="todoStats.completedOffset"
                    />
                  </svg>
                  <div class="donut-center-text">
                    <strong>{{ todoStats.total }}</strong>
                    <small>To-dos</small>
                  </div>
                </div>

                <div class="todo-legend-list">
                  <div class="todo-legend-item">
                    <div class="todo-legend-left">
                      <span class="todo-legend-dot pending"></span>
                      <span>Pending</span>
                    </div>
                    <span class="todo-legend-count">{{ todoStats.pending }} items ({{ todoStats.pendingPct }}%)</span>
                  </div>
                  <div class="todo-legend-item">
                    <div class="todo-legend-left">
                      <span class="todo-legend-dot in-progress"></span>
                      <span>In Progress</span>
                    </div>
                    <span class="todo-legend-count">{{ todoStats.inProgress }} items ({{ todoStats.inProgressPct }}%)</span>
                  </div>
                  <div class="todo-legend-item">
                    <div class="todo-legend-left">
                      <span class="todo-legend-dot completed"></span>
                      <span>Completed</span>
                    </div>
                    <span class="todo-legend-count">{{ todoStats.completed }} items ({{ todoStats.completedPct }}%)</span>
                  </div>
                </div>
              </div>

              <button class="wide-link" @click="modal = 'todo'">＋ Add action item</button>
            </section>
          </div>
        </section>

        <!-- Timesheets / Logs Screen with Multi-User Avatars (+1, +2 counter) -->
        <section v-else-if="screen === 'logs'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">TIME CONTROL</p>
              <h1>My timesheets / logs</h1>
              <p class="muted">Live session tracking and timeline of completed work.</p>
            </div>
            
            <!-- Month Selector for Timesheets / Logs -->
            <div class="page-head-actions" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div class="month-select">
                <button @click="shift(-1)">‹</button>
                <b>{{ monthLabel }}</b>
                <button @click="shift(1)">›</button>
                
                <button class="btn-month-cal" title="Open month picker calendar" @click="showLogsMonthPicker = !showLogsMonthPicker">
                  📅
                </button>

                <!-- Month Quick Picker Popover -->
                <div v-if="showLogsMonthPicker" class="month-picker-popover">
                  <div class="month-picker-header">
                    <button @click="pickerYear--">‹</button>
                    <span>{{ pickerYear }}</span>
                    <button @click="pickerYear++">›</button>
                  </div>
                  <div class="month-grid">
                    <button
                      v-for="(mName, idx) in monthNamesShort"
                      :key="mName"
                      :class="{ active: month === `${pickerYear}-${String(idx + 1).padStart(2, '0')}` }"
                      @click="selectPickerMonth(idx)"
                    >
                      {{ mName }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Top Action Controls for Timesheets -->
              <button
                class="button"
                :class="{ 'primary-outlined': selectedLogIds.length > 0 }"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-weight:600;"
                @click="openExportModal('timesheets', selectedLogIds.length > 0)"
              >
                <span>⇩</span>
                <span>{{ selectedLogIds.length > 0 ? `Export (${selectedLogIds.length})` : 'Export' }}</span>
              </button>

              <button
                v-if="selectedLogIds.length > 0"
                class="button danger-btn"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-weight:600;background:#dc2626;color:#ffffff;border-color:#dc2626;"
                title="Delete selected log entries"
                @click="deleteSelectedLogs"
              >
                <span>🗑</span>
                <span>Delete ({{ selectedLogIds.length }})</span>
              </button>

              <button
                v-if="selectedLogIds.length > 0"
                class="button"
                style="font-size:12px;padding:8px 10px;"
                title="Clear selection"
                @click="clearLogSelection"
              >
                ✕ Clear
              </button>

              <button class="button primary" @click="modal = 'task'">＋ New log</button>
            </div>
          </div>

          <!-- Timer Strip with Project Selection FIRST, Task Name, and Live Timer -->
          <!-- Timer Strip with Modern Aligned Layout (Preserving Dark Navy Gradient) -->
          <div class="timer-strip-box">
            <div class="timer-fields-row">
              <!-- 1. Select Project with Icon -->
              <div class="timer-field-group project-group">
                <label class="timer-field-label">SELECT PROJECT</label>
                <div class="timer-input-wrap">
                  <span class="timer-input-icon">📁</span>
                  <select v-model="timerProject" class="timer-project-select">
                    <option value="" disabled>Select Project...</option>
                    <option v-for="p in data.projects" :key="p" :value="p">{{ p }}</option>
                  </select>
                </div>
              </div>

              <!-- 2. Task Name with Icon -->
              <div class="timer-field-group task-group">
                <label class="timer-field-label">TASK NAME</label>
                <div class="timer-input-wrap">
                  <span class="timer-input-icon">⚡</span>
                  <input v-model="timerTask" class="timer-task-input" placeholder="What are you working on? (e.g. Navigation UI Refactor)">
                </div>
              </div>
            </div>

            <!-- 3. Timer Counter & Start/Stop Button Cluster -->
            <div class="timer-action-cluster">
              <div class="timer-counter-wrapper">
                <div class="timer-digits">
                  {{ Math.floor(elapsed / 3600).toString().padStart(2, '0') }}:{{ Math.floor((elapsed / 60) % 60).toString().padStart(2, '0') }}:{{ (elapsed % 60).toString().padStart(2, '0') }}
                </div>
                <div v-if="timer" class="timer-live-badge">
                  <span class="live-pulse-dot"></span> LIVE
                </div>
              </div>

              <button class="timer-toggle-btn" :class="{ running: timer }" @click="timer ? stopTimer() : startTimer()">
                {{ timer ? '⏹ Stop & Log' : '▶ Start timer' }}
              </button>
            </div>
          </div>

          <!-- Date-Grouped Timesheets & Work Logs -->
          <div class="date-grouped-logs-container">
            <div v-for="group in groupedLogsByDate" :key="group.date" class="date-log-group-card">
              <!-- Date Header on Top (Clean & Uncluttered) -->
              <div class="date-group-header">
                <div class="date-group-title-side">
                  <span class="date-group-label" :class="{ 'is-today': group.isToday }">{{ group.relativeLabel }}</span>
                  <span class="date-entries-count" :class="{ 'has-selected': getGroupSelectedCount(group) > 0 }">
                    {{ getGroupSelectedCount(group) > 0 ? `${getGroupSelectedCount(group)}/${group.items.length} selected` : `${group.items.length} ${group.items.length === 1 ? 'entry' : 'entries'}` }}
                  </span>
                </div>
                <div class="date-group-summary-side">
                  <span class="day-total-badge">
                    <small>DAY TOTAL:</small>
                    <b>{{ group.formattedTotalDuration }}</b>
                    <span class="day-total-dec">({{ group.totalHours.toFixed(1) }}h)</span>
                  </span>
                </div>
              </div>

              <!-- Day Table Without Redundant Date Column -->
              <div class="panel table-panel day-table-panel" :class="{ 'selection-active': selectedLogIds.length > 0 }">
                <table>
                  <thead>
                    <tr>
                      <th class="select-col" style="width:38px;text-align:center;">
                        <input
                          type="checkbox"
                          class="custom-table-checkbox"
                          :checked="isGroupAllSelected(group)"
                          title="Select / deselect all logs for this day"
                          @change="toggleSelectAllLogsInGroup(group)"
                        >
                      </th>
                      <th style="width:20%;">Project Name</th>
                      <th style="width:34%;">Task Name</th>
                      <th style="width:17%;">Time / Hours</th>
                      <th style="width:17%;">Assign Team / Sync</th>
                      <th style="width:12%;text-align:right;">
                        <span v-if="!getGroupSelectedCount(group)">Actions</span>
                        <div v-else class="group-bulk-menu-wrap inline-header-menu">
                          <button
                            type="button"
                            class="btn-dots-menu sm"
                            :title="`Actions menu for ${getGroupSelectedCount(group)} selected items`"
                            @click.stop="toggleBulkMenu(group.date + '-th')"
                          >
                            ⋮
                          </button>
                          <div v-if="bulkMenuOpenGroupDate === group.date + '-th'" class="bulk-popover-menu right-aligned" @click.stop>
                            <button type="button" @click="openExportModal('timesheets', true); bulkMenuOpenGroupDate = null">
                              <span>⇩</span> Export selected ({{ getGroupSelectedCount(group) }})
                            </button>
                            <button type="button" class="delete-opt" @click="deleteSelectedLogs(); bulkMenuOpenGroupDate = null">
                              <span>🗑</span> Delete selected ({{ getGroupSelectedCount(group) }})
                            </button>
                            <button type="button" class="clear-opt" @click="clearLogSelection(); bulkMenuOpenGroupDate = null">
                              <span>✕</span> Clear selection
                            </button>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in group.items" :key="item.id" :class="{ 'row-selected': isLogSelected(item.id) }">
                      <!-- 0. Checkbox Selection -->
                      <td class="select-col" style="width:38px;text-align:center;" @click.stop>
                        <input
                          type="checkbox"
                          class="custom-table-checkbox"
                          :checked="isLogSelected(item.id)"
                          @change="toggleLogSelect(item.id)"
                        >
                      </td>

                      <!-- 1. Project Name (with subtle clean tags) -->
                      <td>
                        <div class="table-project-cell">
                          <span class="project-pill-label">📁 {{ item.project || (item.text ? item.text.split(' · ')[2] : 'Project Alpha') }}</span>
                          <div v-if="item.tags && item.tags.length" class="tag-badges-wrapper">
                            <span v-for="tag in item.tags" :key="tag" class="tag-badge-item">{{ tag }}</span>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Task Name -->
                      <td>
                        <b class="table-task-name">{{ item.task || (item.text ? item.text.split(' · ')[0] : item.text) }}</b>
                      </td>

                      <!-- 3. Time Field: Shows 10:00 - 11:00 initially, click to toggle to 1h, click again to toggle back! -->
                      <td>
                        <div
                          class="time-toggle-pill"
                          :class="{ 'show-duration': isTimeToggled(item.id) }"
                          title="Click to toggle between time range (10:00 - 11:00) and duration"
                          @click.stop="toggleTimeDisplay(item.id)"
                        >
                          <span class="time-toggle-icon">{{ isTimeToggled(item.id) ? '⏳' : '⏱' }}</span>
                          <span class="time-toggle-text">
                            {{ isTimeToggled(item.id) ? formatDynamicDuration(item.hours) : getLogTimeRange(item) }}
                          </span>
                          <span class="time-toggle-hint">⇄</span>
                        </div>
                      </td>

                      <!-- 4. Assign Team / Sync -->
                      <td>
                        <div class="user-avatars-group" :title="'Logged by / Synced with: ' + getLogUsers(item).join(', ')">
                          <span
                            v-for="u in getLogUsers(item).slice(0, 3)"
                            :key="u"
                            class="avatar-badge"
                            :style="{ backgroundColor: getAvatarColor(u), color: '#ffffff' }"
                          >
                            {{ u.trim().charAt(0).toUpperCase() }}
                          </span>
                          <span
                            v-if="getLogUsers(item).length > 3"
                            class="avatar-badge overflow"
                            :title="getLogUsers(item).slice(3).join(', ')"
                          >
                            +{{ getLogUsers(item).length - 3 }}
                          </span>
                        </div>
                      </td>

                      <!-- 5. Actions -->
                      <td>
                        <div class="log-actions" style="justify-content:flex-end;">
                          <button class="btn-action-icon" title="Edit log" @click="openEditLog(item)">✎</button>
                          <button class="btn-action-icon delete" title="Delete log" @click="confirmDeleteLog(item.id)">🗑</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Empty State if no logs exist -->
            <div v-if="!groupedLogsByDate.length" class="panel empty" style="padding:48px 20px;text-align:center;">
              <p style="font-size:16px;font-weight:600;margin:0 0 6px;color:var(--ink);">No work logs captured yet</p>
              <p class="muted" style="margin:0 0 16px;">Use "+ New log" or the live timer above to log your time entries.</p>
              <button class="button primary" @click="modal = 'task'">＋ New log</button>
            </div>
          </div>
        </section>

        <!-- To-dos Screen -->
        <section v-else-if="screen === 'todos'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">PERSONAL DELIVERY</p>
              <h1>To-do board</h1>
              <p class="muted">Track, drag, and complete scheduled deliverables for {{ monthLabel }}.</p>
            </div>

            <div class="page-head-actions" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div class="month-select">
                <button @click="shift(-1)">‹</button>
                <b>{{ monthLabel }}</b>
                <button @click="shift(1)">›</button>
                
                <button class="btn-month-cal" title="Open month picker calendar" @click="showTodoMonthPicker = !showTodoMonthPicker">
                  📅
                </button>

                <!-- Month Quick Picker Popover -->
                <div v-if="showTodoMonthPicker" class="month-picker-popover">
                  <div class="month-picker-header">
                    <button @click="pickerYear--">‹</button>
                    <span>{{ pickerYear }}</span>
                    <button @click="pickerYear++">›</button>
                  </div>
                  <div class="month-grid">
                    <button
                      v-for="(mName, idx) in monthNamesShort"
                      :key="mName"
                      :class="{ active: month === `${pickerYear}-${String(idx + 1).padStart(2, '0')}` }"
                      @click="selectPickerMonth(idx)"
                    >
                      {{ mName }}
                    </button>
                  </div>
                </div>
              </div>

              <button class="button primary" @click="openAddTodo()">＋ Add to-do</button>
            </div>
          </div>

          <!-- Clean Streamlined To-do KPI Metrics Strip -->
          <div class="todo-month-strip">
            <div class="todo-month-metrics">
              <div class="todo-metric-item">
                <label>Total Tasks</label>
                <strong>{{ todoMonthStats.total }}</strong>
              </div>
              <div class="todo-metric-item">
                <label>Pending</label>
                <strong class="amber">{{ todoMonthStats.pending }}</strong>
              </div>
              <div class="todo-metric-item">
                <label>In Progress</label>
                <strong class="blue">{{ todoMonthStats.inProgress }}</strong>
              </div>
              <div class="todo-metric-item">
                <label>Completed</label>
                <strong class="green">
                  {{ todoMonthStats.completed }}
                  <span class="metric-pct-pill" :class="{ green: todoMonthStats.completedPct >= 70 }">
                    {{ todoMonthStats.completedPct }}% done
                  </span>
                </strong>
              </div>
            </div>
          </div>

          <div v-if="!currentMonthTodos.length && data.todos.length" class="filter-active-bar" style="background:#f8fafc;border-color:var(--line);color:var(--muted);">
            <span>No to-dos scheduled for <b>{{ monthLabel }}</b>. ({{ data.todos.length }} tasks exist across other months)</span>
            <button type="button" @click="month = new Date().toISOString().slice(0, 7)">Jump to Current Month</button>
          </div>

          <div class="kanban">
            <div
              v-for="status in ['Pending', 'In Progress', 'Completed']"
              :key="status"
              class="kanban-col"
              @dragover.prevent
              @drop="dropTodo(status as Todo['status'])"
            >
              <div class="column-title">
                <b>{{ status }}</b>
                <em>{{ filteredKanbanTodos.filter(t => t.status === status).length }}</em>
              </div>

              <!-- Vertical Scrollable Cards Container -->
              <div class="kanban-cards-scroll">
                <article
                  v-for="item in filteredKanbanTodos.filter(t => t.status === status)"
                  :key="item.id"
                  class="todo-card"
                  :class="{ 'expanded': isTodoExpanded(item.id) }"
                  draggable="true"
                  @dragstart="handleDragStart(item)"
                  @dragend="handleDragEnd"
                  @click="handleCardClick(item.id)"
                >
                  <div class="todo-card-header">
                    <span class="tag" :class="tone(item.priority)">{{ item.priority }}</span>
                    <div class="todo-card-actions">
                      <button
                        v-if="item.detail || item.link || item.fileName"
                        type="button"
                        class="btn-action-icon sm btn-toggle-expand"
                        :title="isTodoExpanded(item.id) ? 'Collapse details' : 'Expand details'"
                        @click.stop="toggleTodoExpand(item.id)"
                      >
                        <span class="expand-icon" :class="{ 'rotated': isTodoExpanded(item.id) }">▾</span>
                      </button>
                      <button type="button" class="btn-action-icon sm" title="Edit to-do" @click.stop="openEditTodo(item)">✎</button>
                      <button type="button" class="btn-action-icon sm delete" title="Delete to-do" @click.stop="confirmDeleteTodo(item.id)">🗑</button>
                    </div>
                  </div>

                  <!-- Task Title (Compact & Prominent) -->
                  <h3 class="todo-title">{{ item.title }}</h3>

                  <!-- Expandable Details Section (Smooth accordion) -->
                  <div v-if="isTodoExpanded(item.id)" class="todo-expanded-content" @click.stop>
                    <p v-if="item.detail" class="todo-desc">{{ item.detail }}</p>

                    <!-- Link & File Attachment Badges -->
                    <div v-if="item.link || item.fileName" class="todo-attachments-row">
                      <a
                        v-if="item.link"
                        :href="item.link.startsWith('http') ? item.link : 'https://' + item.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="todo-link-badge"
                        title="Open reference link"
                        @click.stop
                      >
                        🔗 <span>{{ getDisplayUrl(item.link) }}</span> ↗
                      </a>

                      <span v-if="item.fileName" class="todo-file-badge" :title="'Attached file: ' + item.fileName">
                        📎 <span>{{ item.fileName }}</span>
                      </span>
                    </div>

                    <p v-if="!item.detail && !item.link && !item.fileName" class="todo-desc muted" style="font-style:italic;margin-bottom:6px;">
                      No additional notes or attachments.
                    </p>
                  </div>

                  <!-- Card Footer (Always Visible) -->
                  <div class="todo-card-footer">
                    <small class="todo-due-date">◷ {{ item.due || 'No due date' }}</small>
                    <div class="todo-footer-indicators">
                      <span v-if="!isTodoExpanded(item.id) && item.detail" class="todo-indicator-icon" title="Has description notes">📝</span>
                      <span v-if="!isTodoExpanded(item.id) && item.link" class="todo-indicator-icon" title="Has reference link">🔗</span>
                      <span v-if="!isTodoExpanded(item.id) && item.fileName" class="todo-indicator-icon" title="Has attached file">📎</span>
                      <span class="todo-status-dot" :class="tone(item.status)" :title="'Status: ' + item.status"></span>
                    </div>
                  </div>
                </article>

                <div v-if="!filteredKanbanTodos.filter(t => t.status === status).length" class="kanban-empty">
                  No {{ status.toLowerCase() }} tasks
                </div>
              </div>

              <button class="column-add" @click="openAddTodo(status as Todo['status'])">＋ Add item</button>
            </div>
          </div>
        </section>

        <!-- Calendar Screen -->
        <section v-else-if="screen === 'calendar'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">SCHEDULE</p>
              <h1>Calendar</h1>
              <p class="muted">Select a month to review scheduled deliverables.</p>
            </div>
            <button class="button primary" @click="modal = 'meeting'">＋ New event</button>
          </div>

          <section class="panel calendar-large">
            <div class="calendar-toolbar">
              <select v-model="month">
                <option v-for="m in months" :key="m" :value="m">
                  {{ new Date(`${m}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
                </option>
              </select>
            </div>

            <div class="weekdays">
              <b v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d">{{ d }}</b>
            </div>

            <div class="calendar-grid">
              <button v-for="day in 35" :key="day">
                <b>{{ day <= 30 ? day : '' }}</b>
              </button>
            </div>
          </section>
        </section>

        <!-- Reports Screen -->
        <section v-else-if="screen === 'reports'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">INSIGHTS</p>
              <h1>Reports</h1>
              <p class="muted">Detailed summary of time spent across projects.</p>
            </div>
            <button class="button primary" @click="openExportModal('reports')">⇩ Export report</button>
          </div>

          <div class="report-cards">
            <div class="report-number">
              <label>MONTH HOURS</label>
              <strong>{{ hours.toFixed(1) }}h</strong>
              <p>{{ monthLabel }}</p>
            </div>
            <div class="report-number">
              <label>OVERALL HOURS</label>
              <strong>{{ data.tasks.reduce((s, t) => s + Number(t.hours || 0), 0).toFixed(1) }}h</strong>
              <p>all projects</p>
            </div>
            <div class="report-number">
              <label>COMPLETION</label>
              <strong>{{ done }}/{{ monthTasks.length }}</strong>
              <p>tasks delivered</p>
            </div>
          </div>
        </section>

        <!-- Integrations Screen -->
        <section v-else-if="screen === 'integrations'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">CONNECTED WORKSPACE</p>
              <h1>Integrations</h1>
              <p class="muted">Sync tools with your workspace tracker.</p>
            </div>
          </div>

          <div class="integration-grid">
            <article v-for="item in ['Google Calendar', 'Google Docs', 'Google Sheets', 'Microsoft Outlook', 'Notion', 'Figma']" :key="item" class="integration-card">
              <b>{{ item }}</b>
              <small>Connect and sync</small>
              <button class="button" @click="notice(`${item} connection configured`)">Connect</button>
            </article>
          </div>
        </section>

        <section v-else class="screen">
          <div class="page-head"><h1>{{ screen }}</h1></div>
          <section class="panel empty">Workspace view ready.</section>
        </section>
      </main>
    </section>

    <!-- Redesigned Modal Form: Log Time / Task Entry -->
    <div v-if="modal === 'task' || modal === 'log'" class="backdrop" @click="activeDropdown = null">
      <form class="modal" @click="activeDropdown = null" @submit.prevent="saveTaskForm">
        <button type="button" class="close" @click="modal = ''; activeDropdown = null">×</button>
        <p class="eyebrow">WORK LOG ENTRY</p>
        <h2>Log time entry</h2>

        <!-- Mandatory Task Name -->
        <label class="form-label" style="margin-top:0;">
          Task Name <span class="req-star">*</span>
        </label>
        <input v-model="task.task" required placeholder="What did you work on? (e.g. Navigation UI Refactor)" @focus="activeDropdown = null">

        <!-- Project Name: Floating Dropdown Menu (Single Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Project Name <span class="req-star">*</span>
          </label>
          <div class="custom-combobox">
            <input
              v-model="task.project"
              placeholder="Select existing or type new project name..."
              required
              @focus="activeDropdown = 'project'"
              @click.stop="activeDropdown = 'project'"
              @keydown.enter.prevent="saveCustomProject"
            >
            <span class="dropdown-chevron" @click.stop="activeDropdown = activeDropdown === 'project' ? null : 'project'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeDropdown === 'project'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Project (Single Select)</div>
              <div
                v-for="p in filteredProjects"
                :key="p"
                class="dropdown-option-item"
                :class="{ selected: task.project === p }"
                @click.stop="selectProject(p)"
              >
                <span>📁 {{ p }}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="task.project === p" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete project"
                    @click.stop="handleDeleteProject(p)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="task.project.trim() && !data.projects.includes(task.project.trim())" class="dropdown-option-item create-new" @click.stop="saveCustomProject">
                ➕ Add "<b>{{ task.project.trim() }}</b>" as new project
              </div>
            </div>
          </div>
        </div>

        <!-- Sync with team member(s): Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Sync with team member(s)
          </label>
          <div class="custom-combobox">
            <input
              v-model="personInputText"
              placeholder="Select or type team member name (press Enter)..."
              @focus="activeDropdown = 'person'"
              @click.stop="activeDropdown = 'person'"
              @keydown.enter.prevent="addPersonFromInput"
            >
            <span class="dropdown-chevron" @click.stop="activeDropdown = activeDropdown === 'person' ? null : 'person'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeDropdown === 'person'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Team Members (Multi-select)</div>
              <div
                v-for="u in filteredUsers"
                :key="u"
                class="dropdown-option-item"
                :class="{ selected: task.owners.includes(u) }"
                @click.stop="selectPersonFromDropdown(u)"
              >
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="avatar-badge mini" :style="{ backgroundColor: getAvatarColor(u), color: '#fff' }">
                    {{ u.charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ u }}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="task.owners.includes(u)" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete member"
                    @click.stop="handleDeleteUser(u)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="personInputText.trim() && !data.users.includes(personInputText.trim())" class="dropdown-option-item create-new" @click.stop="addPersonFromInput">
                ➕ Add "<b>{{ personInputText.trim() }}</b>" as new member
              </div>
            </div>
          </div>

          <!-- Selected Team Member Badges: Styled with vibrant blue badge, not black -->
          <div v-if="task.owners.length" class="tag-badges-wrapper">
            <span
              v-for="p in task.owners"
              :key="p"
              class="tag-badge-item"
            >
              <span class="avatar-badge micro" :style="{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }">
                {{ p.charAt(0).toUpperCase() }}
              </span>
              {{ p }}
              <button type="button" @click.stop="removePerson(p)">✕</button>
            </span>
          </div>
        </div>

        <!-- Add tag: Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Add tag
          </label>
          <div class="custom-combobox">
            <input
              v-model="tagInputText"
              placeholder="Select or type tag name (press Enter)..."
              @focus="activeDropdown = 'tag'"
              @click.stop="activeDropdown = 'tag'"
              @keydown.enter.prevent="addTagFromInput"
            >
            <span class="dropdown-chevron" @click.stop="activeDropdown = activeDropdown === 'tag' ? null : 'tag'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeDropdown === 'tag'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Tags (Multi-select)</div>
              <div
                v-for="t in filteredTags"
                :key="t"
                class="dropdown-option-item"
                :class="{ selected: task.tags.includes(t) }"
                @click.stop="selectTagFromDropdown(t)"
              >
                <span>🏷 {{ t }}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="task.tags.includes(t)" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete tag"
                    @click.stop="handleDeleteTag(t)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="tagInputText.trim() && !availableTags.includes(tagInputText.trim())" class="dropdown-option-item create-new" @click.stop="addTagFromInput">
                ➕ Add "<b>{{ tagInputText.trim() }}</b>" as new tag
              </div>
            </div>
          </div>

          <!-- Selected Tags Badges -->
          <div v-if="task.tags.length" class="tag-badges-wrapper">
            <span v-for="tag in task.tags" :key="tag" class="tag-badge-item">
              {{ tag }}
              <button type="button" @click.stop="removeTag(tag)">✕</button>
            </span>
          </div>
        </div>

        <!-- Sleek Unified Session Schedule Card (Date & Time Layout) -->
        <div class="schedule-card-box" @click="activeDropdown = null">
          <div class="schedule-card-title">
            📅 Session Schedule & Timing
          </div>
          
          <div class="form-group-row">
            <div>
              <label class="form-label" style="margin-top:0;">Start Date</label>
              <input v-model="task.startDate" type="date" required @click="triggerPicker" @change="onStartDateChange">
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Date</label>
              <input v-model="task.endDate" :min="task.startDate" type="date" required @click="triggerPicker">
            </div>
          </div>

          <div class="form-group-row" style="margin-bottom:0;">
            <div>
              <label class="form-label" style="margin-top:0;">Start Time</label>
              <input v-model="task.startTime" type="time" required @click="triggerPicker">
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Time</label>
              <input v-model="task.endTime" type="time" required @click="triggerPicker">
            </div>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save work log</button>
      </form>
    </div>

    <!-- Edit Log Modal: 100% Consistent Layout with Add Log -->
    <div v-if="modal === 'edit-log'" class="backdrop" @click="activeEditDropdown = null">
      <form class="modal" @click="activeEditDropdown = null" @submit.prevent="saveEditedLog">
        <button type="button" class="close" @click="modal = ''; activeEditDropdown = null">×</button>
        <p class="eyebrow">EDIT LOG ENTRY</p>
        <h2>Update work log</h2>

        <!-- Mandatory Task Name -->
        <label class="form-label" style="margin-top:0;">
          Task Name <span class="req-star">*</span>
        </label>
        <input v-model="editLogData.task" required placeholder="What did you work on? (e.g. Navigation UI Refactor)" @focus="activeEditDropdown = null">

        <!-- Project Name: Floating Dropdown Menu (Single Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Project Name <span class="req-star">*</span>
          </label>
          <div class="custom-combobox">
            <input
              v-model="editLogData.project"
              placeholder="Select existing or type new project name..."
              required
              @focus="activeEditDropdown = 'project'"
              @click.stop="activeEditDropdown = 'project'"
              @keydown.enter.prevent="saveCustomEditProject"
            >
            <span class="dropdown-chevron" @click.stop="activeEditDropdown = activeEditDropdown === 'project' ? null : 'project'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeEditDropdown === 'project'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Project (Single Select)</div>
              <div
                v-for="p in filteredEditProjects"
                :key="p"
                class="dropdown-option-item"
                :class="{ selected: editLogData.project === p }"
                @click.stop="selectEditProject(p)"
              >
                <span>📁 {{ p }}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="editLogData.project === p" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete project"
                    @click.stop="handleDeleteProject(p)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="editLogData.project.trim() && !data.projects.includes(editLogData.project.trim())" class="dropdown-option-item create-new" @click.stop="saveCustomEditProject">
                ➕ Add "<b>{{ editLogData.project.trim() }}</b>" as new project
              </div>
            </div>
          </div>
        </div>

        <!-- Sync with team member(s): Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Sync with team member(s)
          </label>
          <div class="custom-combobox">
            <input
              v-model="editPersonInputText"
              placeholder="Select or type team member name (press Enter)..."
              @focus="activeEditDropdown = 'person'"
              @click.stop="activeEditDropdown = 'person'"
              @keydown.enter.prevent="addEditPersonFromInput"
            >
            <span class="dropdown-chevron" @click.stop="activeEditDropdown = activeEditDropdown === 'person' ? null : 'person'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeEditDropdown === 'person'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Team Members (Multi-select)</div>
              <div
                v-for="u in filteredEditUsers"
                :key="u"
                class="dropdown-option-item"
                :class="{ selected: editLogData.owners.includes(u) }"
                @click.stop="selectEditPersonFromDropdown(u)"
              >
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="avatar-badge mini" :style="{ backgroundColor: getAvatarColor(u), color: '#fff' }">
                    {{ u.charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ u }}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="editLogData.owners.includes(u)" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete member"
                    @click.stop="handleDeleteUser(u)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="editPersonInputText.trim() && !data.users.includes(editPersonInputText.trim())" class="dropdown-option-item create-new" @click.stop="addEditPersonFromInput">
                ➕ Add "<b>{{ editPersonInputText.trim() }}</b>" as new member
              </div>
            </div>
          </div>

          <!-- Selected Team Member Badges: Styled with vibrant blue badge, not black -->
          <div v-if="editLogData.owners.length" class="tag-badges-wrapper">
            <span
              v-for="p in editLogData.owners"
              :key="p"
              class="tag-badge-item"
            >
              <span class="avatar-badge micro" :style="{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }">
                {{ p.charAt(0).toUpperCase() }}
              </span>
              {{ p }}
              <button type="button" @click.stop="removeEditPerson(p)">✕</button>
            </span>
          </div>
        </div>

        <!-- Add tag: Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container" @click.stop>
          <label class="form-label">
            Add tag
          </label>
          <div class="custom-combobox">
            <input
              v-model="editTagInputText"
              placeholder="Select or type tag name (press Enter)..."
              @focus="activeEditDropdown = 'tag'"
              @click.stop="activeEditDropdown = 'tag'"
              @keydown.enter.prevent="addEditTagFromInput"
            >
            <span class="dropdown-chevron" @click.stop="activeEditDropdown = activeEditDropdown === 'tag' ? null : 'tag'">▾</span>

            <!-- Floating Dropdown List -->
            <div v-if="activeEditDropdown === 'tag'" class="custom-dropdown-menu">
              <div class="dropdown-menu-title">Select Tags (Multi-select)</div>
              <div
                v-for="t in filteredEditTags"
                :key="t"
                class="dropdown-option-item"
                :class="{ selected: editLogData.tags.includes(t) }"
                @click.stop="selectEditTagFromDropdown(t)"
              >
                <span>🏷 {{ t }}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span v-if="editLogData.tags.includes(t)" class="check-icon">✓</span>
                  <button
                    type="button"
                    class="btn-del-option"
                    title="Delete tag"
                    @click.stop="handleDeleteTag(t)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-if="editTagInputText.trim() && !availableTags.includes(editTagInputText.trim())" class="dropdown-option-item create-new" @click.stop="addEditTagFromInput">
                ➕ Add "<b>{{ editTagInputText.trim() }}</b>" as new tag
              </div>
            </div>
          </div>

          <!-- Selected Tags Badges -->
          <div v-if="editLogData.tags.length" class="tag-badges-wrapper">
            <span v-for="tag in editLogData.tags" :key="tag" class="tag-badge-item">
              {{ tag }}
              <button type="button" @click.stop="removeEditTag(tag)">✕</button>
            </span>
          </div>
        </div>

        <!-- Sleek Unified Session Schedule Card (Date & Time Layout) -->
        <div class="schedule-card-box" @click="activeEditDropdown = null">
          <div class="schedule-card-title">
            📅 Session Schedule & Timing
          </div>
          
          <div class="form-group-row">
            <div>
              <label class="form-label" style="margin-top:0;">Start Date</label>
              <input v-model="editLogData.startDate" type="date" required @click="triggerPicker" @change="onEditStartDateChange">
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Date</label>
              <input v-model="editLogData.endDate" :min="editLogData.startDate" type="date" required @click="triggerPicker">
            </div>
          </div>

          <div class="form-group-row" style="margin-bottom:0;">
            <div>
              <label class="form-label" style="margin-top:0;">Start Time</label>
              <input v-model="editLogData.startTime" type="time" required @click="triggerPicker">
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Time</label>
              <input v-model="editLogData.endTime" type="time" required @click="triggerPicker">
            </div>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save changes</button>
      </form>
    </div>

    <!-- Edit To-do Modal -->
    <div v-if="modal === 'edit-todo' && editingTodo" class="backdrop">
      <form class="modal" @submit.prevent="saveEditedTodo">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">EDIT ACTION ITEM</p>
        <h2>Update action item</h2>

        <!-- 1. Task Name (Mandatory) -->
        <label class="form-label" style="margin-top:0;">
          Task Name <span class="req-star">*</span>
        </label>
        <input v-model="editingTodo.title" required placeholder="What needs doing? (e.g. Design Dashboard Components)">

        <!-- 2. Description / Context (Immediately after Task Name!) -->
        <label class="form-label">Description / Context</label>
        <textarea v-model="editingTodo.detail" rows="2" placeholder="Add any details, notes, or instructions..."></textarea>

        <!-- 3. Priority & Due Date in 2 columns -->
        <div class="form-group-row">
          <div>
            <label class="form-label">Priority</label>
            <select v-model="editingTodo.priority">
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <div>
            <label class="form-label">Due Date</label>
            <input v-model="editingTodo.due" type="date" @click="triggerPicker">
          </div>
        </div>

        <!-- 4. Status Stage -->
        <label class="form-label">Status Stage</label>
        <select v-model="editingTodo.status">
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <!-- 5. Reference Link -->
        <label class="form-label">Reference Link</label>
        <div class="input-with-icon">
          <span class="input-icon">🔗</span>
          <input v-model="editingTodo.link" placeholder="e.g. https://github.com/... or Figma link">
        </div>

        <!-- 6. File Upload / Attachment -->
        <label class="form-label">Upload File / Attachment</label>
        <div class="file-upload-box">
          <input ref="editTodoFileInputRef" type="file" hidden @change="onEditTodoFilePicked">
          <div v-if="!editingTodo.fileName" class="file-upload-placeholder" @click="editTodoFileInputRef?.click()">
            <span>📁 Choose file to attach</span>
            <small>Documents, images, designs, or specs</small>
          </div>
          <div v-else class="file-uploaded-item">
            <span class="file-name">📎 {{ editingTodo.fileName }}</span>
            <button type="button" class="btn-remove-file" title="Remove attachment" @click="removeEditTodoFile">✕</button>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save changes</button>
      </form>
    </div>

    <!-- To-do Creation Modal: Exact Same Fields & Design -->
    <div v-if="modal === 'todo'" class="backdrop">
      <form class="modal" @submit.prevent="addTodo">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">NEW ACTION ITEM</p>
        <h2>Add to-do item</h2>

        <!-- 1. Task Name (Mandatory) -->
        <label class="form-label" style="margin-top:0;">
          Task Name <span class="req-star">*</span>
        </label>
        <input v-model="todo.title" required placeholder="What needs doing? (e.g. Design Dashboard Components)">

        <!-- 2. Description / Context (Immediately after Task Name!) -->
        <label class="form-label">Description / Context</label>
        <textarea v-model="todo.detail" rows="2" placeholder="Add any details, notes, or instructions..."></textarea>

        <!-- 3. Priority & Due Date in 2 columns -->
        <div class="form-group-row">
          <div>
            <label class="form-label">Priority</label>
            <select v-model="todo.priority">
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <div>
            <label class="form-label">Due Date</label>
            <input v-model="todo.due" type="date" @click="triggerPicker">
          </div>
        </div>

        <!-- 4. Reference Link -->
        <label class="form-label">Reference Link</label>
        <div class="input-with-icon">
          <span class="input-icon">🔗</span>
          <input v-model="todo.link" placeholder="e.g. https://github.com/... or Figma link">
        </div>

        <!-- 5. File Upload / Attachment -->
        <label class="form-label">Upload File / Attachment</label>
        <div class="file-upload-box">
          <input ref="todoFileInputRef" type="file" hidden @change="onTodoFilePicked">
          <div v-if="!todo.fileName" class="file-upload-placeholder" @click="todoFileInputRef?.click()">
            <span>📁 Choose file to attach</span>
            <small>Documents, images, designs, or specs</small>
          </div>
          <div v-else class="file-uploaded-item">
            <span class="file-name">📎 {{ todo.fileName }}</span>
            <button type="button" class="btn-remove-file" title="Remove attachment" @click="removeTodoFile">✕</button>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Add to-do</button>
      </form>
    </div>

    <!-- Universal Date-Wise Export Modal -->
    <div v-if="modal === 'export'" class="backdrop" @click="activeDropdown = null">
      <div class="modal export-modal" @click.stop>
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">{{ exportContext === 'timesheets' ? 'TIMESHEET EXPORT' : 'WORKSPACE REPORT' }}</p>
        <h2>{{ exportContext === 'timesheets' ? 'Export Timesheets' : 'Export Reports & Workspace Data' }}</h2>
        <p class="muted">
          {{ exportContext === 'timesheets' 
              ? 'Download a date-wise CSV of all timesheet logs across your selected date range.' 
              : 'Choose your dataset and date range to export comprehensive workspace reports.' }}
        </p>

        <!-- Data Type Selection (Visible only when exporting from Reports screen) -->
        <div v-if="exportContext === 'reports'" class="export-section">
          <label class="export-label">SELECT DATA TYPE TO EXPORT</label>
          <div class="export-pills-row">
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDataType === 'timesheets' }"
              @click="exportDataType = 'timesheets'"
            >
              ⏱ Timesheet Logs
            </button>
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDataType === 'todos' }"
              @click="exportDataType = 'todos'"
            >
              ✓ To-Do Actions
            </button>
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDataType === 'all' }"
              @click="exportDataType = 'all'"
            >
              📊 All Records
            </button>
          </div>
        </div>

        <!-- Date Range Filter: Current Month (Default), Last 3 Months, Last 6 Months, Custom -->
        <div class="export-section">
          <label class="export-label">SELECT DATE RANGE</label>
          <div class="export-pills-grid">
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDateRange === 'current_month' }"
              @click="exportDateRange = 'current_month'"
            >
              📅 Current Month
            </button>
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDateRange === 'last_3_months' }"
              @click="exportDateRange = 'last_3_months'"
            >
              🗓 Last 3 Months
            </button>
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDateRange === 'last_6_months' }"
              @click="exportDateRange = 'last_6_months'"
            >
              📆 Last 6 Months
            </button>
            <button
              type="button"
              class="export-pill"
              :class="{ active: exportDateRange === 'custom' }"
              @click="exportDateRange = 'custom'"
            >
              ⚡ Custom Range
            </button>
          </div>
        </div>

        <!-- Custom Date Range Inputs (Shown when Custom Range is selected) -->
        <div v-if="exportDateRange === 'custom'" class="custom-range-inputs">
          <div class="range-col">
            <label class="sub-label">FROM (START DATE)</label>
            <input
              v-model="exportCustomStartDate"
              type="date"
              class="range-input"
            >
          </div>
          <div class="range-col">
            <label class="sub-label">TO (END DATE)</label>
            <input
              v-model="exportCustomEndDate"
              type="date"
              class="range-input"
            >
          </div>
        </div>

        <!-- Export File Format Dropdown (Dropdown instead of 3 buttons as requested) -->
        <div class="export-section">
          <label class="export-label">EXPORT FILE FORMAT</label>
          <div class="export-dropdown-wrap">
            <span class="export-format-icon">
              {{ exportFileFormat === 'pdf' ? '📑' : (exportFileFormat === 'docx' ? '📝' : '📄') }}
            </span>
            <select v-model="exportFileFormat" class="export-dropdown-select">
              <option value="csv">CSV Spreadsheet (.csv)</option>
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="docx">Word Document (.docx)</option>
            </select>
            <span class="export-dropdown-arrow">▾</span>
          </div>
        </div>

        <!-- Live Summary Preview Card -->
        <div class="export-summary-card">
          <div class="summary-meta">
            <span class="summary-icon">📁</span>
            <div>
              <div class="summary-range-text">Date Range: <b>{{ computedExportRange.displayLabel }}</b></div>
              <div class="summary-count-text">
                <span v-if="exportContext === 'timesheets' || exportDataType === 'timesheets'">
                  Ready to export <b>{{ filteredExportTimesheets.length }}</b> date-wise timesheet log(s)
                </span>
                <span v-else-if="exportDataType === 'todos'">
                  Ready to export <b>{{ filteredExportTodos.length }}</b> to-do action(s)
                </span>
                <span v-else>
                  Ready to export <b>{{ filteredExportTimesheets.length }}</b> logs &amp; <b>{{ filteredExportTodos.length }}</b> to-dos
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="export-modal-actions">
          <button type="button" class="button" @click="modal = ''">Cancel</button>
          <button
            type="button"
            class="button primary"
            :disabled="(exportContext === 'timesheets' || exportDataType === 'timesheets') ? filteredExportTimesheets.length === 0 : (exportDataType === 'todos' ? filteredExportTodos.length === 0 : (filteredExportTimesheets.length === 0 && filteredExportTodos.length === 0))"
            @click="executeExport"
          >
            ⇩ Download {{ exportFileFormat.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import Review Modal -->
    <div v-if="importOpen" class="backdrop">
      <section class="modal">
        <button class="close" @click="importOpen = false">×</button>
        <p class="eyebrow">INTELLIGENT FILE IMPORT</p>
        <h2>Review and import records</h2>
        <pre style="background:#f4f7fb;padding:12px;border-radius:8px;font-size:11px;max-height:180px;overflow:auto;">{{ importPreview }}</pre>
        <div class="modal-actions" style="display:flex;gap:10px;margin-top:15px;">
          <button class="button" style="flex:1;" @click="importOpen = false">Cancel</button>
          <button class="button primary" style="flex:1;" @click="applyImport">Import into DB</button>
        </div>
      </section>
    </div>

    <!-- Toast Notice -->
    <div v-if="toast" class="toast">{{ toast }}</div>

    <!-- Native Datalist Definitions for Instant 1-Click Dropdown Options -->
    <datalist id="project-list">
      <option v-for="p in data.projects" :key="p" :value="p" />
    </datalist>

    <datalist id="user-list">
      <option v-for="u in data.users" :key="u" :value="u" />
    </datalist>

    <datalist id="tag-list">
      <option v-for="t in predefinedTags" :key="t" :value="t" />
    </datalist>
  </div>
</template>
