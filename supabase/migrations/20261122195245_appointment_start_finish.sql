-- =============================================================================
-- Sprint 5 · Iniciar y finalizar cita
--
-- * "Iniciar": el turno pasa a "En curso" (in_progress) y se guarda la hora real.
-- * "Finalizar": el turno pasa a "Finalizado" y, en el mismo paso, se registra
--   cómo pagó el cliente (o se finaliza sin cobrar).
-- Un turno "En curso" ocupa su lugar igual que uno confirmado.
-- =============================================================================

alter table public.appointments add column started_at timestamptz;
grant update (started_at) on public.appointments to authenticated;

-- Dos turnos activos del mismo profesional no se pueden pisar (ahora incluye "En curso").
alter table public.appointments drop constraint appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap exclude using gist (
  member_id with =,
  tstzrange(starts_at, ends_at) with &&
) where (status in ('pending', 'confirmed', 'in_progress', 'completed') and rescheduled_to is null);

-- Cambiar estado: al iniciar se guarda la hora real (la primera vez).
create or replace function public.set_appointment_status(
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
         started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
         cancel_reason = case when p_status = 'cancelled' then nullif(btrim(p_cancel_reason), '') else null end
   where id = p_appointment_id
     and rescheduled_to is null;

  if not found then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Finalizar cita (+ cobro en el mismo paso). p_method null = "Finalizar sin cobrar".
-- -----------------------------------------------------------------------------
create function public.finish_appointment(
  p_appointment_id uuid,
  p_method         public.payment_method default null,
  p_amount         integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt record;
begin
  select a.id, a.business_id, a.member_id, a.client_id, a.status, a.rescheduled_to, a.starts_at
    into v_appt
  from public.appointments a
  where a.id = p_appointment_id
  for update;

  -- Mismo permiso que para manejar el turno: dueño/admin o el propio profesional.
  if v_appt.id is null
     or not (private.has_business_role(v_appt.business_id, array['owner', 'admin']::public.member_role[])
             or private.is_own_member(v_appt.member_id)) then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;
  if v_appt.rescheduled_to is not null or v_appt.status in ('cancelled', 'no_show') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if v_appt.starts_at > now() then
    raise exception 'not_started' using errcode = 'P0001';
  end if;
  if p_method is not null and (p_amount is null or p_amount <= 0 or p_amount > 100000000) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  update public.appointments
     set status = 'completed', status_changed_at = now()
   where id = v_appt.id;

  if p_method is not null then
    begin
      insert into public.payments (business_id, appointment_id, member_id, client_id, amount, method)
      values (v_appt.business_id, v_appt.id, v_appt.member_id, v_appt.client_id, p_amount, p_method);
    exception when unique_violation then
      raise exception 'already_paid' using errcode = 'P0001';
    end;
  end if;
end;
$$;

revoke execute on function public.finish_appointment(uuid, public.payment_method, integer) from public, anon;
grant execute on function public.finish_appointment(uuid, public.payment_method, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- "En curso" también ocupa lugar / cuenta como turno por venir en estas funciones.
-- -----------------------------------------------------------------------------
create or replace function public.public_availability(p_slug text, p_service_id uuid, p_from date, p_days integer default 7)
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
        and a.status in ('pending', 'confirmed', 'in_progress', 'completed')
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

create or replace function public.book_appointment(
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
      and a.status in ('pending', 'confirmed', 'in_progress') and a.rescheduled_to is null
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

create or replace function public.client_overview(p_business_id uuid, p_member_id uuid default null)
returns table (
  id               uuid,
  full_name        text,
  phone            text,
  notes            text,
  created_at       timestamptz,
  visits           integer,
  no_shows         integer,
  last_visit       timestamptz,
  next_appointment timestamptz,
  total_paid       bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.full_name, c.phone, c.notes, c.created_at,
         (count(a.id) filter (where a.status = 'completed'))::integer,
         (count(a.id) filter (where a.status = 'no_show'))::integer,
         max(a.starts_at) filter (where a.status = 'completed'),
         min(a.starts_at) filter (where a.status in ('pending', 'confirmed', 'in_progress')
                                    and a.rescheduled_to is null and a.starts_at >= now()),
         coalesce((
           select sum(p.amount) from public.payments p
           where p.client_id = c.id and p.voided_at is null
             and (p_member_id is null or p.member_id = p_member_id)
         ), 0)::bigint
  from public.clients c
  left join public.appointments a
    on a.client_id = c.id and (p_member_id is null or a.member_id = p_member_id)
  where c.business_id = p_business_id
  group by c.id;
$$;
