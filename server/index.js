import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import provisioningRoutes from './src/provisioningRoutes.js'
import { requireAuth } from './src/authMiddleware.js'
import logger from './src/logger.js'

const app = express()

const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))
app.use(express.json())

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/provisioning', limiter, requireAuth, provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
