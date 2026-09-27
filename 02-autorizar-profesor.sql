-- Primero crea tu usuario en Authentication > Users > Add user > Create new user.
-- Sustituye el correo del ejemplo por el de ESE usuario y ejecuta este archivo.
-- No uses aquí la contraseña de la base de datos.
do $$
declare teacher uuid;
begin
 select id into teacher from auth.users where lower(email)=lower('TU_CORREO_AQUI');
 if teacher is null then raise exception 'No se encontró ese correo. Crea primero el usuario en Authentication > Users y cambia TU_CORREO_AQUI.';end if;
 insert into aq_private.teachers(user_id) values(teacher) on conflict do nothing;
end $$;
