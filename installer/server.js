const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 38473;
const HOST = '127.0.0.1';
const appDir = path.join(__dirname, '..', 'app');
const certDir = path.join(__dirname, '..', 'certs');
const logDir = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
const logStream = fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    logStream.write(line);
    console.log(line.trim());
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const options = {
    pfx: fs.readFileSync(path.join(certDir, 'localhost.pfx')),
    passphrase: 'tvci123'
};

const server = https.createServer(options, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Simple api for logging if needed
    if (req.method === 'POST' && req.url === '/api/log') {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            log(`[CLIENT] ${data}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
        });
        return;
    }
    
    let filePath = path.join(appDir, req.url === '/' ? 'taskpane.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
    log(`TVCI Word Tools Server running at https://${HOST}:${PORT}/`);
});
