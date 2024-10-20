create or replace function semver_to_decimal(p_semver text) returns decimal
  stable language sql
as
$sql$
  select regexp_replace(p_semver, '^(\d+(\.\d*)?)(\D.*|$)$','\1')::decimal;
$sql$;

select *, semver_to_decimal(semver), 'ERROR semver_to_decimal!!!!!!!!!!!!!'
  from (select '12.3.4' semver, 12.3 result
    union values ('12', 12),('12.3',12.3),('12.3.3-r12',12.3),('12b',12)
  )
  where semver_to_decimal(semver) is distinct from result;