const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 38473;
const HOST = '127.0.0.1';
const root = path.resolve(__dirname, '..');
const data = path.join(process.env.LOCALAPPDATA || root, 'TVCIWordTools');
const app = path.join(root, 'app');
const logs = path.join(data, 'logs');
fs.mkdirSync(logs, { recursive: true });

function log(message) {
  try {
    fs.appendFileSync(path.join(logs, 'server.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {}
}

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
});

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

try {
  const certs = path.join(data, 'certs');
  const tlsConfig = {
    pfx: fs.readFileSync(path.join(certs, 'localhost.pfx')),
    passphrase: fs.readFileSync(path.join(certs, 'password.txt'), 'utf8').trim()
  };

  const handleRequest = (request, response) => {
    const origin = request.headers.origin;
    if (origin && (origin === 'https://localhost:38473' || origin === 'https://127.0.0.1:38473')) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204); response.end(); return;
    }

    let url;
    try { url = new URL(request.url, `https://localhost:${PORT}`); }
    catch { response.writeHead(400); response.end(); return; }

    if (url.pathname === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ app: 'TVCIWordTools', status: 'ready' }));
      return;
    }

    if (url.pathname === '/api/log') {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => {
        log(`[CLIENT-LOG] ${body}`);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    if (url.pathname === '/api/repair') {
      const restartWord = url.searchParams.get('restart') === '1';
      log(`Repair requested (restartWord=${restartWord})`);
      const { spawn } = require('node:child_process');
      const candidates = [
        path.join(root, 'scripts', 'repair.ps1'),
        path.join(root, 'installer', 'repair.ps1'),
        path.join(root, 'repair.ps1'),
        path.join(__dirname, 'repair.ps1')
      ];
      const script = candidates.find(c => fs.existsSync(c));
      if (!script) {
        log('repair.ps1 not found in candidates');
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'repair.ps1 not found' }));
        return;
      }

      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script];
      if (restartWord) args.push('-RestartWord');

      const child = spawn('powershell.exe', args, { windowsHide: true, detached: true });
      child.unref();

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, message: 'Đang cấu hình WebView2 và làm sạch cache.' }));
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405); response.end(); return;
    }

    let relative;
    try { relative = decodeURIComponent(url.pathname === '/' ? 'taskpane.html' : url.pathname.slice(1)); }
    catch { response.writeHead(400); response.end(); return; }

    const file = path.resolve(app, relative);
    if (!file.startsWith(app + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }

    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(file);
    stream.on('error', (err) => {
      log(`Stream read error: ${err.message}`);
      if (!response.headersSent) { response.writeHead(500); }
      response.end();
    });
    response.on('error', (err) => {
      log(`Response pipe error: ${err.message}`);
      stream.destroy();
    });
    stream.pipe(response);
  };

  const server = https.createServer(tlsConfig, handleRequest);

  server.on('error', error => {
    log(error.code === 'EADDRINUSE' ? 'Host failed: EADDRINUSE on port 38473; another process remains untouched.' : `Host failed: ${error.code || error.message}`);
    process.exitCode = 1;
  });

  server.listen(PORT, HOST, () => log(`Host ready on ${HOST}:${PORT}, pid ${process.pid}`));

  try {
    const serverV6 = https.createServer(tlsConfig, handleRequest);
    serverV6.on('error', () => {});
    serverV6.listen(PORT, '::1', () => log(`Host IPv6 ready on [::1]:${PORT}`));
  } catch {}
} catch (error) {
  log(`Host initialization failed: ${error.message}`);
  process.exitCode = 1;
}
