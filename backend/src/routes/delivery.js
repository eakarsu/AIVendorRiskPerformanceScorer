const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, s.name as supplier_name
      FROM delivery_performance d
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, s.name as supplier_name
      FROM delivery_performance d
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO delivery_performance (supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes } = req.body;
    const result = await pool.query(
      `UPDATE delivery_performance SET supplier_id=$1, order_id=$2, promised_date=$3, actual_date=$4, quantity_ordered=$5, quantity_delivered=$6, quality_score=$7, on_time=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM delivery_performance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
