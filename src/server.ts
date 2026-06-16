import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import webhookRouter from './routes/webhook';
import apiRouter from './routes/api';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`HomPilot Agent running on port ${PORT}`);
});

export default app;
