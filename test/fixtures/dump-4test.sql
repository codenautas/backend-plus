set role to "test_user";
drop schema if exists "tst4" cascade;
create schema "tst4";
grant usage on schema "tst4" to "test_user";
set search_path = "tst4";
set client_encoding = 'UTF8';


--prepare.sql
-- no prepare.sql


create table "bitacora" (
  "id" integer, 
  "procedure_name" text, 
  "parameters_definition" text, 
  "parameters" text, 
  "username" text, 
  "machine_id" text, 
  "navigator" text, 
  "init_date" timestamp, 
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
  "username" text, 
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
set search_path = tst4;

select setseed(0.123456789);

insert into with_fk (simple_code,wf_code,wf_name) values ('2','A','único elemento');

insert into with_fk (simple_code,wf_code,wf_name) 
  select 1, num, 
         case round(random()::decimal*7,0) 
           when 1 then 'Hacer'
           when 2 then 'Controlar'
           when 3 then 'Verificar'
           when 4 then 'Obtener'
           when 5 then 'Suministrar'
           when 6 then 'Revisar'
           else 'Realizar'
         end || ' ' || case round(random()::decimal*8,0) 
           when 1 then 'el procedimiento'
           when 2 then 'la serie de taeras'
           when 3 then 'el plan'
           when 4 then 'la lista'
           when 5 then 'la planificación'
           when 6 then 'la secuencia'
           else 'el objetivo'
         end || ' ' || case round(random()::decimal*9,0) 
           when 1 then 'número '||num
           when 2 then 'N '||num
           when 3 then '#'||num
           when 4 then to_char(num,'RM')
           when 5 then 'N° '||num
           else num::text
         end
    from generate_series(1,9000) num;


-- conss
alter table "bitacora" alter column "id" set not null;
alter table "bitacora" alter column "procedure_name" set not null;
alter table "bitacora" alter column "parameters_definition" set not null;
alter table "bitacora" alter column "parameters" set not null;
alter table "bitacora" alter column "username" set not null;
alter table "bitacora" alter column "machine_id" set not null;
alter table "bitacora" alter column "navigator" set not null;
alter table "bitacora" alter column "init_date" set not null;
alter table "users" alter column "username" set not null;-- FKs
alter table "with_fk" add constraint  "with_fk simple REL" foreign key ("simple_code") references "simple" ("simple_code")  on update cascade;

