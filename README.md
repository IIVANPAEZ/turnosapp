# TurnosApp

> Nombre de trabajo. Se cambia en `frontend/src/lib/config.ts` (`APP_NAME`, y `PUBLIC_SITE_DOMAIN` para el dominio de las páginas públicas).

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
│       │   ├── onboarding/   Alta del negocio (primer ingreso)
│       │   └── dashboard/    Panel privado
│       ├── components/       UI (shadcn en ui/), la tira del día, piezas por módulo
│       ├── lib/
│       │   ├── supabase/     Clientes (navegador/servidor), proxy de sesión, tipos generados
│       │   ├── auth/         DAL (quién es el usuario y su negocio), Server Actions, validaciones
│       │   ├── business/     Onboarding, configuración del negocio, slug, profesionales
│       │   ├── services/     Servicios: reglas, plantillas por rubro, datos y acciones
│       │   ├── schedule/     Horarios semanales, bloqueos, feriados de Paraguay
│       │   └── format.ts     Guaraníes (₲ 150.000) y duraciones (1 h 30 min)
│       └── proxy.ts          Renueva la sesión y redirige según haya sesión o no
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

### Cambios en la base
```bash
supabase migration new <nombre>     # crea supabase/migrations/<fecha>_<nombre>.sql
# escribir el SQL, revisarlo y luego:
supabase db push --remote --dry-run # muestra qué se aplicaría
supabase db push --remote
cd frontend && npm run db:types
```
`supabase db advisors --remote` revisa problemas de seguridad y rendimiento.

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
- En el código, el **proxy** solo hace redirecciones rápidas; la autorización real está en `src/lib/auth/dal.ts` y en RLS.

## Estado

| Etapa | Estado |
|---|---|
| Base Next.js 16 + TS + shadcn, navegación del panel | ✅ |
| Sprint 1: Supabase, auth, negocios, profesionales, RLS, onboarding | ✅ |
| Sprint 2: Configuración, servicios y horarios | ✅ |
| Sprint 3: Agenda | Pendiente |
| Sprint 4: Reservas públicas | Pendiente |
| Sprint 5: Clientes, pagos y dashboard | Pendiente |
| Sprint 6: PWA y pruebas | Pendiente |
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

### Pendientes conocidos
- Al eliminar la cuenta de un dueño, su negocio queda sin dueño: implementar "eliminar cuenta" borrando también el negocio.
- Antes de producción: confirmación de email + SMTP propio + templates en español; activar la protección contra contraseñas filtradas (Auth → Passwords).
- Feriados trasladables (1 de marzo, 12 de junio, 29 de setiembre): confirmar cada año la fecha que fija el gobierno.
- Agregar personal (varios profesionales) y qué servicios hace cada uno: post-MVP; las tablas ya lo contemplan.
