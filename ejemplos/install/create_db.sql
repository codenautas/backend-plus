create user beplus_example_user password 'beplus_example_3948812bdz';
create database beplus_example_db owner beplus_example_user;
\c beplus_example_db

drop schema if exists bep cascade;
create schema bep authorization beplus_example_user;
grant all on schema bep to beplus_example_user;

create table bep.users(
  username text primary key,
  md5pass text,
  rol text,
  iddato jsonb
);
alter table bep."users" owner to beplus_example_user;

insert into bep.users values ('tester', md5('1234tester'), 'test');

CREATE TYPE bep.estados as enum ('vacio','pendiente','ingresado');
ALTER type bep.estados OWNER TO beplus_example_user;

CREATE TABLE bep.datos(
  id jsonb primary key,
  contenido jsonb,
  estado bep.estados default 'vacio',
  modif timestamp default current_timestamp,
  modiu text default user
);
ALTER TABLE bep.datos 
  OWNER TO beplus_example_user;

  
insert into bep.users values ('test1',md5('1test1'),'test','{"enc":1,"for":"TRAC"}');
insert into bep.users values ('test2',md5('1test2'),'test','{"enc":2,"for":"TRAC"}');
insert into bep.users values ('test3',md5('1test3'),'test','{"enc":3,"for":"TRAC"}');
insert into bep.users values ('test4',md5('1test4'),'test','{"enc":4,"for":"TRAC"}');
insert into bep.users values ('test5',md5('1test5'),'test','{"enc":5,"for":"TRAC"}');
insert into bep.users values ('test6',md5('1test6'),'test','{"enc":6,"for":"TRAC"}');
insert into bep.users values ('test7',md5('1test7'),'test','{"enc":7,"for":"TRAC"}');
insert into bep.users values ('test8',md5('1test8'),'test','{"enc":8,"for":"TRAC"}');
insert into bep.users values ('test9',md5('1test9'),'test','{"enc":9,"for":"TRAC"}');
insert into bep.users values ('test10',md5('1test10'),'test','{"enc":10,"for":"TRAC"}');
insert into bep.users values ('test11',md5('1test11'),'test','{"enc":11,"for":"TRAC"}');
insert into bep.users values ('test12',md5('1test12'),'test','{"enc":12,"for":"TRAC"}');
insert into bep.users values ('test13',md5('1test13'),'test','{"enc":13,"for":"TRAC"}');
insert into bep.users values ('test14',md5('1test14'),'test','{"enc":14,"for":"TRAC"}');
insert into bep.users values ('test15',md5('1test15'),'test','{"enc":15,"for":"TRAC"}');
insert into bep.users values ('test16',md5('1test16'),'test','{"enc":16,"for":"TRAC"}');
insert into bep.users values ('test17',md5('1test17'),'test','{"enc":17,"for":"TRAC"}');
insert into bep.users values ('test18',md5('1test18'),'test','{"enc":18,"for":"TRAC"}');
insert into bep.users values ('test19',md5('1test19'),'test','{"enc":19,"for":"TRAC"}');
insert into bep.users values ('test20',md5('1test20'),'test','{"enc":20,"for":"TRAC"}');
