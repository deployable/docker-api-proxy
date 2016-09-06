const Promise = require('bluebird')
Promise.config({
  longStackTraces: true,
  warnings: true
})

const commonmark = require('commonmark')
const cmReader = new commonmark.Parser()
const needle = Promise.promisifyAll(require('needle'))
const debug = require('debug')('docker-api-proxy:app:parse-docs')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

//https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/


let filename = 'docker_remote_api_v1.24.md'
function fetchDocco(){
  return new Promise( (resolve, reject)=> {
    fs.readFileAsync(path.join(__dirname,filename),'utf8')
    .then( (html)=>{
      debug('using cached file')
      resolve(html)
    })
    .catch( ( err )=> {
      debug('downloading file')
      return needle
        .getAsync('https://raw.githubusercontent.com/docker/docker/master/docs/reference/api/'+filename)
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

function savePrevious(endpoint){
  //console.log('Done with section',data)
}

class DockerApiQueryParams{


}

class DockerApiRequestHeaders{


}

class DockerApiStatusCode{
  static parse(string){
    debug('DockerApiStatusCode parsing [%s]', string)
    let code_description = string.match(/^(\d+)\s+.\s+(.+)\w*$/)
    if ( ! code_description ) throw new Error(`StatusCode string could not be parsed [${string}]`);
    let code = code_description[1]
    let description = code_description[2]
    debug('DockerApiStatusCode parsed [%s] [%s]', code, description)
    return new DockerApiStatusCode({ code: code, description: description })
  }
  constructor(options){
    if (!options.code) throw new Error('code is required for a StatusCode');
    this.code = options.code
    if (options.description) this.description = options.description;
  }
}

class DockerApiStatusCodes{
  static parse($elements){
    debug('DockerApiStatusCodes parsing [%s]', $elements.toString())
    debugger
    let status_codes = []
    let status_finished = false
    $elements[0].children.forEach((element)=> {
      if ( element ) return;
      if ( code_string.match(/Stream details/)) status_finished = true;
      if ( status_finished ) return;
      return DockerApiStatusCode.parse(code_string)
    })
    debug('DockerApiStatusCodes parsed [%s]', codes)
    //return new DockerApiStatusCodes(options)
    return codes
  }
}

class DockerApiStreamDetails{
  static parse($elements){
    debug('DockerApiStreamDetails parsing [%s]', string)
    let stream_lines = []
    let status_started = false
    string.split('\n').forEach((line)=> {
      if ( line.match(/Stream details/)) status_started = true;
      if ( ! status_started ) return;
      stream_lines.push(line)
    })
    debug('DockerApiStreamDetails parsed [%s]', stream_lines)
    //return new DockerApiStreamDetails(options)
    return stream_lines
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
      if ( item.match(/^\(.+\)$/) ) item = '{id}';
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
    return `${this.method} ${this.paths.join()}`
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
}


class DockerApiEndpointPath{
  static parse(string){
    new DockerApiPath
  }
  set path ( string ){this.path = string}
  set method ( string ){ this.method = string}
}


fetchDocco().then( (markdown)=> {
  let docco = cmReader.parse( markdown )
  debug( 'docco.length', docco.length )
  let flag = 'new'
  let data = []
  let done = false
  let started = false
  let current_id = null
  let section = null
  debugger
  docco.each((i,el)=>{
    if (started && done) return;
    if ( el.nodeType === 1 ) {
      let $el = $(el)
      debug('el', el.type, el.name, $el.html())

      if ( started && ( el.name === 'h1' )){
        savePrevious(data)
        console.log('Done')
        done = true;
        return; 
      }

      if ( el.name === 'h2') {
        debug('el', el)
        if (!el.attribs && !el.attribs.id) throw new Error('No ID on h2 for section')
        section_text = el.attribs.id
        if (match = section_text.match(/^\d+(?:\-\d+)*\-(.+)/)){
          section = match[1];
        } else {
          throw new Error('Section did not match re format:'+section_text)
        }
      }

      if ( el.name === 'h3' ) {
        if ( $el.text().match(/Image tarball format/) ) return;
        if (started) savePrevious(data);
        started = true
        current_endpoint = null
        console.log('Description - %s',$el.text())
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
        console.log('Endpoint - %s',$el.text())
        current_endpoint.endpoint = DockerApiRequest.parse($el.text())
        flag = 'endpoint'

      //} else if ( flag === 'endpoint' && $el.text().match(/Query parameters/) ){
      } else if ( $el.text().match(/Query parameters/) ){
        current_endpoint.queryParams = $el.text()
        flag = 'queryParams'

      //} else if ( flag === 'request-headers' && $el.text().match(/Request Headers/) ){
      } else if ( $el.text().match(/Request Headers/) ){
        current_endpoint.requestHeaders = $el.text()
        flag = 'requestHeaders'
      
      //} else if ( flag === 'status-codes' && $el.text().match(/Status codes/) ){
      } else if ( $el.text().match(/Status codes/) ){
        current_endpoint.statusCodes = DockerApiStatusCodes.parse($el.next())
        current_endpoint.streamDetails = DockerApiStreamDetails.parse($el.next())
        flag = 'statusCodes'
      } 
    }
  })

  console.log('data',data)
  //return headers
})
