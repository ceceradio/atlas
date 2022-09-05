import express from 'express'

export const servicerApi = express()

servicerApi.use(express.json())

// const checkScopes = requiredScopes('read:messages');
// servicerApi.use(checkScopes)

servicerApi.get('/hello', (req, res) => {
  res.json({
    success: true,
  })
})
