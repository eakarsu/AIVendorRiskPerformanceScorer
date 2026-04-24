const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all contacts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*, s.name AS supplier_name
       FROM supplier_contacts sc
       JOIN suppliers s ON sc.supplier_id = s.id
       ORDER BY sc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contact by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT sc.*, s.name AS supplier_name
       FROM supplier_contacts sc
       JOIN suppliers s ON sc.supplier_id = s.id
       WHERE sc.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create contact
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, name, title, email, phone, department, is_primary, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO supplier_contacts (supplier_id, name, title, email, phone, department, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [supplier_id, name, title, email, phone, department, is_primary, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update contact
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, name, title, email, phone, department, is_primary, notes } = req.body;
    const result = await pool.query(
      `UPDATE supplier_contacts
       SET supplier_id = $1, name = $2, title = $3, email = $4, phone = $5, department = $6, is_primary = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [supplier_id, name, title, email, phone, department, is_primary, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM supplier_contacts WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
