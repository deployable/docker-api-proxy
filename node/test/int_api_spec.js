const app = require('../app')

describe('Integration::App', ()=>{
  
  describe('/users', ()=>{

    describe('get', ()=>{

      xit('should return an array', (done)=>{
        supertest(app)
          .get('/v1/container/whatever')
          .end( ( err, res )=>{
            if ( err ) done(err);
            expect( res.text ).to.match( /^\{/ )
            expect( res.status ).to.eql( 200 )
            expect( res.body ).to.eql( [{something:"test"}] )
            done()
          })
      })
    })

  })

})
