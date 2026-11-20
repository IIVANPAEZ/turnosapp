-- rls_auto_enable() la crea Supabase (opción "Habilitar RLS automáticamente").
-- Es una función de event trigger: el trigger sigue funcionando sin que
-- anon/authenticated tengan permiso de ejecutarla. Se lo quitamos para que no
-- quede expuesta en /rest/v1/rpc/rls_auto_enable (aviso del linter 0028/0029).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
