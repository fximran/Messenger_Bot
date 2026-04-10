const { spawn, exec } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const multer = require('multer');

// ==================== Database Setup ====================
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        permission INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.get("SELECT id FROM users WHERE email = 'owner@example.com'", async (err, row) => {
        if (!row) {
            const hashedPassword = await bcrypt.hash('owner123', 10);
            db.run("INSERT INTO users (name, email, password, permission) VALUES (?, ?, ?, ?)",
                ['Owner', 'owner@example.com', hashedPassword, 3]
            );
            console.log("Default owner created: owner@example.com / owner123");
        }
    });
});

cron.schedule('0 2 * * *', () => {
    const daysToKeep = 30;
    db.run(`DELETE FROM activity_logs WHERE created_at < datetime('now', '-' || ? || ' days')`, [daysToKeep],
        function(err) {
            if (err) console.error('Auto-clean error:', err);
            else console.log(`Auto-cleaned ${this.changes} old activity logs.`);
        });
});
console.log('Auto-clean scheduled: daily at 2:00 AM, keeping 30 days of logs.');

// ==================== Load package.json ====================
let pkg = {};
try {
    pkg = require(path.join(__dirname, "package.json"));
} catch (err) {
    logger(`Failed to load package.json: ${err.message}`, "[ Error ]");
}
const BOT_NAME = pkg.name || "Islamick Bot";
const BOT_VERSION = pkg.version || "5.0.0";

// ==================== Express Server ====================
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-very-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== Helper Functions ====================
function requireAuth(req, res, next) {
    if (req.session.user) next();
    else res.redirect('/login');
}

function requirePermission(level) {
    return (req, res, next) => {
        if (!req.session.user) return res.redirect('/login');
        if (req.session.user.permission >= level) next();
        else res.status(403).render('error', { message: 'Forbidden: insufficient permission.' });
    };
}

function logActivity(userId, userName, action, details = '', req = null) {
    const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : '';
    db.run('INSERT INTO activity_logs (user_id, user_name, action, details, ip) VALUES (?, ?, ?, ?, ?)',
        [userId, userName, action, details, ip],
        (err) => { if (err) console.error('Activity log error:', err); });
}

const PM2_PROCESS_NAME = "messenger-bot";

function getPM2Status(callback) {
    exec(`pm2 jlist`, (error, stdout, stderr) => {
        if (error) return callback({ online: false, error: error.message });
        try {
            const list = JSON.parse(stdout);
            const bot = list.find(p => p.name === PM2_PROCESS_NAME);
            if (!bot) return callback({ online: false, status: 'stopped' });
            const uptime = bot.pm2_env?.pm_uptime ? Date.now() - bot.pm2_env.pm_uptime : 0;
            const uptimeSeconds = Math.floor(uptime / 1000);
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;
            let uptimeString = "";
            if (days > 0) uptimeString += `${days}d `;
            if (hours > 0) uptimeString += `${hours}h `;
            if (minutes > 0) uptimeString += `${minutes}m `;
            uptimeString += `${seconds}s`;
            callback({
                online: bot.pm2_env?.status === 'online',
                status: bot.pm2_env?.status,
                uptime: uptimeString,
                uptimeSeconds,
                restartCount: bot.pm2_env?.restart_time || 0,
                cpu: bot.monit?.cpu || 0,
                memory: bot.monit?.memory || 0
            });
        } catch (e) {
            callback({ online: false, error: e.message });
        }
    });
}

function readConfig() {
    const configPath = path.join(__dirname, "config.json");
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, "utf8"));
        }
    } catch (e) {}
    return {};
}

// ==================== Routes ====================
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/', (req, res) => res.redirect('/login'));

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    db.get('SELECT id, name, email, password, permission FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid email or password.' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
        req.session.user = { id: user.id, name: user.name, email: user.email, permission: user.permission };
        logActivity(user.id, user.name, 'LOGIN', 'User logged in', req);
        res.json({ success: true, user: req.session.user });
    });
});

app.post('/api/logout', (req, res) => {
    if (req.session.user) logActivity(req.session.user.id, req.session.user.name, 'LOGOUT', 'User logged out', req);
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
    if (req.session.user) res.json({ user: req.session.user });
    else res.status(401).json({ error: 'Not logged in' });
});

