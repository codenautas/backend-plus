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
