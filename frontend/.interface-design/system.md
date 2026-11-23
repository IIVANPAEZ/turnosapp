# TurnosApp · Sistema de diseño

> Fuente de verdad para pantallas nuevas. Los valores viven en `src/app/globals.css`;
> este archivo explica **por qué** y **cómo usarlos**.

## Dirección

- **Quién lo usa:** cualquier negocio o profesional que trabaja con turnos en Paraguay (barbería, consultorio, estudio de tatuajes, taller, profesor particular, etc.). Los textos de la interfaz son **generales**: nunca "para belleza y salud". Abren la app **en el celular**, entre un cliente y otro, para ver *cómo viene el día*. Viven en WhatsApp.
- **Cómo se siente:** moderno y **unisex**, con dos temas (oscuro grafito + ámbar, claro "papel" + azul). Ordenado y tranquilo, con un solo punto de calor (el ámbar). Nada de rosa ni ciruela: el usuario los descartó por "muy de mujer".
- **Origen de la paleta:** la *tierra colorada* al atardecer (ámbar) sobre una mesa de trabajo oscura (grafito).

## Colores (tokens)

Hay **dos temas** con los mismos nombres de tokens: **oscuro** (`.dark`, la tabla de abajo) y **claro** (`:root`, ver "Tema claro"). Ningún componente usa hex ni variables de un tema en particular (`--carbon`, `--ambar`…): solo tokens.

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
- Sombras, tramas y resplandores también son tokens: `--shadow-strong`, `--hatch`, `--hatch-warning`, `--glow-1/2` (`.glow-ambar`), `--selection`; las sombras de color usan `color-mix(in_oklab,var(--primary)_60%,transparent)`.
- **Opción elegida en controles segmentados** (Día/Semana, pestañas En curso/Próximos, períodos, orden): `bg-segment shadow-[var(--segment-shadow)]` (oscuro: = `raised`, sin sombra; claro: blanco con sombra suave).

### Tema claro ("papel" + azul)

| Rol | Token | Claro |
|---|---|---|
| Fondo | `bg-background` | `#f5f6f8` |
| Hundido (campos, bandejas) | `bg-inset` | `#eceef2` |
| Tarjetas / menús | `bg-card`, `bg-popover` | `#ffffff` |
| Ítem activo, chips | `bg-raised` | `#eef1f5` |
| Texto principal / secundario / apoyo / metadatos | | `#15181c` / `#353b43` / `#5b6470` / `#8a929c` |
| **Acento** | `bg-primary` | azul `#2563eb` (texto encima blanco) |
| Acento suave | `bg-primary-soft` | azul 10% |
| Marca de "ahora" | `bg-now` | **coral** `#e8590c` (no se confunde con el azul) |
| Éxito / Atención / Error | | `#15803d` / `#b45309` / `#dc2626` |
| Bordes | `border` / `border-line-strong` | tinta 9% / 16% |

### Cómo se elige el tema
- Menú de la cuenta → **Claro · Oscuro · Automático** (por defecto Automático = sigue al sistema). Se guarda en el dispositivo (`localStorage` `turnosapp:tema`).
- Un script en el `<head>` (`src/components/theme/theme-script.ts`) pone `.dark` o `.light` en `<html>` **antes de dibujar** (sin parpadeo) y sigue los cambios del sistema en Automático. La variante `dark:` de Tailwind depende de `.dark`.
- La página pública sigue el dispositivo del cliente. El ícono de la app instalada queda ámbar (marca).

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

`src/components/today/today-panel.tsx` — pestañas **En curso · Próximos · Atendidos** con contador; se abre sola la que importa. En el Inicio: resumen ("6 turnos · 1 por confirmar"), "+ Nuevo turno", aviso ámbar "Tenés N turnos sin cerrar" (lleva a Atendidos) y botones rápidos; tocar un turno abre el mismo detalle que la agenda. Cada turno: hora (mono), cliente, servicio y chip de estado (`src/lib/appointments/status.ts`: Pendiente, Confirmado, Finalizado, Cancelado, No vino; "Reprogramado → jue 14:00" es una marca; "En curso" se calcula con la hora). En curso muestra progreso y acciones rápidas (Finalizar / No vino). En el login va como muestra con `demo` (hora fija 14:50) y se oculta en el celular.

## Agenda (`/dashboard/agenda`)

