import axios from 'axios'

// Configure global API base URL redirection for production subdirectory deployment
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
axios.defaults.baseURL = apiBase

axios.interceptors.request.use(config => {
  if (config.url && config.url.startsWith('/api') && apiBase !== '/api') {
    config.url = config.url.replace(/^\/api/, apiBase)
  }
  return config
})

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
  
  instance.interceptors.request.use(cfg => {
    if (cfg.url && cfg.url.startsWith('/api') && apiBase !== '/api') {
      cfg.url = cfg.url.replace(/^\/api/, apiBase)
    }
    if (cfg.baseURL && cfg.baseURL.startsWith('/api') && apiBase !== '/api') {
      cfg.baseURL = cfg.baseURL.replace(/^\/api/, apiBase)
    }
    return cfg
  })

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
