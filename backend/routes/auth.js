const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { JWT_SECRET, authenticate, requireRole } = require('../authMiddleware');

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

    // Reset failed attempts on success
    await db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

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
  const { name, email, password } = req.body;
  const db = await getDb();

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    // New registrants default to 'Viewer/Auditor'
    await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, 'Viewer/Auditor']);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin ONLY: Get all users
router.get('/users', authenticate, requireRole(['Admin']), async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT id, name, email, role, status FROM users');
  res.json(users);
});

module.exports = router;
