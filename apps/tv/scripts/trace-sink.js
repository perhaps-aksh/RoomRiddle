#!/usr/bin/env node
/**
 * trace-sink: receives the TV app's dev audio trace (src/audio/trace.ts) and
 * appends it to a file, because the VVD's system log drops app log lines
 * under load (FL-013). Run inside WSL, where the VVD sees it as 10.0.2.2:
 *   wsl.exe -d Ubuntu-24.04 -- node /mnt/d/RoomRiddle/apps/tv/scripts/trace-sink.js [out]
 * Default out: Hermes scratch rr-trace.log. Dev tooling only; no dependencies.
 */
const http = require('node:http');
const fs = require('node:fs');

const PORT = Number(process.env.TRACE_PORT || 4010);
const OUT = process.argv[2] || '/mnt/c/Users/thaku/AppData/Local/hermes/cache/scratch/rr-trace.log';

http
  .createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/trace') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      fs.appendFileSync(OUT, body.endsWith('\n') ? body : body + '\n');
      res.writeHead(204).end();
    });
  })
  .listen(PORT, '0.0.0.0', () => console.log(`trace-sink :${PORT} -> ${OUT}`));
