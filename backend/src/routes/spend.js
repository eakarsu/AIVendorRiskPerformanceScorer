const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET spend summary aggregated per supplier
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.supplier_id, s.name AS supplier_name,
        SUM(sa.amount) AS total_spend,
        SUM(sa.budget) AS budget_total,
        SUM(sa.amount) - SUM(sa.budget) AS variance
       FROM spend_analysis sa
       JOIN suppliers s ON sa.supplier_id = s.id
       GROUP BY sa.supplier_id, s.name
       ORDER BY total_spend DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all spend records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, s.name AS supplier_name
       FROM spend_analysis sa
       JOIN suppliers s ON sa.supplier_id = s.id
       ORDER BY sa.period DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET spend record by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT sa.*, s.name AS supplier_name
       FROM spend_analysis sa
       JOIN suppliers s ON sa.supplier_id = s.id
       WHERE sa.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spend record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create spend record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, period, category, amount, budget, currency, department, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO spend_analysis (supplier_id, period, category, amount, budget, currency, department, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [supplier_id, period, category, amount, budget, currency, department, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update spend record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, period, category, amount, budget, currency, department, notes } = req.body;
    const result = await pool.query(
      `UPDATE spend_analysis
       SET supplier_id = $1, period = $2, category = $3, amount = $4, budget = $5, currency = $6, department = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [supplier_id, period, category, amount, budget, currency, department, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spend record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE spend record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM spend_analysis WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spend record not found' });
    }
    res.json({ message: 'Spend record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
