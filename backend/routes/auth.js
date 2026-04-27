const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const crypto = require('crypto');
require('dotenv').config();

const User = require('../models/User');
const { JWT_SECRET, authenticate, authorize, logAudit, ROLES } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const { notifyUnauthorizedAccess } = require('../utils/notificationService');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
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
        await notifyUnauthorizedAccess(user, 'Multiple failed login attempts', req.ip, req.headers['user-agent']);
      }
      await user.save();

      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // MFA check
    if (user.mfa_enabled) {
      if (user.mfa_type === 'email') {
        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await user.save();

        console.log(`[Email OTP] Sending ${otp} to ${user.email}`);
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "CIMS - Your OTP Code",
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; text-align: center;">
                  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block;">
                    <h2 style="color: #2c3e50; margin-bottom: 10px;">Login Verification</h2>
                    <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 30px;">Enter the code below to securely log in to your CIMS account.</p>
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                      <h1 style="color: #ffffff; font-size: 48px; margin: 0; letter-spacing: 12px;">${otp}</h1>
                    </div>
                    <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">This code expires in 5 minutes.</p>
                  </div>
                </div>
              `
          });
        } catch (err) {
          console.error("Email send failed:", err.message);
        }
      }
      return res.json({ requireMfa: true, mfaType: user.mfa_type, userId: user._id });
    }

    user.failed_attempts = 0;
    user.locked_until = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });

    // Log Login (async but we don't necessarily need to wait for it to respond to user)
    logAudit({ user, ip: req.ip, headers: req.headers }, {
      action: 'LOGIN',
      targetType: 'user',
      targetId: user._id,
      targetName: user.name,
      details: `User ${user.email} logged in successfully`,
      status: 'success'
    }).catch(err => console.error('Login Audit Log failed:', err));
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
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password/${token}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "CIMS - Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block;">
              <h2 style="color: #2c3e50; margin-bottom: 10px;">Reset Your Password</h2>
              <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 30px;">You recently requested to reset your password for your CIMS account. Click the button below to proceed.</p>
              <a href="${resetLink}" style="background: linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-size: 18px; font-weight: bold; display: inline-block; margin-bottom: 30px;">Reset Password</a>
              <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">This link expires in 10 minutes.</p>
              <p style="color: #95a5a6; font-size: 12px; margin-top: 20px;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 10 minutes.</p>
            </div>
          </div>
        `
      });
      console.log(`[Email Service] Sent reset token to ${email}`);
    }
    // Always return generic success to prevent email scanning
    res.json({ message: 'If that email matches an account, we have sent a reset link to it.' });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'user',
      targetId: user._id,
      targetName: user.name,
      details: 'User successfully reset their own password via email link'
    });

    res.json({ message: "Password has been successfully reset. You can now log in." });
  } catch (err) {
    console.error("Reset token verification error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), async (req, res) => {
  try {
    const users = await User.find({}, 'name email role status');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.delete('/users/:id', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === 'chemicalinventorysystem@gmail.com') return res.status(400).json({ error: 'Cannot delete the primary system admin' });

    await User.findByIdAndDelete(id);
    await logAudit(req, {
      action: 'DELETE',
      targetType: 'user',
      targetId: id,
      targetName: user.name,
      details: `Admin deleted account for ${user.email}`
    });

    res.json({ message: `Account for ${user.name} has been deleted permanently.` });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/users/wipe-all', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    // In MongoDB, we don't need to disable PRAGMAs, but we should clear collections
    // Note: This is a destructive operation
    const Chemical = require('../models/Chemical');
    const Request = require('../models/Request');
    const InventoryLog = require('../models/InventoryLog');
    const Disposal = require('../models/Disposal');
    const AuditLog = require('../models/AuditLog');

    await Request.deleteMany({});
    await InventoryLog.deleteMany({});
    await Disposal.deleteMany({});
    await AuditLog.deleteMany({});

    const result = await User.deleteMany({ email: { $ne: 'chemicalinventorysystem@gmail.com' } });

    await logAudit(req, {
      action: 'DELETE',
      targetType: 'system',
      targetId: '0',
      targetName: 'Database',
      details: 'Admin performed a master reset of all personnel accounts.'
    });

    res.json({ message: 'All non-admin users and their history have been removed.', count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Database reset failed' });
  }
});

router.put('/users/:id/role', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), async (req, res) => {
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

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'user',
      targetId: req.params.id,
      targetName: targetUser.name,
      details: `Changed role of ${targetUser.name} from ${oldRole} to ${role}`,
      oldValue: { role: oldRole },
      newValue: { role: role }
    });

    res.json({ message: 'Role updated successfully', role });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:id/status', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === 'chemicalinventorysystem@gmail.com') return res.status(400).json({ error: 'Cannot deactivate the primary system admin' });

    user.status = status;
    await user.save();

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'user',
      targetId: id,
      targetName: user.name,
      details: `Admin changed status of ${user.email} to ${status}`,
      newValue: { status }
    });

    res.json({ message: `User ${user.name} is now ${status}.`, status });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/users/:id/reset-password', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), async (req, res) => {
  const { id } = req.params;
  try {
    const tempPassword = 'Reset' + Math.floor(1000 + Math.random() * 9000);
    const hash = await bcrypt.hash(tempPassword, 10);

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = hash;
    await user.save();

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'user',
      targetId: id,
      targetName: user.name,
      details: `Admin reset password for ${user.email}`
    });
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
    } else if (user.mfa_type === 'email') {
      if (user.otp === code && user.otpExpiry > new Date()) {
        verified = true;
      }
    }

    if (!verified) {
      user.failed_attempts = (user.failed_attempts || 0) + 1;
      if (user.failed_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        await notifyUnauthorizedAccess(user, 'Multiple failed MFA attempts', req.ip, req.headers['user-agent']);
      }
      await user.save();

      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    user.mfa_temp_secret = null;
    user.failed_attempts = 0;
    user.locked_until = null;
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
    } else if (type === 'email') {
      user.mfa_enabled = true;
      user.mfa_type = 'email';
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

router.get('/check-admins-temp', async (req, res) => {
  try {
    const users = await User.find({ role: 'Admin' }, 'email role');
    const all = await User.find({}, 'email role').limit(50);
    res.json({ admins: users, totalAdmins: users.length, allUsersSample: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
