set role to "test_user";
drop schema if exists "tst4" cascade;
create schema "tst4";
grant usage on schema "tst4" to "test_user";
set search_path = "tst4";


--prepare.sql-- no prepare.sql


create table "bitacora" (
  "id" integer NOT NULL, 
  "procedure_name" text NOT NULL, 
  "parameters_definition" text NOT NULL, 
  "parameters" text NOT NULL, 
  "username" text NOT NULL, 
  "machine_id" text NOT NULL, 
  "navigator" text NOT NULL, 
  "init_date" timestamp NOT NULL, 
  "end_date" timestamp, 
  "has_error" boolean, 
  "end_status" text
, primary key ("id")
);
grant select on "bitacora" to "test_user";


CREATE SEQUENCE "secuencia_bitacora" START 1;
ALTER TABLE "bitacora" ALTER COLUMN "id" SET DEFAULT nextval('secuencia_bitacora'::regclass);
GRANT USAGE, SELECT ON SEQUENCE "secuencia_bitacora" TO "test_user";

create table "users" (
  "username" text NOT NULL, 
  "md5pass" text, 
  "active_until" date, 
  "locked_since" date, 
  "rol" text
, primary key ("username")
);
grant select, insert, update, delete on "users" to "test_user";



create table "simple" (
  "simple_code" text, 
  "simple_name" text
, primary key ("simple_code")
);
grant select, insert, update, delete on "simple" to "test_user";


CREATE SEQUENCE "simpe_seq" START 3;
ALTER TABLE "simple" ALTER COLUMN "simple_code" SET DEFAULT nextval('simpe_seq'::regclass);
GRANT USAGE, SELECT ON SEQUENCE "simpe_seq" TO "test_user";

create table "with_fk" (
  "simple_code" text, 
  "wf_code" text, 
  "wf_name" text
, primary key ("simple_code", "wf_code")
);
grant select, insert, update, delete on "with_fk" to "test_user";




-- pre-ADAPTs
-- no pre-adapt.sql




-- DATA
insert into "users" ("username", "md5pass", "active_until", "locked_since", "rol") values
('bob', '6bdb73cceeff578319840176854246e5', '2099-01-01', '2099-01-01', 'admin');

insert into "simple" ("simple_code", "simple_name") values
('1', 'one'),
('2', 'the second');


-- ADAPTs
-- no adapt.sql


-- conss
-- FKs
alter table "with_fk" add constraint  "with_fk simple REL " foreign key ("simple_code") references "simple" ("simple_code")  on update cascade;

