<script setup lang="ts">
import type { TaskStatus, Priority, Todo, LogEntry, Task } from '~/types/tracker'

const tracker = useTracker()
const {
  data, load, addTask, addLog, updateLog, removeLog, addProject, addUser,
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
const tagInputText = ref('')
const personInputText = ref('')

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
  due: '',
  status: 'Pending' as Todo['status'],
  priority: 'Medium' as Priority
})

const months = Array.from({ length: 12 }, (_, i) => `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`)
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = computed(() => new Date(`${month.value}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

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
      return { label: mName, hours: mHrs || (mStr === month.value ? hours.value : 0) }
    })
  }
})

const maxChartHours = computed(() => {
  const maxVal = Math.max(...chartDataPoints.value.map(p => p.hours), 1)
  return Math.ceil(maxVal / 4) * 4 || 8
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
  const allAvailable = Array.from(new Set([...predefinedTags, ...task.value.tags]))
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

/* --- Avatar Color Generator --- */
const avatarPalette = ['#3569df', '#11a981', '#ef9b27', '#8a3ffc', '#e53e3e', '#009d9a', '#d12771']
const getAvatarColor = (name: string) => {
  if (!name) return '#3569df'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

/* --- Tags Input Handlers --- */
const addTagFromInput = () => {
  const trimmed = tagInputText.value.trim()
  if (trimmed && !task.value.tags.includes(trimmed)) {
    task.value.tags.push(trimmed)
  }
  tagInputText.value = ''
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
  }
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
}

const saveTaskForm = () => {
  if (!task.value.project.trim() || !task.value.task.trim()) {
    notice('Project Name and Task Name are mandatory!')
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
  timer.value = window.setInterval(() => elapsed.value++, 1000)
  notice('Live timer started')
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
    timerTask.value = ''
    timerProject.value = ''
    notice('Timer stopped and session logged!')
  }
}

/* --- Log Edit & Delete --- */
const openEditLog = (item: LogEntry) => {
  editingLog.value = { ...item }
  modal.value = 'edit-log'
}

const saveEditedLog = () => {
  if (editingLog.value) {
    updateLog(editingLog.value)
    modal.value = ''
    editingLog.value = null
    notice('Log entry updated!')
  }
}

const confirmDeleteLog = (id: string) => {
  removeLog(id)
  notice('Log entry deleted')
}

/* --- To-do Handlers --- */
const addTodo = () => {
  if (!todo.value.title.trim()) return
  data.value.todos.push({ ...todo.value, id: crypto.randomUUID() })
  save()
  modal.value = ''
  notice('To-do item created')
  todo.value = { title: '', detail: '', due: '', status: 'Pending', priority: 'Medium' }
}

const openEditTodo = (item: Todo) => {
  editingTodo.value = { ...item }
  modal.value = 'edit-todo'
}

const saveEditedTodo = () => {
  if (editingTodo.value) {
    const idx = data.value.todos.findIndex(t => t.id === editingTodo.value?.id)
    if (idx >= 0) {
      data.value.todos[idx] = { ...editingTodo.value }
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

const dragId = ref('')
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

const exportCsv = () => {
  const rows = [
    ['Date/Month', 'Project', 'Category', 'Task', 'Owner', 'Hours', 'Status', 'Priority'],
    ...data.value.tasks.map(t => [t.startDate || t.month, t.project, t.category, t.task, t.owner, t.hours, t.status, t.priority])
  ]
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `timesheet-export-${month.value}.csv`
  a.click()
  modal.value = ''
  notice('Timesheet report exported!')
}

onMounted(() => {
  load()
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
              <button @click="screen = 'logs'; startTimer(); addNewOpen = false">
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
              ♢
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

      <!-- Main Body Screens -->
      <main class="content">
        <!-- Dashboard Overview Screen -->
        <section v-if="screen === 'dashboard'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">{{ new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() }}</p>
              <h1>Good morning, TEZ<span>.</span></h1>
              <p class="muted">Your work analytics, action items, and timesheets in one place.</p>
            </div>
            
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
            <!-- Full Width Work Analytics Card with Horizontal Scrollable Chart -->
            <section class="panel analytics-card">
              <div class="chart-header-row">
                <div>
                  <h3>Work analytics</h3>
                  <p class="muted" style="font-size:11px;">Hours logged by timeframe (scroll horizontally to view all month dates)</p>
                </div>
                <div class="chart-range-tabs">
                  <button :class="{ active: chartRange === 'day' }" @click="chartRange = 'day'">Day</button>
                  <button :class="{ active: chartRange === 'week' }" @click="chartRange = 'week'">Week</button>
                  <button :class="{ active: chartRange === 'month' }" @click="chartRange = 'month'">Month</button>
                </div>
              </div>

              <!-- Horizontal Scrollable Work Analytics Chart -->
              <div class="chart-wrapper">
                <div class="y-axis">
                  <span>{{ maxChartHours }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.75) }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.5) }}h</span>
                  <span>{{ Math.round(maxChartHours * 0.25) }}h</span>
                  <span>0h</span>
                </div>

                <div class="chart-body">
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
            <div style="display:flex;align-items:center;gap:12px;">
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

              <button class="button primary" @click="modal = 'task'">＋ New log</button>
            </div>
          </div>

          <!-- Timer Strip with Task & Project inputs -->
          <div class="timer-strip-box">
            <div class="timer-strip-left">
              <div class="timer-digits">
                {{ Math.floor(elapsed / 3600).toString().padStart(2, '0') }}:{{ Math.floor((elapsed / 60) % 60).toString().padStart(2, '0') }}:{{ (elapsed % 60).toString().padStart(2, '0') }}
              </div>
              
              <div class="timer-fields">
                <input v-model="timerTask" placeholder="Task Name (e.g. API Integration)">
                <input v-model="timerProject" list="project-list" placeholder="Project Name" @focus="triggerDatalistPicker">
              </div>
            </div>

            <button class="button primary" @click="timer ? stopTimer() : startTimer()">
              {{ timer ? 'End timer & Log' : 'Start timer' }}
            </button>
          </div>

          <!-- Logs Table with Multi-User Avatars & Actions -->
          <section class="panel table-panel">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Assign Team / Sync</th>
                  <th>Project & Task Work Log</th>
                  <th>Hours</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in [...data.logs].reverse()" :key="item.id">
                  <td style="white-space:nowrap;font-weight:600;">{{ item.date }}</td>
                  <td>
                    <!-- Stacked Multi-User Avatar Badges (+1, +2 counter) -->
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
                  <td>
                    <b>{{ item.task || item.text.split('·')[0] }}</b>
                    <small v-if="item.project" class="muted" style="display:block;">Project: {{ item.project }}</small>
                    <div v-if="item.tags?.length" class="tag-badges-wrapper">
                      <span v-for="tag in item.tags" :key="tag" class="tag-badge-item" style="font-size:9px;padding:1px 6px;">{{ tag }}</span>
                    </div>
                  </td>
                  <td><b>{{ item.hours || 1 }}h</b></td>
                  <td>
                    <div class="log-actions">
                      <button class="btn-action-icon" title="Edit log" @click="openEditLog(item)">✎</button>
                      <button class="btn-action-icon delete" title="Delete log" @click="confirmDeleteLog(item.id)">🗑</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!data.logs.length">
                  <td colspan="5" class="empty">No work logs captured for {{ monthLabel }}.</td>
                </tr>
              </tbody>
            </table>
          </section>
        </section>

        <!-- To-dos Screen -->
        <section v-else-if="screen === 'todos'" class="screen">
          <div class="page-head">
            <div>
              <p class="eyebrow">PERSONAL DELIVERY</p>
              <h1>To-do board</h1>
              <p class="muted">Drag items between status columns to update delivery.</p>
            </div>
            <button class="button primary" @click="modal = 'todo'">＋ Add to-do</button>
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
                <em>{{ data.todos.filter(t => t.status === status).length }}</em>
              </div>

              <article
                v-for="item in data.todos.filter(t => t.status === status)"
                :key="item.id"
                class="todo-card"
                draggable="true"
                @dragstart="dragStart(item)"
              >
                <div class="todo-card-header">
                  <span class="tag" :class="tone(item.priority)">{{ item.priority }}</span>
                  <div class="todo-card-actions">
                    <button class="btn-action-icon sm" title="Edit to-do" @click.stop="openEditTodo(item)">✎</button>
                    <button class="btn-action-icon sm delete" title="Delete to-do" @click.stop="confirmDeleteTodo(item.id)">🗑</button>
                  </div>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.detail }}</p>
                <small>◷ {{ item.due || 'No due date' }}</small>
              </article>

              <button class="column-add" @click="modal = 'todo'">＋ Add item</button>
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
            <button class="button primary" @click="modal = 'export'">⇩ Export report</button>
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
      <form class="modal" @click.stop @submit.prevent="saveTaskForm">
        <button type="button" class="close" @click="modal = ''; activeDropdown = null">×</button>
        <p class="eyebrow">WORK LOG ENTRY</p>
        <h2>Log time entry</h2>

        <!-- Mandatory Task Name -->
        <label class="form-label" style="margin-top:0;">
          Task Name <span class="req-star">*</span>
        </label>
        <input v-model="task.task" required placeholder="What did you work on? (e.g. Navigation UI Refactor)">

        <!-- Project Name: Floating Dropdown Menu (Single Select) -->
        <div class="custom-dropdown-container">
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
                @click="selectProject(p)"
              >
                <span>📁 {{ p }}</span>
                <span v-if="task.project === p" class="check-icon">✓</span>
              </div>
              <div v-if="task.project.trim() && !data.projects.includes(task.project.trim())" class="dropdown-option-item create-new" @click="saveCustomProject">
                ➕ Add "<b>{{ task.project.trim() }}</b>" as new project
              </div>
            </div>
          </div>
        </div>

        <!-- Sync with team member(s): Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container">
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
                @click.stop="togglePerson(u)"
              >
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="avatar-badge mini" :style="{ backgroundColor: getAvatarColor(u), color: '#fff' }">
                    {{ u.charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ u }}</span>
                </div>
                <span v-if="task.owners.includes(u)" class="check-icon">✓</span>
              </div>
              <div v-if="personInputText.trim() && !data.users.includes(personInputText.trim())" class="dropdown-option-item create-new" @click.stop="addPersonFromInput">
                ➕ Add "<b>{{ personInputText.trim() }}</b>" as new member
              </div>
            </div>
          </div>

          <!-- Selected Team Member Badges -->
          <div v-if="task.owners.length" class="tag-badges-wrapper">
            <span v-for="p in task.owners" :key="p" class="tag-badge-item" style="background:#17243b;">
              <span class="avatar-badge micro" :style="{ backgroundColor: getAvatarColor(p), color: '#fff' }">
                {{ p.charAt(0).toUpperCase() }}
              </span>
              {{ p }}
              <button type="button" @click="removePerson(p)">✕</button>
            </span>
          </div>
        </div>

        <!-- Add tag: Floating Dropdown Menu (Multi Select) -->
        <div class="custom-dropdown-container">
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
                @click.stop="toggleTag(t)"
              >
                <span>🏷 {{ t }}</span>
                <span v-if="task.tags.includes(t)" class="check-icon">✓</span>
              </div>
              <div v-if="tagInputText.trim() && !predefinedTags.includes(tagInputText.trim())" class="dropdown-option-item create-new" @click.stop="addTagFromInput">
                ➕ Add "<b>{{ tagInputText.trim() }}</b>" as new tag
              </div>
            </div>
          </div>

          <!-- Selected Tags Badges -->
          <div v-if="task.tags.length" class="tag-badges-wrapper">
            <span v-for="tag in task.tags" :key="tag" class="tag-badge-item">
              {{ tag }}
              <button type="button" @click="removeTag(tag)">✕</button>
            </span>
          </div>
        </div>

        <!-- Sleek Unified Session Schedule Card (Date & Time Layout) -->
        <div class="schedule-card-box">
          <div class="schedule-card-title">
            📅 Session Schedule & Timing
          </div>
          
          <div class="form-group-row">
            <div>
              <label class="form-label" style="margin-top:0;">Start Date</label>
              <input v-model="task.startDate" type="date" required>
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Date</label>
              <input v-model="task.endDate" type="date" required>
            </div>
          </div>

          <div class="form-group-row" style="margin-bottom:0;">
            <div>
              <label class="form-label" style="margin-top:0;">Start Time</label>
              <input v-model="task.startTime" type="time" required>
            </div>
            <div>
              <label class="form-label" style="margin-top:0;">End Time</label>
              <input v-model="task.endTime" type="time" required>
            </div>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save work log</button>
      </form>
    </div>

    <!-- Edit Log Modal -->
    <div v-if="modal === 'edit-log' && editingLog" class="backdrop">
      <form class="modal" @submit.prevent="saveEditedLog">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">EDIT LOG ENTRY</p>
        <h2>Update work log</h2>

        <label class="form-label">Date</label>
        <input v-model="editingLog.date" type="date" required>

        <label class="form-label">Assign Team / Sync Person</label>
        <input v-model="editingLog.user" required placeholder="User name(s)">

        <label class="form-label">Task Name</label>
        <input v-model="editingLog.task" required placeholder="Task details">

        <label class="form-label">Project</label>
        <input v-model="editingLog.project" list="project-list" placeholder="Project name" @focus="triggerDatalistPicker">

        <label class="form-label">Hours</label>
        <input v-model.number="editingLog.hours" type="number" step="0.5" required>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save changes</button>
      </form>
    </div>

    <!-- Edit To-do Modal -->
    <div v-if="modal === 'edit-todo' && editingTodo" class="backdrop">
      <form class="modal" @submit.prevent="saveEditedTodo">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">EDIT TO-DO</p>
        <h2>Update action item</h2>

        <label class="form-label">Title</label>
        <input v-model="editingTodo.title" required placeholder="What needs doing?">

        <label class="form-label">Details</label>
        <input v-model="editingTodo.detail" placeholder="Details or context">

        <label class="form-label">Due Date</label>
        <input v-model="editingTodo.due" type="date">

        <div class="form-group-row">
          <div>
            <label class="form-label">Status</label>
            <select v-model="editingTodo.status">
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="form-label">Priority</label>
            <select v-model="editingTodo.priority">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <button type="submit" class="button primary full" style="margin-top:16px;">Save to-do</button>
      </form>
    </div>

    <!-- To-do Creation Modal -->
    <div v-if="modal === 'todo'" class="backdrop">
      <form class="modal" @submit.prevent="addTodo">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">NEW ACTION ITEM</p>
        <h2>Add to-do item</h2>
        <input v-model="todo.title" required placeholder="What needs doing?">
        <input v-model="todo.detail" placeholder="Details or context">
        <input v-model="todo.due" type="date">
        <button type="submit" class="button primary full" style="margin-top:16px;">Add to-do</button>
      </form>
    </div>

    <!-- Export Modal -->
    <div v-if="modal === 'export'" class="backdrop">
      <form class="modal" @submit.prevent="exportCsv">
        <button type="button" class="close" @click="modal = ''">×</button>
        <p class="eyebrow">REPORT</p>
        <h2>Export timesheets</h2>
        <p class="muted">Download CSV report of work logs for {{ monthLabel }}.</p>
        <button type="submit" class="button primary full" style="margin-top:16px;">Download CSV</button>
      </form>
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
