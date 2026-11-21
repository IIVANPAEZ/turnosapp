-- =============================================================================
-- Sprint 4 · Etapa 1: Reservas públicas (turnosapp.com/<slug>)
--
-- Las tablas siguen cerradas para usuarios sin sesión (anon). La página pública
-- usa SOLO estas funciones, que devuelven lo mínimo indispensable:
--   public_business      datos públicos del negocio
--   public_services      servicios activos
--   public_availability  horarios libres (nunca nombres ni turnos ajenos)
--   book_appointment     crea la reserva validando todas las reglas otra vez
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reglas de reserva del negocio (editables desde Configuración)
-- -----------------------------------------------------------------------------
alter table public.businesses
  add column booking_enabled boolean not null default true,
  add column booking_min_notice_minutes integer not null default 120
    check (booking_min_notice_minutes between 0 and 10080),   -- hasta 7 días
  add column booking_max_days integer not null default 30
    check (booking_max_days between 1 and 365),
  add column booking_auto_confirm boolean not null default false;

grant update (booking_enabled, booking_min_notice_minutes, booking_max_days, booking_auto_confirm)
  on public.businesses to authenticated;

-- -----------------------------------------------------------------------------
-- Auxiliares (privadas)
-- -----------------------------------------------------------------------------

-- Celular normalizado igual que clients.phone_key: solo dígitos y "595…" → "0…".
create function private.phone_key(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') = '' then null
    when regexp_replace(p_phone, '\D', '', 'g') like '595%'
      then '0' || substr(regexp_replace(p_phone, '\D', '', 'g'), 4)
    else regexp_replace(p_phone, '\D', '', 'g')
  end;
$$;

-- Profesional que recibe las reservas online: el dueño primero (MVP: hay uno solo).
create function private.booking_member(p_business_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.business_members m
  where m.business_id = p_business_id and m.is_active and m.is_bookable
  order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, m.created_at
  limit 1;
$$;

revoke execute on function private.phone_key(text) from public, anon;
revoke execute on function private.booking_member(uuid) from public, anon;

-- -----------------------------------------------------------------------------
-- Funciones públicas
-- -----------------------------------------------------------------------------

-- Datos públicos del negocio (sin ids internos de personas).
create function public.public_business(p_slug text)
returns table (
  name text,
  slug text,
  category public.business_category,
  description text,
  city text,
  address text,
  whatsapp text,
  timezone text,
  booking_enabled boolean,
  booking_max_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, b.slug, b.category, b.description, b.city, b.address, b.whatsapp,
         b.timezone, b.booking_enabled, b.booking_max_days
  from public.businesses b
  where b.slug = lower(btrim(p_slug));
$$;

-- Servicios activos de un negocio con reservas activadas.
create function public.public_services(p_slug text)
returns table (
  id uuid,
  name text,
  description text,
  duration_minutes integer,
  price integer,
  price_type public.price_type
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.name, s.description, s.duration_minutes, s.price, s.price_type
  from public.services s
  join public.businesses b on b.id = s.business_id
  where b.slug = lower(btrim(p_slug)) and b.booking_enabled and s.is_active
  order by s.sort_order, s.created_at;
$$;

-- Horarios libres para un servicio, desde p_from durante p_days días (máx. 31).
-- Respeta: horario de atención, duración del servicio, turnos activos, bloqueos,
-- anticipación mínima y días máximos hacia adelante. Devuelve solo (día, hora).
create function public.public_availability(p_slug text, p_service_id uuid, p_from date, p_days integer default 7)
returns table (day date, slot time)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business record;
  v_member   uuid;
  v_duration integer;
  v_today    date;
  v_from     date;
  v_to       date;
  v_earliest timestamptz;
begin
  select b.id, b.timezone, b.booking_enabled, b.booking_min_notice_minutes, b.booking_max_days
    into v_business
  from public.businesses b
  where b.slug = lower(btrim(p_slug));

  if v_business.id is null or not v_business.booking_enabled then
    return;
  end if;

  select s.duration_minutes into v_duration
  from public.services s
  where s.id = p_service_id and s.business_id = v_business.id and s.is_active;
  if v_duration is null then
    return;
  end if;

  v_member := private.booking_member(v_business.id);
  if v_member is null then
    return;
  end if;

  v_today    := (now() at time zone v_business.timezone)::date;
  v_from     := greatest(coalesce(p_from, v_today), v_today);
  v_to       := least(v_from + least(greatest(coalesce(p_days, 7), 1), 31) - 1, v_today + v_business.booking_max_days);
  v_earliest := now() + make_interval(mins => v_business.booking_min_notice_minutes);

  if v_to < v_from then
    return;
  end if;

  return query
  with days as (
    select gs::date as d from generate_series(v_from, v_to, interval '1 day') as gs
  ),
  candidates as (
    select days.d,
           days.d + wh.start_time + make_interval(mins => k * 15) as local_start
    from days
    join public.working_hours wh
      on wh.member_id = v_member and wh.weekday = extract(isodow from days.d)
    cross join lateral generate_series(
      0,
      floor((extract(epoch from (wh.end_time - wh.start_time)) / 60 - v_duration) / 15)::integer
    ) as k
  ),
  ranged as (
    select c.d, c.local_start,
           tstzrange(c.local_start at time zone v_business.timezone,
                     (c.local_start at time zone v_business.timezone) + make_interval(mins => v_duration)) as r
    from candidates c
  )
  select ranged.d, ranged.local_start::time
  from ranged
  where lower(ranged.r) >= v_earliest
    and not exists (
      select 1 from public.appointments a
      where a.member_id = v_member
        and a.status in ('pending', 'confirmed', 'completed')
        and a.rescheduled_to is null
        and tstzrange(a.starts_at, a.ends_at) && ranged.r
    )
    and not exists (
      select 1 from public.time_off t
      where t.business_id = v_business.id
        and (t.member_id is null or t.member_id = v_member)
        and tstzrange(t.starts_at, t.ends_at) && ranged.r
    )
  order by 1, 2;
end;
$$;

-- Crea una reserva online. Errores (errcode P0001, el mensaje dice cuál):
--   bot · invalid_name · invalid_phone · invalid_notes · booking_disabled ·
--   service_unavailable · slot_unavailable · slot_taken · too_many_bookings
create function public.book_appointment(
  p_slug       text,
  p_service_id uuid,
  p_date       date,
  p_time       time,
  p_name       text,
  p_phone      text,
  p_notes      text default null,
  p_honeypot   text default null
)
returns table (
  appointment_id uuid,
  status public.appointment_status,
  service_name text,
  duration_minutes integer,
  price integer,
  price_type public.price_type
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_business  record;
  v_service   record;
  v_member    uuid;
  v_key       text;
  v_client_id uuid;
  v_starts    timestamptz;
  v_status    public.appointment_status;
  v_id        uuid;
begin
  -- Campo trampa: los humanos no lo ven, los bots lo completan.
  if coalesce(btrim(p_honeypot), '') <> '' then
    raise exception 'bot' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  v_key := private.phone_key(p_phone);
  if v_key is null or char_length(v_key) not between 8 and 15 then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_notes, '')) > 300 then
    raise exception 'invalid_notes' using errcode = 'P0001';
  end if;

  select b.id, b.timezone, b.booking_enabled, b.booking_auto_confirm
    into v_business
  from public.businesses b
  where b.slug = lower(btrim(p_slug));
  if v_business.id is null or not v_business.booking_enabled then
    raise exception 'booking_disabled' using errcode = 'P0001';
  end if;

  select s.id, s.name, s.duration_minutes, s.price, s.price_type
    into v_service
  from public.services s
  where s.id = p_service_id and s.business_id = v_business.id and s.is_active;
  if v_service.id is null then
    raise exception 'service_unavailable' using errcode = 'P0001';
  end if;

  -- Mismas reglas que la página: el horario tiene que estar entre los libres.
  if not exists (
    select 1 from public.public_availability(p_slug, p_service_id, p_date, 1) av
    where av.day = p_date and av.slot = p_time
  ) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  v_member := private.booking_member(v_business.id);

  -- Cliente: si el celular ya existe en el negocio se usa ese; si no, se crea.
  select c.id into v_client_id
  from public.clients c
  where c.business_id = v_business.id and c.phone_key = v_key;
  if v_client_id is null then
    insert into public.clients (business_id, full_name, phone)
    values (v_business.id, btrim(p_name), btrim(p_phone))
    returning id into v_client_id;
  end if;

  -- Límite anti-abuso: hasta 3 reservas online futuras activas por cliente.
  if (
    select count(*) from public.appointments a
    where a.client_id = v_client_id and a.source = 'online'
      and a.status in ('pending', 'confirmed') and a.rescheduled_to is null
      and a.starts_at > now()
  ) >= 3 then
    raise exception 'too_many_bookings' using errcode = 'P0001';
  end if;

  v_starts := (p_date + p_time) at time zone v_business.timezone;
  v_status := case when v_business.booking_auto_confirm then 'confirmed' else 'pending' end;

  begin
    insert into public.appointments (
      business_id, member_id, client_id, service_id, starts_at, ends_at, status,
      service_name, price, price_type, notes, source
    )
    values (
      v_business.id, v_member, v_client_id, v_service.id,
      v_starts, v_starts + make_interval(mins => v_service.duration_minutes), v_status,
      v_service.name, v_service.price, v_service.price_type, nullif(btrim(p_notes), ''), 'online'
    )
    returning id into v_id;
  exception when exclusion_violation then
    -- Otra persona reservó ese horario en el mismo momento.
    raise exception 'slot_taken' using errcode = 'P0001';
  end;

  return query select v_id, v_status, v_service.name, v_service.duration_minutes, v_service.price, v_service.price_type;
end;
$$;

-- Las 4 funciones públicas: para todos (con o sin sesión).
revoke execute on function public.public_business(text) from public;
revoke execute on function public.public_services(text) from public;
revoke execute on function public.public_availability(text, uuid, date, integer) from public;
revoke execute on function public.book_appointment(text, uuid, date, time, text, text, text, text) from public;
grant execute on function public.public_business(text) to anon, authenticated;
grant execute on function public.public_services(text) to anon, authenticated;
grant execute on function public.public_availability(text, uuid, date, integer) to anon, authenticated;
grant execute on function public.book_appointment(text, uuid, date, time, text, text, text, text) to anon, authenticated;
