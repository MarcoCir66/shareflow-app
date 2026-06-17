import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequireAuth } from './authMiddleware.js'

function mockRes() {
  const res = { statusCode: null, body: null }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.body = body; return res }
  return res
}

test('missing Authorization header returns 401', async () => {
  const requireAuth = createRequireAuth(async () => ({}))
  const req = { headers: {} }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(res.statusCode, 401)
  assert.equal(nextCalled, false)
})

test('Authorization header without Bearer prefix returns 401', async () => {
  const requireAuth = createRequireAuth(async () => ({}))
  const req = { headers: { authorization: 'Token abc123' } }
  const res = mockRes()
  await requireAuth(req, res, () => {})
  assert.equal(res.statusCode, 401)
})

test('valid token calls next() and attaches req.user', async () => {
  const requireAuth = createRequireAuth(async (token) => {
    assert.equal(token, 'good-token')
    return { oid: 'user-1', name: 'Ada', preferred_username: 'ada@example.com' }
  })
  const req = { headers: { authorization: 'Bearer good-token' } }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, true)
  assert.deepEqual(req.user, { oid: 'user-1', name: 'Ada', preferred_username: 'ada@example.com' })
})

test('verifyToken rejection returns 401 with a generic message', async () => {
  const requireAuth = createRequireAuth(async () => { throw new Error('jwks fetch failed: internal detail') })
  const req = { headers: { authorization: 'Bearer bad-token' } }
  const res = mockRes()
  await requireAuth(req, res, () => {})
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'Invalid or expired token')
})

test('AUTH_DISABLED bypass in test env calls next() without checking the token', async (t) => {
  process.env.NODE_ENV = 'test'
  process.env.AUTH_DISABLED = 'true'
  t.after(() => { delete process.env.AUTH_DISABLED })
  const requireAuth = createRequireAuth(async () => { throw new Error('should not be called') })
  const req = { headers: {} }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, true)
})
