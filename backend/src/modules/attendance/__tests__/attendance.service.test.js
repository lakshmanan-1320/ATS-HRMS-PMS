jest.mock('../attendance.repository', () => ({
  getActiveGeoFenceZones: jest.fn(),
  createCheckIn: jest.fn(),
  updateCheckOut: jest.fn(),
}));

const repository = require('../attendance.repository');
const attendanceService = require('../attendance.service');

const user = {
  id: '11111111-1111-1111-1111-111111111111',
  organizationId: '22222222-2222-2222-2222-222222222222',
};

const punch = {
  latitude: 13.0827,
  longitude: 80.2707,
  selfieUrl: null,
  deviceInfo: { platform: 'Android' },
};

describe('attendance service duplicate prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.getActiveGeoFenceZones.mockResolvedValue([]);
  });

  test('throws conflict when user already checked in without matching idempotency key', async () => {
    repository.createCheckIn.mockResolvedValue({
      created: false,
      row: {
        id: 'attendance-1',
        check_in_idempotency_key: 'original-key',
        check_in_time: new Date(),
        check_in_latitude: 13.0827,
        check_in_longitude: 80.2707,
      },
    });

    await expect(attendanceService.checkIn(user, punch, 'new-key'))
      .rejects
      .toMatchObject({ statusCode: 409, message: 'Already checked in for today.' });
  });

  test('returns original check-in response when idempotency key matches', async () => {
    repository.createCheckIn.mockResolvedValue({
      created: false,
      row: {
        id: 'attendance-1',
        check_in_idempotency_key: 'same-key',
        check_in_time: new Date('2026-06-19T03:35:00.000Z'),
        check_in_latitude: 13.0827,
        check_in_longitude: 80.2707,
        zone_name: null,
        distance_meters: null,
        is_within_fence: null,
      },
    });

    const result = await attendanceService.checkIn(user, punch, 'same-key');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Check-in successful');
    expect(result.data.attendanceId).toBe('attendance-1');
  });

  test('throws conflict when user is already checked out without matching idempotency key', async () => {
    repository.updateCheckOut.mockResolvedValue({
      status: 'already_checked_out',
      row: {
        id: 'attendance-1',
        check_out_idempotency_key: 'original-key',
        check_out_time: new Date(),
        work_duration_minutes: 550,
      },
    });

    await expect(attendanceService.checkOut(user, punch, 'new-key'))
      .rejects
      .toMatchObject({ statusCode: 409, message: 'Already checked out for today.' });
  });
});
