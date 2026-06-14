import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRouter from './routes/auth.js';
import financesRouter from './routes/finances.js';
import communicationRouter from './routes/communication.js';
import attendanceRouter from './routes/attendance.js';
import membersRouter from './routes/members.js';
import ministeriosRouter from './routes/ministerios.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/finances', financesRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/members', membersRouter);
app.use('/api/ministerios', ministeriosRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(distPath, 'index.html'));
    else next();
  });
  console.log(`Sirviendo frontend desde: ${distPath}`);
} else {
  console.log('Frontend build no encontrado. Solo API disponible.');
  console.log(`Ejecuta: cd frontend && npm run build`);
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, HOST, () => console.log(`Servidor iniciado en http://${HOST}:${PORT}`));
