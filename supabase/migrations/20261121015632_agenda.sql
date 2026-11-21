-- =============================================================================
-- Sprint 3 · Etapa 1: Agenda
--  - clients: clientes básicos del negocio (nombre + celular, sin datos clínicos)
--  - appointments: turnos, sin superposición por profesional
--  - Funciones: create_appointment, reschedule_appointment, set_appointment_status
-- =============================================================================

create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.appointment_source as enum ('manual', 'online');

-- Permiten FKs compuestas (negocio, id) desde appointments.
alter table public.services add constraint services_business_id_id_key unique (business_id, id);

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 80),
  phone       text check (char_length(phone) <= 30),
  -- Celular normalizado para detectar duplicados: solo dígitos y "595…" → "0…".
  -- "0981 123 456" y "+595 981 123456" quedan iguales: "0981123456".
  phone_key   text generated always as (
    case
      when regexp_replace(coalesce(phone, ''), '\D', '', 'g') = '' then null
      when regexp_replace(phone, '\D', '', 'g') like '595%'
        then '0' || substr(regexp_replace(phone, '\D', '', 'g'), 4)
      else regexp_replace(phone, '\D', '', 'g')
    end
  ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint clients_business_id_id_key unique (business_id, id)
);

-- Un mismo celular no se repite dentro del negocio.
create unique index clients_unique_phone_per_business
  on public.clients (business_id, phone_key)
  where phone_key is not null;

create index clients_business_name_idx on public.clients (business_id, lower(full_name));

create trigger set_updated_at before update on public.clients
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Turnos
-- -----------------------------------------------------------------------------
create table public.appointments (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  member_id      uuid not null,
  client_id      uuid not null,
  service_id     uuid not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         public.appointment_status not null default 'confirmed',
  status_changed_at timestamptz not null default now(),
  -- Datos del servicio "congelados" al momento del turno (si después cambia el precio, este no).
  service_name   text not null,
  price          integer not null check (price between 0 and 100000000),
  price_type     public.price_type not null default 'fixed',
  notes          text check (char_length(notes) <= 300),
  cancel_reason  text check (char_length(cancel_reason) <= 120),
  source         public.appointment_source not null default 'manual',
  -- Si se reprogramó: el turno nuevo. Diferida para poder crear ambos en la misma transacción.
  rescheduled_to uuid references public.appointments (id) on delete set null deferrable initially deferred,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint appointments_member_fk foreign key (business_id, member_id)
    references public.business_members (business_id, id) on delete restrict,
  constraint appointments_client_fk foreign key (business_id, client_id)
    references public.clients (business_id, id) on delete restrict,
  -- Un servicio con turnos no se puede borrar (se pausa).
  constraint appointments_service_fk foreign key (business_id, service_id)
    references public.services (business_id, id) on delete restrict,
  constraint appointments_valid_range check (ends_at > starts_at),
  constraint appointments_max_duration check (ends_at - starts_at <= interval '8 hours'),
  -- Dos turnos activos del mismo profesional no se pueden pisar.
  -- Cancelados, "no vino" y reprogramados liberan el lugar. Rango [inicio, fin).
  constraint appointments_no_overlap exclude using gist (
    member_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed', 'completed') and rescheduled_to is null)
);

create index appointments_business_starts_idx on public.appointments (business_id, starts_at);
create index appointments_client_idx on public.appointments (client_id);

create trigger set_updated_at before update on public.appointments
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Permisos por columna (además de RLS)
-- -----------------------------------------------------------------------------
revoke all on public.clients, public.appointments from anon;
revoke insert, update, delete on public.clients, public.appointments from authenticated;

grant insert (business_id, full_name, phone) on public.clients to authenticated;
grant update (full_name, phone) on public.clients to authenticated;
grant delete on public.clients to authenticated;

-- Los turnos se crean y modifican con las funciones de abajo (security invoker:
-- necesitan estos permisos, y RLS aplica igual). No se borran: se cancelan.
grant insert (business_id, member_id, client_id, service_id, starts_at, ends_at, status,
              service_name, price, price_type, notes, source, rescheduled_to)
  on public.appointments to authenticated;
grant update (status, status_changed_at, cancel_reason, notes, rescheduled_to)
  on public.appointments to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- clients: el equipo ve, crea y edita; borrar solo dueño/admin (y solo si no tiene turnos).
create policy "clients: miembros ven"
  on public.clients for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "clients: miembros crean"
  on public.clients for insert to authenticated
  with check ((select private.is_business_member(business_id)));

create policy "clients: miembros editan"
  on public.clients for update to authenticated
  using ((select private.is_business_member(business_id)))
  with check ((select private.is_business_member(business_id)));

create policy "clients: dueño/admin borran"
  on public.clients for delete to authenticated
  using ((select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[])));

-- appointments: el equipo ve; dueño/admin manejan todos; cada profesional, los suyos.
create policy "appointments: miembros ven"
  on public.appointments for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "appointments: dueño/admin o el profesional crean"
  on public.appointments for insert to authenticated
  with check (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  );

