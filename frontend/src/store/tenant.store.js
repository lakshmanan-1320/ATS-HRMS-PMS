import { create } from 'zustand'

export const useTenantStore = create((set) => ({
  tenantSettings: null,
  loading: false,
  error: null,
  
  fetchTenantSettings: async () => {
    // Placeholder for tenant-specific configuration loader logic
  }
}))
