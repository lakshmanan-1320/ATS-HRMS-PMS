import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiX, FiSearch, FiCompass, FiInfo } from 'react-icons/fi'
import { useJsApiLoader, GoogleMap, Marker, Circle, Autocomplete } from '@react-google-maps/api'

const LIBRARIES = ['places']

// Simple Haversine calculator for frontend test validation
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dPhi = ((lat2 - lat1) * Math.PI) / 180
  const dLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Utility to parse address components from Google Places API
const parseAddressComponents = (addressComponents) => {
  let city = ''
  let state = ''
  let country = ''
  if (Array.isArray(addressComponents)) {
    for (const component of addressComponents) {
      const types = component.types || []
      if (types.includes('locality') || types.includes('sublocality_level_1')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name
      } else if (types.includes('country')) {
        country = component.long_name
      }
    }
    // Fallback for city if empty
    if (!city) {
      for (const component of addressComponents) {
        const types = component.types || []
        if (types.includes('administrative_area_level_2')) {
          city = component.long_name
          break
        }
      }
    }
  }
  return { city, state, country }
}

export default function OfficeLocations() {
  const {
    officeLocations,
    loadingLocations,
    error,
    fetchOfficeLocations,
    createOfficeLocation,
    updateOfficeLocation,
    deleteOfficeLocation,
    toggleOfficeLocationStatus,
  } = useAttendanceStore()

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const isApiKeyMissing = !apiKey

  // Google Maps SDK Loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]) // Chennai default
  
  // Geofence Testing State
  const [testingGeofence, setTestingGeofence] = useState(false)
  const [geofenceTestResult, setGeofenceTestResult] = useState(null)
  const [userCoords, setUserCoords] = useState(null)

  const [modalError, setModalError] = useState('')
  const [isCustomRadius, setIsCustomRadius] = useState(false)

  // Default values
  const [formData, setFormData] = useState({
    locationName: '',
    address: '',
    latitude: '13.0827',
    longitude: '80.2707',
    radiusMeters: 100, // Default 100m
    isActive: true,
    city: '',
    state: '',
    country: '',
    placeId: '',
  })

  useEffect(() => {
    fetchOfficeLocations()
  }, [fetchOfficeLocations])

  const autocompleteRef = useRef(null)

  const handleOpenCreate = () => {
    setEditingLocation(null)
    setFormData({
      locationName: '',
      address: '',
      latitude: '13.0827',
      longitude: '80.2707',
      radiusMeters: 100,
      isActive: true,
      city: '',
      state: '',
      country: '',
      placeId: '',
    })
    setIsCustomRadius(false)
    setMapCenter([13.0827, 80.2707])
    setSearchQuery('')
    setGeofenceTestResult(null)
    setUserCoords(null)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (loc) => {
    setEditingLocation(loc)
    const rad = loc.radius_meters
    const presets = [50, 100, 200, 500, 1000]
    if (presets.includes(rad)) {
      setIsCustomRadius(false)
    } else {
      setIsCustomRadius(true)
    }

    setFormData({
      locationName: loc.location_name,
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: rad,
      isActive: loc.is_active,
      city: '',
      state: '',
      country: '',
      placeId: '',
    })
    setMapCenter([parseFloat(loc.latitude), parseFloat(loc.longitude)])
    setSearchQuery(loc.address || '')
    setGeofenceTestResult(null)
    setUserCoords(null)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingLocation(null)
    setGeofenceTestResult(null)
    setUserCoords(null)
    setModalError('')
  }

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace()
    if (!place || !place.geometry) {
      console.warn("No geometry details available for selection.")
      return
    }

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const { city, state, country } = parseAddressComponents(place.address_components)

    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      address: place.formatted_address || '',
      city,
      state,
      country,
      placeId: place.place_id || '',
    }))
    setSearchQuery(place.formatted_address || '')
    setMapCenter([lat, lng])
    setGeofenceTestResult(null)
    setUserCoords(null)
    setModalError('')
  }

  const updateLocationFromCoords = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }))
    setGeofenceTestResult(null)
    setUserCoords(null)

    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = results[0]
          const { city, state, country } = parseAddressComponents(place.address_components)
          setFormData(prev => ({
            ...prev,
            address: place.formatted_address,
            city,
            state,
            country,
            placeId: place.place_id || '',
          }))
          setSearchQuery(place.formatted_address)
        } else {
          // Handle specific geocoding errors gracefully
          if (status === 'ZERO_RESULTS') {
            console.warn('Geocoding status: ZERO_RESULTS for coords', lat, lng)
            alert('No address found for these coordinates. Please update manually.')
          } else if (status === 'OVER_QUERY_LIMIT') {
            console.warn('Geocoding status: OVER_QUERY_LIMIT')
            alert('Geocoding quota exceeded. Coordinates updated, but address lookup failed.')
          } else if (status === 'REQUEST_DENIED') {
            console.warn('Geocoding status: REQUEST_DENIED')
            alert('Geocoding request was denied. Check API key restrictions.')
          } else if (status === 'INVALID_REQUEST') {
            console.warn('Geocoding status: INVALID_REQUEST')
          } else {
            console.warn('Geocoding failed with status:', status)
          }
        }
      })
    }
  }

  const handleForwardGeocode = (addressString) => {
    if (!addressString || addressString.trim() === '') return
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: addressString }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = results[0]
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const { city, state, country } = parseAddressComponents(place.address_components)

          setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            city,
            state,
            country,
            placeId: place.place_id || '',
          }))
          setMapCenter([lat, lng])
          setGeofenceTestResult(null)
          setUserCoords(null)
          setModalError('')
        } else {
          console.warn('Forward geocoding failed with status:', status)
        }
      })
    }
  }

  const handleMapClick = (e) => {
    if (!e || !e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    updateLocationFromCoords(lat, lng)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setSearching(true)
    setModalError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }))
        setMapCenter([lat, lng])
        setGeofenceTestResult(null)
        setUserCoords(null)

        // Reverse Geocode
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const place = results[0]
              const { city, state, country } = parseAddressComponents(place.address_components)
              setFormData(prev => ({
                ...prev,
                address: place.formatted_address,
                city,
                state,
                country,
                placeId: place.place_id || '',
              }))
              setSearchQuery(place.formatted_address)
            } else {
              console.warn('Reverse geocoding failed with status:', status)
              setFormData(prev => ({
                ...prev,
                address: `Current Location Coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
                city: '',
                state: '',
                country: '',
                placeId: '',
              }))
            }
            setSearching(false)
          })
        } else {
          setFormData(prev => ({
            ...prev,
            address: `Current Location Coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
            city: '',
            state: '',
            country: '',
            placeId: '',
          }))
          setSearching(false)
        }
      },
      (err) => {
        console.error(err)
        alert(`Failed to retrieve browser location: ${err.message}`)
        setSearching(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleTestGeofence = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setTestingGeofence(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude
        const uLng = pos.coords.longitude
        setUserCoords({ lat: uLat, lng: uLng })

        const officeLat = parseFloat(formData.latitude)
        const officeLng = parseFloat(formData.longitude)

        const distance = calculateHaversineDistance(uLat, uLng, officeLat, officeLng)
        const inside = distance <= formData.radiusMeters

        setGeofenceTestResult({
          distance: distance.toFixed(1),
          inside,
          accuracy: pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : null,
        })
        setTestingGeofence(false)
      },
      (err) => {
        console.error(err)
        toast.error(`Failed to retrieve your browser location: ${err.message}`)
        setTestingGeofence(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        locationName: formData.locationName,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radiusMeters: formData.radiusMeters,
        isActive: formData.isActive,
        placeId: formData.placeId,
      }

      if (editingLocation) {
        await updateOfficeLocation(editingLocation.office_location_id, payload)
        toast.success('Office location updated successfully')
      } else {
        await createOfficeLocation(payload)
        toast.success('Office location created successfully')
      }
      handleCloseModal()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || err.message || 'Failed to save office location.')
    }
  }

  const handleDelete = async (loc) => {
    if (loc.policies_count > 0) {
      toast.error(`Cannot delete this location because it is currently linked to ${loc.policies_count} active policy/policies.`)
      return
    }
    if (!window.confirm(`Are you sure you want to delete "${loc.location_name}"?`)) return
    try {
      await deleteOfficeLocation(loc.office_location_id)
      toast.success('Office location deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || err.message || 'Failed to delete office location.')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="office-locations" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Page Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiMapPin size={18} color="#fff" />
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Office Locations</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500, paddingLeft: 46 }}>
                Configure company offices and geographical geofence boundaries for checking in.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <FiPlus size={15} /> Add Location
            </button>
          </div>

          {/* Startup Key Validation Alert */}
          {isApiKeyMissing && (
            <div style={{ padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', color: '#b45309', fontSize: '13px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: '700' }}>
                <FiInfo size={18} color="#d97706" />
                <span>Google Maps API Key Missing</span>
              </div>
              <span style={{ color: '#78350f', fontSize: '12px' }}>
                Please define the <code>VITE_GOOGLE_MAPS_API_KEY</code> variable in your frontend <code>.env</code> file. Map loading, reverse geocoding, and address suggestions are disabled until configured.
              </span>
            </div>
          )}

          {/* Error notifications */}
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiInfo size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Locations Grid */}
          {loadingLocations && officeLocations.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading locations…</div>
            </div>
          ) : officeLocations.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 54, height: 54, borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FiMapPin size={24} color="#94a3b8" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>No Office Locations Configured</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Click "Add Location" to register an office location and establish your geofences.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {officeLocations.map((loc) => (
                <div
                  key={loc.office_location_id}
                  style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={loc.location_name}>
                        {loc.location_name}
                      </h3>
                      <button
                        onClick={() => toggleOfficeLocationStatus(loc.office_location_id, !loc.is_active)}
                        style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', border: '1px solid', textTransform: 'uppercase',
                          background: loc.is_active ? '#f0fdf4' : '#fef2f2',
                          color: loc.is_active ? '#15803d' : '#b91c1c',
                          borderColor: loc.is_active ? '#bbf7d0' : '#fecaca'
                        }}
                      >
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    {/* Address */}
                    <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', minHeight: '34px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                      {loc.address || 'No address specified.'}
                    </p>

                    {/* Specifications */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '11px' }}>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontWeight: '500' }}>RADIUS</span>
                        <strong style={{ color: '#334155' }}>{loc.radius_meters}m</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontWeight: '500' }}>POLICIES</span>
                        <strong style={{ color: '#334155' }}>{loc.policies_count}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontWeight: '500' }}>LATITUDE</span>
                        <code style={{ color: '#334155', fontFamily: 'monospace' }}>{Number(loc.latitude).toFixed(4)}</code>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontWeight: '500' }}>LONGITUDE</span>
                        <code style={{ color: '#334155', fontFamily: 'monospace' }}>{Number(loc.longitude).toFixed(4)}</code>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: 'auto' }}>
                    <Link
                      to={`/client-admin/attendance/office-locations/${loc.office_location_id}`}
                      style={{ flex: 1, textAlign: 'center', padding: '7px 0', background: '#f1f5f9', color: '#475569', fontWeight: '700', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', border: '1px solid #e2e8f0', display: 'inline-block' }}
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(loc)}
                      style={{ padding: '7px 10px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      style={{ padding: '7px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Modal - Create/Edit Location (Matches the Keka "Choose location" Image) */}
      {isModalOpen && (
        <div style={modalOverlayStyle} onClick={handleCloseModal}>
          <div style={modalContainerStyle} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={modalHeaderStyle}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Choose location</span>
              <button onClick={handleCloseModal} style={closeButtonStyle}>
                <FiX size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Row 1: Name and Active Checkbox */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Location Name *</label>
                    <input
                      id="office-location-name-input"
                      type="text"
                      required
                      value={formData.locationName}
                      onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                      placeholder="e.g. Chennai Head Office"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                    <label htmlFor="isActive" style={{ fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                      Active
                    </label>
                  </div>
                </div>

                {/* Row 2: Search Location & Radius (Exactly matches Keka layout) */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Search Location</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        {isApiKeyMissing ? (
                          <input
                            id="office-location-search-input-disabled"
                            type="text"
                            placeholder="Map search disabled (API key missing)"
                            disabled
                            style={{ ...inputStyle, paddingLeft: '32px' }}
                          />
                        ) : !isLoaded ? (
                          <input
                            id="office-location-search-input-loading"
                            type="text"
                            placeholder="Loading search Autocomplete..."
                            disabled
                            style={{ ...inputStyle, paddingLeft: '32px' }}
                          />
                        ) : (
                          <Autocomplete
                            onLoad={(ac) => (autocompleteRef.current = ac)}
                            onPlaceChanged={handlePlaceChanged}
                            options={{ types: ['geocode', 'establishment'] }}
                          >
                            <div style={{ position: 'relative' }}>
                              <input
                                id="office-location-search-input"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleForwardGeocode(searchQuery)
                                  }
                                }}
                                placeholder="Search building, street, or area..."
                                style={{ ...inputStyle, paddingLeft: '32px' }}
                              />
                            </div>
                          </Autocomplete>
                        )}
                        <FiSearch size={14} color="#9ca3af" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
                      </div>
                      <button
                        id="office-location-use-current-btn"
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={searching}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        📍 {searching ? 'Locating...' : 'Use Current Location'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Radius (meters) *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        id="office-location-radius-select"
                        value={isCustomRadius ? 'Custom' : formData.radiusMeters}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'Custom') {
                            setIsCustomRadius(true)
                          } else {
                            setIsCustomRadius(false)
                            setFormData(prev => ({
                              ...prev,
                              radiusMeters: parseInt(val, 10) || 100
                            }))
                          }
                          setGeofenceTestResult(null)
                        }}
                        style={selectStyle}
                      >
                        <option value="50">50m</option>
                        <option value="100">100m</option>
                        <option value="200">200m</option>
                        <option value="500">500m</option>
                        <option value="1000">1000m</option>
                        <option value="Custom">Custom...</option>
                      </select>

                      {isCustomRadius && (
                        <input
                          id="office-location-custom-radius-input"
                          type="number"
                          required
                          min="10"
                          max="10000"
                          value={formData.radiusMeters}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || ''
                            setFormData(prev => ({
                              ...prev,
                              radiusMeters: val
                            }))
                            setGeofenceTestResult(null)
                          }}
                          placeholder="Radius"
                          style={{ ...inputStyle, width: '90px' }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Google Map with Pin & Translucent Pink Geofence Circle Overlay */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '340px', position: 'relative' }}>
                  <div style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', background: '#f9fafb' }}>
                    {isApiKeyMissing ? (
                      <div style={unavailableMapStyle}>
                        <FiMapPin size={32} color="#9ca3af" style={{ marginBottom: 12 }} />
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Interactive Map Unavailable</h4>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Google Maps API Key is not configured. Coords must be entered manually.</p>
                      </div>
                    ) : loadError ? (
                      <div style={unavailableMapStyle}>
                        <FiInfo size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                        <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 6px' }}>Error Loading Google Maps</h4>
                        <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>{loadError.message || 'Failed to load Google Maps SDK.'}</p>
                      </div>
                    ) : !isLoaded ? (
                      <div style={unavailableMapStyle}>
                        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ marginTop: 12, color: '#6b7280', fontSize: '12px' }}>Loading Google Map...</span>
                      </div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                        center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                        zoom={15}
                        onClick={handleMapClick}
                        options={{
                          mapTypeControl: false,
                          streetViewControl: false,
                          fullscreenControl: false,
                        }}
                      >
                        <Marker
                          draggable={true}
                          position={{ lat: parseFloat(formData.latitude) || 13.0827, lng: parseFloat(formData.longitude) || 80.2707 }}
                          onDragEnd={(e) => {
                            const lat = e.latLng.lat()
                            const lng = e.latLng.lng()
                            updateLocationFromCoords(lat, lng)
                          }}
                        />
                        <Circle
                          center={{ lat: parseFloat(formData.latitude) || 13.0827, lng: parseFloat(formData.longitude) || 80.2707 }}
                          radius={parseFloat(formData.radiusMeters) || 100}
                          options={{
                            fillColor: '#ec4899', // Premium Keka translucent pink geofence boundary color
                            fillOpacity: 0.2,
                            strokeColor: '#db2777',
                            strokeOpacity: 0.6,
                            strokeWeight: 1.5,
                          }}
                        />
                        {userCoords && (
                          <Marker
                            position={{ lat: userCoords.lat, lng: userCoords.lng }}
                            icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                          />
                        )}
                      </GoogleMap>
                    )}
                  </div>
                </div>

                {/* Row 4: Editable Latitude and Longitude Coords */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Latitude *</label>
                    <input
                      id="office-location-latitude-input"
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData(prev => ({ ...prev, latitude: val }))
                        const latNum = parseFloat(val)
                        if (!isNaN(latNum)) {
                          setMapCenter([latNum, parseFloat(formData.longitude) || 80.2707])
                        }
                      }}
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                      placeholder="e.g. 13.0827"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Longitude *</label>
                    <input
                      id="office-location-longitude-input"
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData(prev => ({ ...prev, longitude: val }))
                        const lngNum = parseFloat(val)
                        if (!isNaN(lngNum)) {
                          setMapCenter([parseFloat(formData.latitude) || 13.0827, lngNum])
                        }
                      }}
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                      placeholder="e.g. 80.2707"
                    />
                  </div>
                </div>

                {/* Row 5: Full Address description */}
                <div>
                  <label style={labelStyle}>Full Office Address</label>
                  <textarea
                    id="office-location-address-textarea"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onBlur={(e) => handleForwardGeocode(e.target.value)}
                    placeholder="Street, City, State..."
                    rows="2"
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                {/* Row 6: Geofence Tester controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>
                    ℹ️ Drag pin marker directly to adjust coords on map.
                  </span>
                  <button
                    id="office-location-test-geofence-btn"
                    type="button"
                    onClick={handleTestGeofence}
                    disabled={testingGeofence}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}
                  >
                    <FiCompass size={13} />
                    {testingGeofence ? 'Tracking...' : 'Test Geofence'}
                  </button>
                </div>

                {geofenceTestResult && (
                  <div style={{
                    padding: '12px', border: '1px solid', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 2,
                    background: geofenceTestResult.inside ? '#ecfdf5' : '#fef2f2',
                    borderColor: geofenceTestResult.inside ? '#a7f3d0' : '#fecaca',
                    color: geofenceTestResult.inside ? '#047857' : '#b91c1c'
                  }}>
                    <div style={{ fontWeight: '700' }}>
                      {geofenceTestResult.inside ? '✓ Inside Geofence Boundary' : '✗ Outside Geofence Boundary'}
                    </div>
                    <span style={{ color: '#4b5563' }}>
                      Distance to Office: <strong>{geofenceTestResult.distance} meters</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer (Replicates Choose location layout Cancel / Select) */}
              <div style={modalFooterStyle}>
                <button
                  id="office-location-cancel-btn"
                  type="button"
                  onClick={handleCloseModal}
                  style={modalCancelButtonStyle}
                >
                  Cancel
                </button>
                <button
                  id="office-location-save-btn"
                  type="submit"
                  style={modalSelectButtonStyle}
                >
                  Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
  transition: 'border-color 0.2s',
}

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
  cursor: 'pointer',
  minWidth: '90px'
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16
}

const modalContainerStyle = {
  background: '#fff',
  borderRadius: '12px',
  width: '760px',
  maxWidth: '100%',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const modalHeaderStyle = {
  padding: '16px 24px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#9ca3af',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s',
}

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '12px',
  padding: '16px 24px',
  borderTop: '1px solid #e5e7eb',
  background: '#fff'
}

const modalCancelButtonStyle = {
  padding: '8px 16px',
  background: 'none',
  border: 'none',
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'color 0.2s',
}

const modalSelectButtonStyle = {
  padding: '8px 24px',
  background: '#2563eb', // Matches blue color in screenshot
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  transition: 'background 0.2s',
}

const unavailableMapStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  textAlign: 'center',
  background: '#f9fafb',
  color: '#6b7280'
}
