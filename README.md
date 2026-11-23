# TurnoPy

> Marca: **TurnoPy** (antes "TurnosApp", nombre de trabajo). Se define en `frontend/src/lib/config.ts` (`APP_NAME`, y `PUBLIC_SITE_DOMAIN` para el dominio de las páginas públicas). Pendiente: dominio propio y consulta de marca en la DINAPI. La carpeta, el repo y las claves internas del navegador (`turnosapp:…`) conservan el nombre viejo a propósito.

SaaS de gestión de turnos para cualquier negocio o profesional que trabaje con citas (peluquerías, consultorios, estudios, talleres, clases, etc.). Mercado inicial: Paraguay (español, guaraníes PYG, zona horaria `America/Asuncion`).

## Stack

- **Web:** Next.js 16 (App Router, `cacheComponents`) + TypeScript + Tailwind CSS 4 + shadcn/ui (Base UI) + lucide-react
- **Formularios:** React Hook Form + Zod (las mismas reglas se validan en el navegador y en el servidor)
- **Datos y auth:** Supabase (PostgreSQL 17, Auth, Row Level Security) con `@supabase/ssr` · región São Paulo (`sa-east-1`)
- **WhatsApp:** `whatsapp-web.js`. Cada profesional conecta su propio número escaneando un QR (post-MVP).
- **Deploy:** Vercel (web, región `gru1`) + Supabase. El servicio de WhatsApp necesita un servidor propio (no corre en Vercel).

## Estructura

```
.
├── frontend/                 App Next.js
│   └── src/
│       ├── app/
│       │   ├── (auth)/       /login, /registro, /recuperar, /actualizar-clave
│       │   ├── auth/confirm/ Destino de los links de los emails de Supabase
│       │   ├── (public)/[slug]/ Página pública de reservas (turnosapp.com/<negocio>)
│       │   ├── onboarding/   Alta del negocio (primer ingreso)
│       │   └── dashboard/    Panel privado
│       ├── components/       UI (shadcn en ui/), la tira del día, piezas por módulo (appointments/: "¿Cómo te pagó?")
│       ├── lib/
│       │   ├── .github/workflows/        CI: lint, TypeScript, pruebas rápidas y build en cada push
├── supabase/     Clientes (navegador/servidor/público sin sesión), proxy de sesión, tipos generados
│       │   ├── public/       Página pública: datos del negocio, horarios libres, reservar, archivo .ics
│       │   ├── auth/         DAL (quién es el usuario y su negocio), Server Actions, validaciones
│       │   ├── business/     Onboarding, configuración del negocio, slug, profesionales
│       │   ├── services/     Servicios: reglas, plantillas por rubro, datos y acciones
│       │   ├── schedule/     Horarios semanales, bloqueos, feriados de Paraguay
│       │   ├── agenda/       Agenda: datos por día/semana, horarios libres, acciones de turnos
│       │   ├── appointments/ Estados del turno (textos y colores)
│       │   ├── clients/      Clientes: resumen, ficha, edición, formas de pago
│       │   ├── income/       Ingresos: períodos y totales
│       │   ├── time/zone.ts  Fechas y horas en la zona del negocio (sin dependencias)
│       │   ├── whatsapp.ts   Links de WhatsApp con mensaje listo
│       │   └── format.ts     Guaraníes (₲ 150.000) y duraciones (1 h 30 min)
│       └── proxy.ts          Renueva la sesión y redirige según haya sesión o no
│   └── tests/                Pruebas: unit/ (Vitest) y e2e/ (Playwright)
│   └── .interface-design/    Guía del sistema de diseño (colores, tipografía, patrones)
├── supabase/
│   └── migrations/           Esquema de la base (versionado, se aplica con la CLI)
└── backend/                  API Express en memoria (legado) + integración WhatsApp que se conserva
```

## Puesta en marcha

### Requisitos
- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`). No hace falta Docker: se trabaja contra el proyecto en la nube.

### 1. Variables de entorno
```bash
cp frontend/.env.example frontend/.env.local
```
Completar con los datos del proyecto (Supabase → *Project Settings → Data API / API Keys*):
- `NEXT_PUBLIC_SUPABASE_URL` → `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `sb_publishable_...`

> Nunca poner la **secret key** ni la contraseña de la base en el repo ni en variables `NEXT_PUBLIC_*`.

