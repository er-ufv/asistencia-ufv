-- AsistenciaQR · Ejecutar completo en SQL Editor de un proyecto Supabase nuevo.
-- Puede repetirse: no elimina datos existentes. Funciones API con permisos explícitos.
begin;
create schema if not exists aq_private;
revoke all on schema aq_private from public, anon, authenticated;

create table if not exists aq_private.teachers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists aq_private.groups (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  name text not null check(length(name) between 1 and 100), timezone text not null default 'Europe/Madrid',
  token text not null unique default replace(gen_random_uuid()::text,'-',''),
  expires_at timestamptz not null default now(), unique(owner_id,name)
);
create table if not exists aq_private.students (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references aq_private.groups(id),
  external_id text not null check(length(external_id) between 1 and 100),
  first text not null check(length(first) between 1 and 100), last text not null check(length(last) between 1 and 100),
  code_hash text not null, unique(group_id,external_id)
);
create table if not exists aq_private.sessions (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references aq_private.groups(id),
  label text not null check(length(label) between 1 and 100), class_date date not null,
  opened_at timestamptz not null default now(), closes_at timestamptz not null, closed_at timestamptz
);
create index if not exists aq_sessions_group_date on aq_private.sessions(group_id,class_date desc,opened_at desc);
create table if not exists aq_private.members (
  session_id uuid not null references aq_private.sessions(id),student_id uuid not null references aq_private.students(id),
  external_id text not null, first text not null,last text not null,
  present boolean not null default false, registered_at timestamptz, source text check(source in ('alumno','profesor')),
  primary key(session_id,student_id)
);
create table if not exists aq_private.attempts (
  group_id uuid not null references aq_private.groups(id), key text not null,
  started_at timestamptz not null default now(), count integer not null default 1,
  primary key(group_id,key)
);
create table if not exists aq_private.corrections (
  id bigint generated always as identity primary key,session_id uuid not null,student_id uuid not null,
  teacher_id uuid not null, previous_present boolean not null,new_present boolean not null,changed_at timestamptz not null default now()
);
-- Actualización UFV: datos académicos opcionales; no se inventa matrícula para registros anteriores.
alter table aq_private.students add column if not exists numero_matricula integer check(numero_matricula between 1 and 20);
alter table aq_private.students add column if not exists curso integer check(curso between 1 and 10);
alter table aq_private.students add column if not exists codigo_asignatura text check(length(codigo_asignatura)<=100);
alter table aq_private.students add column if not exists asignatura text check(length(asignatura)<=150);
alter table aq_private.members add column if not exists numero_matricula integer check(numero_matricula between 1 and 20);
alter table aq_private.members add column if not exists curso integer check(curso between 1 and 10);
alter table aq_private.members add column if not exists codigo_asignatura text check(length(codigo_asignatura)<=100);
alter table aq_private.members add column if not exists asignatura text check(length(asignatura)<=150);
alter table aq_private.teachers enable row level security;
alter table aq_private.groups enable row level security;
alter table aq_private.students enable row level security;
alter table aq_private.sessions enable row level security;
alter table aq_private.members enable row level security;
alter table aq_private.attempts enable row level security;
alter table aq_private.corrections enable row level security;
revoke all on all tables in schema aq_private from public,anon,authenticated;
revoke all on all sequences in schema aq_private from public,anon,authenticated;

create or replace function aq_private.norm(v text) returns text
language sql immutable set search_path='' as $$
 select lower(regexp_replace(trim(regexp_replace(normalize(coalesce(v,''),NFD),U&'[\0300-\036f]','','g')),'\s+',' ','g'));
$$;
create or replace function aq_private.code_hash(g uuid, c text) returns text
language sql immutable set search_path='' as $$
 select encode(sha256(convert_to(g::text||':'||upper(regexp_replace(c,'[\s-]','','g')),'UTF8')),'hex');
$$;
create or replace function aq_private.roll_week(g uuid) returns void
language sql set search_path='' as $$
 update aq_private.groups set token=replace(gen_random_uuid()::text,'-',''),
 expires_at=(date_trunc('week',now() at time zone timezone)+interval '1 week') at time zone timezone
 where id=g and expires_at<=now();
$$;

-- Todas las acciones de profesor comprueban una cuenta autorizada y la propiedad del grupo.
create or replace function public.aq_admin(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); g aq_private.groups; s aq_private.sessions; st aq_private.students;
 r jsonb; v_code text; codes jsonb:='[]'; gid uuid; sid uuid; tz text; n integer; nm text;
 before_value boolean; result jsonb;
