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

// In Vercel serverless, __dirname = bundle root, public/ is placed there via includeFiles
// In local dev, __dirname = dist/, so ../public works — we check both
const publicDir = path.join(__dirname, 'public');
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
