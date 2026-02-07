import dotenv from "dotenv";
import path from "path";

// Always load env relative to the *backend working directory*
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.example") });


import express from 'express';
import cors from 'cors';
import { requestLogger, errorHandler } from './utils/logger';
import intakeRoutes from './routes/intake';
import analysisRoutes from './routes/analysis';
import productsRoutes from './routes/products';
import routineRoutes from './routes/routine';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow large base64 images
app.use(requestLogger);

// API routes
app.use('/api/intake', intakeRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', productsRoutes); // /api/cart/swap uses same router
app.use('/api/existing', productsRoutes); // /api/existing/check uses same router
app.use('/api/routine', routineRoutes);

// Error handler (must be after routes)
app.use(errorHandler as any);

// Serve frontend build in production
const frontendBuild = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SkinSync API running on http://localhost:${PORT}`);
  console.log(
    `OpenAI: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_key_here' ? 'configured' : 'not configured (using fallback)'}`
  );
  console.log(`Debug logs: ${process.env.DEBUG_LOGS === 'true' ? 'ENABLED' : 'disabled'}`);
});

export default app;
