# TurnoPy — Web

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui (preset `base-nova`, sobre Base UI).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

> Next 16 trae su documentación en `node_modules/next/dist/docs/` (ver `AGENTS.md`). Ante dudas sobre APIs, consultarla ahí.

## Estructura

```
src/
├── app/
│   ├── page.tsx                 Landing provisoria
│   └── dashboard/               Panel privado
│       ├── layout.tsx           Sidebar + header
│       ├── page.tsx             Inicio
│       └── agenda/ clientes/ ingresos/ servicios/ horarios/
│           profesionales/ whatsapp/ configuracion/
├── components/
│   ├── ui/                      Componentes shadcn
│   └── layout/                  Sidebar, header, menú móvil, placeholder
└── lib/
    ├── config.ts                Nombre del producto, zona horaria, moneda, locale
    ├── navigation.ts            Ítems del menú del panel
    └── utils.ts                 Helper `cn`
```

## Configuración

- `next.config.ts` deja activados `cacheComponents` y `partialPrefetching` (valores por defecto de Next 16.4). Con Cache Components, llamadas como `new Date()` no pueden ejecutarse durante el prerender de un Server Component: van dentro de un Client Component o detrás de `<Suspense>` + `connection()`.
- Colores del tema en `src/app/globals.css` (variables CSS de shadcn). El color primario es azul.
