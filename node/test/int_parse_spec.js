const debug = require('debug')('docker-api-parse:test:int:parse')
const {DockerApiParse} = require('../app/parse-docs')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')


describe('Integration::Parse', ()=>{

  
  describe('1.24', ()=>{

    // Store the parsed endpoints
    let endpoints_124 = null


    describe('EndpointIndex', ()=>{

      it('should have an endpoints array', (done)=>{
        DockerApiParse.buildConfig({version:'1.24'})
        .then( (res)=> {
          expect( res.endpoints ).to.be.an( 'array' )
          endpoints_124 = res
          done()
        })
      })

      it('should have the /containers path', (done)=>{
        expect( endpoints_124 ).to.contain.key( 'paths' )
        expect( endpoints_124.paths ).to.contain.keys( '/containers', '/images', '/tasks' )
        done()
      })

      it('should toRaml10Obj', (done)=>{
        raml_obj = endpoints_124.toRaml10Obj()
        expect( raml_obj ).to.be.ok
        expect( raml_obj ).to.contain.keys('/containers', 'title')
        expect( raml_obj['/containers'] ).to.contain.keys('/json')
        expect( raml_obj['/containers']['/json'] ).to.contain.keys('get')
        expect( raml_obj['/containers']['/json']['get'] ).to.contain.keys('responses')
        expect( raml_obj['/containers']['/json']['get']['responses'] ).to.contain.keys("200")
        done()
      })

    })

      
    describe('RAML', ()=>{

      let raml_store = null

      it('should toRaml', ()=>{
        raml_store = endpoints_124.toRaml()
        expect( raml_store ).to.be.ok
      })

      it('should have a raml title', ()=>{
        expect( raml_store ).to.match(/title: Docker API 1\.24\n/m)
      })

      it('should have a /networks: key', ()=>{
        expect( raml_store ).to.match(/^\/networks:/m)
      })

      it('should have a /containers: key', ()=>{
        expect( raml_store ).to.match(/^\/containers:/m)
      })

      it('should have a /tasks: key', ()=>{
        expect( raml_store ).to.match(/^\/tasks:/m)
      })

      it('should save a file', (done)=>{
        fs.writeFileAsync(path.join(__dirname,'fixture','docker_remote_api_v1.24.raml'), "#%RAML 0.8\n"+raml_store)
          .then( () => done() )
          .catch(done)
      })

    })

  })

})
