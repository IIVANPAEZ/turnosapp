# TurnosApp · Sistema de diseño

> Fuente de verdad para pantallas nuevas. Los valores viven en `src/app/globals.css`;
> este archivo explica **por qué** y **cómo usarlos**.

## Dirección

- **Quién lo usa:** cualquier negocio o profesional que trabaja con turnos en Paraguay (barbería, consultorio, estudio de tatuajes, taller, profesor particular, etc.). Los textos de la interfaz son **generales**: nunca "para belleza y salud". Abren la app **en el celular**, entre un cliente y otro, para ver *cómo viene el día*. Viven en WhatsApp.
- **Cómo se siente:** oscuro, moderno y **unisex**. Ordenado y tranquilo, con un solo punto de calor (el ámbar). Nada de rosa ni ciruela: el usuario los descartó por "muy de mujer".
- **Origen de la paleta:** la *tierra colorada* al atardecer (ámbar) sobre una mesa de trabajo oscura (grafito).

## Colores (tokens)

Usar **siempre** las clases de Tailwind de los tokens; nunca hex sueltos ni `slate-*`, `white`, `emerald-*`.

| Rol | Token / clase | Valor |
|---|---|---|
| Fondo de la app | `bg-background` (`--carbon`) | `#121417` |
| Hundido (campos, tira del día, barras) | `bg-inset` | `#0d0f11` |
| Capa 1 (tarjetas) | `bg-card` | `#1a1d21` |
| Capa 2 (menús, ítem activo, chips) | `bg-raised` / `bg-secondary` | `#22262b` |
| Texto principal | `text-foreground` (`--tiza`) | `#eef0f2` |
| Texto secundario fuerte | `text-secondary-foreground` | `#cdd2d7` |
| Texto de apoyo | `text-muted-foreground` (`--humo`) | `#959ca5` |
| Metadatos, placeholders | `text-faint` (`--ceniza`) | `#5f666e` |
| **Acento único** | `bg-primary` / `text-primary` (`--ambar`) | `#f2a93b` |
| Texto sobre ámbar | `text-primary-foreground` | `#1d1206` |
| Fondo ámbar suave (seleccionado, íconos) | `bg-primary-soft` | ámbar 12% |
| Marca de "ahora" | `bg-now` | `#7dd3fc` |
| Éxito / disponible | `text-success`, `bg-success-soft` | `#86d9a0` |
| Atención / espera seña | `text-warning`, `bg-warning-soft` | `#f5c56b` |
| Error | `text-destructive` | `#f87171` |
| Borde estándar | `border` (default) | blanco 8% |
| Borde de énfasis / hover | `border-line-strong` | blanco 16% |

**Reglas**
- Un solo acento. El ámbar significa *acción o estado activo*, no decoración.
- La jerarquía de superficies se hace con **luminosidad** (inset < background < card < raised), saltos chicos.
- Los colores de los profesionales (`MEMBER_COLORS` en `src/lib/business/members.ts`) son datos del usuario: solo en avatares y bloques de la tira del día.
- La app es **solo oscura** (`<html class="dark">`, `color-scheme: dark`).

## Tipografía

| Uso | Fuente | Detalle |
|---|---|---|
| Interfaz y títulos | **Space Grotesk** (`font-sans`) | Títulos `font-semibold tracking-tight` |
| Horas, montos, links, contadores | **JetBrains Mono** (`font-mono`) + `.tabular` | Números alineados |

Escala usada: título de página `text-2xl`–`text-3xl` · título de tarjeta `font-medium` (base) · cuerpo `text-sm` · metadatos `text-xs` · etiquetas de sección del sidebar `text-[10.5px] uppercase tracking-[0.12em] text-faint`.

## Profundidad, radios y espaciado

- **Profundidad:** capas por luminosidad + bordes de baja opacidad. Sin sombras fuertes. Excepciones permitidas: brillo ámbar sutil en el botón primario y en el logo; sombra difusa en la tarjeta del onboarding.
- **Radios:** `rounded-lg` (10px) controles · `rounded-xl` tarjetas · `rounded-2xl` contenedores destacados · `rounded-full` avatares y chips.
- **Espaciado:** base 4px. Tarjetas con padding 20px (`--card-spacing: 5`). Separación entre bloques de una página: `gap-6`. Contenido del panel: `max-w-5xl mx-auto`, padding `px-4 py-6 md:px-8 md:py-8`.
- **Tamaños táctiles:** campos `h-10`; botones `h-9` (default), `h-10` (lg), `h-8` (sm).

## Elemento propio: "la tira del día"

`src/components/day-strip.tsx` — el día de trabajo (8–20 h por defecto) como franja horizontal hundida; los turnos son bloques del color de cada profesional; la marca celeste de "ahora" se mueve sola (hora de Asunción, solo en el navegador).

