const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all contracts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT vc.*, s.name AS supplier_name
       FROM vendor_contracts vc
       LEFT JOIN suppliers s ON vc.supplier_id = s.id
       ORDER BY vc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contract by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT vc.*, s.name AS supplier_name
       FROM vendor_contracts vc
       LEFT JOIN suppliers s ON vc.supplier_id = s.id
       WHERE vc.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create contract
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO vendor_contracts (supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update contract
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes } = req.body;
    const result = await pool.query(
      `UPDATE vendor_contracts
       SET supplier_id = $1, contract_number = $2, contract_type = $3, start_date = $4, end_date = $5, value = $6, status = $7, payment_terms = $8, auto_renewal = $9, notes = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE contract
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM vendor_contracts WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