### 2. Vincular la CLI y aplicar la base
Desde la raíz del repo, **en una terminal propia** (los comandos piden navegador o contraseña):
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --remote      # aplica supabase/migrations/
```

### 3. Levantar la web
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### Scripts útiles (`frontend/`)
| Script | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (falla si algo lee la sesión fuera de `<Suspense>`) |
| `npm run typecheck` | Chequeo de TypeScript |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` desde la base. Correr después de cada migración. |
| `npm test` | Pruebas rápidas de la lógica (Vitest, `tests/unit/`, menos de 1 s) |
| `npm run test:e2e` | Pruebas de punta a punta (Playwright, `tests/e2e/`): compila, levanta la app en el puerto 3124 y recorre la app en Chrome |
| `npm run test:e2e:ui` | Lo mismo, con una ventana para verlas paso a paso |

### Pruebas
- **Rápidas (Vitest):** fechas y zona horaria, horarios libres, WhatsApp, guaraníes, períodos de Ingresos, archivo de calendario, slug, horarios y validaciones.
- **De punta a punta (Playwright):** registro y alta del negocio; finalizar con cobro, anular y volver a cobrar; iniciar → finalizar desde Inicio; reserva pública y confirmación; semanas, link inexistente y reservas pausadas; clientes; ingresos (y que una profesional no los vea); app instalable; navegación en el celular.
  - Usan el Chrome instalado (no descargan navegadores) y el proyecto de Supabase real con usuarios `e2e+pw-…@turnosapp-test.dev`, que se borran al terminar (`tests/e2e/global-teardown.ts`). Necesitan la CLI de Supabase vinculada.
  - La prueba "Iniciar → Finalizar desde Inicio" se saltea sola cerca de la medianoche (arma un turno de hoy a 30 minutos).
- **GitHub Actions** (`.github/workflows/ci.yml`): en cada push corre lint, TypeScript, las pruebas rápidas y el build, con valores de relleno para Supabase (las claves reales nunca se suben). Las de punta a punta se corren en la compu.

### Instalar la app (PWA)
- **Android / computadora (Chrome, Edge):** botón **Instalar** en Inicio, o "Instalar app" en el menú de la cuenta (la inicial, arriba a la derecha). También el ícono de instalar en la barra de direcciones.
- **iPhone (Safari):** Compartir → **"Agregar a inicio"** (la app lo explica en Inicio y en el menú).
- Hace falta **HTTPS** (en la compu, `localhost` también sirve). El manifiesto (`/app.webmanifest`) solo se enlaza en el panel y en el acceso: la página pública de reservas no ofrece instalar el panel a los clientes.
- **Sin conexión:** aviso "Sin conexión" y reintento automático de navegaciones y acciones al volver la señal (`experimental.useOffline`). No se guardan datos en el celular.

### Cambios en la base
```bash
supabase migration new <nombre>     # crea supabase/migrations/<fecha>_<nombre>.sql
# escribir el SQL, revisarlo y luego:
supabase db push --remote --dry-run # muestra qué se aplicaría
supabase db push --remote
cd frontend && npm run db:types
```
`supabase db advisors --remote` revisa problemas de seguridad y rendimiento.

## Publicar en Vercel

La web se publica en Vercel (región São Paulo `gru1`, junto a la base en Supabase `sa-east-1`; ver `frontend/vercel.json`). Cada push a `main` se publica solo; cada rama tiene su propia dirección de prueba (usa la misma base de Supabase).

1. **vercel.com → Add New → Project →** importar el repo de GitHub.
2. **Root Directory:** `frontend` (el repo también tiene `backend/`). Framework: Next.js (se detecta solo).
3. **Environment Variables** (Production y Preview):
   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la misma de `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la misma de `.env.local` (la **publishable**, nunca la secret) |
   | `NEXT_PUBLIC_SITE_URL` | `https://turnopy.vercel.app` (o el dominio propio) |
4. **Deploy.** En Settings → Domains, la dirección de producción queda como `turnopy.vercel.app` si el nombre del proyecto es `turnopy` y está libre.
5. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** `https://turnopy.vercel.app`
   - **Redirect URLs:** `https://turnopy.vercel.app/**`, `http://localhost:3000/**` y, para las direcciones de prueba de Vercel, `https://*-<tu-equipo>.vercel.app/**`.
6. **Supabase → Authentication → Passwords:** activar la protección contra contraseñas filtradas (si el plan la incluye).

Con dominio propio: agregarlo en Vercel (Settings → Domains), cambiar `NEXT_PUBLIC_SITE_URL` y volver a publicar, y actualizar Site URL / Redirect URLs en Supabase.

