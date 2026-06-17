import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import provisioningRoutes from './src/provisioningRoutes.js'
import logger from './src/logger.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.use('/api/provisioning', provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
