'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css',
  '.js'   : 'application/javascript',
  '.json' : 'application/json',
  '.svg'  : 'image/svg+xml',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff' : 'font/woff',
  '.ico'  : 'image/x-icon',
  '.txt'  : 'text/plain',
};

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch (_) { resolve({}); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  process.stdout.write('[REQ] ' + req.method + ' ' + pathname + '\n');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ---- API: POST /api/analyze ----
  if (pathname === '/api/analyze') {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      req.body = await parseBody(req);
      const analyzeHandler = require('./api/analyze.js');
      await analyzeHandler(req, res);
    } catch (err) {
      process.stdout.write('[ERROR] analyze: ' + err.message + '\n');
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Erro interno: ' + err.message }));
      }
    }
    return;
  }

  // ---- Arquivos estáticos ----
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(ROOT, filePath);

  // Proteção contra path traversal
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback para index.html (SPA)
      fs.readFile(path.join(ROOT, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.on('error', err => {
  process.stdout.write('[ERROR] server: ' + err.message + '\n');
  process.exit(1);
});

process.on('uncaughtException', err => {
  process.stdout.write('[ERROR] uncaught: ' + err.message + '\n');
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write('[BOOT] Hub Benjamim na porta ' + PORT + '\n');
});
