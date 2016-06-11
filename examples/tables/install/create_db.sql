create user beplus_example_user password 'beplus_example_3948812bdz';
create database beplus_example_db owner beplus_example_user;
\c beplus_example_db

drop schema if exists ext cascade;
create schema ext authorization beplus_example_user;
grant all on schema ext to beplus_example_user;

create table ext.users(
  username text primary key,
  md5pass text,
  rol text
);
alter table ext."users" owner to beplus_example_user;

insert into ext."users" (username, md5pass, rol)
  values ('bob', md5('bobpass'||'bob'), 'boss');

create table ext.pgroups(
  "group" text primary key,
  "class" text not null
);
alter table ext.pgroups owner to beplus_example_user;
insert into ext.pgroups("group", "class") values
  ('Metalloids', 'Metalloids'),
  ('Other nonmetals', 'Nonmetals'),
  ('Halogens', 'Nonmetals'),
  ('Noble gases', 'Nonmetals'),
  ('Alkali metals', 'Metals'),
  ('Alkaline earth metals', 'Metals'),
  ('Lanthanoids', 'Metals'),
  ('Transition metals', 'Metals'),
  ('Post-transition metals', 'Metals');

create table ext.ptable(
  atomic_number        integer primary key,
  symbol               char(4) unique,
  name                 text not null,
  weight               numeric,
  "group"              text,
  discovered_date      date,
  discobered_precision text,
  bigbang              boolean
);
alter table ext.ptable owner to beplus_example_user;

insert into ext.ptable(
  atomic_number
  ,symbol       
  ,name         
  ,weight       
  ,"group"
  ,discovered_date
  ,discobered_precision
  ,bigbang
) values 
( 1, 'H' , 'Hydrogen' , 1.008      , 'Other nonmetals'      , '1766-01-01', 'year'   , true ),
( 2, 'He', 'Helium'   , 4.002602   , 'Noble gases'          , '1895-03-26', 'day'    , true ),
( 3, 'Li', 'Lithium'  , 6.942      , 'Alkali metals'        , '1817-01-01', 'year'   , true ),
( 4, 'Be', 'Beryllium', 9.01218313 , 'Alkaliny earth metals', '1797-01-01', 'year'   , false),
( 5, 'B' , 'Boron'    ,10.81       , 'Metalloids'           , '1766-01-01', 'year'   , false),
( 6, 'C' , 'Carbon'   ,12.011      , 'Nonmetal'             , null        , 'unknown', false),
( 7, 'N' , 'Nitrogen' ,14.007      , 'Nonmetal'             , '1772-01-01', 'year'   , false),
( 8, 'O' , 'Oxygen'   ,15.999      , 'Nonmetal'             , '1774-01-01', 'year'   , false),
( 9, 'F' , 'Fluorine' ,18.998403163, 'Halogen'              , '1886-06-26', 'year'   , false),
(10, 'Ne', 'Neon'     ,20.1797     , 'Noble'                , '1898-06-26', 'year'   , false);

create table ext."parameters"(
  only_one_record boolean not null primary key,
  full_log boolean not null default true,
  constraint only_one_record check (only_one_record is true)
);
alter table ext."parameters" owner to beplus_example_user;

insert into ext."parameters"(only_one_record) values (true);

