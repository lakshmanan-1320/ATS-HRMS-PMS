import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiX, FiSearch, FiCompass, FiInfo } from 'react-icons/fi'
import { useJsApiLoader, GoogleMap, Marker, Circle, Autocomplete } from '@react-google-maps/api'

const LIBRARIES = ['places']
const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

// Haversine distance calculator in meters
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
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
  const navigate = useNavigate()
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

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707])
  
  const [testingGeofence, setTestingGeofence] = useState(false)
  const [geofenceTestResult, setGeofenceTestResult] = useState(null)
  const [userCoords, setUserCoords] = useState(null)

  const [modalError, setModalError] = useState('')
  const [isCustomRadius, setIsCustomRadius] = useState(false)

  const [formData, setFormData] = useState({
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
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      radiusMeters: rad,
      isActive: loc.is_active,
      city: loc.city || '',
      state: loc.state || '',
      country: loc.country || '',
      placeId: loc.google_place_id || '',
    })
    setMapCenter([parseFloat(loc.latitude), parseFloat(loc.longitude)])
    setSearchQuery('')
    setGeofenceTestResult(null)
    setUserCoords(null)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleReverseGeocode = (lat, lng) => {
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = results[0]
          const { city, state, country } = parseAddressComponents(place.address_components)
          setFormData(prev => ({
            ...prev,
            address: place.formatted_address || prev.address,
            city: city || prev.city,
            state: state || prev.state,
            country: country || prev.country,
            placeId: place.place_id || prev.placeId,
          }))
        }
      })
    }
  }

  const handleForwardGeocode = (addressStr) => {
    if (!addressStr.trim() || !window.google || !window.google.maps) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: addressStr }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const place = results[0]
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const { city, state, country } = parseAddressComponents(place.address_components)
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          address: place.formatted_address || addressStr,
          city: city || prev.city,
          state: state || prev.state,
          country: country || prev.country,
          placeId: place.place_id || prev.placeId
        }))
        setMapCenter([lat, lng])
      }
    })
  }

  const updateLocationFromCoords = (lat, lng) => {
    const latStr = Number(lat).toFixed(6)
    const lngStr = Number(lng).toFixed(6)
    setFormData(prev => ({ ...prev, latitude: latStr, longitude: lngStr }))
    setMapCenter([parseFloat(latStr), parseFloat(lngStr)])
    handleReverseGeocode(lat, lng)
  }

  const handleMapClick = (e) => {
    if (e.latLng) {
      updateLocationFromCoords(e.latLng.lat(), e.latLng.lng())
    }
  }

  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry) {
        const lat = place.geometry.location.lat().toFixed(6)
        const lng = place.geometry.location.lng().toFixed(6)
        const formattedAddress = place.formatted_address || ''
        const { city, state, country } = parseAddressComponents(place.address_components)

        setFormData(prev => ({
          ...prev,
          address: formattedAddress,
          latitude: lat,
          longitude: lng,
          city: city || prev.city,
          state: state || prev.state,
          country: country || prev.country,
          placeId: place.place_id || prev.placeId,
          locationName: prev.locationName ? prev.locationName : (place.name || '')
        }))
        setMapCenter([parseFloat(lat), parseFloat(lng)])
      }
    }
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocationFromCoords(pos.coords.latitude, pos.coords.longitude)
        setSearching(false)
        toast.success('Location set to current GPS coordinates!')
      },
      (err) => {
        setSearching(false)
        toast.error('Failed to get current location: ' + err.message)
      },
      { enableHighAccuracy: true }
    )
  }

  const handleTestGeofence = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setTestingGeofence(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserCoords({ lat: userLat, lng: userLng })

        const officeLat = parseFloat(formData.latitude)
        const officeLng = parseFloat(formData.longitude)
        const radius = parseFloat(formData.radiusMeters)

        const dist = calculateHaversineDistance(userLat, userLng, officeLat, officeLng)
        const isInside = dist <= radius

        setGeofenceTestResult({
          distance: dist.toFixed(1),
          isInside,
          accuracy: pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : null
        })
        setTestingGeofence(false)
      },
      (err) => {
        setTestingGeofence(false)
        toast.error('Failed to get location for geofence test: ' + err.message)
      },
      { enableHighAccuracy: true }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setModalError('')

    if (!formData.locationName.trim()) {
      setModalError('Location Name is required')
      return
    }
    if (!formData.latitude || !formData.longitude) {
      setModalError('Latitude and Longitude are required')
      return
    }

    const payload = {
      locationName: formData.locationName,
      location_name: formData.locationName,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radiusMeters: parseInt(formData.radiusMeters, 10),
      radius_meters: parseInt(formData.radiusMeters, 10),
      isActive: formData.isActive,
      is_active: formData.isActive,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      placeId: formData.placeId,
      google_place_id: formData.placeId
    }

    try {
      if (editingLocation) {
        await updateOfficeLocation(editingLocation.office_location_id, payload)
        toast.success('Office location updated successfully!')
      } else {
        await createOfficeLocation(payload)
        toast.success('Office location created successfully!')
      }
      setIsModalOpen(false)
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save location')
    }
  }

  const handleDelete = async (loc) => {
    if (window.confirm(`Are you sure you want to delete "${loc.location_name}"?`)) {
      try {
        await deleteOfficeLocation(loc.office_location_id)
        toast.success('Office location deleted')
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Failed to delete office location')
      }
    }
  }

  const handleToggleStatus = async (loc) => {
    try {
      await toggleOfficeLocationStatus(loc.office_location_id, !loc.is_active)
      toast.success(`Office location marked as ${!loc.is_active ? 'Active' : 'Inactive'}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const filteredLocations = officeLocations.filter(loc =>
    loc.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="office-locations" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiMapPin size={20} color="#C2071A" strokeWidth={2.5} />
                </div>
                Office Locations & Geofencing
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
                Configure office boundaries, GPS coordinates, and geofence verification zones
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                color: '#ffffff', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <FiPlus size={16} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} />
              Add Office Location
            </button>
          </div>

          {/* Locations Container Card */}
          <div style={{
            background: '#ffffff', border: 'none', borderRadius: '16px',
            padding: '24px', boxShadow: cardShadow
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search location name or address..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: '34px', padding: '8px 12px 8px 34px',
                    borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <span style={{
                background: '#FEECEE', color: '#C2071A', padding: '5px 14px',
                borderRadius: 20, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.02em',
              }}>
                {filteredLocations.length} Office Zones
              </span>
            </div>

            {/* Log Table */}
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location Name</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Address</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GPS Coordinates</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Radius</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLocations ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading office locations...</td></tr>
                  ) : filteredLocations.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No office locations found.</td></tr>
                  ) : filteredLocations.map((loc, i) => (
                    <tr key={loc.office_location_id} style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                        <Link to={`/client-admin/attendance/office-locations/${loc.office_location_id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                          {loc.location_name}
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {loc.address || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                        {parseFloat(loc.latitude).toFixed(4)}, {parseFloat(loc.longitude).toFixed(4)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          {loc.radius_meters}m
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          onClick={() => handleToggleStatus(loc)}
                          style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            background: loc.is_active ? '#e8fbf0' : '#feecee',
                            color: loc.is_active ? '#0fa958' : '#dc2626'
                          }}
                        >
                          {loc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleOpenEdit(loc)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer' }}>
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(loc)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#feecee', color: '#dc2626', cursor: 'pointer' }}>
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </div>

      {/* Create / Edit Modal with Interactive Google Map */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 28px', width: '740px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {editingLocation ? 'Edit Office Location' : 'Add New Office Location'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#feecee', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Location Name & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Location Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Headquarters - Tech Park"
                    value={formData.locationName}
                    onChange={e => setFormData(prev => ({ ...prev, locationName: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isActiveModal"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                  <label htmlFor="isActiveModal" style={{ fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                    Active
                  </label>
                </div>
              </div>

              {/* Address Search via Google Autocomplete */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Search Address / Building</label>
                {isLoaded && !isApiKeyMissing ? (
                  <Autocomplete onLoad={ref => (autocompleteRef.current = ref)} onPlaceChanged={handlePlaceSelect}>
                    <div style={{ position: 'relative' }}>
                      <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 5 }} />
                      <input
                        type="text"
                        placeholder="Search Google Maps location, area or building..."
                        value={formData.address}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        onBlur={e => handleForwardGeocode(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </Autocomplete>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Enter office address..."
                      value={formData.address}
                      onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      onBlur={e => handleForwardGeocode(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Interactive Google Map Canvas */}
              <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', position: 'relative', border: '1px solid #e2e8f0' }}>
                {isApiKeyMissing ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    <FiMapPin size={28} color="#94a3b8" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Interactive Map Unavailable</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: 4 }}>Google Maps API Key is not configured. Coordinates can be set manually.</div>
                  </div>
                ) : loadError ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: '#dc2626' }}>
                    <FiInfo size={28} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Error Loading Google Maps</div>
                    <div style={{ fontSize: '11.5px', marginTop: 4 }}>{loadError.message || 'Failed to load Google Maps SDK.'}</div>
                  </div>
                ) : !isLoaded ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#64748b' }}>
                    <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ marginTop: 10, fontSize: '12px', fontWeight: 600 }}>Loading Google Map…</span>
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
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
                        if (e.latLng) {
                          updateLocationFromCoords(e.latLng.lat(), e.latLng.lng())
                        }
                      }}
                      title="Drag pin to set exact office location"
                    />
                    <Circle
                      center={{ lat: parseFloat(formData.latitude) || 13.0827, lng: parseFloat(formData.longitude) || 80.2707 }}
                      radius={parseFloat(formData.radiusMeters) || 100}
                      options={{
                        fillColor: '#C2071A',
                        fillOpacity: 0.18,
                        strokeColor: '#C2071A',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                      }}
                    />
                    {userCoords && (
                      <Marker
                        position={{ lat: userCoords.lat, lng: userCoords.lng }}
                        title="Your Current GPS Position"
                      />
                    )}
                  </GoogleMap>
                )}
              </div>

              {/* Lat, Lng and Current Location Button */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Latitude *</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={e => {
                      const val = e.target.value
                      setFormData(prev => ({ ...prev, latitude: val }))
                      const latNum = parseFloat(val)
                      if (!isNaN(latNum)) setMapCenter([latNum, parseFloat(formData.longitude) || 80.2707])
                    }}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', marginTop: '4px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Longitude *</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={e => {
                      const val = e.target.value
                      setFormData(prev => ({ ...prev, longitude: val }))
                      const lngNum = parseFloat(val)
                      if (!isNaN(lngNum)) setMapCenter([parseFloat(formData.latitude) || 13.0827, lngNum])
                    }}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', marginTop: '4px', fontFamily: 'monospace' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCurrentLocation}
                  disabled={searching}
                  style={{
                    padding: '9px 14px', borderRadius: '8px', border: 'none',
                    background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <FiCompass size={14} /> My Location
                </button>
              </div>

              {/* Radius Select */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Geofence Radius (Meters)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[50, 100, 200, 500, 1000].map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setIsCustomRadius(false)
                        setFormData(prev => ({ ...prev, radiusMeters: r }))
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', border: 'none',
                        background: (!isCustomRadius && Number(formData.radiusMeters) === r) ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : '#f1f5f9',
                        color: (!isCustomRadius && Number(formData.radiusMeters) === r) ? '#ffffff' : '#475569',
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {r}m
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomRadius(true)}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', border: 'none',
                      background: isCustomRadius ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : '#f1f5f9',
                      color: isCustomRadius ? '#ffffff' : '#475569',
                      fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    Custom...
                  </button>

                  {isCustomRadius && (
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={formData.radiusMeters}
                      onChange={e => setFormData(prev => ({ ...prev, radiusMeters: parseInt(e.target.value, 10) || 100 }))}
                      placeholder="Radius in meters"
                      style={{ width: '120px', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px' }}
                    />
                  )}
                </div>
              </div>

              {/* Geofence Test Section */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Test Geofence Accuracy</span>
                  <button
                    type="button"
                    onClick={handleTestGeofence}
                    disabled={testingGeofence}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {testingGeofence ? 'Testing...' : 'Test My Current Location'}
                  </button>
                </div>
                {geofenceTestResult && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: geofenceTestResult.isInside ? '#0fa958' : '#dc2626', fontWeight: 700 }}>
                    Result: {geofenceTestResult.isInside ? 'INSIDE GEOFENCE' : 'OUTSIDE GEOFENCE'} ({geofenceTestResult.distance}m from office center)
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)' }}>
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
