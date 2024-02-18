create or replace function get_app_user() returns text
  stable language sql
as
$sql$
  select split_part(current_setting('application_name'),' ',1);
$sql$;
