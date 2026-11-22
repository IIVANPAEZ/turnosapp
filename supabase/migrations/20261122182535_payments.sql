-- =============================================================================
-- Sprint 5 · Cobros manuales y nota del cliente
--
-- El negocio cobra por su cuenta y anota CÓMO le pagaron (efectivo o
-- transferencia). Un turno tiene como máximo UN cobro vigente. Los cobros no
-- se borran: se anulan (con motivo) para no perder el historial.
-- =============================================================================

-- Nota general del cliente (preferencias, cómo ubicarlo). Sin datos clínicos.
alter table public.clients
  add column notes text check (char_length(notes) <= 500);
grant insert (notes), update (notes) on public.clients to authenticated;

create type public.payment_method as enum ('cash', 'transfer');

-- Para que el cobro apunte a un turno del MISMO negocio.
alter table public.appointments
  add constraint appointments_business_id_id_key unique (business_id, id);

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid not null,
  -- Copiados del turno al cobrar: permiten filtrar por profesional y cliente.
  member_id      uuid not null,
  client_id      uuid,
  amount         integer not null check (amount > 0 and amount <= 100000000),
  method         public.payment_method not null,
  note           text check (char_length(note) <= 200),
  paid_at        timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null default auth.uid(),
  voided_at      timestamptz,
  voided_by      uuid references auth.users (id) on delete set null,
  void_reason    text check (char_length(void_reason) <= 200),
  created_at     timestamptz not null default now(),

  foreign key (business_id, appointment_id) references public.appointments (business_id, id) on delete cascade,
  foreign key (business_id, member_id) references public.business_members (business_id, id),
  foreign key (business_id, client_id) references public.clients (business_id, id) on delete set null (client_id),
  -- Motivo y quién anuló solo existen en un cobro anulado.
  constraint payments_void_consistent check (voided_at is not null or (voided_by is null and void_reason is null))
);

-- Un solo cobro vigente por turno.
create unique index payments_one_active_per_appointment
  on public.payments (appointment_id) where voided_at is null;
create index payments_business_paid_at on public.payments (business_id, paid_at) where voided_at is null;
create index payments_client on public.payments (client_id);

alter table public.payments enable row level security;

-- Ver: dueño/admin, todos los cobros del negocio; un profesional, los de sus turnos.
-- Escribir: solo mediante las funciones de abajo (no hay permisos directos).
grant select on public.payments to authenticated;

create policy "payments: dueño/admin o el profesional ven"
  on public.payments for select to authenticated
  using (
    (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
    or (select private.is_own_member(member_id))
  );

-- -----------------------------------------------------------------------------
-- Registrar el cobro de un turno
-- -----------------------------------------------------------------------------
create function public.record_payment(
  p_appointment_id uuid,
  p_amount         integer,
  p_method         public.payment_method,
  p_note           text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt record;
  v_id   uuid;
begin
  select a.id, a.business_id, a.member_id, a.client_id, a.status, a.rescheduled_to
    into v_appt
  from public.appointments a
  where a.id = p_appointment_id;

  -- Mismo permiso que para manejar el turno: dueño/admin o el propio profesional.
  if v_appt.id is null
     or not (private.has_business_role(v_appt.business_id, array['owner', 'admin']::public.member_role[])
             or private.is_own_member(v_appt.member_id)) then
    raise exception 'appointment_not_found' using errcode = 'P0002';
  end if;

  if v_appt.rescheduled_to is not null or v_appt.status in ('cancelled', 'no_show') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_note, '')) > 200 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;

  begin
    insert into public.payments (business_id, appointment_id, member_id, client_id, amount, method, note)
    values (v_appt.business_id, v_appt.id, v_appt.member_id, v_appt.client_id, p_amount, p_method,
            nullif(btrim(p_note), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_paid' using errcode = 'P0001';
  end;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Anular un cobro (queda en el historial, deja el turno "sin cobrar")
-- -----------------------------------------------------------------------------
create function public.void_payment(p_payment_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay record;
begin
  select p.id, p.business_id, p.member_id, p.voided_at
    into v_pay
  from public.payments p
  where p.id = p_payment_id;

  if v_pay.id is null
     or not (private.has_business_role(v_pay.business_id, array['owner', 'admin']::public.member_role[])
             or private.is_own_member(v_pay.member_id)) then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if v_pay.voided_at is not null then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_reason, '')) > 200 then
    raise exception 'invalid_reason' using errcode = 'P0001';
  end if;

  update public.payments
     set voided_at = now(),
         voided_by = (select auth.uid()),
         void_reason = nullif(btrim(p_reason), '')
   where id = v_pay.id;
end;
$$;

revoke execute on function public.record_payment(uuid, integer, public.payment_method, text) from public, anon;
revoke execute on function public.void_payment(uuid, text) from public, anon;
grant execute on function public.record_payment(uuid, integer, public.payment_method, text) to authenticated;
grant execute on function public.void_payment(uuid, text) to authenticated;
