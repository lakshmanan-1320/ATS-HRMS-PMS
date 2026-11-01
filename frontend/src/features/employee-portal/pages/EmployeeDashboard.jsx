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
import { PMS } from '../theme'
import { Spinner } from '../components/shared/UI'
import { toast } from 'react-toastify'

import AttendanceCard        from '../components/dashboard/AttendanceCard'
import GoalDistributionCard  from '../components/dashboard/GoalDistributionCard'
import PerformanceScoreCard  from '../components/dashboard/PerformanceScoreCard'
import UpcomingDeadlinesCard from '../components/dashboard/UpcomingDeadlinesCard'
import HolidaysWidget        from '../components/dashboard/HolidaysWidget'
import BirthdaysWidget       from '../components/dashboard/BirthdaysWidget'
import TeamAttendanceWidget  from '../components/dashboard/TeamAttendanceWidget'
import PendingLeavesWidget   from '../components/dashboard/PendingLeavesWidget'
import PendingRegsWidget     from '../components/dashboard/PendingRegsWidget'
import QuickActionsWidget    from '../components/dashboard/QuickActionsWidget'
import DashboardHero, { DailyFocus } from '../components/dashboard/DashboardHero'
import MyWorkdayPanel        from '../components/dashboard/MyWorkdayPanel'
import { TotalGoalsCard, PendingApprovalCard, LeaveBalanceCard, TeamMembersCard } from '../components/dashboard/KpiCards'
import { MeetingsCalendarCard, SkillsetOverviewCard } from '../components/dashboard/InsightCards'
import { KeepGoingBanner, NeedHelpCard } from '../components/dashboard/DashboardFooterBanners'

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

// Goal is "in period" when its start→due window overlaps the selected period.
function periodRange(period, now) {
  const y = now.getFullYear(), m = now.getMonth()
  if (period === 'week') {
    const start = new Date(y, m, now.getDate() - ((now.getDay() + 6) % 7))
    return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59)]
  }
  if (period === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59)]
  if (period === 'quarter') {
    const q = Math.floor(m / 3) * 3
    return [new Date(y, q, 1), new Date(y, q + 3, 0, 23, 59, 59)]
  }
  return null
}

