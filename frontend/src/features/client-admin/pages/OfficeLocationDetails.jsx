import React, { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiArrowLeft, FiMapPin, FiUsers, FiCompass, FiInfo } from 'react-icons/fi'
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api'

const GOOGLE_MAPS_LIBRARIES = ['places']

export default function OfficeLocationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentOfficeLocation,
    loadingLocations,
    error,
    fetchOfficeLocationDetails,
  } = useAttendanceStore()

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const isApiKeyMissing = !apiKey

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  useEffect(() => {
    if (id) {
      fetchOfficeLocationDetails(id)
    }
  }, [id, fetchOfficeLocationDetails])

  const renderContent = () => {
    if (loadingLocations && !currentOfficeLocation) {
      return (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading details…</div>
        </div>
      )
    }

    if (error || !currentOfficeLocation) {
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
          <button
            onClick={() => navigate('/client-admin/attendance/office-locations')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#4f46e5', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
          >
            <FiArrowLeft /> Back to Locations
          </button>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <FiInfo size={36} color="#94a3b8" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>Office Location Not Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>{error || 'The requested office location details could not be loaded.'}</p>
          </div>
        </div>
      )
    }

    const loc = currentOfficeLocation
    const mapCenter = [parseFloat(loc.latitude), parseFloat(loc.longitude)]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Breadcrumb / Back Navigation */}
        <div>
          <button
            onClick={() => navigate('/client-admin/attendance/office-locations')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s', padding: 0, marginBottom: '12px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <FiArrowLeft size={14} /> Back to Office Locations
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{loc.location_name}</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMapPin color="#6366f1" size={14} />
                {loc.address || 'No Address specified'}
              </p>
            </div>
            <span style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: '1px solid', textTransform: 'uppercase',
              background: loc.is_active ? '#f0fdf4' : '#fef2f2',
              color: loc.is_active ? '#15803d' : '#b91c1c',
              borderColor: loc.is_active ? '#bbf7d0' : '#fecaca'
            }}>
              {loc.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Content Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Info & Linked Policies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Info Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                Geofence Specifications
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FENCE RADIUS</span>
                  <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800', marginTop: '4px', display: 'block' }}>
                    {loc.radius_meters}m
                  </span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED EMPLOYEES</span>
                  <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiUsers color="#6366f1" size={16} />
                    {loc.assignedEmployeesCount || 0}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Latitude</span>
                  <span style={{ color: '#334155', fontFamily: 'monospace', fontWeight: '600' }}>{loc.latitude}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Longitude</span>
                  <span style={{ color: '#334155', fontFamily: 'monospace', fontWeight: '600' }}>{loc.longitude}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Configured At</span>
                  <span style={{ color: '#334155', fontWeight: '600' }}>
                    {new Date(loc.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>Last Modified</span>
                  <span style={{ color: '#334155', fontWeight: '600' }}>
                    {new Date(loc.updated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Policies Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Linked Policies
                </h2>
                <span style={{ padding: '2px 8px', background: '#eef2ff', color: '#4f46e5', fontWeight: '700', fontSize: '11px', borderRadius: '20px' }}>
                  {loc.assignedPolicies?.length || 0}
                </span>
              </div>

              {(!loc.assignedPolicies || loc.assignedPolicies.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
                  This office location is not linked to any attendance policies yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '240px', overflowY: 'auto', paddingRight: 4 }} className="no-scrollbar">
                  {loc.assignedPolicies.map((pol) => (
                    <div key={pol.attendance_policy_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div>
                        <Link
                          to={`/client-admin/attendance/policies/${pol.attendance_policy_id}`}
                          style={{ color: '#4f46e5', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {pol.name}
                        </Link>
                        <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Type: {pol.policy_type}
                        </span>
                      </div>
                      <span style={{
                        padding: '2px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
                        background: pol.is_active ? '#e8f5e9' : '#f5f5f5',
                        color: pol.is_active ? '#2e7d32' : '#757575'
                      }}>
                        {pol.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Live Map Preview */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCompass color="#6366f1" size={16} />
              Geofence Live Circle Map
            </h2>

            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', position: 'relative', minHeight: '260px' }}>
              {isApiKeyMissing ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: '#f1f5f9', color: '#64748b' }}>
                  <FiMapPin size={32} color="#94a3b8" style={{ marginBottom: 12 }} />
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 6px' }}>Interactive Map Unavailable</h4>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Google Maps API Key is not configured. Define VITE_GOOGLE_MAPS_API_KEY in your env settings.</p>
                </div>
              ) : loadError ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: '#fef2f2', color: '#ef4444' }}>
                  <FiInfo size={32} style={{ marginBottom: 12 }} />
                  <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 6px' }}>Error Loading Google Maps</h4>
                  <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>{loadError.message || 'Failed to load Google Maps SDK.'}</p>
                </div>
              ) : !isLoaded ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ marginTop: 12, color: '#64748b', fontSize: '12px' }}>Loading Google Maps...</span>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={{ height: '100%', width: '100%' }}
                  center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                  zoom={16}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <Marker position={{ lat: mapCenter[0], lng: mapCenter[1] }} />
                  <Circle
                    center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                    radius={loc.radius_meters}
                    options={{
                      fillColor: '#6366f1',
                      fillOpacity: 0.15,
                      strokeColor: '#6366f1',
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                    }}
                  />
                </GoogleMap>
              )}
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="office-locations" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {renderContent()}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    </div>
  )
}
