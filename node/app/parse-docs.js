const debug = require('debug')('docker-api-proxy:app:parse-docs')

const Promise = require('bluebird')
const cheerio = require('cheerio')
const needle = Promise.promisifyAll(require('needle'))
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')
const yaml = require('js-yaml')
const _ = {}
_.keys = require('lodash.keys')
_.toInteger = require('lodash.toInteger')

// Make cheerio accessible
var $ = null

// Useful debug
if (process.env.NODE_ENV != 'production' ){
  Promise.config({
    longStackTraces: true,
    warnings: true
  })
}

//https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/


class DockerApiArrayStore{
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


class DockerApiQueryParam {
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

class DockerApiQueryParams extends DockerApiArrayStore{
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

class DockerApiRequestHeader {
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

class DockerApiRequestHeaders extends DockerApiArrayStore{
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

class DockerApiStatusCode{
  static parse(string){
    debug('DockerApiStatusCode parsing [%s]', string)
    let code_description = string.match(/^(\d+)\s+.\s+(.+)/)
    if ( ! code_description ) throw new Error(`StatusCode string could not be parsed [${string}]`);
    let code = _.toInteger(code_description[1])
    let description = code_description[2]
    debug('DockerApiStatusCode parsed [%s] [%s]', code, description)
    return new DockerApiStatusCode({ code: code, description: description })
  }
  constructor(options){
    if (!options.code) throw new Error('code is required for a StatusCode');
    this.code = options.code
    if (options.description) this.description = options.description;
  }
  toJSON(){
    return {
      code: this.code,
      description: this.description
    }
  }
  toRaml10Obj(){
    let o = {}
    o[this.code] = {}
    if ( this.description ) o[this.code].description = this.description
    return o
  }
}


class DockerApiStatusCodes extends DockerApiArrayStore{
  static parse($elements){
    debug('DockerApiStatusCodes parsing [%s]', $elements.toString())
    let status_codes = []
    let status_finished = false
    //$elements[0].children.forEach((element)=> {
    $elements.children().each((i,element)=> {
      if ( element.name === 'text' ) return;
      let element_text = $(element).text()
      if ( element_text.match(/Stream details/)) status_finished = true;
      if ( status_finished ) return;
      status_codes.push( DockerApiStatusCode.parse(element_text) )
    })
    debug('DockerApiStatusCodes parsed [%s]', status_codes)
    //return new DockerApiStatusCodes(options)
    return new DockerApiStatusCodes({ store: status_codes })
  }
}


class DockerApiStreamDetails{
  static parse($elements){
    debug('DockerApiStreamDetails parsing [%s]', $elements.toString())
    let stream_details = []
    let status_started = false
    let codes = $elements.map((i,element)=> {
      let element_text = $(element).text()
      if ( element_text.match(/Stream details/)) status_started = true;
      if ( ! status_started ) return;
      stream_details.push(element_text)
    })
    debug('DockerApiStreamDetails parsed [%s]', stream_details)
    return new DockerApiStreamDetails({ store: stream_details })
  }
  toJSON(){
    return this.store
  }
}

class DockerApiRequest{
  static parse(string){
    debug('DockerApiRequest parsing [%s]', string)
    let method_path = string.match(/^([A-Z]+)\s+(\/.+)/)
    if ( ! method_path ) throw new Error('Invalid method/path '+method_path)
    let method = method_path[1]
    let reqpath = method_path[2]
    let parts = reqpath.split('/')
    if ( parts[0] === '' ) parts.shift();
    let paths = parts.map( (item)=> {
      if ( item.match(/^\(.+\)$/) || item.match(/^\<.+\>$/)) item = '{id}';
      return '/'+item
    })
    debug('DockerApiRequest parsed [%s] to [%s] [%s]', string, method, paths)
    return new DockerApiRequest({paths:paths, method:method})
  }
  constructor(options){
    this.paths = options.paths;
    this.method = options.method
  }
  toString(){
    return `${this.method} ${this.paths.join('')}`
  }
  toJSON(){
    return {
      method: this.method,
      path: this.paths.join(''),
      paths: this.paths
    }
  }
}

class DockerApiEndpoint{

