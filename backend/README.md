# TurnosApp — Backend (legado + WhatsApp)

> **Estado:** la API REST en memoria (pacientes, doctores, servicios, turnos) es **legado** y se va a reemplazar por Supabase. Lo que se mantiene es la integración de WhatsApp con `whatsapp-web.js`, que se adaptará para que cada profesional conecte su propio número.

## Requisitos previos

- **Node.js** v18 o superior
- **Google Chrome o Chromium** instalado en el sistema (lo usa `whatsapp-web.js` internamente para la sesión de WhatsApp)

## Instalacion

```bash
cd backend
npm install
```

## Iniciar el servidor

```bash
# Modo produccion
npm start

# Modo desarrollo (auto-reload al guardar cambios)
npm run dev
```

El servidor arranca en **http://localhost:3050**.

Al iniciar, se cargan datos de ejemplo (2 doctores, 3 servicios, 2 pacientes) para poder probar de inmediato.

> **Nota:** La base de datos es en memoria. Si reiniciás el servidor, se pierden los datos y se vuelven a cargar los de ejemplo.

---

## Estructura del proyecto

```
backend/
├── index.js                          # Punto de entrada, monta las rutas
├── package.json
├── .gitignore
└── src/
    ├── data/
    │   └── store.js                  # Base de datos en memoria + seed
    ├── modules/
    │   ├── patients.js               # CRUD de pacientes
    │   ├── doctors.js                # CRUD de doctores
    │   ├── services.js               # CRUD de servicios
    │   ├── appointments.js           # CRUD de citas + recordatorio
    │   └── whatsapp.js               # Endpoints de QR y estado WhatsApp
    ├── services/
    │   └── whatsappClient.js         # Singleton del cliente WhatsApp
    └── utils/
        ├── reminders.js              # Logica de envio de mensajes
        └── phoneFormatter.js         # Conversion de telefono a formato WhatsApp
```

---

## Endpoints de la API

### Pacientes — `/patients`

| Metodo | Ruta            | Descripcion          |
|--------|-----------------|----------------------|
| GET    | /patients       | Lista todos          |
| GET    | /patients/:id   | Obtiene uno por ID   |
| POST   | /patients       | Crea un paciente     |
| PUT    | /patients/:id   | Actualiza un paciente|
| DELETE | /patients/:id   | Elimina un paciente  |

**Body para POST y PUT:**
```json
{
  "nombre": "Juan Pérez",
  "telefono": "0961123456",
  "notas": "Alérgico a penicilina"
}
```
- `nombre` y `telefono` son obligatorios.
- `notas` es opcional (string vacío por defecto).

