create or replace function get_app_user(p_var text default 'user') returns text
  stable language sql
as
$sql$
  select current_setting('backend_plus._' || p_var);
$sql$;
