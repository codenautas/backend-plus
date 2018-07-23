"use strict";

var Path = require('path');
var backendPlus = require("../../..");
var MiniTools = require('mini-tools');

var changing = require('best-globals').changing;

class AppExample extends backendPlus.AppBackend{
    constructor(){
        super();
        this.internalData={
            filterAtomicNumberForIsotopes:3
        }
        this.setStaticConfig(`
server:
  port: 3033
  kill-9:
    pid: 1234
  skins:
    "":
      local-path: client/
    confort:
      local-path: node_modules/backend-skins/dist/
    confort-bis:
      local-path: node_modules/backend-skins/dist/
    confort-dark:
      local-path: node_modules/backend-skins/dist/
db:
  motor: postgresql
  host: localhost
  database: beplus_example_db
  schema: ext
  user: beplus_example_user
login:
  table: users
  userFieldName: username
  passFieldName: md5pass
  rolFieldName: rol
  infoFieldList: [username, rol]
  activeClausule: current_timestamp<=active_until
  lockedClausule: current_timestamp>=locked_since
  plus:
    allowHttpLogin: true
    chPassUrlPath: false
    loginForm:
      formTitle: example tables
      formImg: unlogged/tables-lock.png
    x-loginPagePath: false
install:
  dump:
    scripts:
      post-adapt: 
      - ../examples/tables/install/data_db.sql
    skip-content: true
client-setup:
  cursors: true
  skin: confort-dark
  formTitle: example-tables
  menu: true
  title: periodic table
logo: 
  path: client/img        
`)
    }
    get rootPath(){ return Path.resolve(__dirname,'..'); }
    addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        this.app.get('/echo', function(req,res){
            res.end('echo');
        });
    }
    getProcedures(){
        var be = this;
        return super.getProcedures().then(function(procedures){
            return procedures.concat(
                require('./procedures-examples.js').map(be.procedureDefCompleter, be)
            );
        });
    }
    getMenu(context){
        return {menu:[
            {menuType:'menu', name:'periodic table', menuContent:[
                {menuType:'table', name:'ptable'  , label:'elements'},
                {menuType:'table', name:'pgroups' , label:'groups'  },
                {menuType:'table', name:'isotopes', label:'isotopes'},
                {menuType:'table', name:'new_element', label:'new element'},
                {menuType:'table', name:'new_isotopes', label:'new isotopes'},
                {menuType:'proc' , name:'count/without-isotopes', label:'count'},
            ]},
            {menuType:'table', name:'images', table:'element_images'},
            {menuType:'menu', name:'test', menuContent:[
                {menuType:'table', name:'bigint'},
                {menuType:'proc', name:'example/date'},
				{menuType:'table', table:'ptable', name:'ptable-actinide' , label:'actinide elements' , ff:{group:'Actinide' }},
				{menuType:'table', table:'ptable', name:'ptable-metalloid', label:'metalloid elements', ff:{group:'Metalloid'}, showParams:["ff"], selectedByDefault:true, directUrl:true}
            ]},
            {menuType:'menu', name:'bitacora', menuContent:[
                {menuType:'table', name:'bitacora'},
                {menuType:'proc' , name:'bitacora/prueba', label:'prueba bitacora'},
                {menuType:'proc' , name:'bitacora/prueba-error', label:'prueba bitacora c/error'}
            ]},
            {menuType:'menu', name:'config', menuContent:[
                {name:'users', menuType:'table'},
            ]},
        ]}
    }
    getTables(){
        return super.getTables().concat([
            'users',
            {name:'pgroups', fileName:'groups'},
            'ptable',
            'isotopes',
            'element_images',
            'cursors',
            'bigint',
            'new_element',
            'new_isotopes',
            'other_fields',
        ]);
    }
}

new AppExample().start();