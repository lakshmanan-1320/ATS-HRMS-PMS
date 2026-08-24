import { create } from 'zustand'

export const usePermissionStore = create((set) => ({
  userPermissions: [],
  loading: false,
  error: null,
  
  hasPermission: (permission) => {
    // Placeholder logic for checking permissions
    return true;
  }
}))
