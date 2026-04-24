const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all alerts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ra.*, s.name AS supplier_name
       FROM risk_alerts ra
       LEFT JOIN suppliers s ON ra.supplier_id = s.id
       ORDER BY ra.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET alert by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ra.*, s.name AS supplier_name
       FROM risk_alerts ra
       LEFT JOIN suppliers s ON ra.supplier_id = s.id
       WHERE ra.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create alert
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, alert_type, severity, title, description, status, triggered_at, resolved_at } = req.body;
    const result = await pool.query(
      `INSERT INTO risk_alerts (supplier_id, alert_type, severity, title, description, status, triggered_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [supplier_id, alert_type, severity, title, description, status, triggered_at, resolved_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update alert
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, alert_type, severity, title, description, status, triggered_at, resolved_at } = req.body;
    const result = await pool.query(
      `UPDATE risk_alerts
       SET supplier_id = $1, alert_type = $2, severity = $3, title = $4, description = $5, status = $6, triggered_at = $7, resolved_at = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [supplier_id, alert_type, severity, title, description, status, triggered_at, resolved_at, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE alert
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM risk_alerts WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
