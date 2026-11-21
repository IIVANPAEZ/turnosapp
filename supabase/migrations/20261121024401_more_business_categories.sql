-- La app es para cualquier negocio que trabaje con turnos: más rubros.
-- (Agregar valores a un enum no afecta a las filas existentes.)
alter type public.business_category add value if not exists 'wellness' before 'other';     -- Bienestar y deporte
alter type public.business_category add value if not exists 'education' before 'other';    -- Clases y educación
alter type public.business_category add value if not exists 'professional' before 'other'; -- Servicios profesionales
alter type public.business_category add value if not exists 'pets' before 'other';         -- Mascotas
alter type public.business_category add value if not exists 'automotive' before 'other';   -- Autos y técnicos
alter type public.business_category add value if not exists 'tattoo' before 'other';       -- Tatuajes y arte
