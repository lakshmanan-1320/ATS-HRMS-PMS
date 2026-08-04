const { calculateDistanceMeters, findNearestZone } = require('../../../utils/geo');

describe('geo utilities', () => {
  test('calculates Haversine distance in meters', () => {
    const distance = calculateDistanceMeters(
      { latitude: 13.0827, longitude: 80.2707 },
      { latitude: 13.0837, longitude: 80.2707 }
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(130);
  });

  test('finds nearest zone and marks outside fence informationally', () => {
    const nearest = findNearestZone(13.0827, 80.2707, [
      {
        geo_fence_zone_id: 'zone-far',
        zone_name: 'Far Zone',
        latitude: 12.9716,
        longitude: 77.5946,
        radius_meters: 500,
      },
      {
        geo_fence_zone_id: 'zone-near',
        zone_name: 'HQ Chennai',
        latitude: 13.0837,
        longitude: 80.2707,
        radius_meters: 50,
      },
    ]);

    expect(nearest.geoFenceZoneId).toBe('zone-near');
    expect(nearest.zoneName).toBe('HQ Chennai');
    expect(nearest.distanceMeters).toBeGreaterThan(50);
    expect(nearest.isWithinFence).toBe(false);
  });
});
