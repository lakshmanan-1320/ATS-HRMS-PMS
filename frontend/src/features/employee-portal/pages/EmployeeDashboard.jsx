import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar'
import Sidebar from '../../../components/layout/Sidebar'
import { useModules } from '../../../hooks/useModules'
import { useJsApiLoader } from '@react-google-maps/api'
import { useChatbot } from '../../../context/ChatbotContext.jsx'

import {
  getMyProfile, getMyGoals, getMyTeam, getAuthMe,
  getTodayAttendance, getTeamMembers, getLeaveBalances,
  getMyLeaves, getMyRegularizations, getUpcomingHolidays,
  checkIn, checkOut,
} from '../api'
import { COLORS } from '../theme'
import { Spinner } from '../components/shared/UI'
import { toast } from 'react-toastify'
import { TargetIcon, ClockIcon, CheckCircleIcon, BellIcon, UsersIcon, LeafIcon } from '../components/shared/Icons'
import { FiArrowRight, FiHeadphones } from 'react-icons/fi'

import AttendanceCard       from '../components/dashboard/AttendanceCard'
import GoalDistributionCard from '../components/dashboard/GoalDistributionCard'
import PerformanceScoreCard from '../components/dashboard/PerformanceScoreCard'
import UpcomingDeadlinesCard from '../components/dashboard/UpcomingDeadlinesCard'
import HolidaysWidget       from '../components/dashboard/HolidaysWidget'
import BirthdaysWidget      from '../components/dashboard/BirthdaysWidget'
import TeamAttendanceWidget from '../components/dashboard/TeamAttendanceWidget'
import PendingLeavesWidget  from '../components/dashboard/PendingLeavesWidget'
import PendingRegsWidget    from '../components/dashboard/PendingRegsWidget'
import QuickActionsWidget   from '../components/dashboard/QuickActionsWidget'

const GOOGLE_MAPS_LIBRARIES = ['places']

