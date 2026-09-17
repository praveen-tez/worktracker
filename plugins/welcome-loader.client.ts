export default defineNuxtPlugin(() => {
  const overlay = document.createElement('div')
  overlay.className = 'welcome-loader'
  overlay.innerHTML = '<div class="welcome-loader-mark">MT</div><strong>my tracker</strong><span>Preparing your workspace</span><i><b></b></i>'
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('ready'))
  window.addEventListener('load', () => setTimeout(() => overlay.classList.add('done'), 450), { once: true })
  setTimeout(() => overlay.classList.add('done'), 1600)
})
