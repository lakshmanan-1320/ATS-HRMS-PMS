import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import { useJsApiLoader } from '@react-google-maps/api'

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

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#090d16',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  card: {
    background: 'rgba(17,24,39,0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  cardHeader: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#34d399',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontSize: '14px',
  },
  detailLabel: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  detailValue: {
    color: '#f1f5f9',
    fontWeight: '600',
  },

  // Premium Light Attendance Card Styles
  attendanceCard: {
    background: '#ffffff',
    color: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.05)',
  },
  attendanceHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '16px',
    marginBottom: '24px',
  },
  attendanceTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  attendanceDate: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  timerText: {
    fontSize: '56px',
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#10b981',
    lineHeight: '1.1',
    marginBottom: '6px',
    letterSpacing: '1px',
  },
  timerSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '28px',
    fontWeight: '500',
  },
  attendanceDetailsRow: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    gap: '60px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  attendanceDetailCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '280px',
  },
  attendanceDetailLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  attendanceDetailValue: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
  },
  punchBtnIn: {
    padding: '12px 36px',
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  },
  punchBtnOut: {
    padding: '12px 36px',
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  },
  punchBtnDisabled: {
    padding: '12px 36px',
    background: '#e2e8f0',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '30px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  disabledNotice: {
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '12px',
    padding: '16px 20px',
    color: '#fca5a5',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    maxWidth: '500px',
  },
}

// ── Icons ────────────────────────────────────────────────────────────────────

const FingerprintIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
    <path d="M12 22v-3" />
    <path d="M12 14v-4" />
    <path d="M14 14V9a2 2 0 0 0-4 0v5" />
    <path d="M17 14V8a5 5 0 0 0-10 0v6" />
    <path d="M20 14V7A8 8 0 0 0 4 7v7" />
  </svg>
)

const ExitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const EntryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function EmployeeDashboard() {
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [isCheckIn, setIsCheckIn] = useState(false)
  const [hasCheckedOut, setHasCheckedOut] = useState(false)
  const [punchTime, setPunchTime] = useState(null)
  const [checkoutTime, setCheckoutTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [locationAddress, setLocationAddress] = useState('Resolving location...')
  const [todayRecord, setTodayRecord] = useState(null)
  const [punching, setPunching] = useState(false)

  // Google Maps SDK Loader
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const [attendanceCoords, setAttendanceCoords] = useState(null)

  // Use seed/screenshot default coordinate fallback: Chettikulam, Nagercoil, Tamil Nadu, India
  const DEFAULT_LAT = 8.109034
  const DEFAULT_LON = 77.43338

  useEffect(() => {
    async function initDashboard() {
      try {
        const token = sessionStorage.getItem('sa_token')
        const headers = { Authorization: `Bearer ${token}` }
        
        // Fetch Profile
        const res = await axios.get('/api/auth/me', { headers })
        setProfileData(res.data)

        // Fetch Today's Attendance
        const attRes = await axios.get('/api/attendance/today', { headers })
        const att = attRes.data?.data
        if (att) {
          setTodayRecord(att)
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
            setHasCheckedOut(false)
            const diffSecs = Math.max(0, Math.floor((new Date() - inDate) / 1000))
            setElapsedSeconds(diffSecs)
            setAttendanceCoords({
              lat: att.latitude,
              lon: att.longitude
            })
          }
        } else {
          setLocationAddress('—')
        }
      } catch (err) {
        setError('Failed to fetch details. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    initDashboard()
  }, [])

  // Punch Timer
  useEffect(() => {
    let timer
    if (isCheckIn && !hasCheckedOut) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isCheckIn, hasCheckedOut])

  useEffect(() => {
    if (isLoaded && attendanceCoords) {
      resolveAddress(attendanceCoords.lat, attendanceCoords.lon)
    }
  }, [isLoaded, attendanceCoords])

  function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  async function resolveAddress(lat, lon) {
    if (!lat || !lon) {
      setLocationAddress('—')
      return
    }
    const fallbackCoords = `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`

    if (!window.google || !window.google.maps) {
      setLocationAddress(fallbackCoords)
      return
    }

    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lon) } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = results[0]
          const { suburb, city, state } = parseGoogleGeocodeAddress(place.address_components)
          const parts = [suburb, city, state].filter(Boolean)
          setLocationAddress(parts.join(', ') || place.formatted_address)
        } else {
          // Handle specific geocoding errors
          if (status === 'ZERO_RESULTS') {
            console.warn('Geocoding status: ZERO_RESULTS for coords', lat, lon)
            setLocationAddress(`No address found (${fallbackCoords})`)
          } else if (status === 'OVER_QUERY_LIMIT') {
            console.warn('Geocoding status: OVER_QUERY_LIMIT (quota exceeded)')
            setLocationAddress(fallbackCoords)
          } else if (status === 'REQUEST_DENIED') {
            console.warn('Geocoding status: REQUEST_DENIED (API key restriction or invalid key)')
            setLocationAddress(fallbackCoords)
          } else if (status === 'INVALID_REQUEST') {
            console.warn('Geocoding status: INVALID_REQUEST')
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

  async function handlePunch() {
    if (hasCheckedOut || punching) return
    setPunching(true)
    const token = sessionStorage.getItem('sa_token')
    const headers = { Authorization: `Bearer ${token}` }

    const getCoords = () => new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({ latitude: null, longitude: null, accuracy: null, locationSource: 'UNKNOWN', denied: false })
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          locationSource: pos.coords.accuracy && pos.coords.accuracy < 100 ? 'GPS' : 'NETWORK',
          denied: false
        }),
        (err) => {
          const isDenied = err.code === err.PERMISSION_DENIED
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            locationSource: 'UNKNOWN',
            denied: isDenied
          })
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })

    const coords = await getCoords()

    const payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      locationSource: coords.locationSource,
      selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      deviceInfo: {
        platform: 'Web',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Safari'
      }
    }

    try {
      if (!isCheckIn) {
        const res = await axios.post('/api/attendance/check-in', payload, { headers })
        if (res.data?.success) {
          const att = res.data.data
          setIsCheckIn(true)
          setTodayRecord(att)
          const checkInDate = new Date(att.checkInTime)
          setPunchTime(checkInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
          setElapsedSeconds(0)
          setAttendanceCoords({ lat: att.latitude, lon: att.longitude })
          resolveAddress(att.latitude, att.longitude)

          if (coords.denied) {
            toast.warning('Location access denied. Attendance recorded without location validation.')
          } else {
            toast.success('Checked in successfully')
          }
        }
      } else {
        const res = await axios.post('/api/attendance/check-out', payload, { headers })
        if (res.data?.success) {
          const att = res.data.data
          setIsCheckIn(false)
          setHasCheckedOut(true)
          setTodayRecord(att)
          const outDate = new Date(att.checkOutTime)
          setCheckoutTime(outDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
          const checkoutLat = att.checkOutLatitude || coords.latitude
          const checkoutLon = att.checkOutLongitude || coords.longitude
          setAttendanceCoords({ lat: checkoutLat, lon: checkoutLon })
          resolveAddress(checkoutLat, checkoutLon)
          toast.success('Checked out successfully')
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Punch operation failed. Please try again.')
    } finally {
      setPunching(false)
    }
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>Loading Profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...styles.card, maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ color: '#fca5a5', marginBottom: '20px' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
          >Retry</button>
        </div>
      </div>
    )
  }

  const profile = profileData?.profile || {}
  const attendanceEnabled = profileData?.attendance_enabled
  const userRole = sessionStorage.getItem('user_role') || 'employee'

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div style={styles.container}>
      <EmployeeSidebar active="dashboard" />
      <main style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.welcomeText}>Welcome, {profile.first_name || 'Employee'}</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Dashboard for employee code: <strong style={{ color: '#94a3b8' }}>{profile.employee_code || 'N/A'}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '20px', padding: '6px 16px',
              fontSize: '12px', fontWeight: '700', color: '#34d399',
            }}>
              Active Session
            </span>
          </div>
        </div>

        {/* Attendance Punch Card Section (Matching Second Image Design) */}
        {userRole !== 'client_admin' && userRole !== 'super_admin' && (
          <div style={styles.attendanceCard}>
          <div style={styles.attendanceHeader}>
            <div style={styles.attendanceTitle}>
              <FingerprintIcon />
              Today's Attendance
            </div>
            <div style={styles.attendanceDate}>{formattedDate}</div>
          </div>

          <div style={{
            ...styles.timerText,
            color: hasCheckedOut ? '#64748b' : isCheckIn ? '#10b981' : '#64748b'
          }}>
            {formatTime(elapsedSeconds)}
          </div>

          <div style={styles.timerSubtitle}>
            {hasCheckedOut 
              ? 'Attendance completed for today' 
              : isCheckIn 
                ? 'You are currently checked in' 
                : 'You are currently checked out'}
          </div>

          <div style={styles.attendanceDetailsRow}>
            <div style={styles.attendanceDetailCol}>
              <div style={styles.attendanceDetailLabel}>Checked In</div>
              <div style={styles.attendanceDetailValue}>{punchTime || '—'}</div>
            </div>

            {hasCheckedOut && (
              <div style={styles.attendanceDetailCol}>
                <div style={styles.attendanceDetailLabel}>Punched Out</div>
                <div style={styles.attendanceDetailValue}>{checkoutTime || '—'}</div>
              </div>
            )}

            <div style={styles.attendanceDetailCol}>
              <div style={styles.attendanceDetailLabel}>Location</div>
              <div style={styles.attendanceDetailValue}>{locationAddress}</div>
            </div>
          </div>

          {attendanceEnabled ? (
            <button
              onClick={handlePunch}
              disabled={hasCheckedOut || punching}
              style={
                hasCheckedOut 
                  ? styles.punchBtnDisabled 
                  : isCheckIn 
                    ? styles.punchBtnOut 
                    : styles.punchBtnIn
              }
            >
              {punching ? (
                'Processing...'
              ) : hasCheckedOut ? (
                <>
                  <CheckIcon />
                  Checked Out Today
                </>
              ) : isCheckIn ? (
                <>
                  <ExitIcon />
                  Punch Out
                </>
              ) : (
                <>
                  <EntryIcon />
                  Punch In / Check In
                </>
              )}
            </button>
          ) : (
            <div style={styles.disabledNotice}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <strong>Attendance Disabled</strong>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Attendance tracking configuration is not enabled for your account.
                </p>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Profile Details Grid */}
        <div style={styles.grid}>
          {/* Card: Personal Details */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>👤 Personal Information</div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Full Name</span>
              <span style={styles.detailValue}>{profile.first_name} {profile.last_name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Email Address</span>
              <span style={styles.detailValue}>{profile.email || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Phone Number</span>
              <span style={styles.detailValue}>{profile.phone || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Gender</span>
              <span style={styles.detailValue}>{profile.gender || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Blood Group</span>
              <span style={styles.detailValue}>{profile.blood_group || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Emergency Contact</span>
              <span style={styles.detailValue}>{profile.emergency_contact || 'N/A'}</span>
            </div>
          </div>

          {/* Card: Employment Details */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>💼 Employment Details</div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Designation</span>
              <span style={styles.detailValue}>{profile.designation || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Department</span>
              <span style={styles.detailValue}>{profile.department_name || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Hierarchy Level</span>
              <span style={styles.detailValue}>{profile.level_code} — {profile.level_designation}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Joining Date</span>
              <span style={styles.detailValue}>{profile.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Employment Type</span>
              <span style={{ ...styles.detailValue, textTransform: 'capitalize' }}>{(profile.employment_type || '').replace('_', ' ')}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status</span>
              <span style={{ 
                ...styles.detailValue, 
                color: profile.status === 'active' ? '#34d399' : '#f87171',
                textTransform: 'capitalize' 
              }}>{profile.status}</span>
            </div>
          </div>

          {/* Card: Bank & Payroll */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>💳 Bank Account Details</div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Account Holder</span>
              <span style={styles.detailValue}>{profile.bank_account_holder || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Bank Name</span>
              <span style={styles.detailValue}>{profile.bank_name || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Account Number</span>
              <span style={styles.detailValue}>{profile.bank_account_number || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>IFSC Code</span>
              <span style={{ ...styles.detailValue, fontFamily: 'monospace' }}>{profile.bank_ifsc || 'N/A'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Manager</span>
              <span style={styles.detailValue}>{profile.manager_name || 'None'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Secondary Manager</span>
              <span style={styles.detailValue}>{profile.secondary_manager_name || 'None'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
