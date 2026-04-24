const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all watchlist entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, s.name AS supplier_name, u.name AS user_name
       FROM watchlist w
       LEFT JOIN suppliers s ON w.supplier_id = s.id
       LEFT JOIN users u ON w.user_id = u.id
       ORDER BY w.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET watchlist entry by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, s.name AS supplier_name, u.name AS user_name
       FROM watchlist w
       LEFT JOIN suppliers s ON w.supplier_id = s.id
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create watchlist entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, user_id, reason, priority, status } = req.body;
    const result = await pool.query(
      `INSERT INTO watchlist (supplier_id, user_id, reason, priority, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [supplier_id, user_id, reason, priority, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update watchlist entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, user_id, reason, priority, status } = req.body;
    const result = await pool.query(
      `UPDATE watchlist
       SET supplier_id = $1, user_id = $2, reason = $3, priority = $4, status = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [supplier_id, user_id, reason, priority, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE watchlist entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM watchlist WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist entry not found' });
    }
    res.json({ message: 'Watchlist entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
