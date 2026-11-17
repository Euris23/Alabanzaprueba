# 🚀 Guía de Despliegue en Render con Base de Datos PostgreSQL

Esta guía explica cómo desplegar el sistema **TBBC Alabanza** en [Render](https://render.com) conectándolo a una base de datos **PostgreSQL**.

---

## 📁 Archivos creados y configurados

1. **`server.js`**: Servidor Node.js con Express que:
   - Conecta con la base de datos PostgreSQL de Render a través de `DATABASE_URL`.
   - Inicializa automáticamente la tabla `tbbc_app_state` y crea los datos iniciales si está vacía.
   - Ofrece endpoints API REST (`GET /api/db`, `POST /api/db`, `GET /api/health`).
   - Sirve el frontend estático (`index.html`, `styles.css`, `app.js`, `db.js`, `playlist.js`).
   - Incluye respaldo automático en archivo local (`data/database.json`) si se ejecuta sin PostgreSQL.
2. **`render.yaml`**: Archivo **Render Blueprint** que crea con 1 solo clic:
   - Un **Web Service** para la aplicación.
   - Una base de datos **PostgreSQL** gratuita (`tbbc-db`).
   - Conecta automáticamente la variable `DATABASE_URL` entre ambos.
3. **`package.json`**: Dependencias (`express`, `pg`, `cors`, `dotenv`) y scripts de ejecución (`npm start`).
4. **`db.js`**: Sincronización automática periódica (cada 25s) y al guardar cambios, manteniendo persistencia local (LocalStorage) para que la app responda al instante sin trabas.
5. **`.env.example`** y **`.gitignore`**: Configuración de entorno y exclusión de `node_modules/` y `.env`.

---

## 🛠️ Método 1: Despliegue con 1 Clic (Blueprint de Render - Recomendado)

1. Sube tu proyecto a un repositorio de **GitHub** o **GitLab**.
2. Inicia sesión en [Render.com](https://dashboard.render.com/).
3. Haz clic en el botón superior **"New +"** y selecciona **"Blueprint"**.
4. Conecta tu repositorio de GitHub donde subiste el proyecto.
5. Render detectará automáticamente el archivo `render.yaml`:
   - Creará el Web Service: `tbbc-alabanza`.
   - Creará la base de datos PostgreSQL: `tbbc-db`.
   - Vinculará la variable `DATABASE_URL` automáticamente.
6. Haz clic en **"Apply"** y espera a que termine el despliegue.
7. ¡Listo! Render te dará una URL (ejemplo: `https://tbbc-alabanza.onrender.com`) lista para usar por todo el grupo de alabanza.

---

## 🔧 Método 2: Despliegue Manual en Render

Si prefieres crearlo paso a paso desde el panel de Render:

### Paso 1: Crear la Base de Datos PostgreSQL en Render
1. En Render Dashboard, haz clic en **"New +"** -> **"PostgreSQL"**.
2. Dale un nombre, por ejemplo: `tbbc-db`.
3. En **Database**, escribe: `tbbc_db`.
4. En **User**, escribe: `tbbc_user`.
5. Selecciona el plan **Free** y haz clic en **"Create Database"**.
6. Una vez creada, copia el valor de **"Internal Database URL"** (o *External Database URL* si el backend estuviese fuera de Render).

### Paso 2: Crear el Web Service
1. En Render Dashboard, haz clic en **"New +"** -> **"Web Service"**.
2. Conecta tu repositorio.
3. Configura los siguientes campos:
   - **Name**: `tbbc-alabanza`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
4. En la sección **Environment Variables**, agrega:
   - `DATABASE_URL`: Pega la URL de PostgreSQL copiada en el Paso 1.
   - `NODE_ENV`: `production`
5. Haz clic en **"Create Web Service"**.

---

## 🧪 Cómo probarlo localmente (Opcional)

Si deseas probar el servidor en tu computadora antes de subirlo:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor
npm start
```

Abre tu navegador en `http://localhost:3000`. Verás el sistema funcionando y guardando en la carpeta `data/database.json` si no hay PostgreSQL configurado localmente.

---

## 💡 Ventajas de esta arquitectura

- **Multi-dispositivo en tiempo real**: Cualquier integrante que agregue una canción o evalúe un tema actualiza la base de datos en la nube.
- **Tolerancia a desconexión**: La aplicación guarda en LocalStorage primero, por lo que nunca se queda trabada esperando la red.
- **Soporte para el modo reposo de Render (Free Tier)**: Si el servicio se suspende por inactividad, la app sigue funcionando con los datos cacheados localmente hasta que el servidor despierte y sincronice.
- **Indicador en vivo**: En la pestaña **Admin**, verás el badge *"Conectado a Render PostgreSQL"* y un botón *"Sincronizar Ahora"*.

