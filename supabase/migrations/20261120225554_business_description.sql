-- Sprint 2 · Etapa 1: descripción corta del negocio (se muestra en la página pública).
alter table public.businesses
  add column description text check (char_length(description) <= 300);

-- Dueño/admin pueden editarla (la política RLS "businesses: dueño/admin editan" ya cubre la fila).
grant update (description) on public.businesses to authenticated;
