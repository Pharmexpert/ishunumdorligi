/* ==========================================
   ISH UNUMDORLIGI — Backend Server
   Node.js + Express + JSON DB + JWT + SMTP
   ========================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_change_me';
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// Dynamic site URL based on request (works for both localhost and production)
function getSiteUrl(req) {
    if (!req) return SITE_URL;
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers.host || `localhost:${PORT}`;
    return `${proto}://${host}`;
}
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;
const CODE_EXPIRY_MINUTES = 10;

// ==========================================
// JSON FILE DATABASE
// ==========================================
// On Vercel, filesystem is read-only except /tmp
const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = IS_VERCEL ? '/tmp/data.json' : path.join(__dirname, 'data.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        }
    } catch (e) {
        console.error('DB read error:', e.message);
    }
    return { users: [], invitations: [], verification_codes: [], notifications: [] };
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

let db = loadDB();

// Seed admin user if empty
if (db.users.length === 0) {
    const now = new Date().toISOString();
    const adminPw = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
    const samplePw = bcrypt.hashSync('123456', BCRYPT_ROUNDS);
    db.users = [
        { id: 'admin_1', name: 'Administrator', email: 'admin@dpf.uz', password: adminPw, role: 'admin', department: "Davlat farmakopeyasi ishlab chiqish bo'limi", status: 'approved', avatar: 'A', language: 'uz', invited_by: null, created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0 },
        { id: 'user_2', name: 'Aziz Rahimov', email: 'aziz@dpf.uz', password: samplePw, role: 'rahbar', department: "Sifat nazorati bo'limi", status: 'approved', avatar: 'A', language: 'uz', invited_by: null, created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0 },
        { id: 'user_3', name: 'Malika Karimova', email: 'malika@dpf.uz', password: samplePw, role: 'ishchi', department: "Sifat nazorati bo'limi", status: 'approved', avatar: 'M', language: 'uz', invited_by: null, created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0 },
        { id: 'user_4', name: 'Bobur Toshmatov', email: 'bobur@dpf.uz', password: samplePw, role: 'ishchi', department: "Standartlashtirish bo'limi", status: 'approved', avatar: 'B', language: 'uz', invited_by: null, created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0 },
        { id: 'user_5', name: 'Dilnoza Ergasheva', email: 'dilnoza@dpf.uz', password: samplePw, role: 'ekspert', department: "Sifat nazorati bo'limi", status: 'approved', avatar: 'D', language: 'uz', invited_by: null, created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0 },
    ];
    saveDB(db);
    console.log('✅ Seeded admin + sample users (5 users)');
}

// ==========================================
// SMTP SETUP (with fallback)
// ==========================================
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: parseInt(process.env.SMTP_PORT) === 587 ? false : true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
} catch (e) {
    console.error('⚠️ SMTP transport creation failed:', e.message);
}

async function sendEmail(to, subject, html) {
    if (!transporter) {
        console.error('❌ SMTP transporter not configured');
        return { success: false, error: 'SMTP not configured' };
    }
    try {
        const info = await transporter.sendMail({
            from: `"Ish unumdorligi" <${process.env.SMTP_USER}>`, to, subject, html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Email error to ${to}:`, err.message);
        // If DNS fails, log instructions
        if (err.code === 'ENOTFOUND' || err.code === 'EDNS') {
            console.error(`⚠️ SMTP host "${process.env.SMTP_HOST}" DNS topilmadi!`);
            console.error(`💡 .env faylda SMTP_HOST ni to'g'ri sozlang (masalan: smtp.gmail.com, smtp.mail.ru)`);
        }
        return { success: false, error: err.message };
    }
}

// Static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname), {
    extensions: ['html'],
    index: 'login.html'
}));

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter
const rateLimiter = {};
function rateLimit(key, max = 10, windowMs = 60000) {
    const now = Date.now();
    if (!rateLimiter[key]) rateLimiter[key] = [];
    rateLimiter[key] = rateLimiter[key].filter(t => now - t < windowMs);
    if (rateLimiter[key].length >= max) return false;
    rateLimiter[key].push(now);
    return true;
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    // Support both header and query param (for sendBeacon)
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }
    if (!token) return res.status(401).json({ error: 'Авторизация талаб қилинади' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db = loadDB();
        let user = db.users.find(u => u.id === decoded.userId);
        // Vercel cold start fix: if JWT is valid but user not in DB, auto-create
        if (!user && IS_VERCEL) {
            const now = new Date().toISOString();
            user = {
                id: decoded.userId,
                name: decoded.name || decoded.userId.replace(/^(google|user)_/, ''),
                email: decoded.email || 'restored@vercel.tmp',
                password: null,
                role: decoded.role || 'foydalanuvchi',
                department: decoded.department || '',
                status: 'approved',
                avatar: (decoded.name || '?').charAt(0).toUpperCase(),
                language: 'uz',
                authMethod: decoded.userId.startsWith('google') ? 'google' : 'email',
                created_at: now,
                last_login: now,
                _restoredFromJwt: true
            };
            if (!db.user_data) db.user_data = {};
            db.users.push(user);
            saveDB(db);
            console.log(`🔄 Auto-restored user from JWT: ${decoded.userId} (${decoded.email || 'no-email'})`);
        }
        if (!user || user.status !== 'approved')
            return res.status(401).json({ error: 'Фойдаланувчи топилмади ёки тасдиқланмаган' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Нотўғри токен' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат администратор учун' });
    next();
}
function leaderOrAdmin(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'rahbar')
        return res.status(403).json({ error: 'Рухсат берилмаган' });
    next();
}

// Helpers
function genId(prefix = 'id') { return prefix + '_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'); }
function genToken() { return crypto.randomBytes(24).toString('hex'); }
function genCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function sanitizeUser(u) {
    if (!u) return null;
    const { password, ...safe } = u;
    return { ...safe, stats: { tasksCreated: u.tasks_created || 0, tasksCompleted: u.tasks_completed || 0, avgProductivity: u.avg_productivity || 0 } };
}

// ==========================================
// AUTH ROUTES
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    if (!rateLimit('register_' + req.ip, 5, 300000))
        return res.status(429).json({ error: 'Жуда кўп сўровлар. 5 дақиқадан кейин уриниб кўринг.' });

    let { name, email, password, department, token } = req.body;
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '');
    department = (department || '').trim();

    if (!name || !email || !password) return res.status(400).json({ error: 'Барча майдонларни тўлдиринг' });
    if (password.length < 8) return res.status(400).json({ error: 'Парол камида 8 белгидан иборат бўлиши керак' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Нотўғри email формат' });

    db = loadDB();
    if (db.users.find(u => u.email === email))
        return res.status(400).json({ error: 'Бу email аллақачон рўйхатдан ўтган' });

    let invitation = null;
    if (token) {
        invitation = db.invitations.find(inv => inv.token === token && inv.status === 'pending');
        if (!invitation) return res.status(400).json({ error: 'Таклифнома топилмади ёки аллақачон ишлатилган' });
        if (new Date(invitation.expires_at) < new Date()) return res.status(400).json({ error: 'Таклифнома муддати тугаган (24 соат)' });
        if (invitation.email.toLowerCase() !== email) return res.status(400).json({ error: 'Email таклифномадаги email билан мос келмайди' });
    }

    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const userId = genId('user');
    const now = new Date().toISOString();
    const role = invitation ? 'ishchi' : 'foydalanuvchi';
    const dept = invitation ? invitation.department : department;
    const status = invitation ? 'approved' : 'pending';

    db.users.push({
        id: userId, name, email, password: hashedPassword, role, department: dept, status,
        avatar: name.charAt(0).toUpperCase(), language: 'uz', invited_by: invitation ? invitation.invited_by : null,
        created_at: now, last_login: null, tasks_created: 0, tasks_completed: 0, avg_productivity: 0
    });

    if (invitation) {
        invitation.status = 'accepted';
        invitation.accepted_at = now;
        invitation.user_id = userId;
        db.notifications.push({
            id: genId('notif'), user_id: invitation.invited_by, type: 'invite_accepted',
            message: `${name} таклифни қабул қилди`, related_id: userId, is_read: 0, created_at: now
        });
        saveDB(db);
        const jwtToken = jwt.sign({ userId, name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.department }, JWT_SECRET, { expiresIn: '7d' });
        const user = db.users.find(u => u.id === userId);
        return res.json({ success: true, autoApproved: true, wasInvited: true, token: jwtToken, user: sanitizeUser(user) });
    }

    // Non-invited: send verification code
    const code = genCode();
    const codeExpiry = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();
    db.verification_codes.push({
        id: genId('vcode'), email, code, type: 'registration', created_at: now, expires_at: codeExpiry, is_used: 0
    });
    saveDB(db);

    await sendEmail(email, 'Рўйхатдан ўтиш тасдиқлаш коди — Ish unumdorligi', `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FFF8F0;border-radius:16px;border:1px solid rgba(180,140,100,0.12)">
        <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,#C07840,#D4956B,#E8B78E);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                <span style="color:white;font-size:24px;font-weight:800">P</span>
            </div>
            <h2 style="color:#3D2B1F;margin:0">Ish unumdorligi</h2>
        </div>
        <p style="color:#6B5744;font-size:15px;line-height:1.6">Ассалому алайкум, <strong>${name}</strong>!<br>Рўйхатдан ўтишни тасдиқлаш учун қуйидаги кодни киритинг:</p>
        <div style="text-align:center;margin:24px 0">
            <div style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;font-size:32px;font-weight:800;letter-spacing:8px;border-radius:12px;box-shadow:0 4px 16px rgba(192,120,64,0.25)">${code}</div>
        </div>
        <p style="color:#9C8B7A;font-size:13px;text-align:center">Бу код ${CODE_EXPIRY_MINUTES} дақиқа ичида яроқли.</p>
    </div>`);

    res.json({ success: true, autoApproved: false, needsVerification: true });
});

// POST /api/auth/verify-code
app.post('/api/auth/verify-code', (req, res) => {
    let { email, code } = req.body;
    email = (email || '').trim().toLowerCase();
    code = (code || '').trim();
    if (!email || !code) return res.status(400).json({ error: 'Email ва кодни киритинг' });

    db = loadDB();
    const vcodes = db.verification_codes.filter(v => v.email === email && v.code === code && !v.is_used && v.type === 'registration');
    const vcode = vcodes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (!vcode) return res.status(400).json({ error: 'Нотўғри тасдиқлаш коди' });
    if (new Date(vcode.expires_at) < new Date()) return res.status(400).json({ error: 'Тасдиқлаш коди муддати ўтган.' });

    vcode.is_used = 1;
    saveDB(db);

    const user = db.users.find(u => u.email === email);
    res.json({ success: true, message: 'Email тасдиқланди. Администратор тасдиқлашини кутинг.', user: sanitizeUser(user) });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    if (!rateLimit('login_' + req.ip, 10, 60000))
        return res.status(429).json({ error: 'Жуда кўп уриниш. 1 дақиқадан кейин уриниб кўринг.' });

    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();
    if (!email || !password) return res.status(400).json({ error: 'Email ва паролни киритинг' });

    db = loadDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !user.password) return res.status(401).json({ error: 'Нотўғри email ёки парол' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Нотўғри email ёки парол' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Ҳисобингиз ҳали тасдиқланмаган.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Ҳисобингиз рад этилган.' });

    user.last_login = new Date().toISOString();
    saveDB(db);

    const token = jwt.sign({ userId: user.id, name: user.name, email: user.email, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
    let { name, email, credential, avatarUrl } = req.body;
    let firstName = '', lastName = '';

    // Verify Google ID token if provided
    if (credential) {
        try {
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
            if (!response.ok) return res.status(401).json({ error: 'Google токен тасдиқланмади' });
            const payload = await response.json();
            email = payload.email;
            firstName = payload.given_name || '';
            lastName = payload.family_name || '';
            name = payload.name || `${firstName} ${lastName}`.trim() || email.split('@')[0];
            avatarUrl = payload.picture || null;
        } catch (err) {
            return res.status(401).json({ error: 'Google аутентификация хатоси' });
        }
    }

    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email киритинг' });

    db = loadDB();
    let user = db.users.find(u => u.email === email);
    if (user) {
        // Existing user — update Google profile data
        if (user.status === 'rejected') return res.status(403).json({ error: 'Ҳисобингиз рад этилган.' });
        // Auto-approve pending Google users on re-login
        if (user.status === 'pending' && !user.password) {
            user.status = 'approved';
        }
        user.last_login = new Date().toISOString();
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        user.authMethod = 'google';
        saveDB(db);
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, user: sanitizeUser(user) });
    }

    const invitation = db.invitations.find(inv => inv.email === email && inv.status === 'pending');
    const now = new Date().toISOString();

    if (invitation && new Date(invitation.expires_at) >= new Date()) {
        const userId = genId('google');
        db.users.push({
            id: userId, name: name || email.split('@')[0], firstName, lastName, email, password: null,
            role: 'ishchi', department: invitation.department, status: 'approved',
            avatar: (name || email).charAt(0).toUpperCase(), avatarUrl: avatarUrl || null,
            authMethod: 'google', language: 'uz',
            invited_by: invitation.invited_by, created_at: now, last_login: now,
            tasks_created: 0, tasks_completed: 0, avg_productivity: 0
        });
        invitation.status = 'accepted'; invitation.accepted_at = now; invitation.user_id = userId;
        db.notifications.push({
            id: genId('notif'), user_id: invitation.invited_by, type: 'invite_accepted',
            message: `${name || email} таклифни қабул қилди (Google)`, related_id: userId, is_read: 0, created_at: now
        });
        saveDB(db);
        const token = jwt.sign({ userId, name: name || email.split('@')[0], email, role: 'ishchi', department: invitation.department }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, user: sanitizeUser(db.users.find(u => u.id === userId)), wasInvited: true });
    }

    // New Google user — AUTO-APPROVE (no admin approval needed)
    const userId = genId('google');
    db.users.push({
        id: userId, name: name || email.split('@')[0], firstName, lastName, email, password: null,
        role: 'foydalanuvchi', department: '', status: 'approved',
        avatar: (name || email).charAt(0).toUpperCase(), avatarUrl: avatarUrl || null,
        authMethod: 'google', language: 'uz',
        invited_by: null, created_at: now, last_login: now,
        tasks_created: 0, tasks_completed: 0, avg_productivity: 0
    });

    // Notify all admins about new Google user
    const admins = db.users.filter(u => u.role === 'admin' && u.id !== userId);
    admins.forEach(admin => {
        db.notifications.push({
            id: genId('notif'), user_id: admin.id, type: 'new_google_user',
            message: `🔐 Янги Google фойдаланувчи: ${name} (${email})`,
            related_id: userId, is_read: 0, created_at: now
        });
    });

    saveDB(db);
    const token = jwt.sign({ userId, name: name || email.split('@')[0], email, role: 'foydalanuvchi', department: '' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: sanitizeUser(db.users.find(u => u.id === userId)), isNewUser: true });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: sanitizeUser(req.user) });
});

// ==========================================
// FORGOT PASSWORD
// ==========================================
app.post('/api/auth/forgot-password', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email киритинг' });

    db = loadDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Бу email билан фойдаланувчи топилмади' });

    // Generate 6-digit reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Store reset code
    if (!db.reset_codes) db.reset_codes = [];
    // Remove old codes for this email
    db.reset_codes = db.reset_codes.filter(c => c.email !== email);
    db.reset_codes.push({ email, code, expiresAt, used: false });
    saveDB(db);

    // Send email
    const emailResult = await sendEmail(email, '🔐 Парол тиклаш — Ish unumdorligi', `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:linear-gradient(135deg,#FFFBF5,#FFF3E0);border-radius:16px;border:1px solid rgba(192,120,64,0.15)">
            <div style="text-align:center;margin-bottom:24px">
                <div style="font-size:2.5rem">🔐</div>
                <h2 style="color:#3D2B1F;margin:8px 0">Парол тиклаш</h2>
                <p style="color:#6B5744;font-size:0.9rem">Ассалому алайкум, <strong>${user.name}</strong>!</p>
            </div>
            <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;border:1px solid rgba(192,120,64,0.1)">
                <p style="color:#6B5744;margin-bottom:12px;font-size:0.9rem">Қуйидаги кодни киритинг:</p>
                <div style="font-size:2.5rem;font-weight:800;color:#C07840;letter-spacing:8px;padding:16px;background:rgba(192,120,64,0.08);border-radius:10px;font-family:monospace">${code}</div>
                <p style="color:#999;font-size:0.78rem;margin-top:12px">Код 15 дақиқа ичида амал қилади</p>
            </div>
            <p style="color:#999;font-size:0.78rem;text-align:center">Агар сиз бу сўровни юбормаган бўлсангиз, бу хабарга эътибор берманг.</p>
            <div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid rgba(192,120,64,0.1)">
                <p style="color:#C07840;font-size:0.78rem;font-weight:600">Ish unumdorligi</p>
            </div>
        </div>
    `);

    if (emailResult.success) {
        res.json({ success: true, message: 'Тиклаш коди электрон почтангизга юборилди' });
    } else {
        res.status(500).json({ error: 'Email юборишда хато: ' + (emailResult.error || 'Номаълум хато') });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').trim();
    const newPassword = req.body.newPassword;

    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Барча майдонларни тўлдиринг' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Парол камида 8 белгидан иборат бўлсин' });

    db = loadDB();
    if (!db.reset_codes) db.reset_codes = [];
    const resetEntry = db.reset_codes.find(c => c.email === email && c.code === code && !c.used);

    if (!resetEntry) return res.status(400).json({ error: 'Нотўғри код' });
    if (new Date(resetEntry.expiresAt) < new Date()) return res.status(400).json({ error: 'Код муддати ўтган. Қайтадан сўранг.' });

    // Update password
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    user.password = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
    resetEntry.used = true;
    saveDB(db);

    res.json({ success: true, message: 'Парол муваффақиятли ўзгартирилди!' });
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// POST /api/admin/invite
app.post('/api/admin/invite', authMiddleware, leaderOrAdmin, async (req, res) => {
    let { email, department } = req.body;
    email = (email || '').trim().toLowerCase();
    department = (department || '').trim();
    if (!email) return res.status(400).json({ error: 'Email киритинг' });

    db = loadDB();
    // Only block if user is already approved
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser && existingUser.status === 'approved') return res.status(400).json({ error: 'Бу email аллақачон рўйхатдан ўтган ва тасдиқланган' });

    // Remove rejected/pending user so they can re-register via invite
    if (existingUser && (existingUser.status === 'rejected' || existingUser.status === 'pending')) {
        db.users = db.users.filter(u => u.id !== existingUser.id);
    }

    // Check for existing pending invitation
    if (db.invitations.find(inv => inv.email === email && inv.status === 'pending')) return res.status(400).json({ error: 'Бу email учун таклифнома аллақачон юборилган' });

    // Reset cancelled invitation instead of creating new one
    const cancelledInv = db.invitations.find(inv => inv.email === email && inv.status === 'cancelled');
    if (cancelledInv) {
        cancelledInv.status = 'pending';
        cancelledInv.cancelled_at = null;
        cancelledInv.expires_at = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
        cancelledInv.department = department || req.user.department;
        cancelledInv.invited_by = req.user.id;
        saveDB(db);
    }

    const token = genToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const invId = genId('inv');
    const dept = department || req.user.department;

    db.invitations.push({ id: invId, email, department: dept, invited_by: req.user.id, token, status: 'pending', created_at: now, expires_at: expiresAt, accepted_at: null, user_id: null });
    saveDB(db);

    const inviteLink = `${getSiteUrl(req)}/login.html?token=${token}`;
    const emailResult = await sendEmail(email, 'Таклифнома — Ish unumdorligi платформасига қўшилинг', `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FFF8F0;border-radius:16px;border:1px solid rgba(180,140,100,0.12)">
        <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,#C07840,#D4956B,#E8B78E);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="color:white;font-size:24px;font-weight:800">P</span></div>
            <h2 style="color:#3D2B1F;margin:0">Ish unumdorligi</h2>
        </div>
        <p style="color:#6B5744;font-size:15px;line-height:1.6">Ассалому алайкум!<br><br><strong>${req.user.name}</strong> сизни <strong>Ish unumdorligi</strong> платформасига таклиф этди.${dept ? '<br>Бўлим: <strong>' + dept + '</strong>' : ''}</p>
        <div style="text-align:center;margin:28px 0"><a href="${inviteLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C07840,#D4956B,#E8B78E);color:white;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;box-shadow:0 4px 16px rgba(192,120,64,0.25)">Рўйхатдан ўтиш →</a></div>
        <p style="color:#9C8B7A;font-size:13px;text-align:center">Бу ҳавола ${TOKEN_EXPIRY_HOURS} соат ичида яроқли.</p>
    </div>`);

    res.json({ success: true, invitation: { id: invId, email, department: dept, token, status: 'pending' }, link: inviteLink, emailSent: emailResult.success });
});

// GET /api/admin/users
app.get('/api/admin/users', authMiddleware, (req, res) => {
    db = loadDB();
    let users;
    if (req.user.role === 'admin') users = db.users;
    else if (req.user.role === 'rahbar') users = db.users.filter(u => u.department === req.user.department);
    else users = db.users.filter(u => u.department === req.user.department && u.status === 'approved');
    res.json({ users: users.map(sanitizeUser) });
});

// POST /api/admin/approve/:id
app.post('/api/admin/approve/:id', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });
    user.status = 'approved';
    db.notifications.push({ id: genId('notif'), user_id: user.id, type: 'account_approved', message: 'Ҳисобингиз тасдиқланди!', related_id: null, is_read: 0, created_at: new Date().toISOString() });
    saveDB(db);
    res.json({ success: true });
});

// POST /api/admin/reject/:id
app.post('/api/admin/reject/:id', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (user) { user.status = 'rejected'; saveDB(db); }
    res.json({ success: true });
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Ўзингизни ўчира олмайсиз' });
    db = loadDB();
    db.users = db.users.filter(u => u.id !== req.params.id);
    db.notifications = db.notifications.filter(n => n.user_id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
});

// POST /api/admin/role/:id
app.post('/api/admin/role/:id', authMiddleware, adminOnly, (req, res) => {
    const { role } = req.body;
    const validRoles = ['admin', 'rahbar', 'ekspert', 'ishchi', 'foydalanuvchi'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Нотўғри рол' });
    db = loadDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (user) { user.role = role; saveDB(db); }
    res.json({ success: true });
});

// PUT /api/admin/users/:id/edit — Admin edits user profile
app.put('/api/admin/users/:id/edit', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    const { name, firstName, lastName, email, department, phone, role } = req.body;
    if (name !== undefined) user.name = name.trim();
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (email !== undefined) {
        const newEmail = email.trim().toLowerCase();
        // Check email uniqueness
        const existing = db.users.find(u => u.email === newEmail && u.id !== user.id);
        if (existing) return res.status(400).json({ error: 'Бу email бошқа фойдаланувчига тегишли' });
        user.email = newEmail;
    }
    if (department !== undefined) user.department = department.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role !== undefined) {
        const validRoles = ['admin', 'rahbar', 'ekspert', 'ishchi', 'foydalanuvchi'];
        if (validRoles.includes(role)) user.role = role;
    }
    if (name) user.avatar = name.charAt(0).toUpperCase();
    saveDB(db);
    res.json({ success: true, user: sanitizeUser(user) });
});

// GET /api/invitations
app.get('/api/invitations', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const invitations = req.user.role === 'admin' ? db.invitations : db.invitations.filter(inv => inv.invited_by === req.user.id);
    res.json({ invitations });
});

// GET /api/invitation/:token (public)
app.get('/api/invitation/:token', (req, res) => {
    db = loadDB();
    const inv = db.invitations.find(i => i.token === req.params.token);
    if (!inv) return res.status(404).json({ error: 'Таклифнома топилмади', valid: false });
    if (inv.status !== 'pending') return res.status(400).json({ error: 'Таклифнома аллақачон ишлатилган', valid: false });
    if (new Date(inv.expires_at) < new Date()) return res.status(400).json({ error: 'Таклифнома муддати тугаган', valid: false });
    res.json({ valid: true, email: inv.email, department: inv.department });
});

// ==========================================
// NOTIFICATION ROUTES
// ==========================================
app.get('/api/notifications', authMiddleware, (req, res) => {
    db = loadDB();
    const notifications = db.notifications.filter(n => n.user_id === req.user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
    res.json({ notifications });
});
app.post('/api/notifications/read', authMiddleware, (req, res) => {
    db = loadDB();
    db.notifications.forEach(n => { if (n.user_id === req.user.id) n.is_read = 1; });
    saveDB(db);
    res.json({ success: true });
});
app.get('/api/notifications/unread-count', authMiddleware, (req, res) => {
    db = loadDB();
    const count = db.notifications.filter(n => n.user_id === req.user.id && !n.is_read).length;
    res.json({ count });
});

// ==========================================
// DEPARTMENT ROUTES
// ==========================================
app.get('/api/departments', authMiddleware, (req, res) => {
    db = loadDB();
    const depts = [...new Set(db.users.map(u => u.department).filter(Boolean))];
    res.json({ departments: depts });
});
app.get('/api/departments/workers', authMiddleware, (req, res) => {
    db = loadDB();
    const workers = db.users.filter(u => u.department === req.user.department && u.role === 'ishchi' && u.status === 'approved');
    res.json({ workers: workers.map(sanitizeUser) });
});

// ==========================================
// USER DATA PERSISTENCE (replaces localStorage)
// ==========================================
app.get('/api/user/data', authMiddleware, (req, res) => {
    db = loadDB();
    const userData = db.user_data?.[req.user.id] || {};
    res.json({ success: true, data: userData });
});

app.put('/api/user/data', authMiddleware, (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key majburiy' });
    db = loadDB();
    if (!db.user_data) db.user_data = {};
    if (!db.user_data[req.user.id]) db.user_data[req.user.id] = {};
    db.user_data[req.user.id][key] = value;
    db.user_data[req.user.id]._lastUpdated = new Date().toISOString();
    saveDB(db);
    res.json({ success: true });
});

// Bulk save — saves ALL keys at once
app.put('/api/user/data/bulk', authMiddleware, (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data majburiy' });
    db = loadDB();
    if (!db.user_data) db.user_data = {};
    if (!db.user_data[req.user.id]) db.user_data[req.user.id] = {};
    Object.assign(db.user_data[req.user.id], data);
    db.user_data[req.user.id]._lastUpdated = new Date().toISOString();
    saveDB(db);
    res.json({ success: true });
});

// POST version for sendBeacon (sendBeacon can only POST)
app.post('/api/user/data/bulk', authMiddleware, (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data majburiy' });
    db = loadDB();
    if (!db.user_data) db.user_data = {};
    if (!db.user_data[req.user.id]) db.user_data[req.user.id] = {};
    Object.assign(db.user_data[req.user.id], data);
    db.user_data[req.user.id]._lastUpdated = new Date().toISOString();
    saveDB(db);
    res.json({ success: true });
});

// Shared data (tasks, ideas etc shared within department)
app.get('/api/shared/data', authMiddleware, (req, res) => {
    db = loadDB();
    const dept = req.user.department;
    const sharedData = db.shared_data?.[dept] || {};
    res.json({ success: true, data: sharedData });
});

app.put('/api/shared/data', authMiddleware, (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key majburiy' });
    db = loadDB();
    const dept = req.user.department;
    if (!db.shared_data) db.shared_data = {};
    if (!db.shared_data[dept]) db.shared_data[dept] = {};
    db.shared_data[dept][key] = value;
    db.shared_data[dept]._lastUpdated = new Date().toISOString();
    saveDB(db);
    res.json({ success: true });
});

// ==========================================
// DOCUMENT / EXPERT TEXT SYSTEM
// ==========================================
const multer = require('multer');
const uploadDir = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
    }),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Upload document
app.post('/api/documents', authMiddleware, upload.single('file'), (req, res) => {
    if (!['admin', 'rahbar'].includes(req.user.role)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
    if (!req.file && !req.body.text) return res.status(400).json({ error: 'Fayl yoki matn kerak' });

    db = loadDB();
    if (!db.documents) db.documents = [];
    const doc = {
        id: genId('doc'),
        title: req.body.title || req.file?.originalname || 'Nomsiz hujjat',
        description: req.body.description || '',
        text: req.body.text || null,
        filename: req.file?.filename || null,
        originalName: req.file?.originalname || null,
        mimeType: req.file?.mimetype || 'text/plain',
        size: req.file?.size || (req.body.text || '').length,
        createdBy: req.user.id,
        createdByName: req.user.name,
        department: req.user.department,
        status: 'new',
        createdAt: new Date().toISOString()
    };
    db.documents.push(doc);
    saveDB(db);
    res.json({ success: true, document: doc });
});

// List documents for current user
app.get('/api/documents', authMiddleware, (req, res) => {
    db = loadDB();
    if (!db.documents) db.documents = [];
    if (!db.doc_assignments) db.doc_assignments = [];

    let docs;
    if (['admin', 'rahbar'].includes(req.user.role)) {
        // Leaders see all docs in their department + global
        docs = db.documents.filter(d => !d.department || d.department === req.user.department);
    } else {
        // Experts and workers see only assigned docs
        const assignedIds = db.doc_assignments
            .filter(a => a.assignedTo === req.user.id)
            .map(a => a.documentId);
        docs = db.documents.filter(d => assignedIds.includes(d.id));
    }

    // Attach assignment info
    docs = docs.map(d => ({
        ...d,
        assignments: (db.doc_assignments || []).filter(a => a.documentId === d.id).map(a => {
            const user = db.users.find(u => u.id === a.assignedTo);
            return { ...a, assigneeName: user?.name || 'Nomallum' };
        })
    }));

    res.json({ success: true, documents: docs });
});

// Assign document to expert
app.post('/api/documents/:id/assign', authMiddleware, (req, res) => {
    if (!['admin', 'rahbar'].includes(req.user.role)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const { expertId, instructions } = req.body;
    if (!expertId) return res.status(400).json({ error: 'ekspert ID kerak' });

    db = loadDB();
    if (!db.doc_assignments) db.doc_assignments = [];
    const doc = (db.documents || []).find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });
    const expert = db.users.find(u => u.id === expertId);
    if (!expert) return res.status(404).json({ error: 'Ekspert topilmadi' });

    // Check if already assigned
    if (db.doc_assignments.find(a => a.documentId === doc.id && a.assignedTo === expertId))
        return res.status(400).json({ error: 'Allaqachon tayinlangan' });

    const assignment = {
        id: genId('asgn'),
        documentId: doc.id,
        assignedTo: expertId,
        assignedBy: req.user.id,
        instructions: instructions || '',
        status: 'pending',
        assignedAt: new Date().toISOString(),
        review: null,
        reviewedAt: null
    };
    db.doc_assignments.push(assignment);

    // Notify expert
    db.notifications.push({
        id: genId('notif'), user_id: expertId, type: 'doc_assigned',
        message: `📄 Yangi hujjat: "${doc.title}" — ${req.user.name} tayinladi`,
        data: { documentId: doc.id, assignmentId: assignment.id },
        is_read: 0, created_at: new Date().toISOString()
    });
    doc.status = 'assigned';
    saveDB(db);
    res.json({ success: true, assignment });
});

// Expert submits review
app.put('/api/documents/:id/review', authMiddleware, (req, res) => {
    const { assignmentId, review, rating, status } = req.body;
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId kerak' });

    db = loadDB();
    if (!db.doc_assignments) db.doc_assignments = [];
    const assignment = db.doc_assignments.find(a => a.id === assignmentId && a.assignedTo === req.user.id);
    if (!assignment) return res.status(404).json({ error: 'Tayinlash topilmadi' });

    assignment.review = review || '';
    assignment.rating = rating || null;
    assignment.status = status || 'reviewed';
    assignment.reviewedAt = new Date().toISOString();

    const doc = (db.documents || []).find(d => d.id === assignment.documentId);
    if (doc) {
        // Check if all assignments are reviewed
        const allAssignments = db.doc_assignments.filter(a => a.documentId === doc.id);
        if (allAssignments.every(a => a.status === 'reviewed')) doc.status = 'reviewed';
    }

    // Notify the assigner
    db.notifications.push({
        id: genId('notif'), user_id: assignment.assignedBy, type: 'doc_reviewed',
        message: `📝 "${doc?.title}" — ${req.user.name} ko'rib chiqdi (⭐${rating || '-'}/5)`,
        data: { documentId: assignment.documentId, assignmentId },
        is_read: 0, created_at: new Date().toISOString()
    });
    saveDB(db);
    res.json({ success: true });
});

// Download document file
app.get('/api/documents/:id/download', authMiddleware, (req, res) => {
    db = loadDB();
    const doc = (db.documents || []).find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });
    if (doc.text) return res.json({ success: true, text: doc.text, title: doc.title });
    if (doc.filename) {
        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) return res.download(filePath, doc.originalName || doc.filename);
    }
    res.status(404).json({ error: 'Fayl topilmadi' });
});

// Send reminder email to self
app.post('/api/reminders/email', authMiddleware, async (req, res) => {
    const { text, date, time } = req.body;
    if (!text) return res.status(400).json({ error: 'Eslatma matni kerak' });
    const dateStr = date || new Date().toISOString().split('T')[0];
    const timeStr = time || '';

    const result = await sendEmail(req.user.email, `🔔 Eslatma: ${text}`, `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FFF8F0;border-radius:16px;border:1px solid rgba(180,140,100,0.12)">
        <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#3D2B1F;margin:0">🔔 Eslatma</h2>
        </div>
        <p style="color:#3D2B1F;font-size:18px;text-align:center;font-weight:600;margin:20px 0">${text}</p>
        <p style="color:#6B5744;font-size:14px;text-align:center">📅 ${dateStr} ${timeStr ? '⏰ ' + timeStr : ''}</p>
        <hr style="border:none;border-top:1px solid rgba(180,140,100,0.12);margin:24px 0">
        <p style="color:#9C8B7A;font-size:13px;text-align:center">Ish unumdorligi platformasidan yuborildi</p>
    </div>`);

    res.json({ success: true, emailSent: result.success, error: result.error || null });
});

// Get experts for assignment dropdown
app.get('/api/experts', authMiddleware, (req, res) => {
    db = loadDB();
    const experts = db.users.filter(u =>
        (u.role === 'ekspert' || u.role === 'ishchi') &&
        u.status === 'approved' &&
        (!req.user.department || u.department === req.user.department || req.user.role === 'admin')
    );
    res.json({ success: true, experts: experts.map(sanitizeUser) });
});

// ==========================================
// USER PROFILE ROUTES
// ==========================================

// PUT /api/profile — Update personal info
app.put('/api/profile', authMiddleware, (req, res) => {
    const { name, avatar, language, department } = req.body;
    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    if (name) user.name = name.trim();
    if (avatar) user.avatar = avatar.trim();
    if (language) user.language = language;
    if (department && (req.user.role === 'admin' || req.user.role === 'rahbar')) {
        user.department = department.trim();
    }
    saveDB(db);
    res.json({ success: true, user: sanitizeUser(user) });
});

// POST /api/profile/avatar — Upload profile image
app.post('/api/profile/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Расм танланмади' });

    // Only allow images
    if (!req.file.mimetype.startsWith('image/')) {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: 'Фақат расм файллари қабул қилинади' });
    }

    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    // Delete old avatar if it's a file
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, user.avatarUrl);
        fs.unlink(oldPath, () => { });
    }

    user.avatarUrl = '/uploads/' + req.file.filename;
    saveDB(db);
    res.json({ success: true, avatarUrl: user.avatarUrl, user: sanitizeUser(user) });
});

// PUT /api/profile/password — Change password
app.put('/api/profile/password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Янги парол камида 8 белгидан иборат бўлиши керак' });

    db = loadDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    // If user has a password (not Google-only), verify current
    if (user.password && currentPassword) {
        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Жорий парол нотўғри' });
        }
    }
    user.password = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
    saveDB(db);
    res.json({ success: true });
});

// ==========================================
// PROFILE FILE MANAGER
// ==========================================
const LIB_DIR = path.join(__dirname, 'Lib');
const DEFAULT_PROFILE_FOLDERS = [
    { name: 'Қонунчилик ҳужжатлари', icon: '📜', description: 'Қонунлар ва меъёрий ҳужжатлар' },
    { name: 'Мутахассисликка оид', icon: '🔬', description: 'Касбий ҳужжатлар ва маълумотнома' },
    { name: 'Экспертиза жараёнига оид', icon: '📋', description: 'Экспертиза натижалари ва ҳисоботлар' }
];

// GET /api/profile/files — list folders + Lib files for profile file manager
app.get('/api/profile/files', authMiddleware, (req, res) => {
    try {
        db = loadDB();
        if (!db.user_file_manager) db.user_file_manager = {};
        const userFm = db.user_file_manager[req.user.id] || { deletedFolders: [], deletedFiles: [], folderFiles: {} };

        // Folders: default 3 minus deleted
        const folders = DEFAULT_PROFILE_FOLDERS
            .filter(f => !userFm.deletedFolders.includes(f.name))
            .map(f => ({ ...f, files: userFm.folderFiles?.[f.name] || [] }));

        // Lib files: read from Lib directory, exclude deleted
        let libFiles = [];
        if (fs.existsSync(LIB_DIR)) {
            libFiles = fs.readdirSync(LIB_DIR)
                .filter(f => !userFm.deletedFiles.includes(f) && !f.startsWith('.'))
                .map(f => {
                    const stat = fs.statSync(path.join(LIB_DIR, f));
                    const ext = path.extname(f).toLowerCase();
                    let icon = '📄';
                    if (['.pdf'].includes(ext)) icon = '📕';
                    else if (['.doc', '.docx'].includes(ext)) icon = '📝';
                    else if (['.xls', '.xlsx'].includes(ext)) icon = '📊';
                    else if (['.ppt', '.pptx'].includes(ext)) icon = '📎';
                    return { name: f, size: stat.size, icon, ext };
                });
        }

        res.json({ success: true, folders, libFiles });
    } catch (err) {
        res.status(500).json({ error: 'Файл менежерида хато: ' + err.message });
    }
});

// DELETE /api/profile/folders/:name — remove folder from user's view
app.delete('/api/profile/folders/:name', authMiddleware, (req, res) => {
    try {
        const folderName = decodeURIComponent(req.params.name);
        db = loadDB();
        if (!db.user_file_manager) db.user_file_manager = {};
        if (!db.user_file_manager[req.user.id]) db.user_file_manager[req.user.id] = { deletedFolders: [], deletedFiles: [], folderFiles: {} };
        if (!db.user_file_manager[req.user.id].deletedFolders.includes(folderName)) {
            db.user_file_manager[req.user.id].deletedFolders.push(folderName);
        }
        saveDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Папкани ўчиришда хато: ' + err.message });
    }
});

// DELETE /api/profile/files/:fileName — remove Lib file from user's view
app.delete('/api/profile/files/:fileName', authMiddleware, (req, res) => {
    try {
        const fileName = decodeURIComponent(req.params.fileName);
        db = loadDB();
        if (!db.user_file_manager) db.user_file_manager = {};
        if (!db.user_file_manager[req.user.id]) db.user_file_manager[req.user.id] = { deletedFolders: [], deletedFiles: [], folderFiles: {} };
        if (!db.user_file_manager[req.user.id].deletedFiles.includes(fileName)) {
            db.user_file_manager[req.user.id].deletedFiles.push(fileName);
        }
        saveDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Файлни ўчиришда хато: ' + err.message });
    }
});

// POST /api/profile/folders/:name/upload — upload file to a profile folder
app.post('/api/profile/folders/:name/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл танланмади' });
    try {
        const folderName = decodeURIComponent(req.params.name);
        db = loadDB();
        if (!db.user_file_manager) db.user_file_manager = {};
        if (!db.user_file_manager[req.user.id]) db.user_file_manager[req.user.id] = { deletedFolders: [], deletedFiles: [], folderFiles: {} };
        if (!db.user_file_manager[req.user.id].folderFiles) db.user_file_manager[req.user.id].folderFiles = {};
        if (!db.user_file_manager[req.user.id].folderFiles[folderName]) db.user_file_manager[req.user.id].folderFiles[folderName] = [];

        const fileEntry = {
            id: 'pf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: req.file.originalname,
            savedName: req.file.filename,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date().toISOString()
        };
        db.user_file_manager[req.user.id].folderFiles[folderName].push(fileEntry);
        saveDB(db);
        res.json({ success: true, file: fileEntry });
    } catch (err) {
        res.status(500).json({ error: 'Юклашда хато: ' + err.message });
    }
});

// DELETE /api/profile/folder-files/:folderName/:fileId — remove uploaded file from folder
app.delete('/api/profile/folder-files/:folderName/:fileId', authMiddleware, (req, res) => {
    try {
        const folderName = decodeURIComponent(req.params.folderName);
        const fileId = req.params.fileId;
        db = loadDB();
        if (!db.user_file_manager?.[req.user.id]?.folderFiles?.[folderName]) {
            return res.status(404).json({ error: 'Файл топилмади' });
        }
        const arr = db.user_file_manager[req.user.id].folderFiles[folderName];
        const idx = arr.findIndex(f => f.id === fileId);
        if (idx === -1) return res.status(404).json({ error: 'Файл топилмади' });
        const removed = arr.splice(idx, 1)[0];
        // Delete physical file
        if (removed.savedName) {
            const filePath = path.join(uploadDir, removed.savedName);
            fs.unlink(filePath, () => { });
        }
        saveDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ўчиришда хато: ' + err.message });
    }
});

// GET /api/lib/download/:fileName — download a Lib file
app.get('/api/lib/download/:fileName', authMiddleware, (req, res) => {
    try {
        const fileName = decodeURIComponent(req.params.fileName);
        const filePath = path.join(LIB_DIR, fileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл топилмади' });
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Юклаб олишда хато: ' + err.message });
    }
});

// ==========================================
// INVITATION MANAGEMENT
// ==========================================

// PUT /api/invitations/:id/approve — Approve (accept) invitation manually
app.put('/api/invitations/:id/approve', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const inv = db.invitations.find(i => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Таклифнома топилмади' });
    if (inv.status === 'accepted') return res.json({ success: true, message: 'Аллақачон қабул қилинган' });
    if (inv.status === 'cancelled') return res.status(400).json({ error: 'Бу таклифнома бекор қилинган' });

    // Re-send invitation email
    inv.status = 'pending';
    inv.expires_at = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    saveDB(db);

    const inviteLink = `${getSiteUrl(req)}/login.html?token=${inv.token}`;
    sendEmail(inv.email, 'Таклифнома тасдиқланди — Ish unumdorligi', `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FFF8F0;border-radius:16px;">
        <h2 style="color:#3D2B1F;text-align:center">✅ Таклифнома тасдиқланди</h2>
        <p style="color:#6B5744;text-align:center">Сизни Ish unumdorligi платформасига таклиф қилдилар.</p>
        <div style="text-align:center;margin:24px 0">
            <a href="${inviteLink}" style="background:linear-gradient(135deg,#C07840,#D4956B);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">Рўйхатдан ўтиш</a>
        </div>
    </div>`);

    res.json({ success: true, message: 'Таклифнома тасдиқланди ва қайта юборилди' });
});

// DELETE /api/invitations/:id — Cancel invitation
app.delete('/api/invitations/:id', authMiddleware, leaderOrAdmin, (req, res) => {
    db = loadDB();
    const inv = db.invitations.find(i => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Таклифнома топилмади' });
    if (inv.status === 'accepted') return res.status(400).json({ error: 'Қабул қилинган таклифномани бекор қилиб бўлмайди' });
    // Only admin or the person who invited can cancel
    if (req.user.role !== 'admin' && inv.invited_by !== req.user.id)
        return res.status(403).json({ error: 'Рухсат берилмаган' });
    inv.status = 'cancelled';
    inv.cancelled_at = new Date().toISOString();
    saveDB(db);
    res.json({ success: true });
});

// ==========================================
// NOTIFICATION SEND ROUTE
// ==========================================
app.post('/api/notifications/send', authMiddleware, leaderOrAdmin, (req, res) => {
    const { targetUserId, message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'Хабар матнини киритинг' });

    db = loadDB();
    const now = new Date().toISOString();

    if (targetUserId === 'all') {
        // Broadcast to all approved users
        const approvedUsers = db.users.filter(u => u.status === 'approved' && u.id !== req.user.id);
        approvedUsers.forEach(u => {
            db.notifications.push({
                id: genId('notif'), user_id: u.id, type: type || 'admin_message',
                message: `📢 ${req.user.name}: ${message}`, related_id: req.user.id,
                is_read: 0, created_at: now
            });
        });
        saveDB(db);
        return res.json({ success: true, sent: approvedUsers.length });
    }

    // Send to specific user
    const targetUser = db.users.find(u => u.id === targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'Фойдаланувчи топилмади' });

    db.notifications.push({
        id: genId('notif'), user_id: targetUserId, type: type || 'personal_message',
        message: `💬 ${req.user.name}: ${message}`, related_id: req.user.id,
        is_read: 0, created_at: now
    });
    saveDB(db);
    res.json({ success: true, sent: 1 });

});

// ==========================================
// FILE MANAGER (Local Drive)
// ==========================================
const driveDir = IS_VERCEL ? '/tmp/uploads/drive' : path.join(__dirname, 'uploads', 'drive');
if (!fs.existsSync(driveDir)) fs.mkdirSync(driveDir, { recursive: true });

function getDriveFiles() {
    db = loadDB();
    if (!db.driveFiles) db.driveFiles = [];
    return db.driveFiles;
}

function saveDriveFiles(files) {
    db = loadDB();
    db.driveFiles = files;
    saveDB(db);
}

// List files in a folder
app.get('/api/drive/files', authMiddleware, (req, res) => {
    try {
        const folderId = req.query.folderId || 'root';
        const query = (req.query.q || '').toLowerCase();
        let files = getDriveFiles().filter(f => f.parentId === folderId && !f.deleted);
        if (query) files = files.filter(f => f.name.toLowerCase().includes(query));
        files.sort((a, b) => {
            if (a.mimeType === 'folder' && b.mimeType !== 'folder') return -1;
            if (a.mimeType !== 'folder' && b.mimeType === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        // Build breadcrumbs
        let breadcrumbs = [];
        if (folderId !== 'root') {
            let currentId = folderId;
            for (let i = 0; i < 10; i++) {
                const folder = getDriveFiles().find(f => f.id === currentId);
                if (!folder) break;
                breadcrumbs.unshift({ id: folder.id, name: folder.name });
                if (!folder.parentId || folder.parentId === 'root') break;
                currentId = folder.parentId;
            }
        }

        res.json({
            success: true,
            files: files.map(f => ({
                id: f.id,
                name: f.name,
                mimeType: f.mimeType === 'folder' ? 'application/vnd.google-apps.folder' : f.mimeType,
                size: f.size || 0,
                modifiedTime: f.modifiedTime,
                webViewLink: f.mimeType === 'folder' ? null : `/uploads/drive/${f.filename}`
            })),
            breadcrumbs
        });
    } catch (err) {
        res.status(500).json({ error: 'Файллар рўйхатини олишда хато: ' + err.message });
    }
});

// Upload file
app.post('/api/drive/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл танланмади' });
    try {
        const folderId = req.body.folderId || 'root';
        const driveFilename = Date.now() + '_' + req.file.originalname;
        const destPath = path.join(driveDir, driveFilename);

        // Move file from uploads/ to uploads/drive/
        fs.renameSync(req.file.path, destPath);

        const fileEntry = {
            id: 'df_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
            name: req.body.customName || req.file.originalname,
            filename: driveFilename,
            mimeType: req.file.mimetype,
            size: req.file.size,
            parentId: folderId,
            uploadedBy: req.user.id,
            modifiedTime: new Date().toISOString(),
            deleted: false,
            googleFileId: null
        };

        const files = getDriveFiles();
        files.push(fileEntry);
        saveDriveFiles(files);
        logDriveActivity(req.user.id, req.user.name, 'upload', fileEntry.name, fileEntry.id);

        res.json({ success: true, file: { id: fileEntry.id, name: fileEntry.name, mimeType: fileEntry.mimeType, size: fileEntry.size } });

        // Auto-upload to Google Drive in background (async, non-blocking)
        // This ensures the file is preserved even after Vercel /tmp is cleared
        if (gDriveAuthorized && gOAuth2Client) {
            (async () => {
                try {
                    const drive = google.drive({ version: 'v3', auth: gOAuth2Client });

                    // Convert Office files to Google format
                    const convertMap = {
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.google-apps.document',
                        'application/msword': 'application/vnd.google-apps.document',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.google-apps.spreadsheet',
                        'application/vnd.ms-excel': 'application/vnd.google-apps.spreadsheet',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.google-apps.presentation',
                        'application/vnd.ms-powerpoint': 'application/vnd.google-apps.presentation',
                    };
                    const googleMimeType = convertMap[fileEntry.mimeType] || null;
                    const requestBody = { name: fileEntry.name, parents: [GOOGLE_DRIVE_FOLDER_ID] };
                    if (googleMimeType) requestBody.mimeType = googleMimeType;

                    const response = await drive.files.create({
                        requestBody,
                        media: { mimeType: fileEntry.mimeType, body: fs.createReadStream(destPath) },
                        fields: 'id'
                    });

                    // Make accessible
                    await drive.permissions.create({
                        fileId: response.data.id,
                        requestBody: { role: 'writer', type: 'anyone' }
                    });

                    // Save Google file ID
                    const currentFiles = getDriveFiles();
                    const entry = currentFiles.find(f => f.id === fileEntry.id);
                    if (entry) {
                        entry.googleFileId = response.data.id;
                        saveDriveFiles(currentFiles);
                    }
                    console.log(`☁️ Auto-uploaded to Google Drive: ${fileEntry.name} → ${response.data.id}`);
                } catch (e) {
                    console.warn('Auto-upload to Google Drive failed:', e.message);
                }
            })();
        }
    } catch (err) {
        console.error('File upload error:', err.message);
        res.status(500).json({ error: 'Юклашда хато: ' + err.message });
    }
});

// Download file
app.get('/api/drive/download/:fileId', authMiddleware, (req, res) => {
    try {
        const file = getDriveFiles().find(f => f.id === req.params.fileId && !f.deleted);
        if (!file) return res.status(404).json({ error: 'Файл топилмади' });
        const filePath = path.join(driveDir, file.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл серверда топилмади' });
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        logDriveActivity(req.user.id, req.user.name, 'download', file.name, file.id);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Юклаб олишда хато: ' + err.message });
    }
});

// Create folder
app.post('/api/drive/folder', authMiddleware, (req, res) => {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Папка номи керак' });
    try {
        const folderEntry = {
            id: 'df_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
            name: name.trim(),
            mimeType: 'folder',
            parentId: parentId || 'root',
            uploadedBy: req.user.id,
            modifiedTime: new Date().toISOString(),
            deleted: false
        };
        const files = getDriveFiles();
        files.push(folderEntry);
        saveDriveFiles(files);
        res.json({ success: true, folder: { id: folderEntry.id, name: folderEntry.name, mimeType: 'application/vnd.google-apps.folder' } });
    } catch (err) {
        res.status(500).json({ error: 'Папка яратишда хато: ' + err.message });
    }
});

// Delete file/folder
app.delete('/api/drive/files/:fileId', authMiddleware, (req, res) => {
    try {
        const files = getDriveFiles();
        const file = files.find(f => f.id === req.params.fileId);
        if (!file) return res.status(404).json({ error: 'Файл топилмади' });

        file.deleted = true;
        // Also soft-delete children if it's a folder
        if (file.mimeType === 'folder') {
            const deleteChildren = (parentId) => {
                files.filter(f => f.parentId === parentId && !f.deleted).forEach(child => {
                    child.deleted = true;
                    if (child.mimeType === 'folder') deleteChildren(child.id);
                });
            };
            deleteChildren(file.id);
        }
        // Delete physical file
        if (file.filename) {
            const filePath = path.join(driveDir, file.filename);
            fs.unlink(filePath, () => { });
        }
        saveDriveFiles(files);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ўчиришда хато: ' + err.message });
    }
});

// ==========================================
// IN-APP CHAT SYSTEM
// ==========================================
const onlineUsers = new Map(); // userId -> { lastSeen, name }

// Heartbeat — track online status
app.post('/api/chat/heartbeat', authMiddleware, (req, res) => {
    onlineUsers.set(req.user.id, { lastSeen: Date.now(), name: req.user.name });
    res.json({ success: true });
});

// Get online users
app.get('/api/chat/online', authMiddleware, (req, res) => {
    const now = Date.now();
    const TIMEOUT = 30000; // 30 seconds
    const online = [];
    onlineUsers.forEach((val, key) => {
        if (now - val.lastSeen < TIMEOUT) online.push(key);
        else onlineUsers.delete(key);
    });
    res.json({ online });
});

// Get all users for chat list
app.get('/api/chat/users', authMiddleware, (req, res) => {
    db = loadDB();
    const now = Date.now();
    const TIMEOUT = 30000;
    const users = db.users.filter(u => u.status === 'approved' && u.id !== req.user.id).map(u => ({
        id: u.id, name: u.name, avatar: u.avatar, role: u.role, department: u.department,
        online: onlineUsers.has(u.id) && (now - onlineUsers.get(u.id).lastSeen < TIMEOUT)
    }));
    // Count unread messages per user
    const messages = db.chatMessages || [];
    users.forEach(u => {
        u.unread = messages.filter(m => m.from === u.id && m.to === req.user.id && !m.read).length;
    });
    res.json({ users });
});

// Send message
app.post('/api/chat/send', authMiddleware, (req, res) => {
    const { to, text } = req.body;
    if (!to || !text || !text.trim()) return res.status(400).json({ error: 'Хабар матнини киритинг' });

    db = loadDB();
    if (!db.chatMessages) db.chatMessages = [];

    const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        from: req.user.id,
        fromName: req.user.name,
        to,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        read: false,
        readAt: null,
        file: null
    };
    db.chatMessages.push(msg);
    saveDB(db);

    // Auto-backup to Google Drive (async, non-blocking)
    autoChatBackup();

    res.json({ success: true, message: msg });
});

// Chat file/image upload
const chatDir = IS_VERCEL ? '/tmp/chat_files' : path.join(__dirname, 'chat_files');
if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });

app.post('/api/chat/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл танланмади' });
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Қабул қилувчи кўрсатилмаган' });

    // Move file to chat_files
    const ext = path.extname(req.file.originalname);
    const savedName = Date.now() + '_' + Math.random().toString(36).slice(2, 6) + ext;
    const dest = path.join(chatDir, savedName);
    fs.renameSync(req.file.path, dest);

    db = loadDB();
    if (!db.chatMessages) db.chatMessages = [];

    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(req.file.originalname);
    const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        from: req.user.id,
        fromName: req.user.name,
        to,
        text: isImage ? '📷 Расм' : '📎 ' + req.file.originalname,
        timestamp: new Date().toISOString(),
        read: false,
        readAt: null,
        file: {
            name: req.file.originalname,
            savedName,
            size: req.file.size,
            mimeType: req.file.mimetype,
            isImage
        }
    };
    db.chatMessages.push(msg);
    saveDB(db);
    autoChatBackup();
    res.json({ success: true, message: msg });
});

// Serve chat files
app.get('/api/chat/file/:filename', (req, res) => {
    const filePath = path.join(chatDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл топилмади' });

    // Find original filename from chat messages
    db = loadDB();
    const msg = (db.chatMessages || []).find(m => m.file && m.file.savedName === req.params.filename);
    const originalName = msg ? msg.file.name : req.params.filename;

    const ext = path.extname(req.params.filename).toLowerCase();
    const mimeMap = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json', '.zip': 'application/zip', '.rar': 'application/x-rar-compressed' };
    const mime = mimeMap[ext] || 'application/octet-stream';

    // Check if download is requested
    const isDownload = req.query.download === '1';
    const disposition = isDownload ? 'attachment' : 'inline';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
});

// Auto-backup helper (non-blocking)
async function autoChatBackup() {
    if (!gOAuth2Client) return;
    try {
        db = loadDB();
        const chatData = JSON.stringify(db.chatMessages || [], null, 2);
        const fileName = `chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const drive = google.drive({ version: 'v3', auth: gOAuth2Client });
        const existing = await drive.files.list({
            q: `name='${fileName}' and '${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id)'
        });
        const { Readable } = require('stream');
        if (existing.data.files.length) {
            await drive.files.update({
                fileId: existing.data.files[0].id,
                media: { mimeType: 'application/json', body: Readable.from(chatData) }
            });
        } else {
            await drive.files.create({
                requestBody: { name: fileName, parents: [GOOGLE_DRIVE_FOLDER_ID] },
                media: { mimeType: 'application/json', body: Readable.from(chatData) }
            });
        }
        console.log('☁️ Chat backup saved to Google Drive');
    } catch (e) { console.warn('Chat backup error:', e.message); }
}

// Get conversation messages between two users
app.get('/api/chat/messages/:userId', authMiddleware, (req, res) => {
    db = loadDB();
    const messages = (db.chatMessages || []).filter(m =>
        (m.from === req.user.id && m.to === req.params.userId) ||
        (m.from === req.params.userId && m.to === req.user.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Mark received messages as read with timestamp
    let updated = false;
    (db.chatMessages || []).forEach(m => {
        if (m.from === req.params.userId && m.to === req.user.id && !m.read) {
            m.read = true;
            m.readAt = new Date().toISOString();
            updated = true;
        }
    });
    if (updated) saveDB(db);

    res.json({ messages });
});

// Get conversations list with last message
app.get('/api/chat/conversations', authMiddleware, (req, res) => {
    db = loadDB();
    const messages = db.chatMessages || [];
    const convMap = {};
    messages.forEach(m => {
        if (m.from !== req.user.id && m.to !== req.user.id) return;
        const partnerId = m.from === req.user.id ? m.to : m.from;
        if (!convMap[partnerId] || new Date(m.timestamp) > new Date(convMap[partnerId].timestamp)) {
            convMap[partnerId] = m;
        }
    });
    const conversations = Object.entries(convMap).map(([partnerId, lastMsg]) => {
        const partner = db.users.find(u => u.id === partnerId);
        const unread = messages.filter(m => m.from === partnerId && m.to === req.user.id && !m.read).length;
        return {
            partnerId, partnerName: partner ? partner.name : 'Номаълум',
            partnerAvatar: partner ? partner.avatar : '1',
            lastMessage: lastMsg.text.slice(0, 60), lastTimestamp: lastMsg.timestamp, unread,
            online: onlineUsers.has(partnerId) && (Date.now() - onlineUsers.get(partnerId).lastSeen < 30000)
        };
    }).sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    res.json({ conversations });
});

// Delete a message
app.delete('/api/chat/message/:msgId', authMiddleware, (req, res) => {
    db = loadDB();
    const idx = (db.chatMessages || []).findIndex(m => m.id === req.params.msgId && m.from === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Хабар топилмади' });
    const msg = db.chatMessages[idx];
    // Delete attached file if any
    if (msg.file && msg.file.savedName) {
        const filePath = path.join(chatDir, msg.file.savedName);
        fs.unlink(filePath, () => { });
    }
    db.chatMessages.splice(idx, 1);
    saveDB(db);
    autoChatBackup();
    res.json({ success: true });
});

// Get total unread count
app.get('/api/chat/unread', authMiddleware, (req, res) => {
    db = loadDB();
    const count = (db.chatMessages || []).filter(m => m.to === req.user.id && !m.read).length;
    res.json({ unread: count });
});

// Backup chat to Google Drive (manual trigger by admin)
app.post('/api/chat/backup', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат админ' });
    try {
        await autoChatBackup();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Full data backup & restore
app.get('/api/admin/backup', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат админ' });
    db = loadDB();
    // Save timestamped backup
    const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupDir = IS_VERCEL ? '/tmp/backups' : path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, backupName), JSON.stringify(db, null, 2));
    res.json({ success: true, backup: backupName, data: db });
});

app.post('/api/admin/restore', authMiddleware, express.json({ limit: '50mb' }), (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат админ' });
    const { data } = req.body;
    if (!data || !data.users) return res.status(400).json({ error: 'Нотўғри маълумот' });
    // Save current as backup first
    const backupDir = IS_VERCEL ? '/tmp/backups' : path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    db = loadDB();
    fs.writeFileSync(path.join(backupDir, `pre_restore_${Date.now()}.json`), JSON.stringify(db, null, 2));
    // Restore
    saveDB(data);
    res.json({ success: true });
});

// List available backups
app.get('/api/admin/backups', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат админ' });
    const backupDir = IS_VERCEL ? '/tmp/backups' : path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) return res.json({ backups: [] });
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    res.json({ backups: files });
});

// Restore from specific backup
app.post('/api/admin/restore/:backupName', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Фақат админ' });
    const backupPath = (IS_VERCEL ? '/tmp/backups/' : path.join(__dirname, 'backups') + '/') + req.params.backupName;
    if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Бекап топилмади' });
    try {
        // Save current state first
        db = loadDB();
        const backupDir = IS_VERCEL ? '/tmp/backups' : path.join(__dirname, 'backups');
        fs.writeFileSync(path.join(backupDir, `pre_restore_${Date.now()}.json`), JSON.stringify(db, null, 2));
        // Restore
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        saveDB(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
const { google } = require('googleapis');
const GOOGLE_DRIVE_FOLDER_ID = '1C-5nwpnKtsLqK3Kka8EHCBVwMu7UcgPf';

// Try to create OAuth2 client
let gOAuth2Client = null;
let gDriveAuthorized = false; // tracks if refresh token is set
const G_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const G_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Redirect URI determined dynamically from request

function getGoogleRedirectUri(req) {
    const proto = req ? (req.headers['x-forwarded-proto'] || req.protocol) : 'http';
    const host = req ? req.headers.host : `localhost:${PORT}`;
    return `${proto}://${host}/api/google/callback`;
}

if (G_CLIENT_ID && G_CLIENT_SECRET) {
    gOAuth2Client = new google.auth.OAuth2(G_CLIENT_ID, G_CLIENT_SECRET);
    // Load saved refresh token
    db = loadDB();
    if (db.googleRefreshToken) {
        gOAuth2Client.setCredentials({ refresh_token: db.googleRefreshToken });
        gDriveAuthorized = true;
        console.log('✅ Google Drive OAuth2 initialized with saved refresh token');
    } else {
        console.log('⚠️ Google OAuth2 client ready — refresh token not set. Visit /api/google/auth to authorize.');
    }
} else {
    // Fallback: try Service Account
    try {
        const credsPath = path.join(__dirname, 'credentials.json');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
            const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive'] });
            gOAuth2Client = auth;
            gDriveAuthorized = true;
            console.log('⚠️ Using Service Account for Google Drive (may have quota limits)');
        }
    } catch (e) { console.warn('Google Drive API not available'); }
}

// GET /api/drive/status — check if Google Drive OAuth is authorized
app.get('/api/drive/status', authMiddleware, (req, res) => {
    res.json({ authorized: gDriveAuthorized, clientReady: !!gOAuth2Client });
});

// OAuth2 authorization URL
app.get('/api/google/auth', (req, res) => {
    if (!G_CLIENT_ID || !G_CLIENT_SECRET) {
        return res.status(503).json({ error: 'GOOGLE_CLIENT_ID ва GOOGLE_CLIENT_SECRET .env файлда кўрсатилмаган' });
    }
    const redirectUri = getGoogleRedirectUri(req);
    const oauth2 = new google.auth.OAuth2(G_CLIENT_ID, G_CLIENT_SECRET, redirectUri);
    const url = oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive']
    });
    res.redirect(url);
});

// OAuth2 callback
app.get('/api/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Код йўқ');
    try {
        const redirectUri = getGoogleRedirectUri(req);
        const oauth2 = new google.auth.OAuth2(G_CLIENT_ID, G_CLIENT_SECRET, redirectUri);
        const { tokens } = await oauth2.getToken(code);
        oauth2.setCredentials(tokens);
        gOAuth2Client = oauth2;
        gDriveAuthorized = true;

        // Save refresh token
        if (tokens.refresh_token) {
            db = loadDB();
            db.googleRefreshToken = tokens.refresh_token;
            saveDB(db);
            console.log('✅ Google refresh token сақланди');
        }
        res.send(`<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#FFF8F0">
            <div style="text-align:center;padding:40px;background:white;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
                <div style="font-size:3rem">✅</div>
                <h2 style="color:#3D2B1F">Google Drive уланди!</h2>
                <p style="color:#6B5744">Энди файлларни Google Docs да очиш мумкин.</p>
                <a href="/index.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border-radius:10px;text-decoration:none;font-weight:700">Платформага қайтиш</a>
            </div>
        </body></html>`);
    } catch (err) {
        console.error('Google OAuth callback error:', err.message);
        res.status(500).send('Хато: ' + err.message);
    }
});

// Upload file to Google Drive and return edit URL
// NOTE: This uses Google Drive API — does NOT affect Google OAuth login (POST /api/auth/google)
app.post('/api/drive/open-in-google/:fileId', authMiddleware, async (req, res) => {
    const files = getDriveFiles();
    const file = files.find(f => f.id === req.params.fileId && !f.deleted);
    if (!file) return res.status(404).json({ error: 'Файл топилмади' });

    const filePath = file.filename ? path.join(driveDir, file.filename) : null;
    const fileExists = filePath && fs.existsSync(filePath);

    // If file already has a googleFileId — try to use it directly (no local file needed)
    if (file.googleFileId && gDriveAuthorized && gOAuth2Client) {
        try {
            const drive = google.drive({ version: 'v3', auth: gOAuth2Client });
            const existing = await drive.files.get({ fileId: file.googleFileId, fields: 'id, webViewLink' });
            if (existing.data && existing.data.webViewLink) {
                logDriveActivity(req.user.id, req.user.name, 'open_google', file.name, file.id);
                return res.json({ success: true, url: existing.data.webViewLink, fileId: existing.data.id, mode: 'cached' });
            }
        } catch (e) {
            console.warn('Cached Google file not found, re-uploading...', e.message);
            file.googleFileId = null; // Clear stale cache
        }
    }

    // Determine document type for conversion
    const isOfficeDoc = /\.(docx?|xlsx?|pptx?|csv)$/i.test(file.name) ||
        /word|spreadsheet|excel|presentation|powerpoint/i.test(file.mimeType || '');

    // --- Path 1: Google Drive API available + local file exists → upload & convert ---
    if (gDriveAuthorized && gOAuth2Client && fileExists) {
        try {
            const drive = google.drive({ version: 'v3', auth: gOAuth2Client });

            // Determine Google conversion type for Office files
            const convertMap = {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.google-apps.document',
                'application/msword': 'application/vnd.google-apps.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.google-apps.spreadsheet',
                'application/vnd.ms-excel': 'application/vnd.google-apps.spreadsheet',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.google-apps.presentation',
                'application/vnd.ms-powerpoint': 'application/vnd.google-apps.presentation',
                'text/csv': 'application/vnd.google-apps.spreadsheet'
            };
            const googleMimeType = convertMap[file.mimeType] || null;

            const requestBody = { name: file.name, parents: [GOOGLE_DRIVE_FOLDER_ID] };
            if (googleMimeType) requestBody.mimeType = googleMimeType; // Convert to Google format

            const response = await drive.files.create({
                requestBody,
                media: { mimeType: file.mimeType || 'application/octet-stream', body: fs.createReadStream(filePath) },
                fields: 'id, webViewLink'
            });

            // Make accessible to anyone with the link
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: { role: 'writer', type: 'anyone' }
            });

            const updated = await drive.files.get({ fileId: response.data.id, fields: 'id, webViewLink' });

            // Cache Google file ID for future use (won't need local file next time)
            file.googleFileId = response.data.id;
            saveDriveFiles(files);

            logDriveActivity(req.user.id, req.user.name, 'open_google', file.name, file.id);
            return res.json({
                success: true,
                url: updated.data.webViewLink,
                fileId: response.data.id,
                mode: 'google_drive',
                converted: !!googleMimeType
            });
        } catch (err) {
            console.error('Google Drive upload error:', err.message);
            // Fall through to fallback viewers
        }
    }

    // --- Path 2: Fallback viewers (no Google Drive API or upload failed) ---

    // For Office files → use Microsoft Office Online Viewer (works without local file access for public URLs)
    if (isOfficeDoc && fileExists) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const publicUrl = `${proto}://${host}/api/drive/public/${file.id}`;
        const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}`;
        logDriveActivity(req.user.id, req.user.name, 'open_office_viewer', file.name, file.id);
        return res.json({ success: true, url: officeViewerUrl, fallback: true, mode: 'office_viewer' });
    }

    // For any file with local access → Google Docs Viewer
    if (fileExists) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const publicUrl = `${proto}://${host}/api/drive/public/${file.id}`;
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=false`;
        logDriveActivity(req.user.id, req.user.name, 'open_google_viewer', file.name, file.id);
        return res.json({ success: true, url: viewerUrl, fallback: true, mode: 'google_viewer' });
    }

    // --- Path 3: File not on server (Vercel ephemeral /tmp) ---
    return res.status(404).json({
        error: 'Файл серверда топилмади. Vercel да файллар вақтинча сақланади. Файлни қайтадан юкланг.',
        needsReupload: true
    });
});

// Activity logging
function logDriveActivity(userId, userName, action, fileName, fileId) {
    db = loadDB();
    if (!db.driveActivity) db.driveActivity = [];
    db.driveActivity.unshift({
        id: 'act_' + Date.now(),
        userId, userName, action, fileName, fileId,
        timestamp: new Date().toISOString()
    });
    // Keep last 200 entries
    if (db.driveActivity.length > 200) db.driveActivity = db.driveActivity.slice(0, 200);
    saveDB(db);
}

// Get activity log
app.get('/api/drive/activity', authMiddleware, (req, res) => {
    db = loadDB();
    const activities = (db.driveActivity || []).slice(0, 50);
    res.json({ success: true, activities });
});

// Public file access (for Google Viewer)
app.get('/api/drive/public/:fileId', (req, res) => {
    db = loadDB();
    const files = db.driveFiles || [];
    const file = files.find(f => f.id === req.params.fileId && !f.deleted);
    if (!file || !file.filename) return res.status(404).json({ error: 'Файл топилмади' });
    const filePath = path.join(driveDir, file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл серверда топилмади' });
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    fs.createReadStream(filePath).pipe(res);
});

// Get file content as text (for in-app editor)
app.get('/api/drive/text/:fileId', authMiddleware, (req, res) => {
    const files = getDriveFiles();
    const file = files.find(f => f.id === req.params.fileId && !f.deleted);
    if (!file) return res.status(404).json({ error: 'Файл топилмади' });
    const filePath = path.join(driveDir, file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл серверда топилмади' });
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        logDriveActivity(req.user.id, req.user.name, 'view', file.name, file.id);
        res.json({ success: true, content, name: file.name });
    } catch (err) {
        res.status(500).json({ error: 'Файлни ўқишда хато' });
    }
});

// Save text file content
app.put('/api/drive/text/:fileId', authMiddleware, (req, res) => {
    const files = getDriveFiles();
    const file = files.find(f => f.id === req.params.fileId && !f.deleted);
    if (!file) return res.status(404).json({ error: 'Файл топилмади' });
    const filePath = path.join(driveDir, file.filename);
    try {
        fs.writeFileSync(filePath, req.body.content || '', 'utf-8');
        file.modifiedTime = new Date().toISOString();
        file.size = Buffer.byteLength(req.body.content || '', 'utf-8');
        saveDriveFiles(files);
        logDriveActivity(req.user.id, req.user.name, 'edit', file.name, file.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Сақлашда хато: ' + err.message });
    }
});

// Drive status check
app.get('/api/drive/status', authMiddleware, (req, res) => {
    res.json({ connected: true });
});

// ==========================================
// SERVE STATIC FILES
// ==========================================
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname), { extensions: ['html'], index: 'login.html' }));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint топилмади' });
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ==========================================
// START SERVER
// ==========================================
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 Ish unumdorligi сервер ишга тушди: http://localhost:${PORT}`);
        console.log(`📧 SMTP: ${process.env.SMTP_USER} → ${process.env.SMTP_HOST}`);
        console.log(`🔑 JWT Secret: ${JWT_SECRET.slice(0, 8)}...`);
        console.log(`📁 DB: ${DB_PATH}`);
        console.log(`👥 Users: ${db.users.length}`);
        console.log(`🌐 Site URL: ${SITE_URL}\n`);
    });
}

// Export for Vercel serverless
module.exports = app;
