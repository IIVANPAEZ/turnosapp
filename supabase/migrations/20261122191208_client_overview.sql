-- Clientes: resumen por cliente para la lista (visitas, última visita,
-- próximo turno, total cobrado). Security invoker: RLS aplica igual, así que
-- cada usuario solo cuenta lo que puede ver. Con p_member_id (un profesional)
-- se cuentan solo sus turnos y cobros.
create function public.client_overview(p_business_id uuid, p_member_id uuid default null)
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
         min(a.starts_at) filter (where a.status in ('pending', 'confirmed')
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

revoke execute on function public.client_overview(uuid, uuid) from public, anon;
grant execute on function public.client_overview(uuid, uuid) to authenticated;
