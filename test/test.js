"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-env node*/

var request = require('supertest');

var changing = require('best-globals').changing;
var expect = require('expect.js');
var sinon = require('sinon');
var fsSync = require('fs');
var querystring = require('querystring');

var assert = require('self-explain').assert;

var myOwn = require('../for-client/my-things.js');
const { resolve } = require('path');

function testAFixture(){
    return function(){ return new Promise(function(result,reject){
        var procedureDef = be.procedure[fixture.action];
        fixture.method=fixture.method||be.defaultMethod;
        var parameters={};
        procedureDef.parameters.forEach(function(parameterDef){
            var value=fixture.parameters[parameterDef.name];
            value=myOwn.encoders[parameterDef.encoding].stringify(value);
            parameters[parameterDef.name]=value;
        });
        (fixture.method==='get'?(
            agent.get(opt.base+'/'+fixture.action+'?'+querystring.stringify(parameters))
        ):(
            agent.post(opt.base+'/'+fixture.action).type('form').send(parameters)
        ))
        .expect(function(res){
            var result;
            var chunks = res.text || res._body.toString('utf8');
            var error;
            var text;
            if(res.status>=400){
                error = res.error || JSON.parse(chunk);
            }else{
                try{
                    if(procedureDef.progress===false){
                        text = chunks;
                    }else{
                        var lines = chunks.split(/\r?\n/);
                        while(!text && !error){
                            var line = lines[0];
                            error = /^\{"error":/.test(line) && JSON.parse(line).error;
                            lines.shift();
                            if(line == '--') text = lines.join('');
                        }
                    }
                    if(!error){
                        result=myOwn.encoders[procedureDef.encoding].parse(text);
                    }
                }catch(err){
                    console.log('Parsing result',text,result,error)
                    console.dir(res,{depth:0});
                    throw err;
                }
            }
            if(error && !fixture.expectedError){
                console.log("ERROR IN FIXTURE");
                console.log(error.message)
                console.log(error.stack)
                throw new Error("unexpected error");
            }
            if(!error && fixture.expectedError){
                console.log("EXPECTED ERROR BUT NOT");
                console.log(fixture.expectedError);
                throw new Error("EXPECTED ERROR BUT NOT");
            }
            if(error && fixture.expectedError){
                expect(error.message).to.match(fixture.expectedError);
            }else{
                if(parameters.table && !"now, I'm using yaml"){
                    if(result){
                        var structure=be.tableStructures[parameters.table]({be});
                        myOwn.adaptData(structure, (result instanceof Array?result:[result]));
                    }
                }
                var expected = fixture.expected;
                var dif=result && expected && assert.allDifferences(result, expected);
                if(dif){
                    console.log('expected');
                    console.log(expected);
                    console.log('obtained');
                    console.log(result);
                    console.log('unexpected differences');
                    console.log(dif);
                    throw new Error('differences');
                }
            }
        })
        .expect(200,function done(err){ if(err) reject(err); else resolve()});
    })}
}

describe('backend-plus', function describeBackendPlus(){
    [
        {base:''           ,root:true },
        {base:'/base'      ,root:false},
    ].forEach(function(opt, i){
        describe('base:'+opt.base, function(){
                var be;
                var agent;
                before(function (done) {
                    this.timeout(50000);
                    createServerGetAgent({server:{"base-url":opt.base}}).then(function(_be){ 
                        be=_be;
                        return be.inDbClient({}, function(client){
                            return client.executeSqlScript('./test/populate_db.sql');
                        });
                    }).then(function(){
                        agent=request.agent(be.getMainApp());
                    }).then(done,done);
                });
                after(async function(){
                    console.log('cerrando el backend',i);
                    await be.shootDownBackend();
                    be=null;
                    console.log('cerrado! el backend',i);
                });
                it('must set session cookie in the first connection', function(done){
                    agent
                    .get(opt.base+'/any-url')
                    .expect('set-cookie',/connect.sid=/, done);
                });
                it('must redirect if not logged in', function(done){
                    agent
                    .get(opt.base+'/echo')
                    // if config without not-logged-in page: .expect('location', 'login')
                    .expect('location', 'not-logged-in')
                    // if config without not-logged-in page: .expect(302, /Redirecting to login/, done);
                    .expect(302, /Redirecting to not-logged-in/, done);
                });
                it('must get login page when not logged in', function(done){
                    agent
                    .get(opt.base+'/login')
                    .expect(200, /username.*password/, done);
                });
                it('must receive login parameters', function(done){
                    agent
                    .post(opt.base+'/login')
                    .type('form')
                    .send({username:'prueba', password:'prueba1'})
                    .expect(302, /Redirecting to .*\/echo/, done);
                });
                it('must serve data if logged', function(done){
                    agent
                    .get(opt.base+'/echo')
                    .expect('echo',done);
                });
                'fixture-select'.split(',').forEach(function(fixtureListName){
                    var fixtures = eval(fsSync.readFileSync('test/fixtures/'+fixtureListName+'.js', {encoding:'utf8'}));
                    fixtures.forEach(function(fixture,i){
                        var nameIt='execute procedure for fixture:'+fixtureListName+'['+i+'] '+(fixture.name||fixture.action);
                        if(fixture.skip){
                            it.skip(nameIt);
                            return;
                        }
                        it(nameIt, testAFixture);
                    });
                });
            //    it('must serve data if logged 2', function(done){
            //        agent
            //        .get(opt.base+'/private/data2')
            //        .expect('private: data2',done);
            //    });
            //    it('must serve whoami', function(done){
            //        agent
            //        .get(opt.base+'/whoami')
            //        .expect('I am: {"userFieldName":"prueba","userData":"data-user"}',done);
            //    });
            //    if(!opt.root){
            //        it('must fail outside the base', function(done){
            //            agent
            //            .get('/private/algo.txt')
            //            .expect(404, done);
            //        });
            //    };
            //    it('if the login page was visited then unlog', function(done){
            //        agent
            //        .get(opt.base+'/login')
            //        .end(function(){
            //            agent
            //            .get(opt.base+'/private/data3')
            //            .expect('location', opt.base+'/login')
            //            .expect(302, /Redirecting to \/.*login/, done);
            //        });
            //    });
            //describe('loggin in', function(){
            //    var agent;
            //    before(function (done) {
            //        createServerGetAgent({baseUrl:opt.base, successRedirect:'/loggedin'}).then(function(_agent){ 
            //            agent=_agent; 
            //        }).then(done,done);
            //    });
            //    if(!opt.root){
            //        it('must fail outside the base', function(done){
            //            agent
            //            .get('/login')
            //            .expect(404, done);
            //        });
            //    };
            //    it('must redirect to success page', function(done){
            //        agent
            //        .post(opt.base+'/login')
            //        .type('form')
            //        .send({username:'prueba', password:'prueba1'})
            //        .expect(function(res){
            //             //console.log('****', res);
            //        })
            //        .expect(302, /Redirecting to \/.*loggedin/, done);
            //    });
            //});
            //describe("init",function(){
            //    var loginPlusM = new loginPlus.Manager;
            //    it("reject init if the path for login.jade does not exists",function(done){
            //        var app = express();
            //        loginPlusM.init(app,{unloggedPath:'unexisting-path' }).then(function(){
            //            done("an error expected");
            //        },function(err){
            //            done();
            //        });
            //    });
            //    it("reject init if login.jade does not exists",function(done){
            //        var app = express();
            //        loginPlusM.init(app,{fileNameLogin:'unexisting-file' }).then(function(){
            //            done("an error expected");
            //        },function(err){
            //            done();
            //        });
            //    });
            //    it("serve the internal files",function(done){
            //        createServerGetAgent(opt.param==null?null:{baseUrl:opt.base}).then(function(agent){ 
            //            return agent
            //            .get(opt.base+'/auto-login.js')
            //            .expect(200, /^"use strict";/);
            //        }).then(done.bind(null,null),done);
            //    });
            //    it("serve the default login page",function(done){
            //        createServerGetAgent(opt.param==null?null:{baseUrl:opt.base}).then(function(agent){ 
            //            return agent
            //            .get(opt.base+'/login')
            //            .expect(200, /label.*Username/)
            //            .expect(200, /name="username"/)
            //            .expect(200, /id="password".*name="password"/);
            //        }).then(done.bind(null,null),done);
            //    });
            //    it("serve the parametrized default login page",function(done){
            //        var loginForm=changing(loginPlus.spanishLoginForm,{formImg:'this.png'});
            //        createServerGetAgent({baseUrl:opt.base, loginForm}).then(function(agent){ 
            //            return agent
            //            .get(opt.base+'/login')
            //            .expect(200, /usuario.*name="username"/);
            //        }).then(done.bind(null,null),done);
            //    });
            //});
            //describe('logged in php session', function(){
            //    var agent;
            //    before(function (done) {
            //        createServerGetAgent({
            //            baseUrl:opt.base, 
            //            loginPageServe:simpleLoginPageServe,
            //            php:{
            //                varLogged:'abcd_usu_nombre',
            //                save_path:'./test/temp-session'
            //            }
            //        }).then(function(_agent){ 
            //            agent=_agent; 
            //        }).then(done,done);
            //    });
            //    it('must reject if php session is not active', function(done){
            //        agent
            //        .get(opt.base+'/private/data')
            //        .expect('location', opt.base+'/login')
            //        .expect(302, /Redirecting to \/((doble\/)?base\/)?login/, done);
            //    });
            //    it('must set cookie for test', function(done){
            //        agent
            //        .get(opt.base+'/php-set-cookie')
            //        .expect('set-cookie',/PHPSESSID=oek1/)
            //        .expect('ok', done);
            //    });
            //    it.skip('must serve if php session', function(done){
            //        agent
            //        .get(opt.base+'/private/data')
            //        .expect('private: data',done);
            //    });
            //});
            describe("jsonb", function(){
                it("read jsonb in a where", function(){
                    var idj={tres:'cuatro', uno:'dos'}
                    return be.inDbClient({},function(client){
                        return client.query("select data, idj, idn from conjson where idj = $1",[idj])
                        .fetchAll().then(function(result){
                            expect(result.rows).to.eql([
                                {data:'1 2 3 4', idj:idj, idn:1}
                            ])
                        });
                    });
                });
            });
        });
    });
    //describe("warnings", function(){
    //    it("warn deprecated use of module", function(){
    //        sinon.stub(console, "log");
    //        expect(function(){
    //            loginPlus.init();
    //        }).to.throwError(/deprecated/);
    //        try{
    //            expect(console.log.args).to.eql([
    //                [ 'deprecated loginPlus.init is now replaced with new (loginPlus.Manager).init' ]
    //            ]);
    //        }finally{
    //            console.log.restore();
    //        };
    //    });
    //    it("warn alert missuse of parentesis creating object", function(){
    //        sinon.stub(console, "log");
    //        expect(function(){
    //            loginPlus.Manager.init();
    //        }).to.throwError(/lack.* outer.*parent/);
    //        try{
    //            expect(console.log.args).to.eql([
    //                [ "lack outer parenthesis in: var loginPlus = new (require('login-plus').Manager);" ]
    //            ]);
    //        }finally{
    //            console.log.restore();
    //        };
    //    });
    //});
});

var INTERNAL_PORT=34444;

function createServerGetAgent(opts) {
    var appStarted = require('./simple-backend.js')(opts);
    return appStarted;
}
