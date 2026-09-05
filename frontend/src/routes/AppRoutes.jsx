import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import useInactivityLogout from '../hooks/useInactivityLogout.js'
import { clientAdminRoutes, publicRoutes, superAdminRoutes, employeeRoutes } from './routeConfig.js'
import { useModules } from '../hooks/useModules.js'
import Chatbot from '../components/chatbot/Chatbot.jsx'

function SuperAdminRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role') || 'super_admin'
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  useInactivityLogout()
  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    return <Navigate to="/force-change-password" replace />
  }
  if (role !== 'super_admin') {
    return <Navigate to="/client-admin/dashboard" replace />
  }
  return children
}

function ClientAdminRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role')
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  useInactivityLogout()

  useEffect(() => {
    document.body.classList.add('client-admin-theme')
    return () => {
      document.body.classList.remove('client-admin-theme')
    }
  }, [])

  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    return <Navigate to="/force-change-password" replace />
  }
  if (!role || role !== 'client_admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function EmployeeRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role')
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  useInactivityLogout()
  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    return <Navigate to="/force-change-password" replace />
  }
  if (role !== 'employee' && role !== 'manager' && role !== 'hr' && role !== 'client_admin' && role !== 'super_admin') {
    return <Navigate to="/login" replace />
  }
  return children
}

function ModuleGuard({ module, redirectTo, children }) {
  const { isEnabled, loading } = useModules()
  if (loading) return null
  if (module && !isEnabled(module)) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}

export default function AppRoutes() {
  useEffect(() => {
    const token = sessionStorage.getItem('sa_token');
    if (token && !sessionStorage.getItem('employee_id')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.employeeId) {
          sessionStorage.setItem('employee_id', payload.employeeId);
        }
      } catch (e) {
        console.error('[AppRoutes] Failed to decode token on app start:', e);
      }
    }
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {publicRoutes.map(({ path, component: Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}

        {superAdminRoutes.map(({ path, component: Page }) => (
          <Route
            key={path}
            path={path}
            element={<SuperAdminRoute><Page /></SuperAdminRoute>}
          />
        ))}

        {clientAdminRoutes.map(({ path, component: Page, module }) => (
          <Route
            key={path}
            path={path}
            element={
              <ClientAdminRoute>
                <ModuleGuard module={module} redirectTo="/client-admin/dashboard">
                  <Page />
                </ModuleGuard>
              </ClientAdminRoute>
            }
          />
        ))}

        {employeeRoutes.map(({ path, component: Page, module }) => (
          <Route
            key={path}
            path={path}
            element={
              <EmployeeRoute>
                <ModuleGuard module={module} redirectTo="/employee/dashboard">
                  <Page />
                </ModuleGuard>
              </EmployeeRoute>
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