- Usarla donde se hable de **cuándo se atiende**: Horarios (vista semanal) y Agenda (vista día). En el **Inicio y el login NO**: ahí va la tarjeta "Hoy" con pestañas (ver abajo). El usuario la encontró poco clara para "qué tengo hoy".
- En franjas angostas (`@container` < md) los bloques ocultan el texto.
- No reemplazarla por un gráfico de barras ni una lista: es la firma visual del producto.
- **Abierto / cerrado:** `openRanges` pinta las horas de atención en ámbar oscuro sólido y deja las cerradas rayadas. Con `rangeLabels` se escribe el horario dentro de cada tramo (`08–12`). El usuario pidió que se entienda sin interpretar colores: siempre que se muestre un horario, acompañarlo de texto (horas escritas, total del día).
- `size="sm"` (compacta) existe, pero para pilas de días se prefiere el tamaño normal con `hourScale={false}` y una sola escala de horas abajo.
- Vocabulario para el usuario: "horario", "pausa", "cerrado", "bloqueo". Evitar "franja" en la interfaz (resultó confuso).

## Tarjeta "Hoy" (Inicio y login)

`src/components/today/today-panel.tsx` — pestañas **En curso · Próximos · Atendidos** con contador; se abre sola la que importa. Cada turno: hora (mono), cliente, servicio y chip de estado (`src/lib/appointments/status.ts`: Pendiente, Confirmado, Finalizado, Cancelado, No vino; "Reprogramado → jue 14:00" es una marca; "En curso" se calcula con la hora). En curso muestra progreso y acciones rápidas (Finalizar / No vino). En el login va como muestra con `demo` (hora fija 14:50) y se oculta en el celular.

## Patrones de componentes

- **Pantallas públicas** (landing, login, registro, recuperar): `BrandHero` (resplandor `.glow-ambar`, titular, tira del día de ejemplo) + formulario directo sobre el fondo con `AuthCard` (sin tarjeta). Celular: marca arriba; escritorio: lado a lado.
- **Encabezado de página del panel:** título en el `AppHeader` (desde `src/lib/navigation.ts`) + fecha; dentro de la página, `h2 text-2xl` y descripción `text-sm text-muted-foreground`.
- **Navegación:** sidebar del mismo color que el fondo con `border-r`; ítem activo `bg-raised` + ícono ámbar + puntito ámbar; hover `bg-card`.
- **Opciones elegibles (rubros, colores):** `label` con `input` `sr-only`; base `bg-inset border`, hover `border-line-strong`, seleccionado `border-primary/70 bg-primary-soft` con ícono en cuadradito `bg-primary`.
- **Chips de estado:** `rounded-full px-2 py-0.5 text-[11px]` — neutro `bg-raised text-muted-foreground`, éxito `bg-success-soft text-success`, atención `bg-warning-soft text-warning`.
- **Ícono destacado:** `size-10 rounded-xl bg-primary-soft text-primary`.
- **Esqueletos de carga:** `animate-pulse` con `bg-raised` / `bg-card` / `bg-inset` (nunca grises claros).
- **Módulos sin construir:** `PagePlaceholder` (borde punteado, ícono del módulo, "Llega en el Sprint X").
- **Datos que dependen de la sesión:** siempre dentro de `<Suspense>` con un esqueleto que imite el layout final (requisito de `cacheComponents`).
- **Formularios largos (Configuración, Horarios):** barra flotante `sticky bottom-4` (`bg-popover/95`, blur) con "Tenés cambios sin guardar" + **Descartar** / **Guardar**; al guardar muestra "✓ … guardado" 3 s.
- **Crear/editar un ítem (servicios, bloqueos):** `Sheet` a la derecha en escritorio (`sm:max-w-md`) y desde abajo en el celular (`useMediaQuery("(max-width: 639px)")`, `rounded-t-2xl`), con pie fijo Cancelar / acción principal.
- **Listas de ítems:** una sola tarjeta con filas `divide-y`; acciones secundarias en menú `⋯` (`DropdownMenu`); borrar siempre con `AlertDialog`.
- **Avisos de resultado:** línea `aria-live` arriba de la lista (`bg-success-soft` / `bg-destructive/10`) que se oculta a los 4 s.
- **Horas:** `TimeSelect` (select nativo estilizado, cada 15 min) — en el celular abre la ruedita del sistema. **Fechas:** `Calendar` (react-day-picker, `locale={es}`, `weekStartsOn={1}`, celdas `--cell-size: --spacing(10)`).
- **Montos y horas** siempre en `font-mono tabular` (`₲ 150.000`, `08:00`); formatear con `src/lib/format.ts` (no Intl, para que servidor y navegador coincidan).

## Evitar

- Fondos claros, `slate-*`, `white` o `emerald-*` hardcodeados.
- Un segundo color de acento o degradés decorativos (el único degradé es `.glow-ambar` en pantallas de marca).
- Rosa/ciruela como color de la interfaz.
- Bordes fuertes o sombras dramáticas.
- Botones o campos de menos de 32px de alto.