  constructor(options){
    this.id = options.id
    if (options.queryParams) this.queryParams = options.queryParams;
    if (options.statusCodes) this.statusCodes = options.statusCodes;
    if (options.requestHeaders) this.requestHeaders = options.requestHeaders;
    if (options.request) this.request = options.request;
    if (options.description) this.description = options.description;
    if (options.section) this.section = options.section;
  }

  // set queryParams(params){ return this.queryParams = params }
  // set statusCodes(params){ return this.statusCodes = params }
  // set requestHeaders(params){ return this.requestHeaders = params }
  // set request(param){ return this.request = param }
  // set description(param){ return this.description = param }
  // set section(param){ return this.section = param }
  // get section(){ return this.section; }

  toJSON(){
    let o = {
      statusCodes: this.statusCodes.toJSON(),
      queryParams: this.queryParams.toJSON(),
      requestHeaders: this.requestHeaders.toJSON(),
      description: this.description,
      section: this.section
    }
    Object.assign(o, this.request.toJSON())
    return o
  }

  toRamlObj(){ return this.toRaml10Obj() }
  toRaml10Obj(){
    let o = {}
    if ( this.description )     o.description = this.description
    if ( this.queryParams ) {
      if (!this.queryParams.toRaml10Obj) throw new Error('queryParams'+typeof this.queryParams)
      o.queryParameters = this.queryParams.toRaml10Obj()
    }
    if ( this.statusCodes )     o.responses = this.statusCodes.toRaml10Obj()
    if ( this.requestHeaders )  o.headers = this.requestHeaders.toRaml10Obj()
    return o
  }

}

// Final store for all the enpoints
// indexed by a number of fields

class DockerApiEndpointIndex{

  constructor(options){
    this.version = '1.24'
    this.endpoints = []
    this.ids = {}
    this.paths = {}
    this.sections = {}
    this.methods = {}
    this.raml = {}
  }
  
  add(endpoint){
    this.endpoints.push(endpoint)
    this.ids[endpoint.id] = endpoint
    if ( ! this.sections[endpoint.section] ) this.sections[endpoint.section] = {}
    this.sections[endpoint.section][endpoint.id] = endpoint
    if ( ! this.methods[endpoint.method] ) this.methods[endpoint.method] = {}
    this.methods[endpoint.method][endpoint.id] = endpoint
    this.add_path(endpoint)
  }
  
  add_path(endpoint){
    let ref = this.paths
    let rref = this.raml
    endpoint.paths.forEach( (path)=> {
      if ( ! ref[path] ) {
        ref[path] = {}
        rref[path] = {}
      }
      ref = ref[path]
      rref = rref[path]
    })
    let lower_method = endpoint.method.toLowerCase()
    if (ref[lower_method]) throw new Error('Endpoint already exists! '+endpoint.paths+lower_method)
    ref[lower_method] = endpoint
    rref[lower_method] = endpoint.toRamlObj()
  }

  toRaml(){
    //return yaml.safeDump( this.toRaml10Obj() )
    return yaml.dump( this.toRaml10Obj() )
  }

  toRaml08Obj(){
    
  }

  toRaml10Obj(){
    let o = {}
    o.title = 'Docker API '+this.version
    debug( 'toRaml10Obj raml paths', _.keys(this.paths) )
    Object.assign(o, this.raml)
    return o
  }

}


// static methods to fetchc and parse
class DockerApiParse{
  static fetchDocco(filename){
    return new Promise( (resolve, reject)=> {
      fs.readFileAsync(path.join(__dirname,filename),'utf8')
      .then( (html)=>{
        debug('using cached file')
        resolve(html)
      })
      .catch( ( err )=> {
        debug('downloading file')
        return needle
          .getAsync(`https://docs.docker.com/engine/reference/api/${filename}/`)
          .then( (resp) => {
            debug('writing response')
            fs.writeFileAsync(path.join(__dirname,filename), resp.body)
            .then(()=>{
              debug('write response')
              resolve(resp.body)            
            })
          })
      })
    })
  }

