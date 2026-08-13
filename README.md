<div align="center">

# Globalance API

### Backend de la billetera virtual multimoneda para freelancers y profesionales globales

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![AWS SES](https://img.shields.io/badge/AWS_SES-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/ses/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

[Frontend](https://main-eta-jet.vercel.app/) · [API en producción](https://backend-globalance-production-5e5a.up.railway.app) · [Documentación Swagger](https://backend-globalance-production-5e5a.up.railway.app/api/docs)

</div>

---

## Descripción

**Globalance** es una billetera virtual multimoneda orientada a freelancers, profesionales independientes y empresas que reciben, administran y transfieren dinero en diferentes divisas.

Este repositorio contiene la API REST que funciona como motor de la plataforma. El backend centraliza la autenticación, los perfiles, las billeteras, los balances, las operaciones financieras, las cotizaciones, las solicitudes de cobro, los contactos frecuentes, las notificaciones por correo y el asistente financiero con inteligencia artificial.

La aplicación admite cuentas en **pesos argentinos (ARS)**, **dólares estadounidenses (USD)** y **euros (EUR)**, manteniendo trazabilidad sobre cada movimiento y aplicando validaciones de negocio para proteger la consistencia de los saldos.

> [!IMPORTANT]
> Globalance es un proyecto académico y demostrativo. No constituye una entidad financiera ni debe utilizarse para operar fondos reales sin las validaciones legales, regulatorias y de seguridad correspondientes.

---

## Despliegue

| Servicio | URL |
|---|---|
| Frontend | [https://main-eta-jet.vercel.app/](https://main-eta-jet.vercel.app/) |
| API de producción | [https://backend-globalance-production-5e5a.up.railway.app](https://backend-globalance-production-5e5a.up.railway.app) |
| Swagger UI | [https://backend-globalance-production-5e5a.up.railway.app/api/docs](https://backend-globalance-production-5e5a.up.railway.app/api/docs) |
| Especificación OpenAPI (JSON) | [https://backend-globalance-production-5e5a.up.railway.app/api/docs.json](https://backend-globalance-production-5e5a.up.railway.app/api/docs.json) |

---

## Funcionalidades principales

- Autenticación centralizada mediante **Firebase Authentication**.
- Validación de Firebase ID Tokens desde el backend con **Firebase Admin SDK**.
- Sincronización automática de usuarios de Firebase con PostgreSQL.
- Onboarding y administración de perfiles personales o empresariales.
- Creación automática de una billetera con balances iniciales en ARS, USD y EUR.
- Consulta de billetera y saldos por moneda.
- Carga de saldo controlada para entornos de demostración.
- Transferencias internas mediante alias o número de cuenta.
- Compra, venta y conversión entre monedas.
- Cotizaciones actuales e historial de tasas de cambio.
- Integración principal con **Frankfurter** y respaldo con **ExchangeRate-API**.
- Caché de cotizaciones para reducir llamadas externas y mejorar la disponibilidad.
- Historial de movimientos con filtros y paginación.
- Solicitudes de cobro: creación, consulta, listado, pago y cancelación.
- Gestión de contactos frecuentes.
- Notificaciones transaccionales mediante **Amazon SES**.
- Registro de entregas de correo y reintento de envíos fallidos.
- Plantillas HTML para cargas, transferencias, conversiones y solicitudes de cobro.
- Asistente financiero contextual impulsado por **Google Gemini**.
- Persistencia temporal del historial de conversación del asistente.
- Baja segura de cuentas, condicionada a que todos los balances estén en cero.
- Validación de solicitudes con **Zod** y manejo centralizado de errores.
- Protección contra duplicados mediante claves de idempotencia en operaciones financieras.
- Documentación interactiva con **OpenAPI 3.0** y **Swagger UI**.
- Pruebas automatizadas con **Vitest**.

---

## Tecnologías

| Área | Tecnología | Uso dentro del proyecto |
|---|---|---|
| Runtime | Node.js | Ejecución del servidor y herramientas de desarrollo. |
| Framework | Express 5 | API REST, rutas y middlewares. |
| Lenguaje | TypeScript | Tipado estático y mantenibilidad del código. |
| Base de datos | PostgreSQL | Persistencia de usuarios, saldos, operaciones, contactos, cotizaciones y correos. |
| Autenticación | Firebase Admin SDK | Verificación de identidad y administración de usuarios. |
| Validación | Zod | Validación de cuerpos, parámetros y consultas. |
| Correo | AWS SDK / Amazon SES | Envío de notificaciones y comprobantes transaccionales. |
| Inteligencia artificial | Google Gemini API | Asistente financiero contextual. |
| Tipos de cambio | Frankfurter / ExchangeRate-API | Tasas actuales e históricas con proveedor de respaldo. |
| Documentación | OpenAPI 3.0 / Swagger UI | Especificación y exploración interactiva de la API. |
| Pruebas | Vitest | Pruebas unitarias y de servicios. |
| Desarrollo | tsx | Ejecución de TypeScript con recarga automática. |
| Despliegue | Railway | Hosting del backend y configuración del entorno de producción. |

---

## Arquitectura del proyecto

El proyecto utiliza una **arquitectura modular por dominio**. Cada módulo encapsula sus rutas, controladores, servicios, repositorios, validaciones y clientes externos cuando corresponde.

El flujo habitual de una solicitud es:

```text
HTTP Request
    │
    ▼
Route ──► Authentication / Validation Middleware
    │
    ▼
Controller
    │
    ▼
Service ──► Business rules / External integrations
    │
    ▼
Repository
    │
    ▼
PostgreSQL
```

Esta separación mantiene aisladas las responsabilidades HTTP, las reglas de negocio y el acceso a datos, facilitando las pruebas y la evolución independiente de cada dominio.

### Estructura de directorios

```text
Backend-Globalance/
├── scripts/
│   └── preview-emails.ts             # Vista previa de plantillas de correo
├── sql/
│   ├── 001_initial_schema.sql        # Usuarios, perfiles, billeteras y balances
│   ├── 002_transactions_schema.sql   # Transacciones financieras
│   ├── 003_email_deliveries.sql      # Registro de entregas de correo
│   ├── 004_exchange_rate_cache.sql   # Caché de tasas de cambio
│   ├── 005_demo_funding.sql          # Operaciones de carga demo
│   ├── 006_transaction_indexes.sql   # Índices de transacciones
│   ├── 007_transaction_types.sql     # Tipos adicionales de operación
│   ├── 008_user_timezone.sql         # Zona horaria del usuario
│   ├── 009_payment_requests.sql      # Solicitudes de cobro
│   ├── 010_email_delivery_context.sql
│   ├── 011_email_delivery_content.sql
│   ├── 012_frequent_contacts.sql     # Contactos frecuentes
│   ├── 013_exchange_quote_history.sql
│   ├── 014_email_delivery_events.sql
│   ├── 015_assistant_messages.sql    # Historial del asistente de IA
│   ├── 016_alter_email_delivery_event_length.sql
│   └── setup.sql                     # Inicialización base de la base de datos
├── src/
│   ├── config/                       # Entorno, Firebase, Swagger y configuración demo
│   ├── db/                           # Pool de conexiones PostgreSQL
│   ├── docs/                         # Especificación OpenAPI
│   ├── errors/                       # Errores de aplicación y servicios
│   ├── middlewares/                  # Autenticación, validación, 404 y errores
│   ├── modules/
│   │   ├── ai/                       # Asistente financiero con Gemini
│   │   ├── auth/                     # Sesión y sincronización de usuarios
│   │   ├── balances/                 # Consulta de saldos
│   │   ├── contacts/                 # Contactos frecuentes
│   │   ├── emails/                   # SES, entregas y plantillas HTML
│   │   ├── exchange/                 # Tasas, cotizaciones, caché e historial
│   │   ├── health/                   # Estado de API y base de datos
│   │   ├── payment-requests/         # Solicitudes de cobro
│   │   ├── transactions/             # Cargas, cambios, transferencias e historial
│   │   ├── users/                    # Perfiles y baja de cuenta
│   │   └── wallets/                  # Información de billetera
│   ├── routes/                       # Enrutador principal bajo /api
│   ├── types/                        # Tipos compartidos y extensión de Express
│   ├── app.ts                        # Configuración de Express y middlewares
│   └── server.ts                     # Punto de entrada del servidor
├── test/                             # Suite automatizada con Vitest
├── .env.example                      # Plantilla de variables de entorno
├── package.json                      # Dependencias y scripts
├── tsconfig.json                     # Configuración de TypeScript
└── vitest.config.ts                  # Configuración de pruebas
```

---

## Modelo de negocio

- Cada usuario tiene una única billetera.
- Cada billetera mantiene balances independientes en ARS, USD y EUR.
- Los perfiles pueden corresponder a una persona o una empresa.
- El alias y el número de cuenta permiten identificar destinatarios dentro de Globalance.
- Las transferencias internas debitan y acreditan los balances correspondientes dentro de una operación controlada.
- Las conversiones actualizan los balances de origen y destino utilizando la tasa vigente.
- La moneda principal del perfil permite clasificar una operación como compra, venta o conversión.
- Las solicitudes de cobro pueden estar pendientes, pagadas, vencidas o canceladas.
- Las operaciones financieras emplean una clave de idempotencia para evitar duplicados por reintentos.
- Una cuenta solo puede darse de baja cuando todos sus balances se encuentran en cero.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) con soporte nativo para `fetch`.
- [npm](https://www.npmjs.com/).
- [PostgreSQL](https://www.postgresql.org/).
- Un proyecto de [Firebase](https://firebase.google.com/) con Authentication habilitado y credenciales de cuenta de servicio.
- Opcional: clave de [ExchangeRate-API](https://www.exchangerate-api.com/) para el proveedor secundario de cotizaciones.
- Opcional: clave de [Google AI Studio](https://aistudio.google.com/) para activar el asistente Gemini.
- Opcional: credenciales de AWS y una identidad verificada en Amazon SES para enviar correos.

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Globallink-Studio/Backend-Globalance.git
cd Backend-Globalance
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Crear el archivo de entorno

Copiá `.env.example` como `.env` y completá los valores correspondientes al entorno local:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/globalance
FRONTEND_URL=http://localhost:5173

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

DEMO_FUNDING_ENABLED=false
EXCHANGE_RATE_API_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite

EMAIL_DELIVERY_ENABLED=false
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=globalance.notificaciones@gmail.com
```

### Variables de entorno

| Variable | Requerida | Descripción |
|---|:---:|---|
| `PORT` | No | Puerto del servidor. Valor predeterminado: `3000`. |
| `DATABASE_URL` | Sí | URI de conexión a PostgreSQL. |
| `FRONTEND_URL` | No | Origen autorizado por CORS. Valor predeterminado: `http://localhost:5173`. |
| `FIREBASE_PROJECT_ID` | Sí | Identificador del proyecto de Firebase. |
| `FIREBASE_CLIENT_EMAIL` | Sí | Correo de la cuenta de servicio de Firebase. |
| `FIREBASE_PRIVATE_KEY` | Sí | Clave privada de Firebase. Debe conservar los saltos `\n`. |
| `DEMO_FUNDING_ENABLED` | No | Habilita la carga de saldo demo cuando su valor es `true`. |
| `EXCHANGE_RATE_API_KEY` | No | Clave del proveedor secundario de tasas. Sin clave se utiliza su API pública limitada. |
| `GEMINI_API_KEY` | No | Clave de Google AI Studio. Sin ella, el asistente responde `AI_NOT_CONFIGURED`. |
| `GEMINI_MODEL` | No | Modelo utilizado por el asistente. Valor predeterminado: `gemini-3.1-flash-lite`. |
| `EMAIL_DELIVERY_ENABLED` | No | Activa los envíos reales por correo cuando su valor es `true`. |
| `AWS_REGION` | No | Región de Amazon SES. Valor predeterminado: `sa-east-1`. |
| `AWS_ACCESS_KEY_ID` | Condicional | Identificador de credencial AWS para SES. |
| `AWS_SECRET_ACCESS_KEY` | Condicional | Secreto de credencial AWS para SES. |
| `SES_FROM_EMAIL` | Condicional | Remitente verificado utilizado por SES. |

> [!CAUTION]
> Nunca publiques el archivo `.env`, claves privadas, tokens ni credenciales reales. Utilizá secretos del proveedor de despliegue para producción.

---

## Inicialización de la base de datos

Los cambios de base de datos se encuentran versionados como scripts SQL dentro de `sql/`.

### Crear la estructura base

```bash
psql "$DATABASE_URL" -f sql/setup.sql
```

`setup.sql` ejecuta el esquema inicial y las migraciones incluidas hasta `011_email_delivery_content.sql`, además de registrar ARS, USD y EUR.

### Aplicar las migraciones posteriores

En una base nueva, después de `setup.sql`, aplicá en orden los scripts restantes:

```bash
psql "$DATABASE_URL" -f sql/012_frequent_contacts.sql
psql "$DATABASE_URL" -f sql/013_exchange_quote_history.sql
psql "$DATABASE_URL" -f sql/014_email_delivery_events.sql
psql "$DATABASE_URL" -f sql/015_assistant_messages.sql
psql "$DATABASE_URL" -f sql/016_alter_email_delivery_event_length.sql
```

> [!NOTE]
> Las migraciones deben ejecutarse respetando el orden numérico para conservar sus dependencias.

---

## Ejecución de la aplicación

### Desarrollo

Inicia el servidor con recarga automática:

```bash
npm run dev
```

La API queda disponible, de forma predeterminada, en `http://localhost:3000/api`.

### Producción

Compila TypeScript y copia las plantillas HTML al directorio de salida:

```bash
npm run build
```

Ejecuta la versión compilada:

```bash
npm start
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor en modo desarrollo con `tsx watch`. |
| `npm run build` | Compila TypeScript y copia las plantillas de correo a `dist/`. |
| `npm start` | Ejecuta `dist/server.js`. |
| `npm test` | Ejecuta una vez la suite completa de Vitest. |
| `npm run test:watch` | Ejecuta las pruebas en modo observación. |

---

## Autenticación y seguridad

Con excepción del health check y la documentación, los endpoints requieren un Firebase ID Token válido:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

El middleware de autenticación verifica el token con Firebase Admin y agrega el usuario autenticado a la solicitud. La API complementa este mecanismo con:

- Validación de entradas mediante esquemas Zod.
- Consultas parametrizadas a PostgreSQL.
- Manejo centralizado y consistente de errores.
- Restricciones de unicidad para documentos, alias y cuentas.
- Claves de idempotencia en operaciones sensibles.
- Límites de negocio sobre operaciones de cambio.
- Control de propiedad sobre solicitudes, contactos y entregas de correo.
- Desactivación y anonimización de cuentas durante la baja.
- Configuración explícita de orígenes permitidos mediante CORS.

---

## Endpoints de la API

La URL base local es:

```text
http://localhost:3000/api
```

Todos los endpoints marcados como protegidos requieren autenticación con Firebase.

### Estado del servicio

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Comprueba el estado del backend y la conexión con PostgreSQL. |

### Autenticación

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/auth/me` | Protegido | Devuelve el usuario autenticado de Firebase. |
| `POST` | `/auth/sync` | Protegido | Sincroniza el usuario y crea su billetera y balances iniciales si no existen. |

### Usuarios

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/users/profile` | Protegido | Obtiene el perfil personal o empresarial. |
| `POST` | `/users/profile` | Protegido | Completa el onboarding por primera vez. |
| `PATCH` | `/users/profile` | Protegido | Actualiza parcialmente los campos editables del perfil. |
| `DELETE` | `/users/profile` | Protegido | Da de baja la cuenta si todos los balances están en cero. |

### Billetera y balances

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/wallet` | Protegido | Obtiene la billetera, el usuario y sus balances. |
| `GET` | `/balances` | Protegido | Lista los saldos disponibles en ARS, USD y EUR. |

### Transacciones

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/transactions` | Protegido | Lista movimientos con filtros por tipo, moneda y paginación. |
| `POST` | `/transactions/income` | Protegido | Realiza una carga de saldo demo cuando está habilitada. |
| `POST` | `/transactions/exchange` | Protegido | Compra, vende o convierte moneda usando la tasa vigente. |
| `POST` | `/transactions/transfers/internal` | Protegido | Transfiere fondos a un alias o número de cuenta Globalance. |

Las operaciones financieras de creación requieren el encabezado:

```http
Idempotency-Key: <clave-unica-por-operacion>
```

### Cotizaciones

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/exchange/quotes` | Protegido | Calcula una cotización estimada para un monto y un par de monedas. |
| `GET` | `/exchange/rates` | Protegido | Obtiene tasas desde una moneda base. |
| `GET` | `/exchange/rates/history` | Protegido | Devuelve el historial de tasas de un par de monedas. |

### Solicitudes de cobro

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/payment-requests` | Protegido | Crea una solicitud dirigida por correo, alias o número de cuenta. |
| `GET` | `/payment-requests` | Protegido | Lista las solicitudes enviadas o recibidas. |
| `GET` | `/payment-requests/{paymentToken}` | Protegido | Consulta una solicitud mediante su token. |
| `POST` | `/payment-requests/{paymentToken}/pay` | Protegido | Paga una solicitud pendiente. |
| `PATCH` | `/payment-requests/{id}/cancel` | Protegido | Cancela una solicitud propia pendiente. |

### Contactos frecuentes

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/contacts` | Protegido | Guarda un usuario como contacto frecuente. |
| `GET` | `/contacts` | Protegido | Lista los contactos frecuentes del usuario. |
| `DELETE` | `/contacts/{id}` | Protegido | Elimina un contacto frecuente. |

### Asistente financiero

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/ai/assistant` | Protegido | Envía una consulta al asistente contextual basado en Gemini. |

El asistente construye respuestas utilizando información financiera relevante del usuario y conserva un historial reciente limitado. Si `GEMINI_API_KEY` no está configurada, el endpoint devuelve el error `AI_NOT_CONFIGURED`.

### Correos electrónicos

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/emails/deliveries/{deliveryId}/retry` | Protegido | Reintenta una entrega de correo fallida perteneciente al usuario. |

Para conocer parámetros, cuerpos, respuestas, códigos de error y ejemplos actualizados, consultá Swagger UI.

---

## Documentación interactiva

Con el servidor en ejecución, la documentación está disponible en:

```text
http://localhost:3000/api/docs
```

La especificación OpenAPI en formato JSON se expone en:

```text
http://localhost:3000/api/docs.json
```

Desde Swagger UI es posible explorar los contratos y probar las operaciones autenticadas utilizando un Firebase ID Token.

---

## Tasas de cambio

El módulo de cotizaciones implementa una estrategia tolerante a fallos:

1. Busca primero una tasa vigente en la caché de PostgreSQL.
2. Si no existe, consulta **Frankfurter** como proveedor principal.
3. Si el proveedor principal falla, utiliza **ExchangeRate-API** como respaldo.
4. Guarda la tasa obtenida en caché y registra la cotización diaria para consultas históricas.

Las tasas de Frankfurter se almacenan con una vigencia más corta, mientras que las obtenidas mediante el proveedor de respaldo utilizan una vigencia extendida.

---

## Notificaciones por correo

Cuando `EMAIL_DELIVERY_ENABLED=true`, el backend puede enviar notificaciones transaccionales mediante Amazon SES para:

- Solicitudes de cobro.
- Comprobantes de pago.
- Transferencias enviadas y recibidas.
- Cargas de saldo demo.
- Cambios de moneda.

Cada intento queda registrado para facilitar su seguimiento. Los envíos fallidos pueden reintentarse mediante el endpoint correspondiente, siempre que pertenezcan al usuario autenticado.

---

## Pruebas

La suite automatizada utiliza Vitest y cubre reglas de negocio e integraciones clave, entre ellas:

- Servicio y generación de prompts del asistente de IA.
- Cliente de Gemini.
- Gestión de contactos frecuentes.
- Repositorio, contenido y plantillas de correos.
- Solicitudes de cobro.
- Tasas actuales, cotizaciones e historial.
- Proveedores de tipo de cambio y mecanismo de respaldo.
- Transacciones y validaciones de saldo.
- Gestión de perfiles de usuario.

Ejecutar todas las pruebas:

```bash
npm test
```

Ejecutar en modo observación:

```bash
npm run test:watch
```

---

## Convenciones y buenas prácticas

- Mantener la separación `Route → Controller → Service → Repository`.
- Validar toda entrada externa antes de ejecutar reglas de negocio.
- No incluir lógica de negocio dentro de controladores o rutas.
- Utilizar consultas parametrizadas para acceder a PostgreSQL.
- Agregar una migración SQL incremental para cada cambio de esquema.
- Documentar endpoints nuevos o modificados en `src/docs/openapi.yaml`.
- Incorporar pruebas para nuevas reglas de negocio y casos de error.
- No registrar tokens, claves, contraseñas ni datos financieros sensibles.
- Mantener las operaciones financieras atómicas e idempotentes.

---

## Estado del proyecto

El backend dispone actualmente de los módulos centrales necesarios para la demostración integral de Globalance:

- Gestión de identidad y perfiles.
- Billetera multimoneda.
- Operaciones financieras internas.
- Cotizaciones actuales e históricas.
- Solicitudes de cobro y contactos.
- Notificaciones transaccionales.
- Asistencia financiera con IA.
- Documentación y pruebas automatizadas.

Como evolución futura, el proyecto puede incorporar integraciones con proveedores financieros reales, observabilidad centralizada, pruebas de integración end-to-end, mayor cobertura de seguridad y automatización del proceso de migraciones y despliegue.

---

## Equipo de desarrollo

### GlobalLink Studio

- Manuela Henao
- Jazmín
- Lucía
- Fernanda

---

<div align="center">

Desarrollado por **GlobalLink Studio**

[Repositorio del backend](https://github.com/Globallink-Studio/Backend-Globalance)

</div>
