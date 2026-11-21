-- reschedule_appointment crea el turno nuevo con un id elegido de antemano
-- (el turno viejo apunta a él dentro de la misma transacción): hace falta poder escribir "id".
grant insert (id) on public.appointments to authenticated;
