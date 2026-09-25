/**
 * POST /api/qtimesheets/test
 * Validates a Q Timesheets API token and returns user + org info
 */

const BASE = 'https://timesheets.quantana.top/api/v1'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body as { token: string }

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }

  try {
    const [meRes, membershipsRes] = await Promise.all([
      $fetch<{ data: { id: string; name: string; email: string; timezone: string } }>(
        `${BASE}/users/me`, { headers }
      ),
      $fetch<{ data: { id: string; organization: { id: string; name: string }; role: string }[] }>(
        `${BASE}/users/me/memberships`, { headers }
      )
    ])

    const user = (meRes as any).data
    const membership = (membershipsRes as any).data?.[0]

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone
      },
      organization: {
        id: membership?.organization?.id,
        name: membership?.organization?.name
      },
      memberId: membership?.id,
      role: membership?.role
    }
  } catch (e: any) {
    throw createError({
      statusCode: 401,
      message: e?.data?.message || 'Invalid token or connection failed'
    })
  }
})
