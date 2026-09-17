import type { TrackerData, Task, OsgItem, LogEntry } from '~/types/tracker'

const initial: TrackerData = { tasks: [], osg: [], logs: [], todos: [], feedback: [], meetings: [] }
const storageKey = 'monthly-time-tracker-v1'

export function useTracker() {
  const data = useState<TrackerData>('tracker-data', () => structuredClone(initial))
  const loaded = useState('tracker-loaded', () => false)
  const config = useRuntimeConfig()
  const save = () => { if (import.meta.client) localStorage.setItem(storageKey, JSON.stringify(data.value)) }
  const load = () => { if (import.meta.client && !loaded.value) { const saved = localStorage.getItem(storageKey); if (saved) data.value = { ...initial, ...JSON.parse(saved), todos: JSON.parse(saved).todos || [], feedback: JSON.parse(saved).feedback || [], meetings: JSON.parse(saved).meetings || [] }; loaded.value = true } }
  const addTask = (task: Omit<Task, 'id'>) => { data.value.tasks.push({ ...task, id: crypto.randomUUID() }); save() }
  const addOsg = (item: Omit<OsgItem, 'id'>) => { data.value.osg.push({ ...item, id: crypto.randomUUID() }); save() }
  const addLog = (entry: Omit<LogEntry, 'id'>) => { data.value.logs.push({ ...entry, id: crypto.randomUUID() }); save() }
  const updateTask = (task: Task) => { const i = data.value.tasks.findIndex(x => x.id === task.id); if (i >= 0) data.value.tasks[i] = task; save() }
  const removeTask = (id: string) => { data.value.tasks = data.value.tasks.filter(x => x.id !== id); save() }
  const syncSheets = async () => { if (!config.public.sheetsEndpoint) return false; await $fetch(config.public.sheetsEndpoint as string, { method: 'POST', body: data.value }); return true }
  return { data, load, save, addTask, addOsg, addLog, updateTask, removeTask, syncSheets, hasSheets: computed(() => Boolean(config.public.sheetsEndpoint)) }
}
