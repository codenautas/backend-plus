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

  
insert into bep.users 
  select 'ejemplo'||n, md5(n||'ejemplo'||n), 'test', ('{"enc":'||n||',"for":"EJEMPLO"}')::jsonb
    from generate_series(1,200) n;

insert into bep.users 
  select 'trac'||n, md5(n||'trac'||n), 'test', ('{"enc":'||n||',"for":"TRAC"}')::jsonb
    from generate_series(1,200) n;
