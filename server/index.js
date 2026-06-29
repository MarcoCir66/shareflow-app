import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import provisioningRoutes from './src/provisioningRoutes.js'
import projectRoutes from './src/projectRoutes.js'
import { requireAuth } from './src/authMiddleware.js'
import logger from './src/logger.js'

const app = express()

const allowedOrigin = process.env.CLIENT_ORIGIN ?? /^http:\/\/localhost:\d+$/
app.use(cors({ origin: allowedOrigin }))
app.use(express.json())

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/health/azure', async (req, res) => {
  const { isGraphConfigured, getGraphAccessToken } = await import('./src/msalClient.js')
  if (!isGraphConfigured()) return res.json({ configured: false })
  try {
    const token = await getGraphAccessToken()
    res.json({ configured: true, ok: true, tokenLength: token.length })
  } catch (err) {
    res.json({ configured: true, ok: false, error: err.message })
  }
})

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/provisioning', limiter, requireAuth, provisioningRoutes)
app.use('/api/projects', limiter, requireAuth, projectRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
