drop schema if exists tst cascade;

create schema tst authorization test_user;
grant all on schema tst to test_user;

set search_path = tst;

create table tst."users"(
  username text primary key,
  md5pass text,
  active boolean default true,
  locked boolean default false,
  rol text
);
alter table tst."users" owner to test_user;

insert into tst."users" (username, md5pass) values
  ('prueba', md5('prueba1prueba'));
  
create table tst."table 1"(
  id1      bigint primary key,
  "Text 1" text,
  double1  double precision,
  date1    date,
  numeric1 numeric
);
alter table tst."table 1" owner to test_user;

create table employees(
  id_type     text   ,
  id          integer,
  first_name  text,
  last_name   text,
  birth_date  date   ,
  salary      numeric,
  primary key (id_type, id)
);  
alter table tst.employees owner to test_user;

insert into employees(id_type, id, first_name, last_name)
  values ('card', 654213, 'Mary', 'Gomez')
    ('card', 123456, 'Bob', 'Smith')