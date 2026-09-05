import React, { useEffect, useState } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar'
import Sidebar from '../../../components/layout/Sidebar'
import { useModules } from '../../../hooks/useModules'
import { useJsApiLoader } from '@react-google-maps/api'

import {
  getMyProfile, getMyGoals, getMyTeam, getAuthMe,
  getTodayAttendance, getTeamMembers, getLeaveBalances,
  getMyLeaves, getMyRegularizations, getUpcomingHolidays,
  checkIn, checkOut,
} from '../api'
import { COLORS, GRADIENTS } from '../theme'
import { Spinner, KpiCard } from '../components/shared/UI'
import { toast } from 'react-toastify'
import { TargetIcon, ClockIcon, CheckCircleIcon, BellIcon, UsersIcon, LeafIcon } from '../components/shared/Icons'

import AttendanceCard       from '../components/dashboard/AttendanceCard'
import GoalDistributionCard from '../components/dashboard/GoalDistributionCard'
import PerformanceScoreCard from '../components/dashboard/PerformanceScoreCard'
import UpcomingDeadlinesCard from '../components/dashboard/UpcomingDeadlinesCard'
import HolidaysWidget       from '../components/dashboard/HolidaysWidget'
import BirthdaysWidget      from '../components/dashboard/BirthdaysWidget'
import TeamAttendanceWidget from '../components/dashboard/TeamAttendanceWidget'
import PendingLeavesWidget  from '../components/dashboard/PendingLeavesWidget'
import PendingRegsWidget    from '../components/dashboard/PendingRegsWidget'

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

