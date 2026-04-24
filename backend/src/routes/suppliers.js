const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all suppliers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single supplier
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create supplier
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update supplier
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes } = req.body;
    const result = await pool.query(
      `UPDATE suppliers SET name=$1, country=$2, industry=$3, revenue=$4, credit_rating=$5, stock_symbol=$6, financial_health_score=$7, risk_level=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete supplier
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted', supplier: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
