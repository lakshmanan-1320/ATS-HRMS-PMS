import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Employee
export const getMyProfile    = ()       => api.get('/employee/me')
export const getMyGoals      = ()       => api.get('/employee/my-goals')
export const getMyTeam       = ()       => api.get('/employee/my-team')
export const getAuthMe       = ()       => api.get('/auth/me')

// Attendance
export const getTodayAttendance  = ()       => api.get('/attendance/today')
export const getTeamMembers      = ()       => api.get('/attendance/team-members')
export const checkIn             = payload  => api.post('/attendance/check-in', payload)
export const checkOut            = payload  => api.post('/attendance/check-out', payload)
export const getAttendanceHistory = (from, to) =>
  api.get('/attendance/history', { params: { from, to } })

// Leave
export const getLeaveBalances = ()       => api.get('/v1/leave/balances/my')
export const getMyLeaves      = ()       => api.get('/v1/leave/leaves/my')
export const applyLeave       = payload  => api.post('/v1/leave/leaves', payload)
export const cancelLeave      = id       => api.patch(`/v1/leave/leaves/${id}/cancel`)
export const getPendingLeaves = ()       => api.get('/v1/leave/leaves/pending')
export const approveLeave     = id       => api.patch(`/v1/leave/leaves/${id}/approve`)
export const rejectLeave      = (id, reason) => api.patch(`/v1/leave/leaves/${id}/reject`, { reason })

// Regularizations
export const getMyRegularizations      = ()       => api.get('/v1/regularizations/my')
export const submitRegularization      = payload  => api.post('/v1/regularizations', payload)
export const getPendingRegularizations = ()       => api.get('/v1/regularizations/pending')
export const approveRegularization     = id       => api.patch(`/v1/regularizations/${id}/approve`)
export const rejectRegularization      = (id, reason) => api.patch(`/v1/regularizations/${id}/reject`, { reason })

// Holidays
export const getUpcomingHolidays        = ()          => api.get('/v1/holidays/upcoming')
export const getAllHolidays              = ()          => api.get('/v1/holidays')
export const getOptionalHolidayEligibility = ()       => api.get('/v1/leave/optional-holidays/my')
export const toggleOptionalHoliday      = (id)        => api.post(`/v1/leave/optional-holidays/${id}/toggle`)
export const getTeamOptionalHolidays    = ()          => api.get('/v1/leave/manager/optional-holidays')

// Appraisals
export const getMyAppraisal      = ()       => api.get('/v1/appraisals/my')
export const submitAppraisal     = payload  => api.post('/v1/appraisals/submit', payload)
export const getTeamAppraisals   = (page, size) => api.get('/v1/appraisals/team', { params: { page, size } })
export const submitManagerAppraisal = (id, payload) => api.post(`/v1/appraisals/${id}/manager`, payload)

// Goals
export const createGoal  = payload       => api.post('/employee/goals', payload)
export const updateGoal  = (id, payload) => api.put(`/employee/goals/${id}`, payload)
export const deleteGoal  = id            => api.delete(`/employee/goals/${id}`)
export const submitGoal  = id            => api.patch(`/employee/goals/${id}/submit`)
export const getGoalById = id            => api.get(`/employee/goals/${id}`)

// In-app Notifications
export const getMyNotifications  = ()  => api.get('/v1/notifications')
export const markNotificationRead = id => api.patch(`/v1/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.patch('/v1/notifications/read-all')

export default api
