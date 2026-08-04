function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function calculateDistanceMeters(pointA, pointB) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(Number(pointB.latitude) - Number(pointA.latitude));
  const deltaLon = toRadians(Number(pointB.longitude) - Number(pointA.longitude));

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

function findNearestZone(latitude, longitude, zones = []) {
  if (!zones.length) return null;

  return zones.reduce((nearest, zone) => {
    const distanceMeters = calculateDistanceMeters(
      { latitude, longitude },
      { latitude: zone.latitude, longitude: zone.longitude }
    );
    const candidate = {
      geoFenceZoneId: zone.geo_fence_zone_id,
      zoneName: zone.zone_name,
      distanceMeters,
      isWithinFence: distanceMeters <= Number(zone.radius_meters || 0),
    };

    if (!nearest || candidate.distanceMeters < nearest.distanceMeters) {
      return candidate;
    }
    return nearest;
  }, null);
}

module.exports = {
  calculateDistanceMeters,
  findNearestZone,
};
