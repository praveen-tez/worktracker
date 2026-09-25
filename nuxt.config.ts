export default defineNuxtConfig({
  compatibilityDate: '2026-09-15',
  devtools: { enabled: true },
  css: ['~/assets/main.css', '~/assets/ux-overrides.css', '~/assets/welcome-loader.css', '~/assets/workspace-overrides.css', '~/assets/integration-ui.css', '~/assets/analytics-ui.css', '~/assets/overview-polish.css', '~/assets/final-ux.css', '~/assets/chart-filter.css'],
  modules: ['@nuxtjs/google-fonts'],
  googleFonts: { families: { Poppins: [400, 500, 600, 700] }, display: 'swap' },
  runtimeConfig: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    public: { sheetsEndpoint: process.env.NUXT_PUBLIC_SHEETS_ENDPOINT || '' }
  },
  app: { head: { title: 'Monthly Time Tracker', meta: [{ name: 'description', content: 'Monthly sprint and time tracking workspace' }] } }
})
