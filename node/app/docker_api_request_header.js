const debug = require('debug')('docker-api-proxy:DockerApiRequestHeader')

module.exports = class DockerApiRequestHeader {
  static parse(string){
    debug('DockerApiRequestHeader parsing [%s]', string)
    let name_description = string.match(/^([\w\-]+)\s+.\s+(.+)/)
    if ( ! name_description ) throw new Error('Couldnt parse query param '+string)
    let name = name_description[1]
    let description = name_description[2]
    debug('DockerApiRequestHeader parsed [%s] [%s]', name, description)
    return new DockerApiRequestHeader({ name: name, description: description })
  }
  constructor(options){
    this.name = options.name
    if (options.description) this.description = options.description
  }
  toJSON(){
    return {
      name: this.name,
      description: this.description
    }
  }
  toRaml10Obj(){
    let o = {}
    o[this.name] = {
      description: this.description
    }
    return o
  }
}