const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all reports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.*, s.name AS supplier_name, u.name AS author_name
       FROM risk_reports rr
       LEFT JOIN suppliers s ON rr.supplier_id = s.id
       LEFT JOIN users u ON rr.generated_by = u.id
       ORDER BY rr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET report by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.*, s.name AS supplier_name, u.name AS author_name
       FROM risk_reports rr
       LEFT JOIN suppliers s ON rr.supplier_id = s.id
       LEFT JOIN users u ON rr.generated_by = u.id
       WHERE rr.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, report_type, supplier_id, content, generated_by, status } = req.body;
    const result = await pool.query(
      `INSERT INTO risk_reports (title, report_type, supplier_id, content, generated_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, report_type, supplier_id, content, generated_by, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update report
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, report_type, supplier_id, content, generated_by, status } = req.body;
    const result = await pool.query(
      `UPDATE risk_reports
       SET title = $1, report_type = $2, supplier_id = $3, content = $4, generated_by = $5, status = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, report_type, supplier_id, content, generated_by, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE report
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM risk_reports WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