begin
 if uid is null or not exists(select 1 from aq_private.teachers t where t.user_id=uid) then
   raise exception 'Esta cuenta no está autorizada como profesor.' using errcode='42501';
 end if;
 if action='dashboard' then
   for gid in select x.id from aq_private.groups x where x.owner_id=uid loop perform aq_private.roll_week(gid); end loop;
   return jsonb_build_object(
    'groups',coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id,name,timezone,token,expires_at from aq_private.groups where owner_id=uid) x),'[]'::jsonb),
    'students',coalesce((select jsonb_agg(to_jsonb(x) order by x.last,x.first) from (select t.id,t.group_id,t.external_id,t.first,t.last,t.numero_matricula,t.curso,t.codigo_asignatura,t.asignatura from aq_private.students t join aq_private.groups gg on gg.id=t.group_id where gg.owner_id=uid) x),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(to_jsonb(x) order by x.opened_at desc) from (select ss.* from aq_private.sessions ss join aq_private.groups gg on gg.id=ss.group_id where gg.owner_id=uid order by ss.opened_at desc limit 300) x),'[]'::jsonb));
 end if;
 if action='create_group' then
   nm:=trim(payload->>'name');tz:=coalesce(payload->>'timezone','Europe/Madrid');
   if nm is null or length(nm) not between 1 and 100 then raise exception 'Escribe un nombre de grupo.';end if;
   if not exists(select 1 from pg_timezone_names where name=tz) then raise exception 'Zona horaria no válida.';end if;
   if exists(select 1 from aq_private.groups where owner_id=uid and aq_private.norm(name)=aq_private.norm(nm)) then raise exception 'Ya existe un grupo con ese nombre.';end if;
   insert into aq_private.groups(owner_id,name,timezone) values(uid,nm,tz) returning id into gid;
   perform aq_private.roll_week(gid);return jsonb_build_object('ok',true);
 end if;
 if action='import' then
   if jsonb_typeof(payload->'rows') is distinct from 'array' then raise exception 'Se necesita una lista de alumnos.';end if;
   n:=jsonb_array_length(payload->'rows');if n not between 1 and 500 then raise exception 'Importa entre 1 y 500 alumnos.';end if;
   tz:=coalesce(payload->>'timezone','Europe/Madrid');
   if not exists(select 1 from pg_timezone_names where name=tz) then raise exception 'Zona horaria no válida.';end if;
   -- Una sola transacción: un error de fila no deja una importación parcial.
   for r in select value from jsonb_array_elements(payload->'rows') loop
     if coalesce(length(trim(r->>'identificador')),0) not between 1 and 100 or coalesce(length(trim(r->>'nombre')),0) not between 1 and 100 or coalesce(length(trim(r->>'apellidos')),0) not between 1 and 100 or coalesce(length(trim(r->>'grupo')),0) not between 1 and 100 then raise exception 'Hay una fila incompleta o demasiado larga.';end if;
     if nullif(trim(r->>'numero_matricula'),'') is not null then
       if (r->>'numero_matricula') !~ '^[1-9][0-9]?$' or (r->>'numero_matricula')::int not between 1 and 20 then raise exception 'Número de matrícula no válido: usa un entero entre 1 y 20.';end if;
     end if;
     if nullif(trim(r->>'curso'),'') is not null then
       if (r->>'curso') !~ '^[1-9][0-9]?$' or (r->>'curso')::int not between 1 and 10 then raise exception 'Curso no válido: usa un entero entre 1 y 10.';end if;
     end if;
     if length(coalesce(r->>'codigo_asignatura',''))>100 or length(coalesce(r->>'asignatura',''))>150 then raise exception 'El texto de asignatura es demasiado largo.';end if;
     select * into g from aq_private.groups where owner_id=uid and aq_private.norm(name)=aq_private.norm(r->>'grupo') for update;
     if not found then
       insert into aq_private.groups(owner_id,name,timezone) values(uid,trim(r->>'grupo'),tz) returning * into g;
       perform aq_private.roll_week(g.id);
     end if;
     select * into st from aq_private.students where group_id=g.id and aq_private.norm(external_id)=aq_private.norm(r->>'identificador');
     if found then update aq_private.students set first=trim(r->>'nombre'),last=trim(r->>'apellidos'),
       numero_matricula=coalesce(nullif(trim(r->>'numero_matricula'),'')::int,st.numero_matricula),
       curso=coalesce(nullif(trim(r->>'curso'),'')::int,st.curso),
       codigo_asignatura=coalesce(nullif(trim(r->>'codigo_asignatura'),''),st.codigo_asignatura),
       asignatura=coalesce(nullif(trim(r->>'asignatura'),''),st.asignatura) where id=st.id;
     else
       v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
       insert into aq_private.students(group_id,external_id,first,last,code_hash,numero_matricula,curso,codigo_asignatura,asignatura)
       values(g.id,trim(r->>'identificador'),trim(r->>'nombre'),trim(r->>'apellidos'),aq_private.code_hash(g.id,v_code),
       nullif(trim(r->>'numero_matricula'),'')::int,nullif(trim(r->>'curso'),'')::int,nullif(trim(r->>'codigo_asignatura'),''),nullif(trim(r->>'asignatura'),''));
       codes:=codes||jsonb_build_array(r||jsonb_build_object('codigo',v_code));
     end if;
   end loop;
   return jsonb_build_object('count',n,'codes',codes);
 end if;
 if action in ('open','sessions_date') then
   select * into g from aq_private.groups where id=(payload->>'group_id')::uuid and owner_id=uid for update;
 elsif action='reset_code' then
   select * into st from aq_private.students where id=(payload->>'id')::uuid;
   select * into g from aq_private.groups where id=st.group_id and owner_id=uid for update;
 elsif action in ('report','close','correct') then
   sid:=case when action='correct' then (payload->>'session_id')::uuid else (payload->>'id')::uuid end;
   select * into s from aq_private.sessions where id=sid;
   select * into g from aq_private.groups where id=s.group_id and owner_id=uid for update;
 else raise exception 'Acción desconocida.';
 end if;
 if g.id is null then raise exception 'No tienes acceso a este grupo o registro.' using errcode='42501';end if;
 if action='sessions_date' then
   return coalesce((select jsonb_agg(to_jsonb(ss) order by ss.opened_at desc) from aq_private.sessions ss where ss.group_id=g.id and ss.class_date=(payload->>'date')::date),'[]'::jsonb);
 end if;
 if action='reset_code' then
   v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
   update aq_private.students set code_hash=aq_private.code_hash(g.id,v_code) where id=st.id;
   return jsonb_build_object('code',v_code);
 end if;
 if action='open' then
   n:=(payload->>'minutes')::int;nm:=trim(payload->>'label');
   if n is null or n not in (5,10,15,30) then raise exception 'Elige 5, 10, 15 o 30 minutos.';end if;
   if coalesce(length(nm),0) not between 1 and 100 then raise exception 'Escribe un nombre de sesión.';end if;
   if not exists(select 1 from aq_private.students where group_id=g.id) then raise exception 'Primero importa alumnos en el grupo.';end if;
   perform aq_private.roll_week(g.id);
   update aq_private.sessions set closed_at=now() where group_id=g.id and closed_at is null;
   insert into aq_private.sessions(group_id,label,class_date,closes_at) values(g.id,nm,(now() at time zone g.timezone)::date,now()+make_interval(mins=>n)) returning * into s;
   insert into aq_private.members(session_id,student_id,external_id,first,last,numero_matricula,curso,codigo_asignatura,asignatura) select s.id,id,external_id,first,last,numero_matricula,curso,codigo_asignatura,asignatura from aq_private.students where group_id=g.id;
   return to_jsonb(s);
 end if;
 if action='close' then update aq_private.sessions set closed_at=coalesce(closed_at,now()) where id=s.id;return jsonb_build_object('ok',true);end if;
 if action='correct' then
   if jsonb_typeof(payload->'present') is distinct from 'boolean' then raise exception 'Estado incorrecto.';end if;
   select present into before_value from aq_private.members where session_id=s.id and student_id=(payload->>'student_id')::uuid for update;
   if not found then raise exception 'El alumno no pertenece a esta sesión.';end if;
   insert into aq_private.corrections(session_id,student_id,teacher_id,previous_present,new_present) values(s.id,(payload->>'student_id')::uuid,uid,before_value,(payload->>'present')::boolean);
   update aq_private.members set present=(payload->>'present')::boolean,registered_at=case when (payload->>'present')::boolean then now() else null end,source='profesor' where session_id=s.id and student_id=(payload->>'student_id')::uuid;
   return jsonb_build_object('ok',true);
 end if;
 if action='report' then
   return jsonb_build_object('session',to_jsonb(s),'rows',coalesce((select jsonb_agg(to_jsonb(m) order by m.last,m.first) from aq_private.members m where m.session_id=s.id),'[]'::jsonb));
 end if;
 raise exception 'Acción no disponible.';
