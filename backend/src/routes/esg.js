const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.name as supplier_name
      FROM esg_compliance e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      ORDER BY e.overall_score DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.name as supplier_name
      FROM esg_compliance e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO esg_compliance (supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes } = req.body;
    const result = await pool.query(
      `UPDATE esg_compliance SET supplier_id=$1, environmental_score=$2, social_score=$3, governance_score=$4, overall_score=$5, carbon_footprint=$6, labor_practices=$7, board_diversity=$8, sustainability_report=$9, compliance_status=$10, certifications=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM esg_compliance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
