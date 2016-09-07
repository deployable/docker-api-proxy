const debug = require('debug')('docker-api-proxy:DockerApiQueryParams')
const $ = require('cheerio')

const DockerApiArrayStore = require('./docker_api_array_store')
const DockerApiQueryParam = require('./docker_api_query_param')

module.exports = class DockerApiQueryParams extends DockerApiArrayStore{
  static parse($elements){
    debug('DockerApiQueryParams parsing [%s]', $elements.toString())
    let query_params = []
    $elements.children().each((i,element)=> {
      if ( element.name === 'text' ) return;
      let element_text = $(element).text()
      query_params.push( DockerApiQueryParam.parse(element_text) )
    })
    debug('DockerApiQueryParams parsed [%s]', query_params)
    return new DockerApiQueryParams ({ store: query_params })
  }
}