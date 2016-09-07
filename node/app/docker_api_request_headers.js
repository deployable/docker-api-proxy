const debug = require('debug')('docker-api-proxy:DockerApiRequestHeaders')
const $ = require('cheerio')

const DockerApiArrayStore = require('./docker_api_array_store')
const DockerApiRequestHeader = require('./docker_api_request_header')

module.exports = class DockerApiRequestHeaders extends DockerApiArrayStore{
  static parse($elements){
    debug('DockerApiRequestHeaders parsing [%s]', $elements.toString())
    let request_headers = []
    $elements.children().each((i,element)=> {
      if ( element.name === 'text' ) return;
      let element_text = $(element).text()
      request_headers.push( DockerApiRequestHeader.parse(element_text) )
    })
    debug('DockerApiRequestHeaders parsed [%s]', request_headers)
    return new DockerApiRequestHeaders({store: request_headers})
  }
}
