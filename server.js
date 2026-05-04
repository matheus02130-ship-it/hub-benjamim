// server.js — DIAGNÓSTICO MÍNIMO
// Zero imports externos, zero complexidade
import http from 'http';

const PORT = process.env.PORT || 3000;

process.stdout.write('[BOOT] server.js iniciando\n');
process.stdout.write('[BOOT] node: ' + process.version + '\n');
process.stdout.write('[BOOT] PORT env: ' + String(process.env.PORT) + '\n');
process.stdout.write('[BOOT] cwd: ' + process.cwd() + '\n');

process.on('uncaughtException', (err) => {
  process.stdout.write('[ERROR] uncaughtException: ' + err.message + '\n');
  process.stdout.write(err.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  process.stdout.write('[ERROR] unhandledRejection: ' + String(reason) + '\n');
});

const server = http.createServer((req, res) => {
  process.stdout.write('[REQ] ' + req.method + ' ' + req.url + '\n');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hub Benjamim ok - ' + new Date().toISOString());
});

server.on('error', (err) => {
  process.stdout.write('[ERROR] server error: ' + err.message + '\n');
  process.exit(1);
});

server.listen(PORT, () => {
  process.stdout.write('[BOOT] escutando na porta ' + PORT + '\n');
});
