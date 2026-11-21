-- Valores por defecto de las reservas online (pedido del usuario):
--  - Anticipación mínima: 30 minutos (alguien que pasa o está cerca puede reservar).
--  - Hasta 90 días hacia adelante.
alter table public.businesses
  alter column booking_min_notice_minutes set default 30,
  alter column booking_max_days set default 90;

-- Negocios que todavía tienen los valores anteriores (no los cambió nadie a mano).
update public.businesses
   set booking_min_notice_minutes = 30
 where booking_min_notice_minutes = 120;

update public.businesses
   set booking_max_days = 90
 where booking_max_days = 30;
