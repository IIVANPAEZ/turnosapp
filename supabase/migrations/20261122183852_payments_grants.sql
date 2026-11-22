-- Supabase da por defecto todos los permisos sobre las tablas nuevas.
-- Cobros: el visitante sin sesión no tiene ningún permiso; el usuario con
-- sesión solo puede leer (RLS decide qué filas). Se escribe solo con
-- record_payment / void_payment.
revoke all on public.payments from anon;
revoke all on public.payments from authenticated;
grant select on public.payments to authenticated;
