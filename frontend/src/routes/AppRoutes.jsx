import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import useInactivityLogout from '../hooks/useInactivityLogout.js'
import { clientAdminRoutes, publicRoutes, superAdminRoutes, employeeRoutes } from './routeConfig.js'
import Chatbot from '../components/chatbot/Chatbot.jsx'

function SuperAdminRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role') || 'super_admin'
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  console.log('[SuperAdminRoute] token:', !!token, 'role:', role, 'forceReset:', forceReset)
  useInactivityLogout()
  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    console.log('[SuperAdminRoute] Redirecting to /login because no token')
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    console.log('[SuperAdminRoute] Redirecting to /force-change-password')
    return <Navigate to="/force-change-password" replace />
  }
  if (role !== 'super_admin') {
    console.log('[SuperAdminRoute] Redirecting to client admin dashboard because role is not super_admin')
    return <Navigate to="/client-admin/dashboard" replace />
  }
  return children
}

function ClientAdminRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role')
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  console.log('[ClientAdminRoute] token:', !!token, 'role:', role, 'forceReset:', forceReset)
  useInactivityLogout()

  useEffect(() => {
    document.body.classList.add('client-admin-theme')
    return () => {
      document.body.classList.remove('client-admin-theme')
    }
  }, [])

  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    console.log('[ClientAdminRoute] Redirecting to /login because no token')
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    console.log('[ClientAdminRoute] Redirecting to /force-change-password')
    return <Navigate to="/force-change-password" replace />
  }
  if (!role || role !== 'client_admin') {
    console.log('[ClientAdminRoute] Redirecting to /dashboard because role is not client_admin')
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function EmployeeRoute({ children }) {
  const token = sessionStorage.getItem('sa_token')
  const role = sessionStorage.getItem('user_role')
  const forceReset = sessionStorage.getItem('password_reset_required') === 'true'
  console.log('[EmployeeRoute] token:', !!token, 'role:', role, 'forceReset:', forceReset)
  useInactivityLogout()
  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search)
    console.log('[EmployeeRoute] Redirecting to /login because no token')
    return <Navigate to="/login" replace />
  }
  if (forceReset) {
    console.log('[EmployeeRoute] Redirecting to /force-change-password')
    return <Navigate to="/force-change-password" replace />
  }
  if (role !== 'employee' && role !== 'manager' && role !== 'hr' && role !== 'client_admin' && role !== 'super_admin') {
    console.log('[EmployeeRoute] Redirecting to /login because role is invalid')
    return <Navigate to="/login" replace />
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
          console.log('[AppRoutes] Restored employee_id in sessionStorage:', payload.employeeId);
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

        {clientAdminRoutes.map(({ path, component: Page }) => (
          <Route
            key={path}
            path={path}
            element={<ClientAdminRoute><Page /></ClientAdminRoute>}
          />
        ))}

        {employeeRoutes.map(({ path, component: Page }) => (
          <Route
            key={path}
            path={path}
            element={<EmployeeRoute><Page /></EmployeeRoute>}
          />
        ))}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Enterprise Global Floating Right-End AI Chatbot */}
      <Chatbot />
    </BrowserRouter>
  )
}
