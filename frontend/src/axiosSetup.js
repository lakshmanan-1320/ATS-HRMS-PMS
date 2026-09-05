import axios from 'axios'

// Configure global API base URL redirection for production subdirectory deployment
const rawApiBase = import.meta.env.VITE_API_BASE_URL || ''
const apiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '') : ''
const isAbsoluteBase = /^https?:\/\//i.test(apiBase)

// Only set defaults.baseURL if an absolute base URL is explicitly provided
if (isAbsoluteBase) {
  axios.defaults.baseURL = apiBase
}

function normalizeRequestConfig(cfg) {
  if (!cfg) return cfg

  const bURL = cfg.baseURL || ''

  if (isAbsoluteBase) {
    if (cfg.url && typeof cfg.url === 'string') {
      if (cfg.url.startsWith('/api/')) {
        cfg.url = cfg.url.replace(/^\/api/, apiBase)
      } else if (cfg.url === '/api') {
        cfg.url = apiBase
      }
    }
    if (cfg.baseURL && typeof cfg.baseURL === 'string') {
      if (cfg.baseURL.startsWith('/api/')) {
        cfg.baseURL = cfg.baseURL.replace(/^\/api/, apiBase)
      } else if (cfg.baseURL === '/api') {
        cfg.baseURL = apiBase
      }
    }
  } else {
    // Relative environment (same domain or proxy):
    // If baseURL ends with '/api' and url also starts with '/api', strip leading '/api' from url
    if (bURL.endsWith('/api') && cfg.url && typeof cfg.url === 'string' && cfg.url.startsWith('/api')) {
      cfg.url = cfg.url.replace(/^\/api(\/|$)/, '$1') || '/'
    }
  }

  // Guard against any double '/api/api' that could ever occur anywhere in url
  if (cfg.url && typeof cfg.url === 'string') {
    cfg.url = cfg.url.replace(/(\/api){2,}/g, '/api')
  }

  return cfg
}

axios.interceptors.request.use(normalizeRequestConfig)

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      sessionStorage.clear()
      const path = window.location.pathname
      if (!path.endsWith('/login') && !path.endsWith('/force-change-password')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

const originalCreate = axios.create
axios.create = function (config) {
  const instance = originalCreate.call(axios, config)
  instance.interceptors.request.use(normalizeRequestConfig)

  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        sessionStorage.clear()
        const path = window.location.pathname
        if (!path.endsWith('/login') && !path.endsWith('/force-change-password')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )

  return instance
}

