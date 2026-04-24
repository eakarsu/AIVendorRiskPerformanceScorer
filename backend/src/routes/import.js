const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase().replace(/\s+/g, '_')] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Bulk import suppliers via CSV text
router.post('/suppliers', authMiddleware, async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const rows = parseCsv(csvData);
    if (rows.length === 0) return res.status(400).json({ error: 'No valid data rows found' });

    const imported = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row.supplier_name;
      if (!name) {
        errors.push({ row: i + 2, error: 'Missing supplier name' });
        continue;
      }
      try {
        const result = await pool.query(
          `INSERT INTO suppliers (name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            name,
            row.country || null,
            row.industry || null,
            parseFloat(row.revenue) || 0,
            row.credit_rating || null,
            row.stock_symbol || null,
            parseInt(row.financial_health_score) || 50,
            row.risk_level || 'Medium',
            row.notes || null,
          ]
        );
        imported.push(result.rows[0]);
      } catch (err) {
        errors.push({ row: i + 2, error: err.message });
      }
    }

    res.json({
      message: `Imported ${imported.length} suppliers with ${errors.length} errors`,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
