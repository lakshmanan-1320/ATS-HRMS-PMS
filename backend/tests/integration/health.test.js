const request = require('supertest')
const app = require('../../src/app')

describe('Health endpoint', () => {
  test('GET /api/health returns ok status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
    expect(res.body).toHaveProperty('ts')
  })
})
