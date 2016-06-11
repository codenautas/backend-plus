drop schema if exists ext cascade;
create schema ext AUTHORIZATION beplus_example_user;

GRANT ALL ON SCHEMA ext TO beplus_example_user;

set search_path = ext;

create table ptable(
atomic_number        integer primary key, 
symbol               text not null,
name                 text,
weight               numeric,
"group"              text, 
discovered_date      date,
discovered_precision text,
bigbang              boolean
);
alter table "ptable" owner to beplus_example_user;

insert into ptable(atomic_number, symbol) values
(1, 'H' ),
(2, 'He'),
(3, 'Li'),
(4, 'Be'),
(5, 'B' ),
(6, 'C' ),
(7, 'N' ),
(8, 'O' ),
(9, 'Fl'),
(10,'He');

create table "users"(
  username text primary key,
  md5pass text,
  rol text,
  iddato jsonb
);
alter table "users" owner to beplus_example_user;

insert into "users" (username, md5pass, rol) values ('bob', md5('bobpassbob'), 'boss');