// Admin view routes
app.get('/admin', requireAuth, (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', { user: req.session.user, currentPage: 'dashboard', pkgVersion: BOT_VERSION });
});
app.get('/admin/users', requireAuth, requirePermission(2), (req, res) => {
    res.render('users', { user: req.session.user, currentPage: 'users', pkgVersion: BOT_VERSION });
});
app.get('/admin/settings', requireAuth, requirePermission(2), (req, res) => {
    res.render('settings', { user: req.session.user, currentPage: 'settings', pkgVersion: BOT_VERSION });
});
app.get('/admin/groupfiles', requireAuth, requirePermission(2), (req, res) => {
    res.render('groupfiles', { user: req.session.user, currentPage: 'groupfiles', pkgVersion: BOT_VERSION });
});

// ----- User Management APIs -----
app.get('/api/users', requireAuth, requirePermission(2), (req, res) => {
    db.all('SELECT id, name, email, permission, created_at, updated_at FROM users ORDER BY id', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/users', requireAuth, requirePermission(2), async (req, res) => {
    const { name, email, password, permission } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required.' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password, permission) VALUES (?, ?, ?, ?)',
            [name, email, hashed, permission || 0],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists.' });
                    return res.status(500).json({ error: err.message });
                }
                logActivity(req.session.user.id, req.session.user.name, 'USER_CREATE', `Created user ${email}`, req);
                res.json({ success: true, id: this.lastID });
            });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/users/:id', requireAuth, requirePermission(2), async (req, res) => {
    const { id } = req.params;
    const { name, email, password, permission } = req.body;
    let updates = [], params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (permission !== undefined) { updates.push('permission = ?'); params.push(permission); }
    if (password && password.trim() !== '') {
        updates.push('password = ?'); params.push(await bcrypt.hash(password, 10));
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists.' });
            return res.status(500).json({ error: err.message });
        }
        logActivity(req.session.user.id, req.session.user.name, 'USER_UPDATE', `Updated user ID ${id}`, req);
        res.json({ success: true });
    });
});
app.delete('/api/users/:id', requireAuth, requirePermission(3), (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM users WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
        logActivity(req.session.user.id, req.session.user.name, 'USER_DELETE', `Deleted user ID ${id}`, req);
        res.json({ success: true });
    });
});

// ----- Activity Logs -----
app.get('/api/activity', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    db.all('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ----- Bot Logs -----
app.get('/api/bot-logs', requireAuth, requirePermission(2), (req, res) => {
    const lines = parseInt(req.query.lines) || 200;
    exec(`pm2 logs ${PM2_PROCESS_NAME} --lines ${lines} --nostream`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message, stderr });
        res.json({ logs: stdout });
    });
});

// ----- Bot Status & Control -----
app.get('/api/status', requireAuth, (req, res) => {
    getPM2Status((pm2Status) => {
        const config = readConfig();
        let botId = null;
        if (Array.isArray(config.NDH) && config.NDH.length > 0) botId = config.NDH[0];
        const debugMode = typeof config.DEBUG_MODE === 'boolean' ? config.DEBUG_MODE : false;
        res.json({
            botName: config.BOTNAME || "Unnamed Bot",
            botId: botId || 'N/A',
            botPrefix: config.PREFIX || "/",
            botLanguage: config.language || 'en',
            debugMode: debugMode,
            version: BOT_VERSION,
            online: pm2Status.online,
            status: pm2Status.status,
            uptime: pm2Status.uptime,
            uptimeSeconds: pm2Status.uptimeSeconds,
            restartCount: pm2Status.restartCount,
            cpu: pm2Status.cpu,
            memory: pm2Status.memory
        });
    });
});
app.post('/api/start', requireAuth, (req, res) => {
    exec(`pm2 start ${PM2_PROCESS_NAME}`, (error) => {
        if (error) return res.status(500).json({ error: error.message });
        logActivity(req.session.user.id, req.session.user.name, 'BOT_START', 'Started messenger-bot', req);
        res.json({ success: true });
    });
});
app.post('/api/stop', requireAuth, (req, res) => {
    exec(`pm2 stop ${PM2_PROCESS_NAME}`, (error) => {
        if (error) return res.status(500).json({ error: error.message });
        logActivity(req.session.user.id, req.session.user.name, 'BOT_STOP', 'Stopped messenger-bot', req);
        res.json({ success: true });
    });
});
app.post('/api/restart', requireAuth, (req, res) => {
    exec(`pm2 restart ${PM2_PROCESS_NAME}`, (error) => {
        if (error) return res.status(500).json({ error: error.message });
        logActivity(req.session.user.id, req.session.user.name, 'BOT_RESTART', 'Restarted messenger-bot', req);
        res.json({ success: true });
    });
});
app.post('/api/restart-panel', requireAuth, requirePermission(2), (req, res) => {
    logActivity(req.session.user.id, req.session.user.name, 'PANEL_RESTART', 'Restarting messenger-panel', req);
    res.json({ success: true, message: 'Panel restart initiated.' });
    setTimeout(() => {
        exec(`pm2 restart messenger-panel`, (error) => {
            if (error) console.error('Panel restart error:', error);
        });
    }, 500);
});

