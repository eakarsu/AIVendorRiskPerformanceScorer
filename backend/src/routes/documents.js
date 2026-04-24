const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET all documents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cd.*, s.name AS supplier_name
       FROM compliance_documents cd
       JOIN suppliers s ON cd.supplier_id = s.id
       ORDER BY cd.expiry_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET document by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cd.*, s.name AS supplier_name
       FROM compliance_documents cd
       JOIN suppliers s ON cd.supplier_id = s.id
       WHERE cd.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create document
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_documents (supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update document
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes } = req.body;
    const result = await pool.query(
      `UPDATE compliance_documents
       SET supplier_id = $1, document_name = $2, document_type = $3, expiry_date = $4, status = $5, issuing_authority = $6, file_url = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM compliance_documents WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