export default function EmployeeDashboard() {
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

  function formatTimeStr(t) {
    if (!t) return '—'
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg, fontFamily: 'Roboto, sans-serif' }}>
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)',
          borderRadius: '20px', padding: '26px 32px', marginBottom: '22px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(99,102,241,0.18)',
        }}>
          <div style={{ position: 'absolute', left: '-50px', top: '-50px', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(99,102,241,0.38) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '8%', bottom: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '21px', fontWeight: '700', color: '#fff', marginBottom: '5px' }}>
                Welcome back, {profile?.first_name} 👋
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.58)', display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{profile?.designation}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{profile?.department_name}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{profile?.level_name}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isPmsActive ? (
                [
                  { val: `${completionPct}%`, label: 'Goal Completion', color: '#a5b4fc' },
                  { val: `${avgProgress}%`,   label: 'Avg Progress',    color: '#34d399' },
                  { val: goals.length,        label: 'Total Goals',     color: '#fbbf24' },
                  ...(isManager ? [{ val: team.length, label: 'Team Size', color: '#f0abfc' }] : []),
                ].map((m, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }} />}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{m.label}</div>
                    </div>
                  </React.Fragment>
                ))
              ) : (
                [
                  { val: `${totalLeaveAvail}d`, label: 'Leave Balance', color: '#a5b4fc' },
                  { val: pendingLeaves.length, label: 'Pending Leaves', color: '#fbbf24' },
                  { val: pendingRegs.length,   label: 'Pending Regs',   color: '#34d399' },
                  ...(isManager ? [{ val: team.length, label: 'Team Size', color: '#f0abfc' }] : []),
                ].map((m, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }} />}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{m.label}</div>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isManager ? 'rgba(34,197,94,0.18)' : 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                {isManager ? '👔' : '👤'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.92)' }}>{profile?.first_name} {profile?.last_name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{profile?.employee_code}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {profile?.manager_first_name && (
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>👔</div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '1px' }}>Reports To</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{profile.manager_first_name} {profile.manager_last_name}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>{profile.manager_designation}</div>
                  </div>
                </div>
              )}
              {profile?.shift_name && (
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: profile.shift_color_code || 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>⏰</div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '1px' }}>Current Shift</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {profile.shift_name}
                      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.15)', padding: '1px 4px', borderRadius: '4px' }}>{profile.shift_code}</span>
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>{formatTimeStr(profile.shift_start_time)} - {formatTimeStr(profile.shift_end_time)}</div>
                  </div>
                </div>
              )}
              {leaveBalances.slice(0, 4).map((b, i) => {
                const avail = Number(b.available_days ?? b.balance ?? b.remaining ?? 0)
                const color = avail === 0 ? '#f87171' : avail <= 2 ? '#fbbf24' : '#a78bfa'
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}40`, borderRadius: '9px', padding: '6px 10px', textAlign: 'center', minWidth: '52px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', marginBottom: '2px', whiteSpace: 'nowrap', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.leave_type_name || b.type || 'Leave'}</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color }}>{avail}</div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>days</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          {isPmsActive ? (
            <>
              <KpiCard icon={<TargetIcon />}      label="Total Goals"      value={goals.length}   sub={`${completionPct}% complete`}  gradient={GRADIENTS.primary} />
              <KpiCard icon={<ClockIcon />}       label="Active Goals"     value={activeGoals}    sub="In progress"                   gradient={GRADIENTS.blue}    />
              <KpiCard icon={<CheckCircleIcon />} label="Completed"        value={completedGoals} sub={`of ${goals.length} total`}    gradient={GRADIENTS.green}   />
              <KpiCard icon={<BellIcon />}        label="Pending Approval" value={pendingGoals}   sub="Awaiting review"               gradient={GRADIENTS.amber}   />
              {isManager
                ? <KpiCard icon={<UsersIcon />} label="Team Members"  value={team.length}        sub="Direct reports"                gradient={GRADIENTS.pink}    />
                : <KpiCard icon={<LeafIcon />}  label="Leave Balance" value={totalLeaveAvail > 0 ? `${totalLeaveAvail}d` : '—'} sub="Available days" gradient={GRADIENTS.purple} />
              }
            </>
          ) : (
            <>
              <KpiCard icon={<LeafIcon />}        label="Leave Balance"    value={totalLeaveAvail > 0 ? `${totalLeaveAvail}d` : '0d'} sub="Available days"    gradient={GRADIENTS.purple}  />
              <KpiCard icon={<ClockIcon />}       label="Pending Leaves"   value={pendingLeaves.length} sub="Awaiting approval"         gradient={GRADIENTS.amber}   />
              <KpiCard icon={<CheckCircleIcon />} label="Regularizations"  value={pendingRegs.length}   sub="Pending review"           gradient={GRADIENTS.blue}    />
              <KpiCard icon={<BellIcon />}        label="Upcoming Holiday" value={upcomingHolidays.length} sub="In coming weeks"       gradient={GRADIENTS.green}   />
              {isManager && (
                <KpiCard icon={<UsersIcon />} label="Team Members"  value={team.length}        sub="Direct reports"                gradient={GRADIENTS.pink}    />
              )}
            </>
          )}
        </div>

        {/* ── Analytics Row ─────────────────────────────────────────────────── */}
        {isPmsActive ? (
          <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '1fr 1fr 1fr' : '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
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

            <GoalDistributionCard
              goals={goals}
              avgProgress={avgProgress}
              completionPct={completionPct}
              onTrack={onTrack}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <PerformanceScoreCard
                avgProgress={avgProgress}
                completionPct={completionPct}
                totalGoals={goals.length}
                completedGoals={completedGoals}
                onTrack={onTrack}
              />
              <UpcomingDeadlinesCard goals={upcomingGoals} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '1.2fr 1fr' : '1fr', gap: '18px', marginBottom: '18px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <PendingLeavesWidget leaves={pendingLeaves} />
              <PendingRegsWidget   regs={pendingRegs}     />
            </div>
          </div>
        )}

        {/* ── Quick Info Widgets ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <HolidaysWidget       holidays={upcomingHolidays} />
          <BirthdaysWidget      birthdays={birthdays}       />
          {isManager && <TeamAttendanceWidget members={teamMembers} />}
          {isPmsActive && (
            <>
              <PendingLeavesWidget  leaves={pendingLeaves}      />
              <PendingRegsWidget    regs={pendingRegs}          />
            </>
          )}
        </div>

        </main>
      </div>
    </div>
  )
}
