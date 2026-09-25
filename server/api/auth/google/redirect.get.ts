/**
 * GET /api/auth/google/redirect
 * Starts the Google OAuth2 flow for Calendar access
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const clientId = (config.googleClientId as string) || process.env.GOOGLE_CLIENT_ID
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = getRequestHeader(event, 'x-forwarded-proto') || 'http'
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/callback`
  const redirectUri = (config.googleRedirectUri as string) || process.env.GOOGLE_REDIRECT_URI || dynamicRedirectUri

  if (!clientId) {
    return sendRedirect(event, '/?page=integrations&google_error=missing_credentials', 302)
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent'
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return sendRedirect(event, googleAuthUrl, 302)
})
