const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const twilio = require('twilio');
require('dotenv').config();

const { getDb } = require('../db');
const { JWT_SECRET, authenticate, requireRole, ROLES } = require('../authMiddleware');

async function logAudit(db, userId, action, resource, resourceId, details) {
  try {
    await db.run(
      'INSERT INTO audit_logs (user_id, action, resource, resource_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, resource, resourceId, details]
    );
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (twilioSid && twilioSid.startsWith('AC')) {
  twilioClient = twilio(twilioSid, twilioAuthToken);
} else {
  console.log("[MFA] Twilio credentials missing or invalid. SMS will be logged to console only.");
}

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account locked due to multiple failed attempts' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // Increment failed attempts
      const failed = user.failed_attempts + 1;
      let lockedUntil = null;
      if (failed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
      }
      await db.run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [failed, lockedUntil, user.id]);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // MFA check
    if (user.mfa_enabled) {
      if (user.mfa_type === 'sms') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Store temp secret/otp for verification
        await db.run('UPDATE users SET mfa_temp_secret = ? WHERE id = ?', [otp, user.id]);
        
        // Mock SMS sending to console and attempt Twilio
        console.log(`[SMS OTP] Sending ${otp} to ${user.mfa_phone}`);
        if (process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_sid') {
          try {
            await twilioClient.messages.create({
              body: `Your CIMS verification code: ${otp}`,
              from: twilioFrom,
              to: user.mfa_phone
            });
          } catch (err) {
             console.error("Twilio send failed:", err.message);
          }
        }
      }
      return res.json({ requireMfa: true, mfaType: user.mfa_type, userId: user.id });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const db = await getDb();

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    // User registration always defaults to Viewer / Auditor
    // Only an Admin can promote roles via the dashboard
    const userRole = ROLES.VIEWER;
    await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, userRole]);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password (Mock email sending)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  
  // Always return success to prevent email enumeration attacks
  if (user) {
    console.log(`[Email Service] Sent reset logic to ${email}`);
  }
  
  // Simulating email delay
  setTimeout(() => {
    res.json({ message: 'If that email matches an account, we have sent a reset link to it.' });
  }, 1000);
});

// Admin ONLY: Get all users
router.get('/users', authenticate, requireRole(['Admin']), async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT id, name, email, role, status FROM users');
  res.json(users);
});

// Admin ONLY: Update a user's role
router.put('/users/:id/role', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  const db = await getDb();
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided.' });
  }

  try {
    const targetUser = await db.get('SELECT name, role FROM users WHERE id = ?', [req.params.id]);
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    
    await logAudit(db, req.user.id, 'CHANGE_ROLE', 'users', req.params.id, 
      `Changed role of ${targetUser.name} from ${targetUser.role} to ${role}`);

    res.json({ message: 'Role updated successfully', role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// --- MFA ROUTES ---

// 1. MFA Login Verification (Step 2 of login)
router.post('/mfa/verify', async (req, res) => {
  const { userId, code } = req.body;
  const db = await getDb();
  
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let verified = false;
    if (user.mfa_type === 'totp') {
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: code
      });
    } else if (user.mfa_type === 'sms') {
      // For SMS, we stored the OTP in mfa_temp_secret during /login
      verified = (user.mfa_temp_secret === code);
    }

    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

    // Success: Generate final token
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Clear temp secret
    await db.run('UPDATE users SET mfa_temp_secret = NULL WHERE id = ?', [user.id]);

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during MFA verification' });
  }
});

// 2. Setup Authenticator App (TOTP)
router.get('/mfa/setup/totp', authenticate, async (req, res) => {
  const db = await getDb();
  const secret = speakeasy.generateSecret({
    name: `CIMS: ${req.user.email}`
  });

  // Save temp secret for verification before enabling
  await db.run('UPDATE users SET mfa_temp_secret = ? WHERE id = ?', [secret.base32, req.user.id]);

  QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) return res.status(500).json({ error: 'QR Code generation failed' });
    res.json({ 
       secret: secret.base32,
       qrCode: data_url 
    });
  });
});

// 3. Enable MFA (TOTP or SMS) after first successful verification
router.post('/mfa/enable', authenticate, async (req, res) => {
  const { type, code, phone } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

  try {
    let verified = false;
    if (type === 'totp') {
      verified = speakeasy.totp.verify({
        secret: user.mfa_temp_secret,
        encoding: 'base32',
        token: code
      });
      if (verified) {
        await db.run('UPDATE users SET mfa_enabled = 1, mfa_type = "totp", mfa_secret = ?, mfa_temp_secret = NULL WHERE id = ?', [user.mfa_temp_secret, req.user.id]);
      }
    } else if (type === 'sms') {
      // In a real scenario, you'd send an OTP to 'phone' first
      // For this demo, we'll just enable it
      await db.run('UPDATE users SET mfa_enabled = 1, mfa_type = "sms", mfa_phone = ? WHERE id = ?', [phone, req.user.id]);
      verified = true;
    }

    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });
    res.json({ message: 'MFA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

// 4. Disable MFA
router.post('/mfa/disable', authenticate, async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE users SET mfa_enabled = 0, mfa_type = "none", mfa_secret = NULL, mfa_phone = NULL WHERE id = ?', [req.user.id]);
  res.json({ message: 'MFA disabled' });
});

module.exports = router;