  // Ugly, but working
  static buildConfig(options){
    if ( ! options ) options = {}
    let file_prefix = 'docker_remote_api_v'
    let version = options.version || '1.24'
    return this.fetchDocco(file_prefix+version)
    .then( (html)=> {
      $ = cheerio.load( html )
      let docco = $('#DocumentationText').contents()
      debug( 'docco.length', docco.length )

      let flag = 'new'
      let data = []
      let done = false
      let started = false
      let current_id = null
      let section = null
      let current_endpoint = null
      let endpoint_index = new DockerApiEndpointIndex()

      docco.each((i,el)=>{
        if (started && done) return;
        if ( el.nodeType === 1 ) {
          let $el = $(el)
          debug( 'el', el.type, el.name )

          if ( started && ( el.name === 'h1' )){
            endpoint_index.add(current_endpoint)
            current_endpoint = null
            debug('Done with data (h1)')
            done = true;
            return; 
          }

          if ( el.name === 'h2') {
            debug('el h2')
            if (!el.attribs && !el.attribs.id) throw new Error('No ID on h2 for section')
            let section_text = el.attribs.id
            let match = section_text.match(/^\d+(?:\-\d+)*\-(.+)/)
            if ( match ){
              section = match[1];
            } else {
              throw new Error('Section did not match re format:'+section_text)
            }
          }

          if ( el.name === 'h3' ) {
            // A rogue h3
            if ( $el.text().match(/Image tarball format/) ) return;

            if (started) endpoint_index.add(current_endpoint);
            started = true
            current_endpoint = null
            debug('Description - %s',$el.text())
            if (!el.attribs.id) throw new Error('no id on el');
            if (!section) throw new Error('no section to add endpoint to');
            current_endpoint = new DockerApiEndpoint({
              id: el.attribs.id,
              section: section,
              description: $el.text()
            })
            data.push(current_endpoint)
            flag = 'description'

          } else if (flag === 'description' && el.name === 'p' ){
            debug('Endpoint - %s',$el.text())
            let req = DockerApiRequest.parse($el.text())
            current_endpoint.method = req.method
            current_endpoint.paths = req.paths
            current_endpoint.path = req.paths.join('')
            flag = 'endpoint'

          //} else if ( flag === 'endpoint' && $el.text().match(/Query parameters/) ){
          } else if ( $el.text().match(/Query parameters/) ){
            current_endpoint.queryParams = DockerApiQueryParams.parse($el.next())
            flag = 'queryParams'

          //} else if ( flag === 'request-headers' && $el.text().match(/Request Headers/) ){
          } else if ( $el.text().match(/Request Headers/) ){
            current_endpoint.requestHeaders = DockerApiRequestHeaders.parse($el.next())
            flag = 'requestHeaders'
          
          //} else if ( flag === 'status-codes' && $el.text().match(/Status codes/) ){
          } else if ( $el.text().match(/Status codes/) ){
            current_endpoint.statusCodes = DockerApiStatusCodes.parse($el.next())
            //current_endpoint.streamDetails = DockerApiStreamDetails.parse($el.next())
            flag = 'statusCodes'
          } 
        }
      })

      
      debug('the endpoint index i[%s]', endpoint_index.endpoints.length)
      data.forEach((endpoint)=>{
        debug('%s %s - %s', endpoint.method.padRight(6), endpoint.path.padRight(26), endpoint.description)
      })
      //return headers

      return endpoint_index
    })
  }
}


module.exports = {
  DockerApiParse: DockerApiParse,
  DockerApiEndpoint: DockerApiEndpoint,
  DockerApiRequest: DockerApiRequest,
  DockerApiQueryParam: DockerApiQueryParam,
  DockerApiQueryParams: DockerApiQueryParams,
  DockerApiRequestHeader: DockerApiRequestHeader,
  DockerApiRequestHeaders: DockerApiRequestHeaders,
  DockerApiStreamDetails: DockerApiStreamDetails,
  DockerApiStatusCode: DockerApiStatusCode,
  DockerApiEndpointIndex: DockerApiEndpointIndex
}

String.prototype.padLeft = function (length, paddingValue=' ') {
  if ( this.length >= length ) return this
  return String(Array(length).join(paddingValue) + this).slice(-length)
}
String.prototype.padRight = function (length, paddingValue=' ') {
  if ( this.length >= length ) return this
  return String(this + Array(length).join(paddingValue)).slice(0,length)
}