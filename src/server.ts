import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import webhookRouter from './routes/webhook';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, 'public');
console.log('Static files dir:', publicDir);
app.use(express.static(publicDir));

app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

// Serve index.html for all other routes (SPA fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HomPilot Agent running on port ${PORT}`);
});

export default app;
