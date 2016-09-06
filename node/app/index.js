const express = require('express')
const osprey = require('osprey')
const join = require('path').join

const app   = express()

const router = osprey.Router()

router.get('/users', ( req, res )=>{
  res.json([{username: 'meeee',  password: 'qwerpiou'}])
})

osprey
  .loadFile(join(__dirname, '..', 'raml', 'docker-remote-api-1.24.raml'))
  .then( ( middleware )=>{
    app.use('/v1', middleware, router)
  })
  .catch( (error)=>{
    console.error(error)
  })

module.exports = app
