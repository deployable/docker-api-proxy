
const config = require('./config.json')
const app = require('./app')
app.listen(config.http.port, ()=>{
  console.log(`listening ${config.http.port}`)
})
