create user beplus_example_user password 'beplus_example_3948812bdz';
create database beplus_example_db owner beplus_example_user;
\c beplus_example_db
drop schema if exists bep cascade;
create schema bep authorization beplus_example_user;
grant all on schema bep to beplus_example_user;

create table bep.users(
  username text primary key,
  md5pass text,
  rol text
);
alter table bep."users" owner to beplus_example_user;

insert into bep.users values ('tester', md5('1234tester'), 'test');
