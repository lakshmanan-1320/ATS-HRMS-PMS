import React, { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiArrowLeft, FiMapPin, FiUsers, FiCompass, FiInfo } from 'react-icons/fi'
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api'

const GOOGLE_MAPS_LIBRARIES = ['places']
const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

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
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading details…</div>
        </div>
      )
    }

    if (error || !currentOfficeLocation) {
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
          <button
            onClick={() => navigate('/client-admin/attendance/office-locations')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#C2071A', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
          >
            <FiArrowLeft color="#C2071A" strokeWidth={2.5} /> Back to Locations
          </button>
          <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: cardShadow }}>
            <FiInfo size={36} color="#94a3b8" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Office Location Not Found</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{error || 'The requested office location details could not be loaded.'}</p>
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
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#C2071A', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s', padding: 0, marginBottom: '12px' }}
          >
            <FiArrowLeft size={14} color="#C2071A" strokeWidth={2.5} /> Back to Office Locations
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{loc.location_name}</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMapPin color="#C2071A" size={14} />
                {loc.address || 'No Address specified'}
              </p>
            </div>
            <span style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
              background: loc.is_active ? '#e8fbf0' : '#feecee',
              color: loc.is_active ? '#0fa958' : '#dc2626',
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
            <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: cardShadow }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                Geofence Specifications
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', border: 'none', padding: '14px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FENCE RADIUS</span>
                  <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800', marginTop: '4px', display: 'block' }}>
                    {loc.radius_meters}m
                  </span>
                </div>
                <div style={{ background: '#f8fafc', border: 'none', padding: '14px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED EMPLOYEES</span>
                  <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiUsers color="#C2071A" size={16} />
                    {loc.assignedEmployeesCount || 0}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#475569', fontWeight: '500' }}>Latitude</span>
                  <span style={{ color: '#0f172a', fontFamily: 'monospace', fontWeight: '700' }}>{loc.latitude}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#475569', fontWeight: '500' }}>Longitude</span>
                  <span style={{ color: '#0f172a', fontFamily: 'monospace', fontWeight: '700' }}>{loc.longitude}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{ color: '#475569', fontWeight: '500' }}>Configured At</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>
                    {new Date(loc.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: '500' }}>Last Modified</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>
                    {new Date(loc.updated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Policies Card */}
            <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: cardShadow }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                Linked Attendance Policies
              </h2>
              {(!loc.policies || loc.policies.length === 0) ? (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>No policies are linked to this office location.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {loc.policies.map(p => (
                    <div key={p.attendance_policy_id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{p.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '4px' }}>{p.policy_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Google Maps Interactive View */}
          <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: cardShadow, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              Map & Geofence Boundary
            </h2>
            <div style={{ width: '100%', height: '360px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
              {isLoaded && !isApiKeyMissing ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                  zoom={16}
                >
                  <Marker position={{ lat: mapCenter[0], lng: mapCenter[1] }} title={loc.location_name} />
                  <Circle
                    center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                    radius={parseFloat(loc.radius_meters)}
                    options={{ fillColor: '#C2071A', fillOpacity: 0.15, strokeColor: '#C2071A', strokeWidth: 2 }}
                  />
                </GoogleMap>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Google Maps view is unavailable (API key not configured).
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="office-locations" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