- **Cuadrícula horas × días** (`agenda-view.tsx`): filas cada 30 min, columna de horas fija (`sticky left-0`). Cada celda lista **todos** los turnos que empiezan en esa media hora (se apilan; la celda crece). En las celdas siguientes de un turno largo: "↳ Nombre (sigue)" en `text-faint`. Celdas: abiertas `bg-card`, cerradas `bg-inset` + rayado, bloqueadas rayado ámbar + "Bloqueado · motivo", media hora actual `ring-now/60`. El usuario rechazó la línea de tiempo con tarjetas posicionadas: no volver a ella.
- **Turno en la celda:** `bg-raised`, borde izquierdo del color del profesional, chip de estado; en semana, puntito de estado. Con más de un profesional, se muestra quién atiende.
- **Celda vacía** = botón "Nuevo turno" con ese día/hora (aparece un "+" punteado al pasar el mouse). **Tocar un turno** abre su detalle (no la celda).
- Semana en el celular = lista por día (no cuadrícula). Cancelados / no vino / reprogramados no ocupan lugar: van en una lista desplegable debajo del día.

## Detalle y nuevo turno

- **Nuevo turno** (`new-appointment-form.tsx`): Cliente (buscar o "+ Nuevo cliente") → Servicio (radio con duración y precio, "Ajustar" duración) → Día (popover con calendario) y horarios libres en chips **Mañana / Tarde**, "Elegir otra hora" → Estado (Confirmado / Por confirmar) → Nota. Se pisa = error rojo y botón deshabilitado; fuera de horario/bloqueo/pasado = aviso ámbar y botón **"Cargar igual"**.
- **Detalle** (`appointment-detail.tsx`): chip de estado, fecha y horario en mono, servicio y precio; tarjeta **Contacto** (celular, Llamar, botones de WhatsApp en verde `bg-success-soft`); nota editable; acciones fijas abajo según estado y hora. Cancelar y reprogramar abren un recuadro dentro del panel (no otro diálogo). Después: tarjeta verde "¿Le avisás? → Avisar por WhatsApp".
- Estados: **"Por confirmar"** (no "Pendiente"), Confirmado, Finalizado, No vino, Cancelado, "Reprogramado → Lun 23, 14:00". **"Sin cerrar"** = ya pasó y sigue abierto (chip ámbar + botones Vino / No vino en el Inicio).

## Página pública de reservas (`/[slug]`)

- Una sola columna `max-w-2xl` sobre `.glow-ambar`, pensada primero para el celular. Encabezado: inicial del negocio en un cuadrado ámbar `size-14 rounded-2xl`, nombre `text-2xl`, rubro, descripción, dirección con `MapPin` y botón verde "Consultar por WhatsApp".
- **Pasos numerados** (`StepTitle`: círculo `size-6 bg-raised` mono + título). Un paso que todavía no aplica se ve con `opacity-50` y una frase guía.
- **Servicios:** tarjetas radio (círculo que se llena en ámbar), duración con `Clock`, precio mono a la derecha ("desde" encima).
- **Tira de días:** botones `w-[4.5rem]` que se deslizan de costado (`snap-x`, a sangre en el celular y dentro de la columna desde `sm`): día de la semana / número grande / mes / "N libres" en verde o "Sin lugar" (deshabilitado, `bg-inset`). Al final, "Más días" con borde punteado.
- **Horarios:** grilla `grid-cols-4 sm:grid-cols-6` de botones `h-11` mono, separados en Mañana / Tarde; el elegido va relleno en ámbar.
- **Barra de resumen fija abajo** (`bg-popover/95` + blur, respeta `safe-area-inset-bottom`): servicio + "Lun 23 · 10:30 · ₲ 40.000" y la acción principal (Continuar / Confirmar reserva).
- **Fecha destacada:** bloque `w-14 rounded-xl bg-primary-soft text-primary` con día corto / número / mes (en "Tus datos" y en "¡Listo!").
- **Pantalla "¡Listo!":** círculo verde con ✓, "¡Listo, tu turno está reservado!" siempre; la frase y la etiqueta (Confirmado / Por confirmar) cambian según el estado. Botones a lo ancho en el celular: "Agregar a mi calendario" (neutro) y "Escribir al negocio" (verde).
- Avisos dentro del flujo: horario perdido = `bg-warning-soft text-warning` con scroll al paso 3; error de datos = `bg-destructive/10`.

## Reservas online en el panel

- **Pastillas de opciones fijas** (Configuración → Reservas online): `h-9 rounded-lg border bg-inset`, elegida `border-primary/70 bg-primary-soft text-primary`. Interruptor con título y frase que explica el estado actual (`ToggleRow`).
- **Marca online:** ícono `Globe` en ámbar (`text-primary`): "Online" en la vista día, solo el ícono en semana, chip `bg-primary-soft` "Reservado online" en el detalle.
- **Aviso en Inicio:** tarjeta con borde `border-primary/25`, filas `divide-y` con fecha mono, cliente, servicio y botones `h-8` (WhatsApp verde cuadrado + Confirmar ámbar); al confirmar la fila queda "✓ Confirmado" + "Avisarle".
- **Tarjeta "Tu página de reservas":** chip de estado (Activa verde / Pausada ámbar / Falta configurar neutro), link mono en `bg-inset` con "Copiar", y dos botones: "Ver mi página" (neutro) y "Compartir" (verde).

