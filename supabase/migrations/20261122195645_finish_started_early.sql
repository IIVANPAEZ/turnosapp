-- Si el cliente llegó antes y la cita se inició antes de hora, se puede finalizar igual.
create or replace function public.finish_appointment(
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
  -- Antes de la hora solo si ya se inició (el cliente llegó antes).
  if v_appt.starts_at > now() and v_appt.status <> 'in_progress' then
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
