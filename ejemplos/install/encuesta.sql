-- DROP TABLE bep.datos;

CREATE TYPE bep.estados as enum ('vacio','pendiente','ingresado');

CREATE TABLE bep.datos(
  id jsonb primary key,
  contenido jsonb,
  estado bep.estados default 'vacio',
  modif timestamp default current_timestamp,
  modiu text default user
);
ALTER TABLE bep.datos 
  OWNER TO beplus_example_user;

/*
insert into bep.datos (id, contenido) 
  values ('{"id":4}', '{"v1": "a"}');

select * from bep.datos;

alter type bep.estados add value 'cerrado';

insert into bep.datos (id, contenido) values ('{"id":5}', '{"v1": "b"}');
insert into bep.datos (id, contenido) values ('{"id":6, "for":"TRAC"}', '{"v1": "b", "v2":"a"}');

update bep.datos set estado='cerrado' where id='{"id":5}';
update bep.datos set estado='pendiente' where id='{"id":6, "for":"TRAC"}';

select * from bep.datos order by id;
select * from bep.datos order by estado;

*/