const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder and db file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      users: [],
      solves: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
    return initialDB;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return { users: [], solves: [] };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  /* ------------------- REST API (DATABASE) ------------------- */
  if (pathname.startsWith('/api/')) {
    const db = loadDB();

    // 1. Register Account
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { username, email, password, avatar, avatarId } = await parseBody(req);
      if (!username || !password) {
        return sendJSON(res, 400, { error: 'Nome de usuário e senha são obrigatórios.' });
      }

      const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() || (email && u.email === email));
      if (existing) {
        return sendJSON(res, 400, { error: 'Já existe um usuário com este nome ou email.' });
      }

      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        username: username.trim(),
        email: email ? email.trim() : '',
        passwordHash: hashPassword(password),
        avatar: avatar || '🔥',
        avatarId: avatarId || 'fire',
        elo: 1000,
        level: 1,
        xp: 0,
        fireCoins: 120,
        duelsWon: 0,
        duelsLost: 0,
        activeSkin: 'default',
        unlockedSkins: ['default'],
        createdAt: new Date().toLocaleDateString('pt-BR')
      };

      db.users.push(newUser);
      saveDB(db);

      // Return user without passwordHash
      const { passwordHash, ...userSafe } = newUser;
      return sendJSON(res, 201, { success: true, user: userSafe, token: newUser.id });
    }

    // 2. Login Account
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { identifier, password } = await parseBody(req);
      if (!identifier || !password) {
        return sendJSON(res, 400, { error: 'Preencha o nome/email e senha.' });
      }

      const hash = hashPassword(password);
      const user = db.users.find(u => 
        (u.username.toLowerCase() === identifier.toLowerCase() || (u.email && u.email.toLowerCase() === identifier.toLowerCase())) &&
        u.passwordHash === hash
      );

      if (!user) {
        return sendJSON(res, 401, { error: 'Credenciais inválidas. Verifique seu usuário e senha.' });
      }

      const { passwordHash, ...userSafe } = user;
      const userSolves = db.solves.filter(s => s.userId === user.id);
      return sendJSON(res, 200, { success: true, user: userSafe, solves: userSolves, token: user.id });
    }

    // 3. Get User Profile & Solves
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const userId = urlObj.searchParams.get('userId');
      const user = db.users.find(u => u.id === userId);
      if (!user) {
        return sendJSON(res, 404, { error: 'Usuário não encontrado.' });
      }
      const { passwordHash, ...userSafe } = user;
      const userSolves = db.solves.filter(s => s.userId === user.id);
      return sendJSON(res, 200, { user: userSafe, solves: userSolves });
    }

    // 4. Sync User Stats & Skin
    if (pathname === '/api/user/sync' && req.method === 'POST') {
      const body = await parseBody(req);
      const { userId, elo, level, xp, fireCoins, duelsWon, duelsLost, activeSkin, unlockedSkins } = body;
      const user = db.users.find(u => u.id === userId);
      if (user) {
        if (elo !== undefined) user.elo = elo;
        if (level !== undefined) user.level = level;
        if (xp !== undefined) user.xp = xp;
        if (fireCoins !== undefined) user.fireCoins = fireCoins;
        if (duelsWon !== undefined) user.duelsWon = duelsWon;
        if (duelsLost !== undefined) user.duelsLost = duelsLost;
        if (activeSkin) user.activeSkin = activeSkin;
        if (unlockedSkins) user.unlockedSkins = unlockedSkins;
        saveDB(db);
        return sendJSON(res, 200, { success: true });
      }
      return sendJSON(res, 404, { error: 'Usuário não encontrado.' });
    }

    // 5. Save Solve to Database
    if (pathname === '/api/solves' && req.method === 'POST') {
      const solve = await parseBody(req);
      if (solve && solve.time) {
        db.solves.push(solve);
        saveDB(db);
        return sendJSON(res, 201, { success: true, solveId: solve.id });
      }
      return sendJSON(res, 400, { error: 'Dados do solve inválidos.' });
    }

    // 6. Delete Solve
    if (pathname === '/api/solves/delete' && req.method === 'POST') {
      const { solveId, userId } = await parseBody(req);
      db.solves = db.solves.filter(s => s.id !== solveId || (userId && s.userId !== userId));
      saveDB(db);
      return sendJSON(res, 200, { success: true });
    }

    // 7. Leaderboard from Database
    if (pathname === '/api/leaderboard' && req.method === 'GET') {
      const userRanking = db.users.map((u, idx) => ({
        rank: idx + 1,
        name: u.username,
        avatar: u.avatar || '🔥',
        elo: u.elo || 1000,
        level: u.level || 1,
        duelsWon: u.duelsWon || 0
      })).sort((a, b) => b.elo - a.elo);

      return sendJSON(res, 200, { leaderboard: userRanking });
    }

    return sendJSON(res, 404, { error: 'Endpoint não encontrado.' });
  }

  /* ------------------- STATIC FILE SERVER ------------------- */
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(BASE_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Arquivo não encontrado');
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`FireCube Pro servidor ativo em http://${HOST}:${PORT}/`);
});
