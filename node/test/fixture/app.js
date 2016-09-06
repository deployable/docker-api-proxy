const express = require('express')
const osprey = require('osprey')
const join = require('path').join

const app   = express()

const router = osprey.Router()

router.get('/users', ( req, res )=>{
  res.json([{username: 'meeee',  password: 'qwerpiou'}])
})

osprey
  .loadFile(join(__dirname, 'docker_remote_api_v1.24.raml'))
  .then( ( middleware )=>{
    app.use('/v1', middleware, router)
  })
  .catch( (error)=>{
    console.error(error)
  })

module.exports = app
