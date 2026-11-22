-- Primeros pasos → "Compartí tu link de reservas": se tilda cuando alguien del
-- negocio copia o comparte el link por primera vez.
alter table public.businesses add column booking_link_shared_at timestamptz;

-- Cualquier miembro activo puede marcarlo (solo la primera vez; después no cambia).
create function public.mark_booking_link_shared()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.businesses b
     set booking_link_shared_at = now()
   where b.booking_link_shared_at is null
     and b.id in (
       select m.business_id from public.business_members m
        where m.user_id = (select auth.uid()) and m.is_active
     );
$$;

revoke execute on function public.mark_booking_link_shared() from public, anon;
grant execute on function public.mark_booking_link_shared() to authenticated;
