const debug = require('debug')('docker-api-proxy:dockerApiArrayStore')

module.exports = class DockerApiArrayStore{
  constructor(options){
    this.store = []
    if (options.store) this.store = options.store;
  }
  toJSON(){
    return this.store.map((item)=>{
      return item.toJSON()
    })
  }
  toRaml10Obj(){
    let o = {}
    this.store.forEach((item)=>{
      Object.assign( o, item.toRaml10Obj() )
    })
    return o
  }
}