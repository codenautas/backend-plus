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
                        return be.getDbClient();
                    }).then(function(client){
                        return client.executeSqlScript('./test/populate_db.sql');
                    }).then(function(){
                        agent=request.agent(be.getMainApp());
                    }).then(done,done);
                });
                after(async function(){
                    console.log('cerrando el backend',i);
                    await be.shootDownBackend();
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
                    .expect('location', 'login')
                    .expect(302, /Redirecting to login/, done);
                });
                it('must get login page when not logged in', function(done){
                    agent
                    .get(opt.base+'/login')
                    .expect(200, /username.*password/, done);
                });
                //it('must redirect to root if not logged in', function(done){
                //    agent
                //    .get(opt.base+'/this/and/this/algo.txt')
                //    .expect('location', opt.base+'/login')
                //    .expect(302, /Redirecting to \/((doble\/)?base\/)?login/, done);
                //});
                //if(!opt.root){
                //    it('must fail outside the base', function(done){
                //        agent
                //        .get('/algo.txt')
                //        .expect(function(rec){
                //            if(rec.status!=404){
                //                console.log('***************')
                //                console.log(rec);
                //            }
                //        })
                //        .expect(404, done);
                //    });
                //};
            //    var agent;
            //    before(function (done) {
            //        createServerGetAgent({baseUrl:opt.base, loginPageServe:simpleLoginPageServe, userFieldName:'userFieldName'}).then(function(_agent){ 
            //            agent=_agent; 
            //        }).then(done,done);
            //    });
                it('must receive login parameters', function(done){
                    agent
                    .post(opt.base+'/login')
                    .type('form')
                    .send({username:'prueba', password:'prueba1'})
                    .expect(302, /Redirecting to \.\/menu/, done);
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
                        it(nameIt, function(done){
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
                                if(res.error && !fixture.expectedError){
                                    console.log("ERROR IN FIXTURE");
                                    console.log(res.error);
                                    console.log(res.error.stack);
                                    throw new Error("unexpected error");
                                }
                                if(!res.error && fixture.expectedError){
                                    console.log("EXPECTED ERROR BUT NOT");
                                    console.log(fixture.expectedError);
                                    throw new Error("EXPECTED ERROR BUT NOT");
                                }
                                if(res.error && fixture.expectedError){
                                    expect(res.error.message).to.match(fixture.expectedError);
                                }else{
                                    result=myOwn.encoders[procedureDef.encoding].parse(res.text);
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
                            .expect(200,done);
                        });
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
                    var idj={uno:'dos', tres:'cuatro'}
                    return be.getDbClient().then(function(client){
                        return client.query("select data, idj, idn from conjson where idj = $1",[idj]).execute();
                    }).then(function(result){
                        expect(result.rows).to.eql([
                            {data:'1,2,3,4', idj:idj, idn:1}
                        ])
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
    /////////////////////////
    return new Promise(function(resolve, reject){
        var app = express();
        app.use(cookieParser());
        var concat = require('concat-stream');
        app.use(bodyParser.urlencoded({extended:true}));
        if("show raw body"){
            app.use(function(req, res, next){
              req.pipe(concat(function(data){
                req.bodyRaw = data.toString();
                next();
              }));
            });
        }
        var opts2 = opts||{};
        opts2.baseUrl = opts2.baseUrl||'';
        app.get(opts2.baseUrl+'/php-set-cookie', function(req,res){
            res.cookie('PHPSESSID', 'oek1ort6vbqdd7374eft6adv61');
            res.end('ok');
        });
        // loginPlus.logAll=true;
        loginPlusManager.init(app,opts);
        loginPlusManager.setValidatorStrategy(function(req, username, password, done){
            // console.log('********* intento de entrar de ',username,password);
            if(username=='prueba' && password=='prueba1'){
                if(opts2.userFieldName){
                    done(null, {userFieldName: 'prueba', userData: 'data-user'});
                }else{
                    done(null, {username: 'user'});
                }
            }else{
                done('user not found in this test.');
            }
        });
        app.get(opts2.baseUrl+'/private/:id',function(req,res){
            res.end('private: '+req.params.id);
        });
        app.get(opts2.baseUrl+'/whoami',function(req,res){
            res.end('I am: '+JSON.stringify(req.user));
        });
        var server = app.listen(INTERNAL_PORT++,function(){
            // resolve(server);
            resolve(request.agent(server));
        });
    });
}
