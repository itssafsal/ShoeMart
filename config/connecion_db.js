var mongoClient=require('mongodb').MongoClient
var url='mongodb://localhost:27017'
var client = new mongoClient(url)

const state={
    db:null
}

module.exports.connect=function(done){
    const dbname='shopping'

    client.connect().then(function(data){
        state.db=data.db(dbname)
        done()
    }).catch(function(err){
        return done(err)
    })
}

module.exports.get=function(){
    return state.db
}