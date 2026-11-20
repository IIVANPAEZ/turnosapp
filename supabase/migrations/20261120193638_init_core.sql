-- =============================================================================
-- TurnosApp · Sprint 1 · Núcleo multi-tenant
-- Perfiles de usuario, negocios, profesionales del negocio, RLS y onboarding.
-- =============================================================================

-- Esquema privado para funciones auxiliares (NO se expone en la API de datos).
create schema if not exists private;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.business_category as enum ('beauty', 'health', 'other');
create type public.member_role as enum ('owner', 'admin', 'staff');

-- -----------------------------------------------------------------------------
-- Funciones auxiliares
-- -----------------------------------------------------------------------------

-- Mantiene updated_at al día en cada UPDATE.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Slug válido: 3-40 caracteres, minúsculas/números/guiones, sin guion al
-- inicio o al final, y que no choque con rutas de la app.
create function private.is_valid_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
     and p_slug !~ '--'
     and p_slug <> all (array[
       'admin', 'api', 'app', 'auth', 'ayuda', 'actualizar-clave', 'assets',
       'configuracion', 'cuenta', 'dashboard', 'login', 'logout', 'onboarding',
       'perfil', 'precios', 'privacidad', 'public', 'recuperar', 'registro',
       'reservar', 'soporte', 'static', 'terminos', 'turnos', 'www'
     ]);
$$;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

-- Datos básicos de cada usuario (1 a 1 con auth.users). Se crea por trigger.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 80),
  phone      text check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El negocio (tenant). Todo lo demás cuelga de business_id.
create table public.businesses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 80),
  slug       text not null unique check (private.is_valid_slug(slug)),
  category   public.business_category not null default 'other',
  phone      text check (char_length(phone) <= 30),
  whatsapp   text check (char_length(whatsapp) <= 30),
  address    text check (char_length(address) <= 160),
  city       text check (char_length(city) <= 80),
  timezone   text not null default 'America/Asuncion',
  currency   char(3) not null default 'PYG',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profesionales del negocio. user_id puede ser null a futuro
-- (personal que atiende pero no tiene cuenta).
create table public.business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  role         public.member_role not null default 'staff',
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  color        text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_bookable  boolean not null default true,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index business_members_business_id_idx on public.business_members (business_id);

-- MVP: 1 usuario = 1 negocio. Para permitir varios, borrar este índice.
create unique index business_members_one_business_per_user
  on public.business_members (user_id)
  where user_id is not null;

-- Un solo dueño por negocio.
create unique index business_members_one_owner_per_business
  on public.business_members (business_id)
  where role = 'owner';

create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.business_members
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Funciones de autorización (usadas por las políticas RLS)
-- security definer: leen business_members sin volver a disparar RLS.
-- -----------------------------------------------------------------------------
create function private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.is_active
  );
$$;

create function private.has_business_role(p_business_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.is_active
      and m.role = any (p_roles)
  );
$$;

-- -----------------------------------------------------------------------------
-- Permisos por columna (defensa en profundidad, además de RLS)
-- anon no toca estas tablas; authenticated solo edita columnas permitidas.
-- Altas de negocios/miembros: solo vía la función create_business.
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.businesses, public.business_members from anon;
revoke insert, update, delete on public.profiles, public.businesses, public.business_members from authenticated;

grant update (full_name, phone) on public.profiles to authenticated;
grant update (name, slug, category, phone, whatsapp, address, city) on public.businesses to authenticated;
grant update (display_name, color, is_bookable) on public.business_members to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

-- profiles: cada uno ve y edita solo su perfil.
create policy "profiles: ver el propio"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: editar el propio"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- businesses: los miembros lo ven; dueño/admin lo editan.
create policy "businesses: miembros ven su negocio"
  on public.businesses for select to authenticated
  using ((select private.is_business_member(id)));

create policy "businesses: dueño/admin editan"
  on public.businesses for update to authenticated
  using ((select private.has_business_role(id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_business_role(id, array['owner', 'admin']::public.member_role[])));

-- business_members: los miembros ven a sus compañeros;
-- dueño/admin editan a cualquiera, cada uno se edita a sí mismo.
create policy "business_members: miembros ven el equipo"
  on public.business_members for select to authenticated
  using ((select private.is_business_member(business_id)));

create policy "business_members: dueño/admin o uno mismo editan"
  on public.business_members for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
  )
  with check (
    user_id = (select auth.uid())
    or (select private.has_business_role(business_id, array['owner', 'admin']::public.member_role[]))
  );

-- -----------------------------------------------------------------------------
-- Perfil automático al registrarse
-- Toma full_name y phone de los metadatos enviados en signUp.
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 80),
    left(nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''), 30)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Onboarding (RPC expuestas a la app)
-- -----------------------------------------------------------------------------

-- ¿Está libre este slug? (RLS oculta negocios ajenos, por eso security definer)
create function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_valid_slug(p_slug)
     and not exists (select 1 from public.businesses b where b.slug = p_slug);
$$;

-- Crea el negocio y carga al usuario actual como dueño, en una sola transacción.
-- Errores: 28000 sin sesión · P0001 'already_has_business'
--          23505 slug tomado · 23514 datos inválidos (check)
create function public.create_business(
  p_name     text,
  p_slug     text,
  p_category public.business_category,
  p_phone    text default null,
  p_whatsapp text default null,
  p_city     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id     uuid := auth.uid();
  v_business_id uuid;
  v_display     text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.business_members where user_id = v_user_id) then
    raise exception 'already_has_business' using errcode = 'P0001';
  end if;

  insert into public.businesses (name, slug, category, phone, whatsapp, city)
  values (
    btrim(p_name),
    lower(btrim(p_slug)),
    p_category,
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_whatsapp), ''),
    nullif(btrim(p_city), '')
  )
  returning id into v_business_id;

  select coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Profesional')
    into v_display
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_user_id;

  insert into public.business_members (business_id, user_id, role, display_name)
  values (v_business_id, v_user_id, 'owner', left(v_display, 80));

  return v_business_id;
end;
$$;

-- Solo usuarios logueados pueden llamar a las RPC.
revoke execute on function public.is_slug_available(text) from public, anon;
revoke execute on function public.create_business(text, text, public.business_category, text, text, text) from public, anon;
grant execute on function public.is_slug_available(text) to authenticated;
grant execute on function public.create_business(text, text, public.business_category, text, text, text) to authenticated;

-- Las funciones privadas no deben ser invocables por anon.
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.is_valid_slug(text) to authenticated;
