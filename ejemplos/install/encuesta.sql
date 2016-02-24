-- DROP TABLE bep.datos;

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