const parseGoogleGeocodeAddress = (addressComponents) => {
  let suburb = ''
  let city = ''
  let state = ''
  let country = ''
  if (Array.isArray(addressComponents)) {
    for (const component of addressComponents) {
      const types = component.types || []
      if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
        suburb = component.long_name
      } else if (types.includes('locality') || types.includes('postal_town') || types.includes('administrative_area_level_2')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name
      } else if (types.includes('country')) {
        country = component.long_name
      }
    }
  }
  return { suburb, city, state, country }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const STAT_TINTS = {
  red:    { bg: 'rgba(194,7,26,0.1)',  color: '#C2071A' },
  blue:   { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  green:  { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  amber:  { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  purple: { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
}

function StatCard({ icon, label, value, sub, tint }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: tint.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tint.color, marginBottom: '14px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: COLORS.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.text, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  )
}

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { openChat } = useChatbot()
  const [profile, setProfile]         = useState(null)
  const [goals, setGoals]             = useState([])
  const [team, setTeam]               = useState([])
  const [authMe, setAuthMe]           = useState(null)
  const [leaveBalances, setLeaveBalances] = useState([])
  const [upcomingHolidays, setUpcomingHolidays] = useState([])
  const [pendingLeaves, setPendingLeaves]       = useState([])
  const [pendingRegs, setPendingRegs]           = useState([])
  const [teamMembers, setTeamMembers]           = useState([])
  const [birthdays, setBirthdays]               = useState([])
  const [loading, setLoading]         = useState(true)

  const [isCheckIn, setIsCheckIn]         = useState(false)
  const [hasCheckedOut, setHasCheckedOut] = useState(false)
  const [punchTime, setPunchTime]         = useState(null)
  const [checkoutTime, setCheckoutTime]   = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [locationAddress, setLocationAddress] = useState('Resolving...')
  const [punching, setPunching]           = useState(false)
  const [isHoliday, setIsHoliday]         = useState(false)
  const [holidayName, setHolidayName]     = useState('')
  const [isOnLeave, setIsOnLeave]         = useState(false)

  // Google Maps SDK Loader
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const [attendanceCoords, setAttendanceCoords] = useState(null)

  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const userRole  = sessionStorage.getItem('user_role') || 'employee'
  const isEmployee = userRole !== 'client_admin' && userRole !== 'super_admin'

  const { isEnabled } = useModules()
  const isPmsActive = isEnabled('pms') && isEnabled('goals')

  function showToast(message, type = 'success') {
    if (type === 'error') {
      toast.error(message)
    } else {
      toast.success(message)
    }
  }

  const resolveAddress = (lat, lon) => {
    const fallbackCoords = `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      setLocationAddress(fallbackCoords)
      return
    }

    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat: Number(lat), lng: Number(lon) } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const { suburb, city, state, country } = parseGoogleGeocodeAddress(results[0].address_components)
          const parts = [suburb, city, state, country].filter(Boolean)
          if (parts.length > 0) {
            setLocationAddress(parts.join(', '))
          } else {
            setLocationAddress(results[0].formatted_address || fallbackCoords)
          }
        } else {
          if (status === 'ZERO_RESULTS') {
            console.warn('Geocoder returned ZERO_RESULTS for coords:', lat, lon)
            setLocationAddress(fallbackCoords)
          } else {
            console.warn('Geocoding failed with status:', status)
            setLocationAddress(fallbackCoords)
          }
        }
      })
    } catch (err) {
      console.error('Error in resolveAddress:', err)
      setLocationAddress(fallbackCoords)
    }
  }

  useEffect(() => {
    if (isLoaded && attendanceCoords) {
      resolveAddress(attendanceCoords.lat, attendanceCoords.lon)
    }
  }, [isLoaded, attendanceCoords])

  useEffect(() => {
    const teamCall = isManager ? getMyTeam().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    const goalsCall = (isEnabled('pms') && isEnabled('goals')) ? getMyGoals().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })

    Promise.all([
      getMyProfile().catch(() => ({ data: null })),
      goalsCall,
      teamCall,
      getTodayAttendance().catch(() => null),
      getAuthMe().catch(() => null),
      getLeaveBalances().catch(() => null),
      getUpcomingHolidays().catch(() => null),
      getMyLeaves().catch(() => null),
      getMyRegularizations().catch(() => null),
      getTeamMembers().catch(() => null),
    ]).then(([profileRes, goalsRes, teamRes, attRes, authMeRes, leaveRes, holidaysRes, myLeavesRes, regsRes, teamAttRes]) => {
      setProfile(profileRes?.data || null)
      setGoals(goalsRes?.data || [])
      setTeam(teamRes?.data || [])
      setAuthMe(authMeRes?.data || null)

      const lb = leaveRes?.data?.data || leaveRes?.data || []
      setLeaveBalances(Array.isArray(lb) ? lb : [])

      const hols = holidaysRes?.data?.data || holidaysRes?.data || []
      setUpcomingHolidays(Array.isArray(hols) ? hols.slice(0, 5) : [])

      const myLeaves = myLeavesRes?.data?.data || myLeavesRes?.data || []
      setPendingLeaves(
        Array.isArray(myLeaves)
          ? myLeaves.filter(l => ['pending', 'submitted'].includes((l.status || '').toLowerCase())).slice(0, 5)
          : []
      )

      const regs = regsRes?.data?.data || regsRes?.data || []
      setPendingRegs(
        Array.isArray(regs)
          ? regs.filter(r => ['pending', 'submitted'].includes((r.status || '').toLowerCase())).slice(0, 5)
          : []
      )

      const tmArr = Array.isArray(teamAttRes?.data?.data || teamAttRes?.data)
        ? (teamAttRes?.data?.data || teamAttRes?.data)
        : []
      setTeamMembers(tmArr.slice(0, 5))

      const today = new Date()
      setBirthdays(
        tmArr.filter(m => {
          if (!m.date_of_birth) return false
          const dob  = new Date(m.date_of_birth)
          const bday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
          if (bday < today) bday.setFullYear(today.getFullYear() + 1)
          return Math.ceil((bday - today) / 864e5) <= 30
        }).sort((a, b) => {
          const mkBday = m => {
            const d = new Date(m.date_of_birth)
            const bd = new Date(today.getFullYear(), d.getMonth(), d.getDate())
            if (bd < today) bd.setFullYear(today.getFullYear() + 1)
            return bd
          }
          return mkBday(a) - mkBday(b)
        }).slice(0, 5)
      )

      if (profileRes?.data) {
        sessionStorage.setItem('employee_name', `${profileRes.data.first_name} ${profileRes.data.last_name}`)
      }

      const att = attRes?.data?.data
      if (att) {
        setIsHoliday(!!att.is_holiday)
        setHolidayName(att.holiday_name || '')
        setIsOnLeave(!!att.is_on_leave)
        if (att.checkInTime) {
          const inDate = new Date(att.checkInTime)
          setPunchTime(inDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
          if (att.checkOutTime) {
            const outDate = new Date(att.checkOutTime)
            setCheckoutTime(outDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
            setIsCheckIn(false)
            setHasCheckedOut(true)
            setElapsedSeconds((att.workDurationMinutes || 0) * 60)
            setAttendanceCoords({
              lat: att.checkOutLatitude || att.latitude,
              lon: att.checkOutLongitude || att.longitude
            })
          } else {
            setIsCheckIn(true)
            setElapsedSeconds(Math.max(0, Math.floor((new Date() - inDate) / 1000)))
            setAttendanceCoords({
              lat: att.latitude,
              lon: att.longitude
            })
          }
        } else {
          setLocationAddress('—')
        }
      } else {
        setLocationAddress('—')
      }
    }).catch(err => {
      console.warn('Dashboard data fetch warning:', err)
    }).finally(() => setLoading(false))
  }, [isManager])

  useEffect(() => {
    if (!isCheckIn || hasCheckedOut) return
    const t = setInterval(() => setElapsedSeconds(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [isCheckIn, hasCheckedOut])

  async function getCoords() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
        err => {
          const messages = {
            1: 'Location access denied. Please allow location permission to punch in/out.',
            2: 'Location unavailable. Please check your device settings.',
            3: 'Location request timed out. Please try again.',
          }
          reject(new Error(messages[err.code] || 'Failed to get location.'))
        },
        { timeout: 8000, enableHighAccuracy: true }
      )
    })
  }

  async function handlePunch() {
    if (hasCheckedOut || punching) return
    setPunching(true)

    let coords
    try {
      coords = await getCoords()
    } catch (err) {
      showToast(err.message, 'error')
      setPunching(false)
      return
    }

    const payload = {
      latitude:  coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      deviceInfo: { platform: 'Web', browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari' },
    }

    try {
      if (!isCheckIn) {
        const res = await checkIn(payload)
        if (res.data?.success) {
          const att = res.data.data
          setIsCheckIn(true)
          setPunchTime(new Date(att.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
          setElapsedSeconds(0)
          resolveAddress(att.latitude, att.longitude)
          setIsHoliday(!!att.is_holiday)
          setHolidayName(att.holiday_name || '')
          setIsOnLeave(!!att.is_on_leave)
          showToast('Checked in successfully')
        }
      } else {
        const res = await checkOut(payload)
        if (res.data?.success) {
          const att = res.data.data
          setIsCheckIn(false)
          setHasCheckedOut(true)
          setCheckoutTime(new Date(att.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
          resolveAddress(att.checkOutLatitude || coords.latitude, att.checkOutLongitude || coords.longitude)
          setIsHoliday(!!att.is_holiday)
          setHolidayName(att.holiday_name || '')
          setIsOnLeave(!!att.is_on_leave)
          showToast('Checked out successfully')
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Punch operation failed.', 'error')
    } finally {
      setPunching(false)
    }
  }

  if (loading) return <Spinner label="Loading Dashboard…" />

  // ── Derived goal analytics ─────────────────────────────────────────────────
  const activeGoals    = goals.filter(g => ['active', 'in_progress'].includes(g.status)).length
  const pendingGoals   = goals.filter(g => g.status === 'submitted').length
  const completedGoals = goals.filter(g => ['approved', 'completed'].includes(g.status)).length
  const completionPct  = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0
  const avgProgress    = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / goals.length) : 0
  const onTrack        = goals.filter(g => (Number(g.progress) || 0) >= 50).length

  const now   = new Date()
  const in30  = new Date(now.getTime() + 30 * 864e5)
  const upcomingGoals = goals
    .filter(g => g.due_date && new Date(g.due_date) >= now && new Date(g.due_date) <= in30 && !['approved', 'completed'].includes(g.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  const totalLeaveAvail = leaveBalances.reduce((s, b) => s + Number(b.available_days ?? b.balance ?? b.remaining ?? 0), 0)
  const attendanceEnabled = authMe?.attendance_enabled
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const greeting = getGreeting()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {userRole === 'client_admin'
        ? <ClientAdminSidebar active="attendance" />
        : userRole === 'super_admin'
          ? <Sidebar active="attendance" />
          : <EmployeeSidebar active="dashboard" />
      }

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {userRole === 'client_admin'
          ? <ClientAdminTopBar title="Dashboard" />
          : <EmployeeTopBar title="Dashboard" />
        }
        <main style={{ flex: 1, padding: '28px 30px', overflowY: 'auto', minWidth: 0 }}>

        {/* ── Welcome Banner ───────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(96deg, #fef0f2 0%, #fdf5f6 34%, #fdeff1 62%, #fce9ec 100%)',
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: '20px', padding: '24px 32px', marginBottom: '22px',
          minHeight: '150px', boxSizing: 'border-box',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text }}>
                {greeting}, <span style={{ color: COLORS.primary }}>{profile?.first_name}!</span>
              </div>
              <div style={{ fontSize: '13px', color: COLORS.textSub, marginTop: '4px', maxWidth: '420px' }}>
                Here's your overview for today. Stay on track and keep making progress.
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: '700', color: COLORS.primary, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                "Small steps every day lead to big results."
              </div>
            </div>
          </div>
          <svg width="150" height="78" viewBox="0 0 150 78" style={{ position: 'absolute', right: '18px', bottom: 0, opacity: 0.9, pointerEvents: 'none' }}>
            <polygon points="0,78 45,20 72,48 100,10 150,78" fill="#f7a6af" opacity="0.55" />
            <polygon points="22,78 75,26 128,78" fill="#C2071A" opacity="0.9" />
            <line x1="75" y1="26" x2="75" y2="8" stroke="#7c0a1a" strokeWidth="2" />
            <polygon points="75,8 89,14 75,20" fill="#941018" />
          </svg>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '14px', marginBottom: '22px', alignItems: 'start' }}>
          {isPmsActive ? (
            <>
              <StatCard icon={<TargetIcon size={18} />}      label="Total Goals"      value={goals.length}   sub={`${completionPct}% complete`}  tint={STAT_TINTS.red}    />
              <StatCard icon={<ClockIcon size={18} />}       label="Active Goals"     value={activeGoals}    sub="In progress"                   tint={STAT_TINTS.blue}   />
              <StatCard icon={<CheckCircleIcon size={18} />} label="Completed"        value={completedGoals} sub={`of ${goals.length} total`}    tint={STAT_TINTS.green}  />
              <StatCard icon={<BellIcon size={18} />}        label="Pending Approval" value={pendingGoals}   sub="Awaiting review"               tint={STAT_TINTS.amber}  />
              {isManager
                ? <StatCard icon={<UsersIcon size={18} />} label="Team Members"  value={team.length}        sub="Direct reports"                tint={STAT_TINTS.purple} />
                : <StatCard icon={<LeafIcon size={18} />}  label="Leave Balance" value={totalLeaveAvail > 0 ? `${totalLeaveAvail}d` : '—'} sub="Available days" tint={STAT_TINTS.purple} />
              }
            </>
          ) : (
            <>
              <StatCard icon={<LeafIcon size={18} />}        label="Leave Balance"    value={totalLeaveAvail > 0 ? `${totalLeaveAvail}d` : '0d'} sub="Available days"    tint={STAT_TINTS.purple} />
              <StatCard icon={<ClockIcon size={18} />}       label="Pending Leaves"   value={pendingLeaves.length} sub="Awaiting approval"         tint={STAT_TINTS.amber}  />
              <StatCard icon={<CheckCircleIcon size={18} />} label="Regularizations"  value={pendingRegs.length}   sub="Pending review"           tint={STAT_TINTS.blue}   />
              <StatCard icon={<BellIcon size={18} />}        label="Upcoming Holiday" value={upcomingHolidays.length} sub="In coming weeks"       tint={STAT_TINTS.green}  />
              {isManager && (
                <StatCard icon={<UsersIcon size={18} />} label="Team Members"  value={team.length}        sub="Direct reports"                tint={STAT_TINTS.purple} />
              )}
            </>
          )}
        </div>

        {/* ── Main Dashboard Layout Grid (Compact, Seamless, Zero Gaps) ───────── */}
        {isPmsActive ? (
          <>
            {/* PMS Active Top Analytics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? 'repeat(auto-fit, minmax(320px, 1fr))' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px', marginBottom: '22px', alignItems: 'start' }}>
              {isEmployee && (
                <AttendanceCard
                  isCheckIn={isCheckIn}
                  hasCheckedOut={hasCheckedOut}
                  punchTime={punchTime}
                  checkoutTime={checkoutTime}
                  elapsedSeconds={elapsedSeconds}
                  locationAddress={locationAddress}
                  punching={punching}
                  isHoliday={isHoliday}
                  holidayName={holidayName}
                  isOnLeave={isOnLeave}
                  attendanceEnabled={attendanceEnabled}
                  formattedDate={formattedDate}
                  onPunch={handlePunch}
                  shiftName={profile?.shift_name}
                  shiftCode={profile?.shift_code}
                  shiftStartTime={profile?.shift_start_time}
                  shiftEndTime={profile?.shift_end_time}
                  shiftColorCode={profile?.shift_color_code}
                  shiftGraceMinutes={profile?.shift_grace_minutes}
                />
              )}

              <PerformanceScoreCard
                avgProgress={avgProgress}
                completionPct={completionPct}
                totalGoals={goals.length}
                completedGoals={completedGoals}
                onTrack={onTrack}
                onViewAll={() => navigate('/employee/performance')}
              />

              <GoalDistributionCard
                goals={goals}
                completionPct={completionPct}
                onViewAll={() => navigate('/employee/performance')}
              />
            </div>

            {/* PMS Secondary Widgets 2-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '22px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                <UpcomingDeadlinesCard goals={upcomingGoals} onViewAll={() => navigate('/employee/performance')} />
                <QuickActionsWidget />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                <PendingLeavesWidget leaves={pendingLeaves} onViewAll={() => navigate('/employee/leave-request')} />
                <PendingRegsWidget regs={pendingRegs} onViewAll={() => navigate('/employee/regularization')} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
                  <HolidaysWidget holidays={upcomingHolidays} onViewAll={() => navigate('/employee/holidays')} />
                  <BirthdaysWidget birthdays={birthdays} />
                </div>
                {isManager && <TeamAttendanceWidget members={teamMembers} />}
              </div>
            </div>
          </>
        ) : (
          /* Standard HRMS 2-Column Balanced Dashboard Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '22px', alignItems: 'start' }}>
            {/* Left Column - Attendance Card & Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
              {isEmployee && (
                <AttendanceCard
                  isCheckIn={isCheckIn}
                  hasCheckedOut={hasCheckedOut}
                  punchTime={punchTime}
                  checkoutTime={checkoutTime}
                  elapsedSeconds={elapsedSeconds}
                  locationAddress={locationAddress}
                  punching={punching}
                  isHoliday={isHoliday}
                  holidayName={holidayName}
                  isOnLeave={isOnLeave}
                  attendanceEnabled={attendanceEnabled}
                  formattedDate={formattedDate}
                  onPunch={handlePunch}
                  shiftName={profile?.shift_name}
                  shiftCode={profile?.shift_code}
                  shiftStartTime={profile?.shift_start_time}
                  shiftEndTime={profile?.shift_end_time}
                  shiftColorCode={profile?.shift_color_code}
                  shiftGraceMinutes={profile?.shift_grace_minutes}
                />
              )}
              <QuickActionsWidget />
            </div>

            {/* Right Column - Pending Requests, Holidays & Birthdays */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
              <PendingLeavesWidget leaves={pendingLeaves} onViewAll={() => navigate('/employee/leave-request')} />
              <PendingRegsWidget regs={pendingRegs} onViewAll={() => navigate('/employee/regularization')} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
                <HolidaysWidget holidays={upcomingHolidays} onViewAll={() => navigate('/employee/holidays')} />
                <BirthdaysWidget birthdays={birthdays} />
              </div>
              {isManager && <TeamAttendanceWidget members={teamMembers} />}
            </div>
          </div>
        )}

        {/* ── Motivation / Support Banner ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '2fr 1fr' : '1fr', gap: '18px' }}>
          <div style={{
            background: 'linear-gradient(96deg, #fef0f2 0%, #fdf5f6 34%, #fdeff1 62%, #fce9ec 100%)',
            border: `1px solid ${COLORS.borderLight}`, borderRadius: '18px', padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            position: 'relative', overflow: 'hidden', flexWrap: 'wrap', minWidth: 0, boxSizing: 'border-box',
          }}>
            <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.text }}>Keep going, great things take time.</div>
              <div style={{ fontSize: '12px', color: COLORS.textSub, marginTop: '4px' }}>Stay consistent and make every day count.</div>
            </div>
            {isPmsActive && (
              <button
                onClick={() => navigate('/employee/goals/create')}
                style={{
                  position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 18px', background: 'linear-gradient(135deg, #D01021 0%, #B40619 100%)',
                  color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(194,7,26,0.3)',
                }}
              >
                Set a New Goal <FiArrowRight size={14} />
              </button>
            )}
          </div>

          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`, borderRadius: '18px',
            padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            minWidth: 0, boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(194,7,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, flexShrink: 0 }}>
                <FiHeadphones size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, whiteSpace: 'nowrap' }}>Need Help?</div>
                <div style={{ fontSize: '11px', color: COLORS.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Our support team is here for you.</div>
              </div>
            </div>
            <button
              onClick={() => openChat()}
              style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: COLORS.primary, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Contact Support →
            </button>
          </div>
        </div>

        </main>
      </div>
    </div>
  )
}
