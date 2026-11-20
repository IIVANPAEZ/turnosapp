# TurnosApp

> Nombre de trabajo. Se cambia en `frontend/src/lib/config.ts` cuando se defina la marca.

SaaS de gestión de turnos para profesionales independientes y pequeños negocios de belleza y salud. Mercado inicial: Paraguay (español, guaraníes PYG, zona horaria `America/Asuncion`).

## Stack

- **Web:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + lucide-react
- **Datos y auth:** Supabase (PostgreSQL, Auth, Row Level Security) — _próximo paso_
- **WhatsApp:** `whatsapp-web.js`. Cada profesional conecta su propio número escaneando un QR.
- **Deploy:** Vercel (web) + Supabase. El servicio de WhatsApp necesita un servidor propio (no corre en Vercel).

## Estructura

```
.
├── frontend/   App Next.js (panel privado en /dashboard, página pública en /[slug])
└── backend/    API Express en memoria (legado) + integración WhatsApp que se conserva
```

## Desarrollo

```bash
# Web
cd frontend
npm install
npm run dev        # http://localhost:3000

# Backend / WhatsApp (legado)
cd backend
npm install
npm run dev        # http://localhost:3050
```

## Estado

| Etapa | Estado |
|---|---|
| Base Next.js 16 + TS + shadcn, navegación del panel | ✅ |
| Sprint 1: Supabase, auth, negocios, profesionales, RLS, onboarding | Pendiente |
| Sprint 2: Servicios y horarios | Pendiente |
| Sprint 3: Agenda | Pendiente |
| Sprint 4: Reservas públicas | Pendiente |
| Sprint 5: Clientes, pagos y dashboard | Pendiente |
| Sprint 6: PWA y pruebas | Pendiente |
| WhatsApp por profesional | Post-MVP |