function goalInPeriod(goal, period, now) {
  const range = periodRange(period, now)
  if (!range) return true
  const s = goal.start_date ? new Date(goal.start_date) : null
  const e = goal.due_date ? new Date(goal.due_date) : null
  if (!s && !e) return true
  const from = s || e
  const to = e || s
  return from <= range[1] && to >= range[0]
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
  const [period, setPeriod]           = useState('all')

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
          ? myLeaves.filter(l => ['pending', 'submitted'].includes((l.status || '').toLowerCase()))
          : []
      )

      const regs = regsRes?.data?.data || regsRes?.data || []
      setPendingRegs(
        Array.isArray(regs)
          ? regs.filter(r => ['pending', 'submitted'].includes((r.status || '').toLowerCase()))
          : []
      )

      const tmArr = Array.isArray(teamAttRes?.data?.data || teamAttRes?.data)
        ? (teamAttRes?.data?.data || teamAttRes?.data)
        : []
      setTeamMembers(tmArr)

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

  // ── Period filter (hero tabs) ──────────────────────────────────────────────
  const now = new Date()
  const periodGoals = goals.filter(g => goalInPeriod(g, period, now))

  // ── Derived goal analytics ─────────────────────────────────────────────────
  const activeGoals    = periodGoals.filter(g => ['active', 'in_progress'].includes(g.status)).length
  const pendingGoals   = periodGoals.filter(g => g.status === 'submitted').length
  const completedGoals = periodGoals.filter(g => ['approved', 'completed'].includes(g.status)).length
  const completionPct  = periodGoals.length > 0 ? Math.round((completedGoals / periodGoals.length) * 100) : 0
  const avgProgress    = periodGoals.length > 0 ? Math.round(periodGoals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / periodGoals.length) : 0
  const onTrack        = periodGoals.filter(g => (Number(g.progress) || 0) >= 50 && !['approved', 'completed'].includes(g.status)).length
  const behind         = Math.max(0, periodGoals.length - completedGoals - onTrack)

  const in30  = new Date(now.getTime() + 30 * 864e5)
  const upcomingGoals = goals
    .filter(g => g.due_date && new Date(g.due_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && new Date(g.due_date) <= in30 && !['approved', 'completed'].includes(g.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const totalLeaveAvail = leaveBalances.reduce((s, b) => s + Number(b.available_days ?? b.balance ?? b.remaining ?? 0), 0)
  const attendanceEnabled = authMe?.attendance_enabled
  // Figma format: "Sun, 6 Sep 2026"
  const formattedDate = `${now.toLocaleDateString('en-US', { weekday: 'short' })}, ${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })} ${now.getFullYear()}`

  const greeting = getGreeting()
  const workdayTeam = isManager ? team : teamMembers
  const teamSubtitle = isManager
    ? `${team.length} direct report${team.length === 1 ? '' : 's'}`
    : workdayTeam.length ? 'Teammates in your team' : 'No teammates to show yet'
  const goNewGoal = () => navigate('/employee/goals/create')

  const attendancePanel = isEmployee ? (
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
      leaveBalanceDays={totalLeaveAvail}
      openRegularizations={pendingRegs.length}
      onRequestShift={() => openChat()}
      onOpenAttendance={() => navigate('/employee/attendance')}
      onContactAdmin={() => openChat()}
    />
  ) : null

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: PMS.white, fontFamily: PMS.fontHead }}>
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
        <main className="pms-main" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Greeting / period / CTA ───────────────────────────────────── */}
          <DashboardHero
            greeting={greeting}
            firstName={profile?.first_name}
            dateLabel={formattedDate}
            period={period}
            onPeriodChange={setPeriod}
            showGoalControls={isPmsActive}
            onNewGoal={goNewGoal}
            onFilters={() => navigate('/employee/performance')}
          />

          {/* ── KPI row ───────────────────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: '39px' }}>
            {isPmsActive ? (
              <>
                <TotalGoalsCard
                  total={periodGoals.length}
                  completionPct={completionPct}
                  active={activeGoals}
                  completed={completedGoals}
                  pending={pendingGoals}
                  onTrack={onTrack}
                  behind={behind}
                />
                <PerformanceScoreCard onViewAll={() => navigate('/employee/performance')} />
                <GoalDistributionCard
                  goals={periodGoals}
                  avgProgress={avgProgress}
                  completionPct={completionPct}
                  onViewAll={() => navigate('/employee/performance')}
                />
              </>
            ) : (
              <LeaveBalanceCard
                className={isManager ? 'pms-span-2' : 'pms-span-3'}
                balances={leaveBalances}
                total={totalLeaveAvail}
                onOpen={() => navigate('/employee/leave')}
              />
            )}
            <PendingApprovalCard
              leaves={pendingLeaves.length}
              regs={pendingRegs.length}
              goals={pendingGoals}
              showGoals={isPmsActive}
              onOpen={() => navigate(isPmsActive ? '/employee/performance' : '/employee/leave-request')}
              onLeaves={() => navigate('/employee/leave-request')}
              onRegs={() => navigate('/employee/regularization')}
              onGoals={() => navigate('/employee/performance')}
            />
            {!isPmsActive && isManager && (
              <TeamMembersCard team={team} onOpen={() => navigate('/employee/team')} />
            )}
          </div>

          {/* ── Daily focus ──────────────────────────────────────────────── */}
          <div style={{ marginTop: '61px' }}>
            <DailyFocus quote="Small steps every day lead to big results." />
          </div>

          {/* ── My Workday ───────────────────────────────────────────────── */}
          <div style={{ marginTop: '28px' }}>
            <MyWorkdayPanel
              goals={goals}
              upcomingGoals={upcomingGoals}
              showGoals={isPmsActive}
              teamMembers={workdayTeam}
              teamSubtitle={teamSubtitle}
              onViewTeam={isManager ? () => navigate('/employee/team') : null}
              onOpenGoals={() => navigate('/employee/performance')}
              onNewGoal={isPmsActive ? goNewGoal : null}
              menuLinks={[
                ...(isPmsActive ? [{ label: 'Open performance hub', onClick: () => navigate('/employee/performance') }] : []),
                { label: 'My attendance', onClick: () => navigate('/employee/attendance') },
                { label: 'Regularization requests', onClick: () => navigate('/employee/regularization') },
              ]}
            >
              {attendancePanel}
            </MyWorkdayPanel>
          </div>

          {/* ── Meetings / skills / deadlines ────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: '40px' }}>
            <MeetingsCalendarCard className="pms-span-2" />
            <SkillsetOverviewCard />
            {isPmsActive
              ? <UpcomingDeadlinesCard goals={upcomingGoals} onViewAll={() => navigate('/employee/performance')} />
              : <HolidaysWidget holidays={upcomingHolidays} onViewAll={() => navigate('/employee/holidays')} />
            }
          </div>

          {/* ── Requests / holidays / birthdays ──────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: '25px' }}>
            <PendingLeavesWidget leaves={pendingLeaves} onViewAll={() => navigate('/employee/leave-request')} />
            <PendingRegsWidget regs={pendingRegs} onViewAll={() => navigate('/employee/regularization')} />
            {isPmsActive && <HolidaysWidget holidays={upcomingHolidays} onViewAll={() => navigate('/employee/holidays')} />}
            <div className={isPmsActive ? undefined : 'pms-span-2'} style={{ display: 'grid', minWidth: 0 }}>
              <BirthdaysWidget birthdays={birthdays} />
            </div>
          </div>

          {/* ── Quick actions / team attendance ──────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: '25px' }}>
            <QuickActionsWidget className={isManager ? 'pms-span-2' : 'pms-span-full'} />
            {isManager && (
              <TeamAttendanceWidget className="pms-span-2" members={teamMembers.slice(0, 5)} onViewAll={() => navigate('/employee/team-attendance')} />
            )}
          </div>

          {/* ── Motivation / support ─────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: '25px' }}>
            <KeepGoingBanner className="pms-span-3" onNewGoal={isPmsActive ? goNewGoal : null} />
            <NeedHelpCard onContact={() => openChat()} />
          </div>

        </main>
      </div>
    </div>
  )
}
