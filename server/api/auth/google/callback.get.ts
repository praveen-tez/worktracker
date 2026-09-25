/**
 * GET /api/auth/google/callback
 * Handles Google OAuth2 callback — exchanges code for tokens,
 * then redirects back to the app's integrations page with connection data.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const error = query.error as string

  if (error || !code) {
    // OAuth was cancelled or denied — redirect back with error
    return sendRedirect(event, '/?page=integrations&google_error=1', 302)
  }

  const config = useRuntimeConfig()
  const clientId = (config.googleClientId as string) || process.env.GOOGLE_CLIENT_ID
  const clientSecret = (config.googleClientSecret as string) || process.env.GOOGLE_CLIENT_SECRET
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = getRequestHeader(event, 'x-forwarded-proto') || 'http'
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/callback`
  const redirectUri = (config.googleRedirectUri as string) || process.env.GOOGLE_REDIRECT_URI || dynamicRedirectUri

  if (!clientId || !clientSecret) {
    return sendRedirect(event, '/?page=integrations&google_error=missing_credentials', 302)
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await $fetch<{
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
      scope: string
    }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    })

    // Get user profile info
    const userRes = await $fetch<{
      email: string
      name: string
      picture: string
    }>('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` }
    })

    // Encode token data to pass back to app via URL
    const connectionData = encodeURIComponent(JSON.stringify({
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token || '',
      email: userRes.email,
      name: userRes.name,
      picture: userRes.picture,
      expiresAt: Date.now() + tokenRes.expires_in * 1000
    }))

    // Redirect back to app — integrations page — with connection data
    return sendRedirect(
      event,
      `/?page=integrations&google_connected=1&gdata=${connectionData}`,
      302
    )
  } catch (e: any) {
    console.error('Google OAuth callback error:', e)
    return sendRedirect(event, '/?page=integrations&google_error=oauth_failed', 302)
  }
})