**Seguridad en producción:** `next.config.ts` agrega `frame-ancestors 'none'` / `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS. No hay CSP completa con *nonces* a propósito: obligaría a generar cada página en el momento (se perdería la carga instantánea).

## Configuración del panel de Supabase

La configuración de Auth **vive en el panel de Supabase, no en el repo**. `supabase/config.toml` solo aplica a un entorno local y hoy tiene valores distintos: **no correr `supabase config push`** sin revisar antes `supabase config diff --remote`, porque pisaría esta configuración.

| Dónde | Desarrollo | Producción (antes de lanzar) |
|---|---|---|
| Authentication → Sign In / Providers → **Email** | Habilitado | Habilitado |
| → **Confirmar correo electrónico** | Apagado | **Encendido**, con SMTP propio (ej. Resend) |
| Authentication → URL Configuration → **Site URL** | `http://localhost:3000` | Dominio real |
| → **Redirect URLs** | `http://localhost:3000/**` | Agregar `https://<dominio>/**` y las previews de Vercel |
| Templates de email | Por defecto | Traducir al español; usar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...` para que los links funcionen en otro dispositivo |

> El SMTP gratuito de Supabase solo envía a los emails del equipo del proyecto y tiene un límite bajo por hora.

## Seguridad (multi-tenant)

- Cada tabla principal tiene `business_id`. **RLS** está activo en todas: cada usuario ve y edita solo los datos de su negocio.
- Permisos por columna: la app solo puede modificar las columnas editables (por ejemplo, nadie puede cambiarse el rol).
- Las altas sensibles pasan por funciones de la base (`create_business`, `set_working_hours`, `add_time_off`), que validan y guardan todo en una sola transacción.
- Reglas de negocio en la base: nombres de servicio únicos por negocio, duraciones en múltiplos de 5, franjas horarias sin superposición (exclusión con `btree_gist`), fechas de bloqueos convertidas con la zona horaria del negocio.
- Las funciones auxiliares de seguridad viven en el esquema `private` (no expuesto en la API).
- **Página pública (sin sesión):** quien no tiene sesión no puede leer ni escribir ninguna tabla. Solo puede usar 4 funciones de la base: `public_business`, `public_services`, `public_availability` (devuelve solo `{día, horario}`, nunca datos de otros clientes) y `book_appointment` (valida todo de nuevo, evita reservas simultáneas con la exclusión de turnos, campo trampa contra bots, máximo 3 reservas por venir por celular). El panel de Supabase avisa que esas funciones son `SECURITY DEFINER` ejecutables sin sesión: es a propósito.
- **Cobros:** la tabla `payments` no tiene permisos de escritura directos: se cobra con `finish_appointment` / `record_payment` y se anula con `void_payment`, que revisan que sea el dueño/admin o el profesional del turno. Un profesional lee solo los cobros de sus turnos; la pantalla de Ingresos es solo para dueño/admin. Un cobro nunca se borra (se anula con motivo).
- **Tablas nuevas:** Supabase da por defecto todos los permisos a `anon` y `authenticated` sobre las tablas nuevas de `public`. Toda migración que cree una tabla tiene que hacer `revoke all … from anon` y dar a `authenticated` solo lo necesario.
- En el código, el **proxy** solo hace redirecciones rápidas; la autorización real está en `src/lib/auth/dal.ts` y en RLS.

## Estado

| Etapa | Estado |
|---|---|
| Base Next.js 16 + TS + shadcn, navegación del panel | ✅ |
| Sprint 1: Supabase, auth, negocios, profesionales, RLS, onboarding | ✅ |
| Sprint 2: Configuración, servicios y horarios | ✅ |
| Sprint 3: Agenda | ✅ |
| Sprint 4: Reservas públicas | ✅ |
| Sprint 5: Clientes, pagos y dashboard | ✅ |
| Sprint 6: PWA y pruebas | ✅ |
| WhatsApp por profesional | Post-MVP |

### Sprint 1 — qué incluye
- Proyecto Supabase en São Paulo, migraciones versionadas en `supabase/migrations/`.
- Tablas `profiles`, `businesses`, `business_members` con RLS y permisos por columna.
- Registro, login, recuperar y actualizar contraseña, cierre de sesión, `/auth/confirm`.
- Onboarding: alta del negocio con dirección pública (`slug`) verificada en vivo.
- Panel protegido: sin sesión → `/login`; sin negocio → `/onboarding`. Header con negocio y usuario.
- Profesionales: el dueño edita su nombre visible y color de agenda (agregar personal: post-MVP).

### Sprint 2 — qué incluye
- **Rediseño visual:** tema oscuro grafito + ámbar, Space Grotesk, "la tira del día" (ver `frontend/.interface-design/system.md`).
- **Configuración** (`/dashboard/configuracion`): nombre, rubro, descripción, dirección pública (con aviso al cambiarla), WhatsApp, dirección y ciudad.
- **Servicios** (`/dashboard/servicios`): duración, precio en guaraníes (fijo o "desde"), pausar/activar, duplicar, eliminar y plantillas por rubro. Sin señas ni pagos por ahora.
- **Horarios** (`/dashboard/horarios`): semana por profesional con pausas elegibles, vista semanal, plantillas, copiar a otros días; bloqueos de días completos o de unas horas; feriados nacionales de Paraguay como sugerencias (Semana Santa calculada; los trasladables se marcan para confirmar).
- **Inicio:** horario real de hoy (descontando bloqueos) en la tira del día y "Primeros pasos" con el progreso real.

### Sprint 3 — qué incluye
- **Base:** `clients` (nombre + celular; el celular no se repite, se normaliza "+595…" = "0…") y `appointments` (precio congelado, estados, reprogramado, motivo). Dos turnos activos del mismo profesional **no se pueden pisar** (exclusión con `btree_gist`). Funciones `create_appointment`, `reschedule_appointment` (todo o nada) y `set_appointment_status`. Los turnos no se borran (se cancelan) y un servicio con turnos no se puede borrar (se pausa).
- **Agenda** (`/dashboard/agenda`): cuadrícula horas × días (cada 30 min), vista Día y Semana (en el celular, lista por día), navegación por fechas con calendario. Varios turnos en el mismo horario se apilan. El dueño/admin ve los turnos de todo el equipo; cada profesional, los suyos.
- **Nuevo turno:** buscar o crear cliente (aviso de celular duplicado), servicio con duración ajustable, horarios libres sugeridos (horario, pausas, bloqueos y otros turnos), avisos de fuera de horario/bloqueo/pasado y error si se pisa. Desde la barra, el "+" flotante, una celda o el Inicio.
- **Detalle del turno:** confirmar, finalizar y "no vino" (desde la hora de inicio), cancelar con motivo, reprogramar (calendario + horarios libres), deshacer, editar nota; WhatsApp con mensaje listo (confirmación, recordatorio, reprogramado, cancelado).
- **Inicio:** tarjeta "Hoy" con En curso / Próximos / Atendidos, acciones rápidas y aviso de turnos **sin cerrar** (Vino / No vino).

### Sprint 4 — qué incluye
- **Página pública** (`/<slug>`, ej. `localhost:3000/ivan-dev`): encabezado del negocio (rubro, descripción, dirección, "Consultar por WhatsApp") y reserva en pasos: servicio → día (tira con "N libres", "Más días") → horario (Mañana / Tarde) → tus datos (nombre, celular obligatorio, nota) → "¡Listo, tu turno está reservado!" con **Agregar a mi calendario** (.ics con aviso 1 h antes) y **Escribir al negocio**. Recuerda nombre y celular en el navegador del cliente. Si el horario se ocupa mientras completa los datos, vuelve a elegir con horarios actualizados. Título y descripción para compartir el link.
- **Reglas:** las reservas van al dueño (primer profesional reservable); entran **"Por confirmar"** salvo que el negocio active la confirmación automática; el cliente cancela o cambia **por WhatsApp** (sin link de autogestión). Por defecto: anticipación mínima 30 min y hasta 90 días adelante.
- **Configuración → Reservas online:** activar/pausar, anticipación mínima, hasta cuándo se puede reservar y confirmación automática.
- **Agenda:** marca "Online" (vista día), ícono de globo (semana) y "Reservado online" en el detalle.
- **Inicio:** aviso "Tenés N reservas online por confirmar" con **Confirmar** y WhatsApp ("Avisarle" con el mensaje de confirmación); tarjeta "Tu página de reservas" (Activa / Pausada / Falta configurar, Copiar, Ver mi página, Compartir por WhatsApp). "Compartí tu link" se tilda la primera vez que se copia o comparte.

### Sprint 5 — qué incluye
- **Clientes** (`/dashboard/clientes`): lista con buscador (nombre sin tildes o parte del celular), filtros Nuevos / Frecuentes / No volvieron, orden Recientes / A–Z / Más visitas, última visita, próximo turno, visitas y cobrado. **Ficha:** visitas, "no vino", cobrado, celular con Llamar y WhatsApp, **nota** (sin datos de salud), próximos turnos e historial con el cobro; editar datos (celular repetido → aviso); "Nuevo turno para…" con el cliente ya elegido. Desde el detalle de un turno: "Ver ficha del cliente".
- **Iniciar cita:** el turno pasa a "En curso" de verdad (se guarda la hora real). Desde 1 h antes de la hora; opcional.
- **Finalizar cita = cobrar:** "¿Cómo te pagó?" con el monto del servicio (editable) y **Efectivo** / **Transferencia o tarjeta** — un toque finaliza y registra el cobro. "Finalizar sin cobrar" para casos especiales; después, "Registrar cobro" o "Anular cobro" desde el detalle. Pagos manuales: el negocio cobra por su cuenta; **un cobro por turno**, sin parciales ni ingresos sueltos (por ahora).
- **Ingresos** (`/dashboard/ingresos`, solo dueño/admin): período (hoy, semana, mes, mes anterior o fechas), cobrado vs. período anterior, turnos atendidos, ticket promedio, falta cobrar (con "Cobrar" ahí mismo), gráfico por día, desgloses por forma de pago, servicio y profesional, % no vino, clientes nuevos, % reservas online y lista de cobros. **Inicio:** tira "Hoy cobraste ₲ … · Falta cobrar ₲ …".

### Sprint 6 — qué incluye
- **App instalable:** manifiesto (solo en el panel y el acceso), íconos con el logo (Android, iPhone, favicon), "Instalá TurnoPy" en Inicio ("Ahora no" la oculta 30 días) e "Instalar app" en el menú de la cuenta; en iPhone, los pasos de Compartir → Agregar a inicio.
- **Sin conexión:** pastilla "Sin conexión…" abajo y reintento automático.
- **Celular como app:** barra fija abajo (Inicio · Agenda · Clientes · Ingresos · Más), bordes del iPhone (safe-area), alto real de pantalla (`dvh`).
- **Pantallas de carga, error (Reintentar) y "No encontrada"**, también en la página pública.
- **Página pública:** elegir el día por semana (lunes a domingo, flechas, salta sola a la primera semana con lugar) en lugar de la tira que no se podía deslizar con el mouse.
- **Pruebas** guardadas (Vitest + Playwright) y **CI** en GitHub.
- **Datos siempre de la visita actual** (`connection()` al leer la sesión y en la página pública): sin avisos de precarga en el servidor, y si Supabase falla la página pública muestra "Algo salió mal · Reintentar" (no "No encontramos esta página").

### Pendientes conocidos
- Al eliminar la cuenta de un dueño, su negocio queda sin dueño: implementar "eliminar cuenta" borrando también el negocio.
- Antes de producción: confirmación de email + SMTP propio + templates en español; activar la protección contra contraseñas filtradas (Auth → Passwords).
- Feriados trasladables (1 de marzo, 12 de junio, 29 de setiembre): confirmar cada año la fecha que fija el gobierno.
- Agregar personal (varios profesionales) y qué servicios hace cada uno: post-MVP; las tablas ya lo contemplan. Al hacerlo: restringir en RLS que el personal vea solo sus turnos y sumar al dueño un selector "Todos / Mis turnos / <profesional>" en la agenda.
- `npm audit`: 4 avisos moderados de `minimatch` dentro de la CLI de shadcn (solo se usa al compilar los estilos; no corre en la app).
- Ingresos sueltos (venta de productos) y cobros parciales: decididos para más adelante.
- "Deshacer inicio" vuelve el turno a Confirmado pero conserva la primera hora de inicio guardada.
- Dominio real: los links copiados usan el dominio donde está abierta la app; la tarjeta muestra `turnosapp.com/…` (`PUBLIC_SITE_DOMAIN` en `src/lib/config.ts`).
- Abuso de la página pública: el límite de 3 reservas es por celular; alguien que invente números podría llenar la agenda. Si pasa, sumar un tope por negocio y por hora, o un límite por IP.
- Elegir profesional en la página pública: cuando haya equipo (hoy todo va al dueño).
- Recordatorios automáticos por WhatsApp (whatsapp-web.js, un número por profesional): post-MVP. Hoy los mensajes se abren en el WhatsApp del profesional para enviarlos a mano.
