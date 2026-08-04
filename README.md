# Globalance API

Backend de Globalance, una billetera virtual multimoneda orientada a freelancers que reciben pagos en diferentes divisas.

## Despliegue

* **Frontend:** [https://main-eta-jet.vercel.app/](https://main-eta-jet.vercel.app/)
* **API de Produccion:** [https://backend-globalance-production-5e5a.up.railway.app](https://backend-globalance-production-5e5a.up.railway.app)
* **Documentacion API (Swagger):** [https://backend-globalance-production-5e5a.up.railway.app/api/docs](https://backend-globalance-production-5e5a.up.railway.app/api/docs)

## Descripcion

Globalance permite a los usuarios gestionar dinero en multiples monedas dentro de una unica billetera digital. Este repositorio contiene la API de servicios que sirve como motor del sistema.

En esta primera version del backend, orientada a la primera demostracion, se ha implementado:

* Autenticacion centralizada mediante Firebase Authentication.
* Sincronizacion automatica de usuarios Firebase con la base de datos PostgreSQL.
* Creacion automatica de billetera y balances iniciales en tres divisas (ARS, USD, EUR) al registrarse.
* Gestion y lectura de perfiles especializados para personas y empresas.
* Arquitectura modular escalable basada en Express y TypeScript.
* Validacion de solicitudes en tiempo de ejecucion mediante esquemas Zod.
* Documentacion interactiva de la API con OpenAPI (Swagger).

---

## Tecnologias

* Node.js
* Express
* TypeScript
* PostgreSQL
* Firebase Admin SDK
* Zod
* Swagger / OpenAPI
* Railway (Despliegue)

---

## Arquitectura del Proyecto

El proyecto sigue una arquitectura modular donde cada dominio de negocio esta autocontenido:

```
src
├── config          # Configuraciones globales (Firebase, base de datos)
├── db              # Cliente y conexion a la base de datos PostgreSQL
├── docs            # Archivos de configuracion de Swagger/OpenAPI
├── middlewares     # Middlewares globales (autenticacion, validacion)
├── modules         # Modulos de negocio autocontenidos
│   ├── auth        # Flujo de sesion y sincronizacion de usuarios
│   ├── balances    # Consulta de balances de la billetera
│   ├── health      # Verificacion de estado de la API
│   ├── users       # Gestion de datos de perfil (Persona/Empresa)
│   └── wallets     # Consulta de informacion de billetera
├── routes          # Enrutador principal de la aplicacion
├── types           # Definiciones de tipos TypeScript globales
├── app.ts          # Inicializacion y configuracion de Express
└── server.ts       # Punto de entrada para levantar el servidor
```

Cada modulo de negocio sigue el patron de diseño:

```
Routes
  ↓
Controller
  ↓
Service
  ↓
Repository
```

Esta separacion de responsabilidades asegura que las consultas a la base de datos, las reglas de negocio y los controladores HTTP esten aislados y listos para pruebas unitarias.

---

## Instalacion y Configuracion

### 1. Clonar el repositorio

```bash
git clone https://github.com/Globallink-Studio/Backend-Globalance.git
cd api
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Cree un archivo `.env` en la raiz del directorio `api` tomando como referencia el archivo `.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/globalance
FRONTEND_URL=http://localhost:5173
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_CLIENT_EMAIL=cuenta-de-servicio@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

| Variable | Descripcion |
|----------|-------------|
| PORT | Puerto local donde correra el servidor Express. |
| DATABASE_URL | URI de conexion a la base de datos PostgreSQL. |
| FRONTEND_URL | URL del frontend (para CORS y redirecciones en produccion). |
| FIREBASE_PROJECT_ID | Identificador del proyecto en Firebase. |
| FIREBASE_CLIENT_EMAIL | Correo electronico de la cuenta de servicio de Firebase. |
| FIREBASE_PRIVATE_KEY | Llave privada de la cuenta de servicio de Firebase. |

---

## Inicializacion de la Base de Datos

La estructura de la base de datos se gestiona a traves de scripts SQL ubicados en la carpeta `sql/` de la raiz del proyecto.

Para inicializar la estructura y precargar los datos semilla (como las monedas soportadas):

1. Asegurese de tener una base de datos PostgreSQL creada.
2. Ejecute el archivo de inicializacion `setup.sql` utilizando la utilidad `psql` o su gestor de base de datos preferido:

```bash
psql -d nombre_base_datos -f sql/setup.sql
```

El script `setup.sql` se encarga de ejecutar de manera secuencial:
* `001_initial_schema.sql`: Creacion de tablas de usuarios, perfiles (personas/empresas), billeteras y balances.
* `002_transactions_schema.sql`: Estructura para el registro de transacciones (para proximas fases).
* `003_email_deliveries.sql`: Estructura para el registro de correos electronicos enviados (para proximas fases).
* Insercion de las monedas iniciales admitidas: Peso argentino (ARS), Dolar estadounidense (USD) y Euro (EUR).

---

## Ejecucion de la Aplicacion

### Modo Desarrollo (con recarga automatica)

```bash
npm run dev
```

El servidor iniciara por defecto en `http://localhost:3000`.

### Modo Produccion

Compilar el codigo TypeScript:

```bash
npm run build
```

Ejecutar la aplicacion compilada:

```bash
npm run start
```

---

## Endpoints de la API

### Health Check

#### Verificar estado del servidor
```http
GET /health
```
Retorna un diagnostico simple sobre el estado de la API y de la conexion activa a PostgreSQL.

---

### Autenticacion (Protected)

Todos los endpoints detallados a continuacion requieren la cabecera de autorizacion con un token valido de Firebase:
```http
Authorization: Bearer <Firebase ID Token>
```

#### Obtener usuario autenticado
```http
GET /auth/me
```
Obtiene el perfil y datos asociados al token de Firebase enviado.

#### Sincronizar usuario
```http
POST /auth/sync
```
Valida la sesion del usuario de Firebase en PostgreSQL. Si es el primer acceso, registra al usuario en la base de datos relacional, le asigna una billetera e inicializa sus cuentas en ARS, USD y EUR con balance en cero.

---

### Usuarios (Protected)

#### Obtener perfil de usuario
```http
GET /users/profile
```
Retorna la informacion detallada del perfil del freelancer (Persona o Empresa) segun su registro.

#### Actualizar o completar perfil
```http
PATCH /users/profile
```
Recibe y valida los datos complementarios del perfil del usuario (Zod schema). Admite configuracion especifica tanto si se trata de una cuenta personal o corporativa.

---

### Billetera y Cuentas (Protected)

#### Obtener informacion de la billetera
```http
GET /wallet
```
Obtiene los metadatos y el identificador unico de la billetera del usuario.

#### Obtener balances
```http
GET /balances
```
Retorna el balance actual detallado de cada una de las tres divisas configuradas (ARS, USD, EUR) de la billetera.

---

## Modelo de Negocio

El modelo financiero de Globalance esta estructurado de la siguiente forma:

* Cada usuario posee una unica billetera (`wallet`).
* Cada billetera tiene asociados tres balances activos fijos correspondientes a las siguientes divisas:
  * ARS (Peso Argentino)
  * USD (Dolar Estadounidense)
  * EUR (Euro)
* Las conversiones de divisas modifican el balance de las cuentas existentes; no se crean billeteras ni cuentas adicionales dinamicamente.

---

## Documentacion Interactiva

La documentacion OpenAPI detallada con ejemplos de solicitudes y respuestas de todos los endpoints esta disponible mediante la interfaz de Swagger UI en la siguiente ruta cuando el servidor esta en ejecucion:

```
http://localhost:3000/docs
```

---

## Proximas Funcionalidades (Roadmap)

* Historial y busqueda de transacciones.
* Modulo de conversion interna de divisas (tipo de cambio).
* Flujo de transferencias directas entre usuarios de la plataforma.
* Integracion con Frankfurter y ExchangeRate API para tasas de cambio en tiempo real.
* Envio de correos electronicos y notificaciones mediante AWS SES.
* Recomendaciones financieras personalizadas basadas en IA con Gemini API.
* Cobertura de pruebas unitarias y de integracion con Vitest.

---

## Equipo de Desarrollo

GlobalLink Studio:
* Manuela Henao
* Jazmín
* Lucía
* Fernanda

---
