create user beplus_example_user password 'beplus_example_3948812bdz';
create database beplus_example_db owner beplus_example_user;
\c beplus_example_db

drop schema if exists fic cascade;
create schema fic authorization beplus_example_user;
grant all on schema fic to beplus_example_user;

set search_path = fic;

create table fic.users(
  username text primary key,
  md5pass text,
  active_until date not null,
  locked_since date,
  rol text check (rol in ('user','admin'))
);
alter table fic."users" owner to beplus_example_user;

insert into fic."users" (username, md5pass, rol, active_until)
  values ('bob', md5('bobpass'||'bob'), 'admin', '2099-12-31');

insert into fic."users" (username, md5pass, rol, active_until)
  values ('died', md5('diedpass'||'died'), 'user', '1999-12-31');

insert into fic."users" (username, md5pass, rol, active_until,locked_since)
  values ('locked', md5('lockedpass'||'locked'), 'user', '2999-12-31','2016-07-02');

insert into fic."users" (username, md5pass, rol, active_until)
  values ('mat', md5('matpass'||'mat'), 'user', '2099-12-31');

create table fichas(
autor          text       ,
fichanro       integer    primary key,
titulo         text       ,
annio          numeric    ,
medida1        numeric    ,
medida2        numeric    ,
medida3        numeric    ,
tecnica        text       ,
ubicación      text       ,
propietario    text       ,
publicado      boolean    ,
enmarcado      text       ,
imagenadelante text       ,
imagenatras    text       ,
observaciones  text       ,
costo          numeric    ,
notas          text    
);
alter table fichas owner to beplus_example_user;

create table publicaciones(
  fichanro integer references fichas (fichanro),
  dondepublicado text,
  primary key (fichanro, dondepublicado)
);
alter table publicaciones owner to beplus_example_user;