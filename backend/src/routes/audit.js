const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all audit trail entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT at.*, u.name AS user_name
       FROM audit_trail at
       LEFT JOIN users u ON at.user_id = u.id
       ORDER BY at.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET audit trail entry by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT at.*, u.name AS user_name
       FROM audit_trail at
       LEFT JOIN users u ON at.user_id = u.id
       WHERE at.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create audit trail entry (system logging)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, entity_type, entity_id, action, changes, ip_address } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_trail (user_id, entity_type, entity_id, action, changes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, entity_type, entity_id, action, changes, ip_address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// No PUT or DELETE - audit trail is immutable

module.exports = router;
