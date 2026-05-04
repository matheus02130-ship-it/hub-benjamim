// server.js — Entry point para Hostinger Node.js hosting
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import analyzeHandler from './api/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html'],
}));

// API: análise Instagram
app.post('/api/analyze', (req, res) => analyzeHandler(req, res));
app.options('/api/analyze', (req, res) => analyzeHandler(req, res));

// Fallback → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Hub Benjamim rodando na porta ${PORT}`);
});
