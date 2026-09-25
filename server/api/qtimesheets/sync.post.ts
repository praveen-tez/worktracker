/**
 * POST /api/qtimesheets/sync
 * Real two-way sync with Q Timesheets (timesheets.quantana.top)
 * 
 * Body: { token: string, logs: LogEntry[], direction: 'push' | 'pull' | 'both' }
 * Returns: { pushed: number, pulled: QEntry[], errors: string[] }
 */

const BASE = 'https://timesheets.quantana.top/api/v1'

interface LogEntry {
  id: string
  date: string
  text: string
  project?: string
  task?: string
  hours?: number
  startTime?: string
  endTime?: string
  officeSynced?: boolean
  officeSyncId?: string
}

interface QTimeEntry {
  id: string
  start: string
  end: string | null
  duration: number | null
  description: string
  project_id: string | null
  project?: { id: string; name: string; color: string }
  tags?: { id: string; name: string }[]
  billable: boolean
}

// Build ISO datetime from date + time strings
function buildISO(date: string, time?: string, fallback?: string): string {
  // date is like "2024-09-24" or "Sep 24, 2024"
  let d = date
  // Try to parse various formats
  try {
    const parsed = new Date(date)
    if (!isNaN(parsed.getTime())) {
      d = parsed.toISOString().split('T')[0]
    }
  } catch { /* keep original */ }

  const t = time || fallback || '09:00'
  return `${d}T${t.length === 5 ? t : t.substring(0, 5)}:00.000Z`
}

// Calculate end time from start + hours
function calcEnd(startISO: string, hours: number): string {
  const start = new Date(startISO)
  start.setMinutes(start.getMinutes() + Math.round(hours * 60))
  return start.toISOString()
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, logs = [], direction = 'both' } = body as {
    token: string
    logs: LogEntry[]
    direction: 'push' | 'pull' | 'both'
  }

  if (!token) {
    throw createError({ statusCode: 400, message: 'API token is required' })
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  const errors: string[] = []
  let pushed = 0
  let pulled: QTimeEntry[] = []
  const syncedIds: Record<string, string> = {} // localId -> qTimesheetsId

  // ── Step 1: Get user + org + member info ──────────────────────────────────
  let orgId = ''
  let memberId = ''

  try {
    const meRes = await $fetch<{ data: { memberships?: { organization: { id: string }, id: string }[] } }>(
      `${BASE}/users/me/memberships`,
      { headers }
    )
    const membership = (meRes as any).data?.[0]
    orgId = membership?.organization?.id || ''
    memberId = membership?.id || ''
  } catch (e: any) {
    throw createError({ statusCode: 401, message: `Auth failed: ${e?.message || 'Invalid token'}` })
  }

  if (!orgId || !memberId) {
    throw createError({ statusCode: 400, message: 'Could not resolve organization. Check your token.' })
  }

  // ── Step 2: Fetch projects for project-name → ID mapping ──────────────────
  let projectMap: Record<string, string> = {} // name (lowercase) → id
  let defaultProjectId = ''

  try {
    const projRes = await $fetch<{ data: { id: string; name: string; is_archived: boolean }[] }>(
      `${BASE}/organizations/${orgId}/projects?per_page=100`,
      { headers }
    )
    for (const p of projRes.data || []) {
      if (!p.is_archived) {
        projectMap[p.name.toLowerCase()] = p.id
        if (!defaultProjectId) defaultProjectId = p.id // first active project as fallback
      }
    }
  } catch (e: any) {
    errors.push(`Could not fetch projects: ${e?.message}`)
  }

  // ── Step 3: PUSH — local logs → Q Timesheets ─────────────────────────────
  if (direction === 'push' || direction === 'both') {
    const unsynced = logs.filter(l => !l.officeSynced && l.hours && l.hours > 0)

    for (const log of unsynced) {
      try {
        // Resolve project_id: match by name or use default
        const localProject = (log.project || '').toLowerCase().trim()
        const projectId = projectMap[localProject] || defaultProjectId

        if (!projectId) {
          errors.push(`No project found for log "${log.text}" — skipped`)
          continue
        }

        // Build start/end ISO timestamps
        const startISO = buildISO(log.date, log.startTime, '09:00')
        const endISO = log.endTime
          ? buildISO(log.date, log.endTime)
          : calcEnd(startISO, log.hours || 1)

        const description = [log.task || log.text, log.project ? `[${log.project}]` : '']
          .filter(Boolean).join(' ')

        const payload = {
          member_id: memberId,
          project_id: projectId,
          start: startISO,
          end: endISO,
          description: description.substring(0, 500),
          billable: false,
          tags: []
        }

        const created = await $fetch<{ data: QTimeEntry }>(
          `${BASE}/organizations/${orgId}/time-entries`,
          { method: 'POST', headers, body: JSON.stringify(payload) }
        )

        syncedIds[log.id] = created.data?.id || ''
        pushed++
      } catch (e: any) {
        const msg = e?.data?.message || e?.message || 'Unknown error'
        errors.push(`Failed to push "${log.text}": ${msg}`)
      }
    }
  }

  // ── Step 4: PULL — Q Timesheets → local ───────────────────────────────────
  if (direction === 'pull' || direction === 'both') {
    try {
      // Get last 30 days of entries for this member
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const sinceISO = since.toISOString().split('T')[0]

      const entriesRes = await $fetch<{ data: QTimeEntry[] }>(
        `${BASE}/organizations/${orgId}/time-entries?member_ids[]=${memberId}&start=${sinceISO}&per_page=100`,
        { headers }
      )
      pulled = entriesRes.data || []
    } catch (e: any) {
      // Pull is best-effort — don't fail the whole sync
      errors.push(`Pull skipped: ${e?.data?.message || e?.message}`)
    }
  }

  return {
    success: true,
    orgId,
    memberId,
    pushed,
    syncedIds,
    pulled,
    errors
  }
})