**Respuesta de ejemplo:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "telefono": "0961123456",
  "notas": "Alérgico a penicilina"
}
```

---

### Doctores — `/doctors`

| Metodo | Ruta           | Descripcion         |
|--------|----------------|---------------------|
| GET    | /doctors       | Lista todos         |
| GET    | /doctors/:id   | Obtiene uno por ID  |
| POST   | /doctors       | Crea un doctor      |
| PUT    | /doctors/:id   | Actualiza un doctor |
| DELETE | /doctors/:id   | Elimina un doctor   |

**Body para POST y PUT:**
```json
{
  "nombre": "Dra. María López",
  "especialidad": "Ortodoncia",
  "horario": {
    "start": "09:00",
    "end": "18:00"
  }
}
```
- `nombre` es obligatorio.
- `especialidad` es opcional (string vacío por defecto).
- `horario` es opcional (por defecto `{ start: "09:00", end: "18:00" }`).

**Respuesta de ejemplo:**
```json
{
  "id": 1,
  "nombre": "Dra. María López",
  "especialidad": "Ortodoncia",
  "horario": { "start": "09:00", "end": "18:00" }
}
```

---

### Servicios — `/services`

| Metodo | Ruta            | Descripcion          |
|--------|-----------------|----------------------|
| GET    | /services       | Lista todos          |
| GET    | /services/:id   | Obtiene uno por ID   |
| POST   | /services       | Crea un servicio     |
| PUT    | /services/:id   | Actualiza un servicio|
| DELETE | /services/:id   | Elimina un servicio  |

**Body para POST y PUT:**
```json
{
  "nombre": "Limpieza dental",
  "duracion": 30,
  "precio": 50000
}
```
- `nombre` y `duracion` son obligatorios.
- `duracion` es un numero en minutos.
- `precio` es un numero (por defecto 0).

**Respuesta de ejemplo:**
```json
{
  "id": 1,
  "nombre": "Limpieza dental",
  "duracion": 30,
  "precio": 50000
}
```

---

### Citas — `/appointments`

| Metodo | Ruta                          | Descripcion                        |
|--------|-------------------------------|------------------------------------|
| GET    | /appointments                 | Lista todas las citas              |
| GET    | /appointments?from=ISO&to=ISO | Lista citas en un rango de fechas  |
| GET    | /appointments/:id             | Obtiene una cita por ID            |
| POST   | /appointments                 | Crea una cita                      |
| PUT    | /appointments/:id             | Actualiza una cita                 |
| DELETE | /appointments/:id             | Cancela una cita                   |
| POST   | /appointments/:id/remind      | Envia recordatorio por WhatsApp    |

#### GET /appointments — Listar citas

Se puede llamar de tres formas:

1. **Sin parametros** — devuelve TODAS las citas (usado para historial de pacientes):
   ```
   GET /appointments
   ```

2. **Con rango de fechas** — filtra citas entre dos fechas ISO:
   ```
   GET /appointments?from=2026-03-21T00:00:00&to=2026-03-22T00:00:00
   ```

3. **Con filtros combinados** — se puede agregar `doctorId` y/o `date`:
   ```
   GET /appointments?doctorId=1&date=2026-03-21
   ```

#### POST /appointments — Crear cita

**Body:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "serviceId": 1,
  "start": "2026-03-21T14:30:00"
}
```
- Todos los campos son obligatorios.
- `start` es un datetime ISO 8601. Puede ser a cualquier minuto (no solo horas en punto o medias horas).
- El backend calcula `end` automaticamente sumando la duracion del servicio al `start`.
- Si el doctor ya tiene una cita que se superpone con el nuevo rango, devuelve **409 Conflict**.

**Respuesta (201 Created):**
```json
{
  "id": 1,
  "patientId": 1,
  "doctorId": 1,
  "serviceId": 1,
  "start": "2026-03-21T17:30:00.000Z",
  "end": "2026-03-21T18:00:00.000Z",
  "status": "pending"
}
```

#### PUT /appointments/:id — Actualizar cita

Se usa principalmente para cambiar el estado:
```json
{ "status": "confirmed" }
```

Tambien se puede cambiar `start`, `serviceId`, etc. Si se cambia `start` o `serviceId`, el backend recalcula `end` automaticamente.

Los estados posibles son: `"pending"`, `"confirmed"`, `"cancelled"`.

#### DELETE /appointments/:id — Cancelar cita

No elimina la cita de la base de datos, sino que cambia su `status` a `"cancelled"`. Devuelve la cita actualizada.

#### POST /appointments/:id/remind — Enviar recordatorio WhatsApp

No lleva body. Envia un mensaje de WhatsApp al paciente asociado a esa cita.

**Respuesta exitosa:**
```json
{ "ok": true, "message": "Recordatorio enviado" }
```

**Errores posibles:**
| Status | Respuesta |
|--------|-----------|
| 404    | `{ "error": "Turno no encontrado" }` |
| 500    | `{ "error": "WhatsApp no está conectado" }` |
| 500    | `{ "error": "El paciente no tiene teléfono registrado" }` |

**Mensaje que recibe el paciente:**
> Hola Juan Pérez, te recordamos que tenés turno con Dra. María López (Limpieza dental) el viernes 21 de marzo a las 14:30hs. Consultorio Dental.

---

### Disponibilidad — `/appointments/availability`