## Clientes, cobros e ingresos (Sprint 5)

- **Lista de clientes:** una tarjeta con filas `divide-y`; en escritorio columnas Cliente / Última visita / Próximo turno / Visitas / Cobrado (montos mono a la derecha); en el celular, una línea de resumen `text-xs text-faint`. Inicial en círculo `bg-raised`. Etiquetas: Nuevo `bg-primary-soft text-primary`, Frecuente `bg-success-soft text-success`, No volvió `bg-warning-soft text-warning`. Filtros como pastillas redondas con contador mono; orden como control segmentado `bg-inset` (elegido `bg-raised`).
- **Ficha del cliente:** `Sheet`; arriba tres números (`grid-cols-[1fr_1fr_1.5fr]`, el cobrado más ancho), tarjeta `bg-inset` con celular, Llamar, Editar (lápiz), WhatsApp verde y nota; "Próximos turnos" como tarjetas, "Historial" como lista con borde. Pie fijo: "Nuevo turno para <nombre>".
- **"¿Cómo te pagó?" (`FinishPanel`):** recuadro `border-primary/30 bg-card`: título + monto editable (₲ mono, en `bg-inset`) y dos botones grandes ámbar `min-h-16` con ícono (Efectivo / Transferencia o tarjeta); abajo "Volver" y "Finalizar sin cobrar". Se abre dentro del detalle o debajo de la fila (no otro diálogo). Es el único paso para cobrar.
- **En curso:** chip `bg-primary text-primary-foreground` "En curso · desde las 17:07"; en la tarjeta Hoy, barra de progreso y aviso ámbar si se pasó de su horario. "Iniciar cita" con ícono `Play`.
- **Cobro en el turno:** línea verde "Cobrado ₲ … · Efectivo" + "Anular cobro" (confirmación en línea); o ámbar "Sin cobrar" + "Registrar cobro".
- **Ingresos:** número principal grande (mono `text-3xl`, resplandor ámbar suave) con la comparación (flecha verde/ámbar + %); tarjetas KPI (en el celular, de a dos); gráfico de una sola serie en ámbar: columnas `max-w-6` con punta redondeada de 4px, 3 líneas guía `foreground/7%`, eje con montos compactos ("₲ 100 mil"), tooltip al pasar/tocar y tabla oculta para lectores de pantalla. Desgloses como barras horizontales finas (`h-1.5 bg-primary` sobre `bg-inset`) con nombre, cantidad, monto y %.

## App en el celular (Sprint 6)

- **Barra de secciones abajo** (`BottomNav`, solo `<md`): mismo fondo que el sidebar (`bg-sidebar`) con `border-t`, alto 64px + `env(safe-area-inset-bottom)`. 5 pestañas: ícono en una pastilla `h-7 w-12 rounded-full` (activa `bg-primary-soft` + ícono ámbar) y etiqueta `text-[11px]`. "Más" abre un `Sheet` desde abajo con las demás secciones (filas `h-12`) y Cerrar sesión. Es parte del flujo del layout (no flota): el contenido termina arriba; lo que flota (botón "+", aviso sin conexión) se sube con `bottom-[calc(…+env(safe-area-inset-bottom))]`.
- **Encabezado en el celular:** logo ámbar `size-8 rounded-lg` + título; sin menú de tres líneas.
- **Menú de la cuenta:** la inicial abre un `DropdownMenu` (nombre · rol · negocio, Instalar app, Configuración, Cerrar sesión).
- **"Instalá TurnosApp":** tarjeta `bg-card` con ícono `Smartphone` en `bg-primary-soft`, botón Instalar ámbar (o los pasos de iPhone numerados en círculos `bg-raised`), ✕ "Ahora no".
- **Sin conexión:** pastilla `bg-warning` con texto oscuro, flotando abajo y centrada (no tapa el encabezado).
- **Error / No encontrada:** centrado, ícono en cuadrado (`bg-warning-soft` para error, `border bg-card` para no encontrada), título `text-xl`, acción principal ámbar ("Reintentar" / "Ir a mi panel") + secundaria ghost.
- **Elegir día en la página pública (vista por semana):** flechas `size-10 rounded-lg border bg-card` a los lados del título ("Esta semana", "La semana que viene", "Semana del 30 nov" + rango), y 7 celdas `grid-cols-7` (día corto / número `text-lg` / cantidad libre en mono verde o "—"); elegida `border-primary/70 bg-primary-soft`; pasadas o fuera de rango apagadas.

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
