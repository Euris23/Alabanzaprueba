const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Datos iniciales de arranque (si la base de datos está vacía)
const initialData = {
    users: [
        { id: 1, name: 'Admin', role: 'admin', code: '2323', email: 'admin@tbbc.org', paused: false },
        { id: 2, name: 'Betty', role: 'integrante', code: '7243', email: 'betty@tbbc.org', paused: false },
        { id: 3, name: 'Euris', role: 'integrante', code: '3861', email: 'euris@tbbc.org', paused: false },
        { id: 4, name: 'Johan', role: 'integrante', code: '5094', email: 'johan@tbbc.org', paused: false },
        { id: 5, name: 'Jelissa', role: 'integrante', code: '2718', email: 'jelissa@tbbc.org', paused: false },
        { id: 6, name: 'Yaneyri', role: 'integrante', code: '9436', email: 'yaneyri@tbbc.org', paused: false },
        { id: 7, name: 'Gerald', role: 'integrante', code: '1652', email: 'gerald@tbbc.org', paused: false },
        { id: 8, name: 'Sonido', role: 'sonido', code: '8375', email: 'sonido@tbbc.org', paused: false },
        { id: 9, name: 'Invitado', role: 'invitado', code: '1010', email: 'invitado@tbbc.org', paused: false }
    ],
    songs: [
        { 
            id: 1, 
            name: 'Dios Poderoso', 
            version: 'Miel San Marcos',
            link: 'https://youtube.com/watch?v=demo', 
            lyrics: 'Dios poderoso, reina por siempre...', 
            tones: { gerald: 'G', jelissa: 'A', yaneyri: 'F' },
            evaluations: []
        }
    ],
    repertoires: [],
    favorites: [],
    songsToLearn: [
        {
            id: 1,
            name: 'Cantaré de tu Amor Por Siempre',
            version: 'Delirious / Versión General',
            link: 'https://youtube.com/watch?v=demo',
            tentativeDate: '2026-11-15',
            addedBy: 1,
            createdAt: '2026-10-10T09:00:00.000Z',
            checks: {
                2: { checked: true, timestamp: '2026-10-10T09:05:00.000Z' }
            }
        }
    ],
    events: [
        {
            id: 1,
            title: 'Vigilia Especial de Alabanza',
            date: '2026-10-31',
            description: 'Vigilia de fin de mes de 8:00 PM a 12:00 AM en el Templo Principal',
            playlistLink: '',
            createdBy: 1,
            createdAt: '2026-10-10T10:00:00.000Z',
            songs: [],
            checks: {}
        }
    ],
    emailSettings: {
        serviceId: '',
        templateId: '',
        publicKey: '',
        autoSendOnPublish: true
    },
    userFolders: [],
    logs: []
};

// ----------------------------------------------------
// Gestor de Persistencia: PostgreSQL (Render) o Archivo Local
// ----------------------------------------------------
let pool = null;
let usePostgres = false;

if (DATABASE_URL) {
    try {
        const { Pool } = require('pg');
        pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
        });
        usePostgres = true;
        console.log('🔗 Conectando a PostgreSQL de Render...');
    } catch (err) {
        console.warn('⚠️ No se pudo inicializar el driver de PostgreSQL. Usando almacenamiento local.', err.message);
        usePostgres = false;
    }
} else {
    console.log('ℹ️ No se detectó DATABASE_URL. Usando persistencia local en carpeta /data.');
}

const localDataDir = path.join(__dirname, 'data');
const localDataFile = path.join(localDataDir, 'database.json');

