-- =============================================================================
-- Sprint 2 · Etapa 2: Servicios del negocio
-- Nombre, descripción, duración, precio en guaraníes (fijo o "desde"), activo.
-- Sin seña ni pagos por ahora.
-- =============================================================================

-- "fixed": ₲ 150.000 · "from": desde ₲ 150.000
create type public.price_type as enum ('fixed', 'from');

create table public.services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  description      text check (char_length(description) <= 300),
  duration_minutes integer not null
                   check (duration_minutes between 5 and 480 and duration_minutes % 5 = 0),
  -- Guaraníes enteros (el guaraní no tiene centavos).
  price            integer not null default 0 check (price between 0 and 100000000),
  price_type       public.price_type not null default 'fixed',
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index services_business_id_idx on public.services (business_id, sort_order, created_at);

-- Un negocio no puede tener dos servicios con el mismo nombre (sin importar mayúsculas).
create unique index services_unique_name_per_business
  on public.services (business_id, lower(btrim(name)));

create trigger set_updated_at before update on public.services
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Permisos por columna (además de RLS)
-- -----------------------------------------------------------------------------
revoke all on public.services from anon;
revoke insert, update, delete on public.services from authenticated;

grant insert (business_id, name, description, duration_minutes, price, price_type, is_active, sort_order)
  on public.services to authenticated;
grant update (name, description, duration_minutes, price, price_type, is_active, sort_order)
  on public.services to authenticated;
grant delete on public.services to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.services enable row level security;

create policy "services: miembros ven los servicios"
  on public.services for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "services: dueño/admin crean"
  on public.services for insert to authenticated
  with check ((select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[])));

create policy "services: dueño/admin editan"
  on public.services for update to authenticated
  using ((select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[])));

create policy "services: dueño/admin borran"
  on public.services for delete to authenticated
  using ((select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[])));
