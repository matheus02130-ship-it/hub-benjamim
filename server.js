// server.js — Entry point para Hostinger Node.js hosting
// Zero dependências externas: usa apenas built-ins do Node 18
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import analyzeHandler from './api/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
};

// Adiciona métodos Express-like ao res nativo para compatibilidade com analyzeHandler
function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.set    = (headers) => {
    if (headers && typeof headers === 'object') {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    }
    return res;
  };
  res.json   = (data) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    }
  };
  return res;
}

// Parse do corpo JSON para compatibilidade com analyzeHandler
function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk.toString());
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// Serve um arquivo estático; cai para index.html se não encontrar (SPA fallback)
function serveStatic(filePath, res) {
  // Segurança: previne path traversal
  const safePath = path.resolve(filePath);
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      // SPA fallback → index.html
      fs.readFile(path.join(__dirname, 'index.html'), (err2, html) => {
        if (err2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    const ext  = path.extname(safePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  wrapRes(res);

  const urlObj   = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // ---- Rota da API ----
  if (pathname === '/api/analyze') {
    if (req.method === 'OPTIONS') {
      res.status(204).set({
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }).end();
      return;
    }
    if (req.method === 'POST') {
      req.body = await parseBody(req);
      try { await analyzeHandler(req, res); }
      catch (err) {
        console.error('analyzeHandler error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Erro interno' });
      }
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Arquivos estáticos ----
  let filePath = path.join(__dirname, pathname);

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    // Arquivo não existe → SPA fallback dentro de serveStatic
  }

  serveStatic(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Hub Benjamim rodando na porta ${PORT}`);
});
