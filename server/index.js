import express from 'express'
import cors from 'cors'
import provisioningRoutes from './src/provisioningRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/provisioning', provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
