const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const twilio = require('twilio');
require('dotenv').config();

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { JWT_SECRET, authenticate, requireRole, ROLES } = require('../authMiddleware');

async function logAudit(userId, action, resource, resourceId, details) {
  try {
    const log = new AuditLog({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details
    });
    await log.save();
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

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check status
    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
    }

    // Check lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account locked due to multiple failed attempts' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Increment failed attempts
      user.failed_attempts = (user.failed_attempts || 0) + 1;
      if (user.failed_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await user.save();
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // MFA check
    if (user.mfa_enabled) {
      if (user.mfa_type === 'sms') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.mfa_temp_secret = otp;
        await user.save();

        console.log(`[SMS OTP] Sending ${otp} to ${user.mfa_phone}`);
        if (twilioClient) {
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
      return res.json({ requireMfa: true, mfaType: user.mfa_type, userId: user._id });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const userRole = ROLES.VIEWER;

    const user = new User({
      name,
      email,
      password: hash,
      role: userRole
    });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      console.log(`[Email Service] Sent reset logic to ${email}`);
    }
    setTimeout(() => {
      res.json({ message: 'If that email matches an account, we have sent a reset link to it.' });
    }, 1000);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', authenticate, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await User.find({}, 'name email role status');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.delete('/users/:id', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === 'admin@lab.com') return res.status(400).json({ error: 'Cannot delete the primary system admin' });

    await User.findByIdAndDelete(id);
    await logAudit(req.user.id, 'DELETE_USER', 'users', id, `Admin deleted account for ${user.email}`);

    res.json({ message: `Account for ${user.name} has been deleted permanently.` });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/users/wipe-all', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    // In MongoDB, we don't need to disable PRAGMAs, but we should clear collections
    // Note: This is a destructive operation
    const Chemical = require('../models/Chemical');
    const Request = require('../models/Request');
    const InventoryLog = require('../models/InventoryLog');
    const Disposal = require('../models/Disposal');

    await Request.deleteMany({});
    await InventoryLog.deleteMany({});
    await Disposal.deleteMany({});
    await AuditLog.deleteMany({});
    
    const result = await User.deleteMany({ email: { $ne: 'admin@lab.com' } });

    await logAudit(req.user.id, 'MASTER_WIPE', 'system', '0', 'Admin performed a master reset of all personnel accounts.');

    res.json({ message: 'All non-admin users and their history have been removed.', count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Database reset failed' });
  }
});

router.put('/users/:id/role', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided.' });
  }

  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await logAudit(req.user.id, 'CHANGE_ROLE', 'users', req.params.id,
      `Changed role of ${targetUser.name} from ${oldRole} to ${role}`);

    res.json({ message: 'Role updated successfully', role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:id/status', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === 'admin@lab.com') return res.status(400).json({ error: 'Cannot deactivate the primary system admin' });

    user.status = status;
    await user.save();

    await logAudit(req.user.id, 'STATUS_CHANGE', 'users', id, `Admin changed status of ${user.email} to ${status}`);

    res.json({ message: `User ${user.name} is now ${status}.`, status });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/users/:id/reset-password', authenticate, requireRole([ROLES.ADMIN]), async (req, res) => {
  const { id } = req.params;
  try {
    const tempPassword = 'Reset' + Math.floor(1000 + Math.random() * 9000);
    const hash = await bcrypt.hash(tempPassword, 10);

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = hash;
    await user.save();

    await logAudit(req.user.id, 'PASSWORD_RESET', 'users', id, `Admin reset password for ${user.email}`);
    res.json({
      message: `Password for ${user.name} has been reset successfully.`,
      tempPassword
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/mfa/verify', async (req, res) => {
  const { userId, code } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let verified = false;
    if (user.mfa_type === 'totp') {
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: code
      });
    } else if (user.mfa_type === 'sms') {
      verified = (user.mfa_temp_secret === code);
    }

    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    user.mfa_temp_secret = null;
    await user.save();

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during MFA verification' });
  }
});

router.get('/mfa/setup/totp', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CIMS: ${req.user.email}`
    });

    const user = await User.findById(req.user.id);
    user.mfa_temp_secret = secret.base32;
    await user.save();

    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).json({ error: 'QR Code generation failed' });
      res.json({
        secret: secret.base32,
        qrCode: data_url
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

router.post('/mfa/enable', authenticate, async (req, res) => {
  const { type, code, phone } = req.body;
  try {
    const user = await User.findById(req.user.id);
    let verified = false;

    if (type === 'totp') {
      verified = speakeasy.totp.verify({
        secret: user.mfa_temp_secret,
        encoding: 'base32',
        token: code
      });
      if (verified) {
        user.mfa_enabled = true;
        user.mfa_type = 'totp';
        user.mfa_secret = user.mfa_temp_secret;
        user.mfa_temp_secret = null;
        await user.save();
      }
    } else if (type === 'sms') {
      user.mfa_enabled = true;
      user.mfa_type = 'sms';
      user.mfa_phone = phone;
      await user.save();
      verified = true;
    }

    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });
    res.json({ message: 'MFA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

router.post('/mfa/disable', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.mfa_enabled = false;
    user.mfa_type = 'none';
    user.mfa_secret = null;
    user.mfa_phone = null;
    await user.save();
    res.json({ message: 'MFA disabled' });
  } catch (err) {
    res.status(500).json({ error: 'MFA disable failed' });
  }
});

module.exports = router;
