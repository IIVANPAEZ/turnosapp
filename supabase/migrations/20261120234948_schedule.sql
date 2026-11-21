-- =============================================================================
-- Sprint 2 · Etapa 3: Horarios
--  - working_hours: franjas semanales por profesional (sin superposiciones)
--  - time_off: bloqueos de días completos o de unas horas
-- Las horas de working_hours son "hora de reloj" en la zona del negocio.
-- =============================================================================

-- Necesaria para exclusiones con igualdad sobre uuid/smallint (también la usará la agenda).
create extension if not exists btree_gist with schema extensions;

-- Permite FKs compuestas (negocio, profesional): garantiza que el profesional
-- pertenezca al mismo negocio que la fila que lo referencia.
alter table public.business_members
  add constraint business_members_business_id_id_key unique (business_id, id);

-- -----------------------------------------------------------------------------
-- Horario semanal
-- -----------------------------------------------------------------------------
create table public.working_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  member_id   uuid not null,
  -- 1 = lunes … 7 = domingo (ISO)
  weekday     smallint not null check (weekday between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),

  constraint working_hours_member_fk foreign key (business_id, member_id)
    references public.business_members (business_id, id) on delete cascade,
  constraint working_hours_valid_range check (end_time > start_time),
  constraint working_hours_five_minutes check (
    extract(minute from start_time)::int % 5 = 0 and extract(second from start_time) = 0
    and extract(minute from end_time)::int % 5 = 0 and extract(second from end_time) = 0
  ),
  -- Un profesional no puede tener franjas superpuestas el mismo día.
  -- Rango [inicio, fin): las franjas pegadas (08–12 y 12–14) están permitidas.
  constraint working_hours_no_overlap exclude using gist (
    member_id with =,
    weekday with =,
    tsrange(date '2000-01-03' + start_time, date '2000-01-03' + end_time) with &&
  )
);

create index working_hours_business_id_idx on public.working_hours (business_id);

-- -----------------------------------------------------------------------------
-- Bloqueos (vacaciones, feriados, trámites)
-- member_id null = bloqueo de todo el negocio.
-- -----------------------------------------------------------------------------
create table public.time_off (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  member_id   uuid,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  all_day     boolean not null default false,
  reason      text check (char_length(reason) <= 120),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint time_off_member_fk foreign key (business_id, member_id)
    references public.business_members (business_id, id) on delete cascade,
  constraint time_off_valid_range check (ends_at > starts_at),
  constraint time_off_max_span check (ends_at - starts_at <= interval '366 days')
);

create index time_off_business_ends_idx on public.time_off (business_id, ends_at);

-- -----------------------------------------------------------------------------
-- Autorización
-- -----------------------------------------------------------------------------

-- ¿El profesional p_member_id es el usuario actual?
create function private.is_own_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.id = p_member_id and m.user_id = (select auth.uid()) and m.is_active
  );
$$;

revoke execute on function private.is_own_member(uuid) from public, anon;
grant execute on function private.is_own_member(uuid) to authenticated;

-- Permisos por columna: solo alta y baja (los cambios se hacen reemplazando).
revoke all on public.working_hours, public.time_off from anon;
revoke insert, update, delete on public.working_hours, public.time_off from authenticated;

grant insert (business_id, member_id, weekday, start_time, end_time) on public.working_hours to authenticated;
grant delete on public.working_hours to authenticated;
grant insert (business_id, member_id, starts_at, ends_at, all_day, reason) on public.time_off to authenticated;
grant delete on public.time_off to authenticated;

alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;

-- working_hours: el equipo ve; dueño/admin o el propio profesional editan.
create policy "working_hours: miembros ven"
  on public.working_hours for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "working_hours: dueño/admin o uno mismo crean"
  on public.working_hours for insert to authenticated
  with check (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  );

create policy "working_hours: dueño/admin o uno mismo borran"
  on public.working_hours for delete to authenticated
  using (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  );

-- time_off: el equipo ve; dueño/admin cargan cualquiera; cada uno los suyos.
create policy "time_off: miembros ven"
  on public.time_off for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "time_off: dueño/admin o uno mismo crean"
  on public.time_off for insert to authenticated
  with check (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (member_id is not null and (select private.is_own_member(member_id)))
  );

create policy "time_off: dueño/admin o uno mismo borran"
  on public.time_off for delete to authenticated
  using (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (member_id is not null and (select private.is_own_member(member_id)))
  );

-- -----------------------------------------------------------------------------
-- Funciones para la app (security invoker: RLS aplica igual)
-- -----------------------------------------------------------------------------

-- Reemplaza toda la semana de un profesional en una sola transacción.
-- p_hours: [{"weekday": 1, "start": "08:00", "end": "12:00"}, …]
-- Errores: P0002 profesional no encontrado · 23P01 franjas superpuestas
--          23514 franja inválida · 42501 sin permiso
create function public.set_working_hours(p_member_id uuid, p_hours jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id from public.business_members where id = p_member_id;
  if v_business_id is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  delete from public.working_hours where member_id = p_member_id;

  insert into public.working_hours (business_id, member_id, weekday, start_time, end_time)
  select v_business_id, p_member_id, (h ->> 'weekday')::smallint, (h ->> 'start')::time, (h ->> 'end')::time
  from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) as h;
end;
$$;

-- Crea un bloqueo a partir de fechas/horas locales del negocio.
--  Día(s) completo(s): p_start_time y p_end_time en null (de p_start_date a p_end_date inclusive).
--  Unas horas: p_start_date + p_start_time → p_start_date + p_end_time.
-- p_member_id null = todo el negocio.
create function public.add_time_off(
  p_start_date date,
  p_end_date   date default null,
  p_start_time time default null,
  p_end_time   time default null,
  p_reason     text default null,
  p_member_id  uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_tz          text;
  v_all_day     boolean := p_start_time is null;
  v_starts      timestamptz;
  v_ends        timestamptz;
  v_id          uuid;
begin
  select m.business_id, b.timezone
    into v_business_id, v_tz
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = (select auth.uid()) and m.is_active
  limit 1;

  if v_business_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_all_day then
    v_starts := p_start_date::timestamp at time zone v_tz;
    v_ends   := (coalesce(p_end_date, p_start_date) + 1)::timestamp at time zone v_tz;
  else
    if p_end_time is null then
      raise exception 'missing_end_time' using errcode = '22023';
    end if;
    v_starts := (p_start_date + p_start_time) at time zone v_tz;
    v_ends   := (p_start_date + p_end_time) at time zone v_tz;
  end if;

  insert into public.time_off (business_id, member_id, starts_at, ends_at, all_day, reason)
  values (v_business_id, p_member_id, v_starts, v_ends, v_all_day, nullif(btrim(p_reason), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.set_working_hours(uuid, jsonb) from public, anon;
revoke execute on function public.add_time_off(date, date, time, time, text, uuid) from public, anon;
grant execute on function public.set_working_hours(uuid, jsonb) to authenticated;
grant execute on function public.add_time_off(date, date, time, time, text, uuid) to authenticated;