// ----- Config / AppState APIs -----
app.get('/api/config', requireAuth, requirePermission(2), (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        if (!fs.existsSync(configPath)) return res.status(404).json({ error: "config.json not found." });
        res.json(JSON.parse(fs.readFileSync(configPath, "utf8")));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/config', requireAuth, requirePermission(2), (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        const newConfig = req.body;
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
        if (!global.config) global.config = {};
        if (typeof newConfig.language !== 'undefined') global.config.language = newConfig.language;
        if (typeof newConfig.DEBUG_MODE !== 'undefined') global.debugMode = newConfig.DEBUG_MODE;
        logActivity(req.session.user.id, req.session.user.name, 'CONFIG_EDIT', 'Updated config.json', req);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/appstate', requireAuth, (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        if (!fs.existsSync(appstatePath)) return res.json([]);
        res.json(JSON.parse(fs.readFileSync(appstatePath, "utf8")));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/appstate', requireAuth, (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        fs.writeFileSync(appstatePath, JSON.stringify(req.body, null, 2), "utf8");
        logActivity(req.session.user.id, req.session.user.name, 'APPSTATE_EDIT', 'Updated appstate.json', req);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Group Files Management (box_exports) -----
const boxExportPath = path.join(__dirname, "Script", "commands", "cache", "box_exports");
if (!fs.existsSync(boxExportPath)) fs.mkdirSync(boxExportPath, { recursive: true });

app.get('/api/groupfiles', requireAuth, requirePermission(2), (req, res) => {
    try {
        const files = fs.readdirSync(boxExportPath)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filePath = path.join(boxExportPath, f);
                const stats = fs.statSync(filePath);
                let groupName = '';
                let totalMembers = 0;
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    groupName = content.groupName || 'Unknown';
                    totalMembers = content.totalMembers || 0;
                } catch (e) {}
                return {
                    filename: f,
                    groupName,
                    totalMembers,
                    size: stats.size,
                    modified: stats.mtime
                };
            });
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/groupfiles/download/:filename', requireAuth, requirePermission(2), (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(boxExportPath, filename);
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.download(filePath, filename);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const upload = multer({ dest: boxExportPath });
app.post('/api/groupfiles/upload', requireAuth, requirePermission(2), upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const originalName = req.file.originalname;
        if (!originalName.endsWith('.json')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Only JSON files are allowed' });
        }
        const newPath = path.join(boxExportPath, originalName);
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
        fs.renameSync(req.file.path, newPath);
        logActivity(req.session.user.id, req.session.user.name, 'UPLOAD_GROUPFILE', `Uploaded ${originalName}`, req);
        res.json({ success: true, filename: originalName });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/groupfiles/:filename', requireAuth, requirePermission(2), (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(boxExportPath, filename);
    try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        fs.unlinkSync(filePath);
        logActivity(req.session.user.id, req.session.user.name, 'DELETE_GROUPFILE', `Deleted ${filename}`, req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== Start Server ====================
app.listen(port, () => {
    logger(`Server running on port ${port}`, "[ Starting ]");
    logger(`Login at: http://localhost:${port}/login`, "[ Info ]");
}).on("error", (err) => logger(`Server error: ${err.message}`, "[ Error ]"));

logger(BOT_NAME, "[ NAME ]");
logger(`Version: ${BOT_VERSION}`, "[ VERSION ]");