// Inicializar tabla en PostgreSQL o archivo local
async function initDatabase() {
    if (usePostgres && pool) {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS tbbc_app_state (
                    id VARCHAR(50) PRIMARY KEY,
                    data JSONB NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            const res = await pool.query('SELECT id FROM tbbc_app_state WHERE id = $1', ['main']);
            if (res.rows.length === 0) {
                await pool.query(
                    'INSERT INTO tbbc_app_state (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
                    ['main', JSON.stringify(initialData)]
                );
                console.log('✅ Base de datos PostgreSQL inicializada con datos predeterminados de TBBC.');
            } else {
                console.log('✅ Tabla tbbc_app_state conectada exitosamente.');
            }
        } catch (err) {
            console.error('❌ Error inicializando tabla en PostgreSQL:', err);
            usePostgres = false;
        }
    }

    if (!usePostgres) {
        if (!fs.existsSync(localDataDir)) {
            fs.mkdirSync(localDataDir, { recursive: true });
        }
        if (!fs.existsSync(localDataFile)) {
            fs.writeFileSync(localDataFile, JSON.stringify(initialData, null, 2), 'utf8');
            console.log('✅ Archivo local database.json inicializado con datos predeterminados.');
        }
    }
}

// Obtener datos del estado
async function getDataFromDb() {
    if (usePostgres && pool) {
        const res = await pool.query('SELECT data, updated_at FROM tbbc_app_state WHERE id = $1', ['main']);
        if (res.rows.length > 0) {
            return {
                data: res.rows[0].data,
                updatedAt: res.rows[0].updated_at
            };
        }
    }

    // Fallback archivo local
    if (fs.existsSync(localDataFile)) {
        const content = fs.readFileSync(localDataFile, 'utf8');
        return {
            data: JSON.parse(content),
            updatedAt: fs.statSync(localDataFile).mtime
        };
    }

    return { data: initialData, updatedAt: new Date() };
}

// Guardar datos en la base de datos
async function saveDataToDb(data) {
    if (usePostgres && pool) {
        const res = await pool.query(`
            INSERT INTO tbbc_app_state (id, data, updated_at)
            VALUES ('main', $1, CURRENT_TIMESTAMP)
            ON CONFLICT (id)
            DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
            RETURNING updated_at;
        `, [JSON.stringify(data)]);
        return res.rows[0].updated_at;
    }

    // Fallback archivo local
    if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
    }
    fs.writeFileSync(localDataFile, JSON.stringify(data, null, 2), 'utf8');
    return new Date();
}

// ----------------------------------------------------
// RUTAS API REST
// ----------------------------------------------------

// Estado del servidor y tipo de base de datos
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'TBBC Alabanza API',
        database: usePostgres ? 'Render PostgreSQL' : 'Local Storage Fallback',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Obtener base de datos completa
app.get('/api/db', async (req, res) => {
    try {
        const result = await getDataFromDb();
        res.json({
            success: true,
            data: result.data,
            updatedAt: result.updatedAt
        });
    } catch (err) {
        console.error('Error al leer de la base de datos:', err);
        res.status(500).json({ success: false, error: 'Error al leer la base de datos' });
    }
});

// Guardar o actualizar base de datos completa
app.post('/api/db', async (req, res) => {
    try {
        const payload = req.body.data || req.body;
        if (!payload || !payload.users || !Array.isArray(payload.users)) {
            return res.status(400).json({ success: false, error: 'Estructura de datos inválida.' });
        }

        const updatedAt = await saveDataToDb(payload);
        res.json({
            success: true,
            message: 'Datos guardados correctamente.',
            updatedAt: updatedAt
        });
    } catch (err) {
        console.error('Error al guardar en la base de datos:', err);
        res.status(500).json({ success: false, error: 'Error al guardar en la base de datos' });
    }
});

// ----------------------------------------------------
// ARCHIVOS ESTÁTICOS Y FRONTEND
// ----------------------------------------------------
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, async () => {
    await initDatabase();
    console.log(`===============================================`);
    console.log(`🚀 TBBC Alabanza ejecutándose en el puerto ${PORT}`);
    console.log(`📦 Base de Datos: ${usePostgres ? 'Render PostgreSQL' : 'Local File'}`);
    console.log(`🌐 Acceso local: http://localhost:${PORT}`);
    console.log(`===============================================`);
});

