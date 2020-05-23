const staticConfigYaml=`
server:
  port: 3333
  session-store: false
db:
  motor: postgresql
  host: localhost
  database: test_db
  schema: tst4
  user: test_user
install:
  dump:
    skip-content: true
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
    x-chPassUrlPath: false
    loginForm:
      formTitle: example for test
      formImg: unlogged/tables-lock.png
client-setup:
  cursors: true
  menu: true
  title: app for test
logo: 
  path: client/img
test:
  view-chrome: false
`;

module.exports = staticConfigYaml;