import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  role: sessionStorage.getItem('user_role') || null,
  token: sessionStorage.getItem('sa_token') || null,

  setAuth: (user, role, token) => {
    sessionStorage.setItem('user', JSON.stringify(user))
    sessionStorage.setItem('user_role', role)
    sessionStorage.setItem('sa_token', token)
    set({ user, role, token })
  },

  clearAuth: () => {
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('user_role')
    sessionStorage.removeItem('sa_token')
    set({ user: null, role: null, token: null })
  }
}))
