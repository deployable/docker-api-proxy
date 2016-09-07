const debug = require('debug')('docker-api-proxy:DockerApiQueryParam')

module.exports = class DockerApiQueryParam {
  static parse(string){
    debug('DockerApiQueryParam parsing [%s]', string)
    let name_description = string.match(/^(\w+)\s+.\s+(.+)/)
    if ( ! name_description ) throw new Error('Couldnt parse query param '+string)
    let name = name_description[1]
    let description = name_description[2]
    debug('DockerApiQueryParam parsed [%s] [%s]', name, description)
    return new DockerApiQueryParam({ name: name, description: description })
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