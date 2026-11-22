-- Sprint 5 · "Iniciar cita": estado "En curso" guardado (antes se calculaba
-- con la hora). Va en su propia migración: Postgres no permite usar un valor
-- nuevo de un enum en la misma transacción que lo agrega.
alter type public.appointment_status add value 'in_progress' after 'confirmed';
