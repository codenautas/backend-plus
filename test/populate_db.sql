drop schema if exists tst cascade;

create schema tst authorization test_user;
grant all on schema tst to test_user;

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