const { spawn, exec } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

// ==================== Database Setup ====================
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // ইউজার টেবিল
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        permission INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ডিফল্ট Owner ইউজার তৈরি (যদি না থাকে)
    db.get("SELECT id FROM users WHERE email = 'owner@example.com'", async (err, row) => {
        if (!row) {
            const hashedPassword = await bcrypt.hash('owner123', 10);
            db.run("INSERT INTO users (name, email, password, permission) VALUES (?, ?, ?, ?)",
                ['Owner', 'owner@example.com', hashedPassword, 3]
            );
            console.log("Default owner user created: owner@example.com / owner123");
        }
    });
});

// ==================== Load package.json ====================
let pkg = {};
try {
    pkg = require(path.join(__dirname, "package.json"));
} catch (err) {
    logger(`Failed to load package.json: ${err.message}`, "[ Error ]");
}
const BOT_NAME = pkg.name || "Islamick Bot";
const BOT_VERSION = pkg.version || "5.0.0";
const BOT_DESC = pkg.description || "Islamick Chat Bot";

// ==================== Express Server ====================
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: 'your-very-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// ==================== Authentication Middleware ====================
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function requirePermission(level) {
    return (req, res, next) => {
        if (!req.session.user) return res.redirect('/login');
        if (req.session.user.permission >= level) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: insufficient permission.' });
        }
    };
}

// ==================== PM2 Process Name ====================
const PM2_PROCESS_NAME = "messenger-bot";

// ==================== Helper: Get PM2 Bot Status ====================
function getPM2Status(callback) {
    exec(`pm2 jlist`, (error, stdout, stderr) => {
        if (error) {
            callback({ online: false, error: error.message });
            return;
        }
        try {
            const list = JSON.parse(stdout);
            const bot = list.find(p => p.name === PM2_PROCESS_NAME);
            if (!bot) {
                callback({ online: false, status: 'stopped' });
                return;
            }
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
                uptimeSeconds: uptimeSeconds,
                restartCount: bot.pm2_env?.restart_time || 0,
                cpu: bot.monit?.cpu || 0,
                memory: bot.monit?.memory || 0
            });
        } catch (e) {
            callback({ online: false, error: e.message });
        }
    });
}

// ==================== Routes ====================

// ----- Public routes -----
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

// ----- Authentication APIs -----
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required.' });
    }
    db.get('SELECT id, name, email, password, permission FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            permission: user.permission
        };
        res.json({ success: true, user: req.session.user });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// ----- Protected routes (requireAuth) -----
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ----- Member Management APIs (requireAuth + permission check) -----
// GET all members (only admin can see all)
app.get('/api/users', requireAuth, (req, res) => {
    db.all('SELECT id, name, email, permission, created_at, updated_at FROM users ORDER BY id', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create user (requires permission >= 2)
app.post('/api/users', requireAuth, requirePermission(2), async (req, res) => {
    const { name, email, password, permission } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password, permission) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, permission || 0],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists.' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, id: this.lastID });
            });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT update user (requires permission >= 2)
app.put('/api/users/:id', requireAuth, requirePermission(2), async (req, res) => {
    const { id } = req.params;
    const { name, email, password, permission } = req.body;

    let updates = [];
    let params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (permission !== undefined) { updates.push('permission = ?'); params.push(permission); }
    if (password && password.trim() !== '') {
        const hashed = await bcrypt.hash(password, 10);
        updates.push('password = ?'); params.push(hashed);
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
    }

    params.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// DELETE user (requires permission >= 3)
app.delete('/api/users/:id', requireAuth, requirePermission(3), (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM users WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
        res.json({ success: true });
    });
});

// ----- Bot Status & Control APIs (requireAuth) -----
app.get('/api/status', requireAuth, (req, res) => {
    getPM2Status((status) => {
        res.json({
            ...status,
            botName: BOT_NAME,
            version: BOT_VERSION
        });
    });
});

app.post('/api/start', requireAuth, (req, res) => {
    exec(`pm2 start ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: "Bot started.", output: stdout });
    });
});

app.post('/api/stop', requireAuth, (req, res) => {
    exec(`pm2 stop ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: "Bot stopped.", output: stdout });
    });
});

app.post('/api/restart', requireAuth, (req, res) => {
    exec(`pm2 restart ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: "Bot restarted.", output: stdout });
    });
});

// ----- Config & AppState Editor APIs (requireAuth) -----
app.get('/api/config', requireAuth, (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        if (!fs.existsSync(configPath)) return res.status(404).json({ error: "config.json not found." });
        const data = fs.readFileSync(configPath, "utf8");
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/config', requireAuth, (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2), "utf8");
        res.json({ success: true, message: "Config saved." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/appstate', requireAuth, (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        if (!fs.existsSync(appstatePath)) return res.json([]);
        const data = fs.readFileSync(appstatePath, "utf8");
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/appstate', requireAuth, (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        fs.writeFileSync(appstatePath, JSON.stringify(req.body, null, 2), "utf8");
        res.json({ success: true, message: "AppState saved." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== Start Server ====================
app.listen(port, () => {
    logger(`Server is running on port ${port}...`, "[ Starting ]");
    logger(`Login at: http://localhost:${port}/login`, "[ Info ]");
}).on("error", (err) => {
    if (err.code === "EACCES") {
        logger(`Permission denied. Cannot bind to port ${port}.`, "[ Error ]");
    } else {
        logger(`Server error: ${err.message}`, "[ Error ]");
    }
});

logger(BOT_NAME, "[ NAME ]");
logger(`Version: ${BOT_VERSION}`, "[ VERSION ]");