end; $$;

-- Solo revela el nombre del grupo y la clase abierta. No devuelve alumnos ni asistencias.
create or replace function public.aq_portal(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g aq_private.groups; s aq_private.sessions;
begin
 if length(p_token)<>32 then return jsonb_build_object('ok',false);end if;
 select * into g from aq_private.groups where token=p_token and expires_at>now();
 if not found then return jsonb_build_object('ok',false);end if;
 select * into s from aq_private.sessions where group_id=g.id and closed_at is null and closes_at>now() order by opened_at desc limit 1;
 return jsonb_build_object('ok',true,'group',g.name,'subject',(select t.asignatura from aq_private.students t where t.group_id=g.id and t.asignatura is not null order by t.id limit 1),'open',s.id is not null,'label',s.label,'closes_at',s.closes_at);
end; $$;

create or replace function public.aq_checkin(p_token text,p_first text,p_last text,p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g aq_private.groups;s aq_private.sessions;st aq_private.students;m aq_private.members;k text;cnt int;
begin
 if coalesce(length(p_token),0)<>32 then return jsonb_build_object('ok',false,'message','Este QR ha caducado. Pide el código actual.');end if;
 if coalesce(length(p_first),0) not between 1 and 100 or coalesce(length(p_last),0) not between 1 and 100 or coalesce(length(p_code),0) not between 1 and 24 then return jsonb_build_object('ok',false,'message','Revisa tu nombre, apellidos y código personal.');end if;
 -- Serializa altas por grupo: evita carreras con duplicados, apertura y cierre.
 select * into g from aq_private.groups where token=p_token and expires_at>now() for update;
 if not found then return jsonb_build_object('ok',false,'message','Este QR ha caducado. Pide el código actual.');end if;
 select * into s from aq_private.sessions where group_id=g.id and closed_at is null and closes_at>now() order by opened_at desc limit 1 for update;
 if not found then return jsonb_build_object('ok',false,'message','La asistencia está cerrada. Avisa al profesor.');end if;
 delete from aq_private.attempts where group_id=g.id and started_at<now()-interval '5 minutes';
 -- Límite compartido de 600 intentos por grupo y 8 por nombre en cinco minutos.
 -- Las respuestas fallidas retornan JSON, conservando los contadores de la transacción.
 insert into aq_private.attempts(group_id,key) values(g.id,'*') on conflict(group_id,key) do update set count=aq_private.attempts.count+1 returning count into cnt;
 if cnt>600 then return jsonb_build_object('ok',false,'message','Demasiados intentos. Espera cinco minutos o avisa al profesor.');end if;
 k:=encode(sha256(convert_to(aq_private.norm(p_first)||'|'||aq_private.norm(p_last),'UTF8')),'hex');
 insert into aq_private.attempts(group_id,key) values(g.id,k) on conflict(group_id,key) do update set count=aq_private.attempts.count+1 returning count into cnt;
 if cnt>8 then return jsonb_build_object('ok',false,'message','Demasiados intentos. Espera cinco minutos o avisa al profesor.');end if;
 select * into st from aq_private.students where group_id=g.id and code_hash=aq_private.code_hash(g.id,p_code) and aq_private.norm(first)=aq_private.norm(p_first) and aq_private.norm(last)=aq_private.norm(p_last);
 if not found then return jsonb_build_object('ok',false,'message','Revisa tu nombre, apellidos y código personal.');end if;
 select * into m from aq_private.members where session_id=s.id and student_id=st.id;
 if not found then return jsonb_build_object('ok',false,'message','No figuras en esta sesión. Avisa al profesor.');end if;
 if m.present then return jsonb_build_object('ok',true,'duplicate',true);end if;
 -- Una corrección del profesor no se puede deshacer mediante otro registro del alumno.
 if m.source='profesor' then return jsonb_build_object('ok',false,'message','Tu profesor ha revisado esta asistencia. Consulta con él.');end if;
 update aq_private.members set present=true,registered_at=now(),source='alumno' where session_id=s.id and student_id=st.id;
 return jsonb_build_object('ok',true,'duplicate',false);
end; $$;

revoke all on all functions in schema aq_private from public,anon,authenticated;
revoke all on function public.aq_admin(text,jsonb) from public,anon,authenticated;
revoke all on function public.aq_portal(text) from public,anon,authenticated;
revoke all on function public.aq_checkin(text,text,text,text) from public,anon,authenticated;
grant execute on function public.aq_admin(text,jsonb) to authenticated;
grant execute on function public.aq_portal(text) to anon,authenticated;
grant execute on function public.aq_checkin(text,text,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