| Metodo | Ruta                                              | Descripcion              |
|--------|----------------------------------------------------|--------------------------|
| GET    | /appointments/availability/:doctorId/:serviceId/:date | Slots disponibles       |

**Ejemplo:**
```
GET /appointments/availability/1/1/2026-03-21
```

Devuelve los horarios disponibles para ese doctor, considerando la duracion del servicio y las citas ya agendadas:

```json
[
  {
    "start": "2026-03-21T12:00:00.000Z",
    "end": "2026-03-21T12:30:00.000Z",
    "label": "09:00 - 09:30"
  },
  {
    "start": "2026-03-21T12:30:00.000Z",
    "end": "2026-03-21T13:00:00.000Z",
    "label": "09:30 - 10:00"
  }
]
```

---

### WhatsApp — `/whatsapp`

| Metodo | Ruta              | Descripcion                      |
|--------|-------------------|----------------------------------|
| GET    | /whatsapp/status  | Estado de conexion de WhatsApp   |
| GET    | /whatsapp/qr      | QR code para vincular WhatsApp   |

#### GET /whatsapp/status

```json
{ "connected": true }
```

#### GET /whatsapp/qr

Devuelve el QR como imagen base64 para vincular WhatsApp Web. Tiene tres estados posibles:

**Ya conectado (no necesita QR):**
```json
{ "status": "connected", "qr": null }
```

**Inicializando (QR aun no listo):**
```json
{ "status": "waiting", "qr": null, "message": "QR aún no generado. Esperá unos segundos." }
```

**QR listo para escanear:**
```json
{
  "status": "scanning",
  "qr": "data:image/png;base64,iVBORw0KGgo..."
}
```

El campo `qr` es un data URL que se puede usar directo en un `<img src={qr} />`.

**Flujo para vincular:**
1. Llamar a `GET /whatsapp/qr` cada 3-5 segundos.
2. Cuando `status` sea `"scanning"`, mostrar la imagen QR.
3. El usuario escanea con WhatsApp en su telefono.
4. Cuando `status` cambie a `"connected"`, la vinculacion fue exitosa.
5. La sesion se guarda en disco (carpeta `.wwebjs_auth/`), asi que al reiniciar el servidor no hay que escanear de nuevo.

---

## Formato de errores

Todos los errores siguen el mismo formato:

```json
{ "error": "Mensaje describiendo el error" }
```

Con el status HTTP correspondiente (400, 404, 409, 500).

---

## Datos de ejemplo (seed)

Al iniciar el servidor se crean automaticamente:

**Doctores:**
| ID | Nombre           | Especialidad | Horario       |
|----|------------------|--------------|---------------|
| 1  | Dra. María López | Ortodoncia   | 09:00 - 18:00 |
| 2  | Dr. Carlos Ruiz  | Endodoncia   | 08:00 - 16:00 |

**Servicios:**
| ID | Nombre              | Duracion | Precio  |
|----|---------------------|----------|---------|
| 1  | Limpieza dental     | 30 min   | 50.000  |
| 2  | Ortodoncia consulta | 60 min   | 120.000 |
| 3  | Extraccion simple   | 45 min   | 80.000  |

**Pacientes:**
| ID | Nombre     | Telefono    | Notas                  |
|----|------------|-------------|------------------------|
| 1  | Juan Pérez | 0961123456  |                        |
| 2  | Ana Gómez  | 0971654321  | Alérgica a penicilina  |

---

## Notas tecnicas

- **Base de datos en memoria**: los datos se pierden al reiniciar. Pensado para desarrollo y demos.
- **WhatsApp Web**: usa `whatsapp-web.js` que controla una sesion de WhatsApp Web via Chromium headless. La sesion se persiste en `.wwebjs_auth/`.
- **Telefonos**: el sistema convierte numeros paraguayos locales (ej: `0961123456`) al formato internacional para WhatsApp (`595961123456@c.us`).
- **CORS**: habilitado para todas las origenes (desarrollo). En produccion se deberia restringir.
