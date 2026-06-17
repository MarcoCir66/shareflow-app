import jwksRsa from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const TENANT_ID = process.env.AZURE_TENANT_ID
const SPA_CLIENT_ID = process.env.SPA_CLIENT_ID

function buildDefaultVerifyToken() {
  const jwksClient = jwksRsa({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 24 * 60 * 60 * 1000,
  })

  function getSigningKey(header, callback) {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err)
      callback(null, key.getPublicKey())
    })
  }

  return function verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        { audience: SPA_CLIENT_ID, issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0` },
        (err, decoded) => (err ? reject(err) : resolve(decoded))
      )
    })
  }
}

export function createRequireAuth(verifyToken) {
  return async function requireAuth(req, res, next) {
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_DISABLED === 'true') {
      return next()
    }

    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }

    try {
      const decoded = await verifyToken(token)
      req.user = { oid: decoded.oid, name: decoded.name, preferred_username: decoded.preferred_username }
      next()
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
    }
  }
}

export const requireAuth = createRequireAuth(buildDefaultVerifyToken())