create policy "appointments: dueño/admin o el profesional editan"
  on public.appointments for update to authenticated
  using (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  )
  with check (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  );

-- -----------------------------------------------------------------------------
-- Funciones para la app (security invoker)
-- Errores: P0002 no encontrado · 23P01 se pisa con otro turno · 23503 dato de otro negocio
--          22023 parámetro inválido · P0001 operación no permitida (ver mensaje)
-- -----------------------------------------------------------------------------

-- Crea un turno a partir de fecha y hora locales del negocio.
-- La duración viene del servicio salvo que se indique otra (p_duration_minutes).
create function public.create_appointment(
  p_member_id        uuid,
  p_client_id        uuid,
  p_service_id       uuid,
  p_date             date,
  p_time             time,
  p_duration_minutes integer default null,
  p_notes            text default null,
  p_status           public.appointment_status default 'confirmed',
  p_source           public.appointment_source default 'manual'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service  record;
  v_tz       text;
  v_starts   timestamptz;
  v_minutes  integer;
  v_id       uuid;
begin
  select s.business_id, s.name, s.price, s.price_type, s.duration_minutes
    into v_service
  from public.services s
  where s.id = p_service_id;

  if v_service.business_id is null then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  if p_status not in ('pending', 'confirmed') then
    raise exception 'invalid_initial_status' using errcode = '22023';
  end if;

  v_minutes := coalesce(p_duration_minutes, v_service.duration_minutes);
  if v_minutes < 5 or v_minutes > 480 or v_minutes % 5 <> 0 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select timezone into v_tz from public.businesses where id = v_service.business_id;
  v_starts := (p_date + p_time) at time zone v_tz;

  insert into public.appointments (
    business_id, member_id, client_id, service_id, starts_at, ends_at, status,
    service_name, price, price_type, notes, source
  )
  values (
    v_service.business_id, p_member_id, p_client_id, p_service_id,
    v_starts, v_starts + make_interval(mins => v_minutes), p_status,
    v_service.name, v_service.price, v_service.price_type, nullif(btrim(p_notes), ''), p_source
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Mueve un turno a otra fecha/hora: crea el nuevo (confirmado, mismo precio) y marca el viejo.
-- Todo o nada: si el nuevo horario está ocupado, no cambia nada.
create function public.reschedule_appointment(
  p_appointment_id   uuid,
  p_date             date,
  p_time             time,
  p_duration_minutes integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old     public.appointments%rowtype;
  v_tz      text;
  v_starts  timestamptz;
  v_minutes integer;
  v_new_id  uuid := gen_random_uuid();
begin
  select * into v_old from public.appointments where id = p_appointment_id for update;
  if v_old.id is null then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;
  if v_old.rescheduled_to is not null or v_old.status not in ('pending', 'confirmed') then
    raise exception 'appointment_not_reschedulable' using errcode = 'P0001';
  end if;

  v_minutes := coalesce(p_duration_minutes, extract(epoch from v_old.ends_at - v_old.starts_at)::integer / 60);
  if v_minutes < 5 or v_minutes > 480 or v_minutes % 5 <> 0 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select timezone into v_tz from public.businesses where id = v_old.business_id;
  v_starts := (p_date + p_time) at time zone v_tz;

  -- Primero se libera el lugar del turno viejo (la FK es diferida), después se crea el nuevo.
  update public.appointments
     set rescheduled_to = v_new_id, status_changed_at = now()
   where id = v_old.id;

  insert into public.appointments (
    id, business_id, member_id, client_id, service_id, starts_at, ends_at, status,
    service_name, price, price_type, notes, source
  )
  values (
    v_new_id, v_old.business_id, v_old.member_id, v_old.client_id, v_old.service_id,
    v_starts, v_starts + make_interval(mins => v_minutes), 'confirmed',
    v_old.service_name, v_old.price, v_old.price_type, v_old.notes, v_old.source
  );

  return v_new_id;
end;
$$;

-- Cambia el estado de un turno (confirmar, finalizar, no vino, cancelar o deshacer).
-- Un turno reprogramado ya no se modifica: se trabaja sobre el nuevo.
create function public.set_appointment_status(
  p_appointment_id uuid,
  p_status         public.appointment_status,
  p_cancel_reason  text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.appointments
     set status = p_status,
         status_changed_at = now(),
         cancel_reason = case when p_status = 'cancelled' then nullif(btrim(p_cancel_reason), '') else null end
   where id = p_appointment_id
     and rescheduled_to is null;

  if not found then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.create_appointment(uuid, uuid, uuid, date, time, integer, text, public.appointment_status, public.appointment_source) from public, anon;
revoke execute on function public.reschedule_appointment(uuid, date, time, integer) from public, anon;
revoke execute on function public.set_appointment_status(uuid, public.appointment_status, text) from public, anon;
grant execute on function public.create_appointment(uuid, uuid, uuid, date, time, integer, text, public.appointment_status, public.appointment_source) to authenticated;
grant execute on function public.reschedule_appointment(uuid, date, time, integer) to authenticated;
grant execute on function public.set_appointment_status(uuid, public.appointment_status, text) to authenticated;
