const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, s.name as supplier_name
      FROM geopolitical_risks g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      ORDER BY g.risk_score DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, s.name as supplier_name
      FROM geopolitical_risks g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      WHERE g.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO geopolitical_risks (supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes } = req.body;
    const result = await pool.query(
      `UPDATE geopolitical_risks SET supplier_id=$1, country=$2, region=$3, risk_score=$4, political_stability=$5, trade_restrictions=$6, sanctions_status=$7, conflict_zone=$8, currency_risk=$9, regulatory_risk=$10, notes=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM geopolitical_risks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
