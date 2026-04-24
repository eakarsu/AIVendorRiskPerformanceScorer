require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vendor_risk_scorer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('Creating tables...');

  await pool.query(`
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS spend_analysis CASCADE;
    DROP TABLE IF EXISTS supplier_contacts CASCADE;
    DROP TABLE IF EXISTS compliance_documents CASCADE;
    DROP TABLE IF EXISTS risk_alerts CASCADE;
    DROP TABLE IF EXISTS vendor_contracts CASCADE;
    DROP TABLE IF EXISTS audit_trail CASCADE;
    DROP TABLE IF EXISTS risk_reports CASCADE;
    DROP TABLE IF EXISTS watchlist CASCADE;
    DROP TABLE IF EXISTS esg_compliance CASCADE;
    DROP TABLE IF EXISTS geopolitical_risks CASCADE;
    DROP TABLE IF EXISTS delivery_performance CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'analyst',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      country VARCHAR(100),
      industry VARCHAR(100),
      revenue DECIMAL(15,2),
      credit_rating VARCHAR(10),
      stock_symbol VARCHAR(20),
      financial_health_score INTEGER DEFAULT 50,
      risk_level VARCHAR(20) DEFAULT 'Medium',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE delivery_performance (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      order_id VARCHAR(50),
      promised_date DATE,
      actual_date DATE,
      quantity_ordered INTEGER,
      quantity_delivered INTEGER,
      quality_score DECIMAL(5,2),
      on_time BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE geopolitical_risks (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      country VARCHAR(100),
      region VARCHAR(100),
      risk_score DECIMAL(5,2),
      political_stability VARCHAR(20),
      trade_restrictions VARCHAR(20),
      sanctions_status VARCHAR(50),
      conflict_zone BOOLEAN DEFAULT false,
      currency_risk VARCHAR(20),
      regulatory_risk VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE esg_compliance (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      environmental_score DECIMAL(5,2),
      social_score DECIMAL(5,2),
      governance_score DECIMAL(5,2),
      overall_score DECIMAL(5,2),
      carbon_footprint VARCHAR(20),
      labor_practices VARCHAR(20),
      board_diversity VARCHAR(20),
      sustainability_report BOOLEAN DEFAULT false,
      compliance_status VARCHAR(50),
      certifications TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create additional tables (new features)
  await pool.query(`
    CREATE TABLE risk_alerts (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      alert_type VARCHAR(50),
      severity VARCHAR(20),
      title VARCHAR(255),
      description TEXT,
      status VARCHAR(20) DEFAULT 'Open',
      triggered_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE vendor_contracts (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      contract_number VARCHAR(50),
      contract_type VARCHAR(50),
      start_date DATE,
      end_date DATE,
      value DECIMAL(15,2),
      status VARCHAR(20) DEFAULT 'Active',
      payment_terms VARCHAR(50),
      auto_renewal BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE audit_trail (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      action VARCHAR(20),
      changes TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE risk_reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      report_type VARCHAR(50),
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      content TEXT,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'Draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE watchlist (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      priority VARCHAR(20) DEFAULT 'Medium',
      status VARCHAR(20) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(supplier_id, user_id)
    );

    CREATE TABLE compliance_documents (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      document_name VARCHAR(255),
      document_type VARCHAR(50),
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'Valid',
      issuing_authority VARCHAR(255),
      file_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE supplier_contacts (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      name VARCHAR(255),
      title VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      department VARCHAR(50),
      is_primary BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE spend_analysis (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      period VARCHAR(20),
      category VARCHAR(50),
      amount DECIMAL(15,2),
      budget DECIMAL(15,2),
      currency VARCHAR(10) DEFAULT 'USD',
      department VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      severity VARCHAR(20) DEFAULT 'info',
      read BOOLEAN DEFAULT false,
      link VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created. Seeding data...');

  // Seed users
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@vendorrisk.com', $1, 'admin'),
    ('John Analyst', 'john@vendorrisk.com', $1, 'analyst'),
    ('Sarah Manager', 'sarah@vendorrisk.com', $1, 'manager')
  `, [hash]);

  // Seed 16 suppliers
  await pool.query(`
    INSERT INTO suppliers (name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes) VALUES
    ('TechNova Solutions', 'United States', 'Technology', 4500.00, 'AA', 'TNVS', 88, 'Low', 'Leading cloud infrastructure provider with strong financials'),
    ('Shanghai MegaSteel', 'China', 'Manufacturing', 12000.00, 'A', 'SHMS', 72, 'Medium', 'Major steel supplier with growing concerns about trade tensions'),
    ('Bangalore InfoTech', 'India', 'IT Services', 2300.00, 'A-', 'BFIT', 81, 'Low', 'Reliable IT outsourcing partner with competitive pricing'),
    ('Munich AutoParts GmbH', 'Germany', 'Automotive', 8900.00, 'AA-', 'MAPG', 91, 'Low', 'Premium automotive parts with excellent quality track record'),
    ('São Paulo Chemicals', 'Brazil', 'Chemicals', 3200.00, 'BBB+', 'SPCM', 63, 'Medium', 'Regional chemical supplier with moderate financial stability'),
    ('Lagos Logistics Ltd', 'Nigeria', 'Logistics', 450.00, 'BB', 'LLGL', 38, 'High', 'Emerging market logistics provider with currency risk exposure'),
    ('Tokyo Electronics Co', 'Japan', 'Electronics', 18500.00, 'AAA', 'TKEC', 95, 'Low', 'World-class electronics manufacturer with pristine credit'),
    ('Moscow Energy Corp', 'Russia', 'Energy', 6700.00, 'B+', 'MSEC', 25, 'Critical', 'Energy supplier under heavy sanctions pressure'),
    ('Seoul Semiconductor', 'South Korea', 'Electronics', 7800.00, 'AA', 'SLSC', 87, 'Low', 'Innovation leader in semiconductor manufacturing'),
    ('Istanbul Textiles', 'Turkey', 'Textiles', 890.00, 'BB+', 'ISTT', 52, 'Medium', 'Cost-effective textile supplier with currency volatility'),
    ('Sydney Mining Group', 'Australia', 'Mining', 15600.00, 'A+', 'SYMG', 84, 'Low', 'Major mining operation with strong ESG practices'),
    ('Nairobi AgriTech', 'Kenya', 'Agriculture', 320.00, 'B', 'NRAT', 31, 'High', 'Agricultural technology startup with limited financial history'),
    ('Warsaw Pharma', 'Poland', 'Pharmaceuticals', 4100.00, 'A-', 'WSPH', 76, 'Medium', 'Growing pharma supplier with EU regulatory compliance'),
    ('Dubai Trade Hub', 'UAE', 'Trading', 9200.00, 'A', 'DTBH', 79, 'Low', 'Strategic Middle East trading partner with diverse portfolio'),
    ('Vancouver Green Energy', 'Canada', 'Renewable Energy', 2800.00, 'A-', 'VCGE', 82, 'Low', 'Leading renewable energy equipment supplier'),
    ('Bangkok Components', 'Thailand', 'Manufacturing', 1600.00, 'BBB', 'BKCP', 58, 'Medium', 'Cost-effective component manufacturer with growing capacity')
  `);

  // Seed 16 delivery performance records
  await pool.query(`
    INSERT INTO delivery_performance (supplier_id, order_id, promised_date, actual_date, quantity_ordered, quantity_delivered, quality_score, on_time, notes) VALUES
    (1, 'PO-2024-001', '2024-01-15', '2024-01-14', 1000, 1000, 97.5, true, 'Delivered one day early with perfect quality'),
    (2, 'PO-2024-002', '2024-01-20', '2024-01-28', 5000, 4800, 88.0, false, 'Delayed due to customs issues, minor quantity shortfall'),
    (3, 'PO-2024-003', '2024-02-01', '2024-02-01', 200, 200, 95.0, true, 'On-time delivery with excellent quality'),
    (4, 'PO-2024-004', '2024-02-10', '2024-02-09', 800, 800, 99.2, true, 'Premium quality automotive parts delivered early'),
    (5, 'PO-2024-005', '2024-02-15', '2024-02-20', 3000, 2900, 82.0, false, 'Moderate delay, slight quality issues noted'),
    (6, 'PO-2024-006', '2024-03-01', '2024-03-12', 500, 450, 71.0, false, 'Significant delay and quantity shortfall'),
    (7, 'PO-2024-007', '2024-03-05', '2024-03-04', 2000, 2000, 98.8, true, 'Exceptional quality and early delivery'),
    (8, 'PO-2024-008', '2024-03-10', '2024-04-01', 1500, 1200, 65.0, false, 'Major delay due to sanctions-related complications'),
    (9, 'PO-2024-009', '2024-03-15', '2024-03-15', 3500, 3500, 96.0, true, 'Perfect on-time delivery with top quality'),
    (10, 'PO-2024-010', '2024-03-20', '2024-03-25', 1200, 1150, 79.0, false, 'Slight delay due to shipping complications'),
    (11, 'PO-2024-011', '2024-04-01', '2024-03-30', 4000, 4000, 94.0, true, 'Delivered early with consistent quality'),
    (12, 'PO-2024-012', '2024-04-05', '2024-04-15', 300, 280, 68.0, false, 'Delayed shipment with quality concerns'),
    (13, 'PO-2024-013', '2024-04-10', '2024-04-10', 600, 600, 91.0, true, 'On-time pharmaceutical delivery meeting all standards'),
    (14, 'PO-2024-014', '2024-04-15', '2024-04-14', 2500, 2500, 93.0, true, 'Reliable delivery from Dubai hub'),
    (15, 'PO-2024-015', '2024-04-20', '2024-04-20', 800, 800, 90.0, true, 'Green energy components delivered on schedule'),
    (16, 'PO-2024-016', '2024-04-25', '2024-04-30', 1800, 1750, 83.0, false, 'Minor delay from Bangkok facility')
  `);

  // Seed 16 geopolitical risk records
  await pool.query(`
    INSERT INTO geopolitical_risks (supplier_id, country, region, risk_score, political_stability, trade_restrictions, sanctions_status, conflict_zone, currency_risk, regulatory_risk, notes) VALUES
    (1, 'United States', 'North America', 15.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Stable democratic governance with strong institutions'),
    (2, 'China', 'East Asia', 68.0, 'Moderate', 'High', 'Partial', false, 'Medium', 'High', 'Increasing trade tensions and regulatory uncertainty'),
    (3, 'India', 'South Asia', 42.0, 'Moderate', 'Medium', 'None', false, 'Medium', 'Medium', 'Growing economy with some regulatory challenges'),
    (4, 'Germany', 'Western Europe', 12.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Strong EU member with reliable trade framework'),
    (5, 'Brazil', 'South America', 55.0, 'Moderate', 'Medium', 'None', false, 'High', 'Medium', 'Political volatility and currency fluctuation risks'),
    (6, 'Nigeria', 'West Africa', 78.0, 'Unstable', 'Medium', 'None', false, 'High', 'High', 'Security concerns and infrastructure challenges'),
    (7, 'Japan', 'East Asia', 18.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Highly stable with advanced trade infrastructure'),
    (8, 'Russia', 'Eastern Europe', 95.0, 'Unstable', 'Critical', 'Full', true, 'Critical', 'Critical', 'Under comprehensive international sanctions'),
    (9, 'South Korea', 'East Asia', 35.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Stable but proximity to North Korea adds risk'),
    (10, 'Turkey', 'Middle East', 62.0, 'Moderate', 'Medium', 'None', false, 'High', 'Medium', 'Currency instability and regional geopolitical tensions'),
    (11, 'Australia', 'Oceania', 14.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Very stable with strong trade relationships'),
    (12, 'Kenya', 'East Africa', 65.0, 'Moderate', 'Medium', 'None', false, 'High', 'Medium', 'Developing economy with political transition risks'),
    (13, 'Poland', 'Central Europe', 28.0, 'Stable', 'Low', 'None', false, 'Medium', 'Low', 'EU member with stable governance, proximity to conflict'),
    (14, 'UAE', 'Middle East', 32.0, 'Stable', 'Low', 'None', false, 'Low', 'Medium', 'Strategic hub with regional conflict proximity'),
    (15, 'Canada', 'North America', 10.0, 'Stable', 'Low', 'None', false, 'Low', 'Low', 'Very low risk with strong bilateral trade agreements'),
    (16, 'Thailand', 'Southeast Asia', 45.0, 'Moderate', 'Medium', 'None', false, 'Medium', 'Medium', 'Political transitions and regional competition')
  `);

  // Seed 16 ESG compliance records
  await pool.query(`
    INSERT INTO esg_compliance (supplier_id, environmental_score, social_score, governance_score, overall_score, carbon_footprint, labor_practices, board_diversity, sustainability_report, compliance_status, certifications, notes) VALUES
    (1, 85.0, 88.0, 92.0, 88.3, 'Low', 'Excellent', 'High', true, 'Compliant', 'ISO 14001, B Corp', 'Industry leader in corporate sustainability'),
    (2, 45.0, 52.0, 48.0, 48.3, 'High', 'Moderate', 'Low', false, 'Partial', 'ISO 9001', 'Significant environmental concerns in manufacturing'),
    (3, 72.0, 68.0, 75.0, 71.7, 'Medium', 'Good', 'Medium', true, 'Compliant', 'ISO 27001, SOC2', 'Strong governance with room for environmental improvement'),
    (4, 90.0, 85.0, 88.0, 87.7, 'Low', 'Excellent', 'High', true, 'Compliant', 'ISO 14001, ISO 50001, IATF 16949', 'German automotive excellence in ESG'),
    (5, 55.0, 60.0, 58.0, 57.7, 'Medium', 'Moderate', 'Medium', false, 'Partial', 'ISO 9001', 'Improving ESG practices but gaps remain'),
    (6, 30.0, 35.0, 32.0, 32.3, 'High', 'Poor', 'Low', false, 'Non-Compliant', 'None', 'Major ESG deficiencies across all categories'),
    (7, 92.0, 90.0, 95.0, 92.3, 'Low', 'Excellent', 'High', true, 'Compliant', 'ISO 14001, ISO 45001, UN Global Compact', 'World-class ESG performance'),
    (8, 20.0, 18.0, 15.0, 17.7, 'Critical', 'Poor', 'Low', false, 'Non-Compliant', 'None', 'Severe ESG concerns compounded by sanctions'),
    (9, 82.0, 78.0, 84.0, 81.3, 'Low', 'Good', 'Medium', true, 'Compliant', 'ISO 14001, K-ESG', 'Strong ESG commitment with continuous improvement'),
    (10, 48.0, 55.0, 50.0, 51.0, 'Medium', 'Moderate', 'Low', false, 'Partial', 'ISO 9001', 'Mixed ESG performance with labor practice concerns'),
    (11, 88.0, 82.0, 86.0, 85.3, 'Medium', 'Excellent', 'High', true, 'Compliant', 'ISO 14001, GRI Standards', 'Strong mining ESG despite industry challenges'),
    (12, 35.0, 40.0, 38.0, 37.7, 'Medium', 'Moderate', 'Low', false, 'Partial', 'None', 'Early stage ESG development'),
    (13, 78.0, 80.0, 82.0, 80.0, 'Low', 'Good', 'Medium', true, 'Compliant', 'ISO 14001, GMP', 'Solid pharmaceutical ESG compliance'),
    (14, 65.0, 58.0, 70.0, 64.3, 'Medium', 'Moderate', 'Medium', true, 'Partial', 'ISO 9001, ISO 14001', 'Progressing ESG with regional standards'),
    (15, 95.0, 90.0, 88.0, 91.0, 'Low', 'Excellent', 'High', true, 'Compliant', 'ISO 14001, B Corp, Carbon Neutral', 'Top-tier green energy ESG performance'),
    (16, 50.0, 52.0, 55.0, 52.3, 'Medium', 'Moderate', 'Low', false, 'Partial', 'ISO 9001', 'Average ESG with improvement trajectory')
  `);

  // Seed risk alerts (16)
  await pool.query(`
    INSERT INTO risk_alerts (supplier_id, alert_type, severity, title, description, status, triggered_at) VALUES
    (8, 'Sanctions', 'Critical', 'Full Sanctions Detected', 'Moscow Energy Corp is under comprehensive international sanctions. Immediate review required.', 'Open', '2024-01-10'),
    (6, 'Financial', 'High', 'Credit Rating Downgrade', 'Lagos Logistics Ltd credit rating dropped to BB. Financial instability concerns rising.', 'Open', '2024-01-15'),
    (2, 'Geopolitical', 'High', 'Trade Restriction Escalation', 'New trade tariffs imposed on Chinese steel imports. May affect Shanghai MegaSteel supply chain.', 'Open', '2024-02-01'),
    (12, 'Financial', 'High', 'Low Financial Health Score', 'Nairobi AgriTech health score dropped below 35. Limited financial runway detected.', 'Open', '2024-02-10'),
    (10, 'Currency', 'Medium', 'Currency Volatility Alert', 'Turkish Lira depreciated 15% in Q1. Istanbul Textiles pricing may be affected.', 'Acknowledged', '2024-02-15'),
    (5, 'Delivery', 'Medium', 'Delivery Delay Pattern', 'São Paulo Chemicals showing consistent 3-5 day delays over last 3 orders.', 'Acknowledged', '2024-03-01'),
    (8, 'ESG', 'Critical', 'ESG Non-Compliance', 'Moscow Energy Corp fails minimum ESG standards across all categories.', 'Open', '2024-03-05'),
    (6, 'ESG', 'High', 'Labor Practice Concerns', 'Lagos Logistics Ltd reported poor labor practices. Investigation recommended.', 'Open', '2024-03-10'),
    (16, 'Delivery', 'Medium', 'Quality Score Decline', 'Bangkok Components quality score trending downward over last 2 deliveries.', 'Acknowledged', '2024-03-15'),
    (2, 'ESG', 'Medium', 'Environmental Compliance Gap', 'Shanghai MegaSteel environmental score below 50. Carbon footprint rated High.', 'Resolved', '2024-03-20'),
    (10, 'Geopolitical', 'Medium', 'Regional Instability', 'Elevated geopolitical tensions in Turkey affecting supply chain reliability.', 'Open', '2024-04-01'),
    (12, 'Delivery', 'High', 'Shipment Quality Issues', 'Nairobi AgriTech last delivery had 68.0 quality score with quantity shortfall.', 'Open', '2024-04-05'),
    (5, 'Currency', 'Medium', 'Brazilian Real Fluctuation', 'BRL showing high volatility. May impact São Paulo Chemicals contract pricing.', 'Resolved', '2024-04-10'),
    (1, 'Compliance', 'Low', 'Certification Renewal Due', 'TechNova Solutions ISO 14001 certification renewal due in 60 days.', 'Acknowledged', '2024-04-15'),
    (4, 'Compliance', 'Low', 'Annual Audit Scheduled', 'Munich AutoParts GmbH annual compliance audit scheduled for next quarter.', 'Resolved', '2024-04-20'),
    (9, 'Geopolitical', 'Low', 'Regional Monitoring', 'Seoul Semiconductor - routine monitoring of Korean Peninsula situation.', 'Resolved', '2024-04-25')
  `);

  // Seed vendor contracts (16)
  await pool.query(`
    INSERT INTO vendor_contracts (supplier_id, contract_number, contract_type, start_date, end_date, value, status, payment_terms, auto_renewal, notes) VALUES
    (1, 'CTR-2023-001', 'Master Service Agreement', '2023-01-01', '2025-12-31', 2500000.00, 'Active', 'Net 30', true, 'Multi-year cloud infrastructure contract'),
    (2, 'CTR-2023-002', 'Supply Agreement', '2023-03-15', '2025-03-14', 8500000.00, 'Active', 'Net 45', false, 'Bulk steel supply with quarterly pricing review'),
    (3, 'CTR-2023-003', 'Service Level Agreement', '2023-06-01', '2024-05-31', 1200000.00, 'Expired', 'Net 30', true, 'IT outsourcing services - renewal pending'),
    (4, 'CTR-2023-004', 'Framework Agreement', '2023-04-01', '2026-03-31', 5600000.00, 'Active', 'Net 60', true, 'Premium automotive parts framework'),
    (5, 'CTR-2024-001', 'Supply Agreement', '2024-01-01', '2024-12-31', 1800000.00, 'Active', 'Net 30', false, 'Chemical supply for manufacturing operations'),
    (6, 'CTR-2024-002', 'Logistics Contract', '2024-02-01', '2025-01-31', 350000.00, 'Active', 'Net 15', false, 'Regional logistics and warehousing'),
    (7, 'CTR-2023-005', 'Strategic Partnership', '2023-07-01', '2026-06-30', 12000000.00, 'Active', 'Net 45', true, 'Long-term electronics supply partnership'),
    (8, 'CTR-2023-006', 'Energy Supply', '2023-01-01', '2024-12-31', 4200000.00, 'Suspended', 'Net 30', false, 'Suspended due to sanctions - under legal review'),
    (9, 'CTR-2024-003', 'Technology License', '2024-01-15', '2026-01-14', 3800000.00, 'Active', 'Net 30', true, 'Semiconductor technology licensing and supply'),
    (10, 'CTR-2024-004', 'Supply Agreement', '2024-03-01', '2025-02-28', 520000.00, 'Active', 'Net 30', false, 'Textile supply with currency adjustment clause'),
    (11, 'CTR-2023-007', 'Mining Rights Agreement', '2023-09-01', '2028-08-31', 22000000.00, 'Active', 'Net 60', true, 'Long-term mining output purchase agreement'),
    (12, 'CTR-2024-005', 'Pilot Agreement', '2024-04-01', '2024-09-30', 150000.00, 'Active', 'Net 15', false, 'AgriTech pilot program - evaluation phase'),
    (13, 'CTR-2024-006', 'Pharmaceutical Supply', '2024-02-01', '2026-01-31', 2800000.00, 'Active', 'Net 45', true, 'GMP-compliant pharmaceutical ingredient supply'),
    (14, 'CTR-2023-008', 'Trading Agreement', '2023-11-01', '2025-10-31', 6500000.00, 'Active', 'Net 30', true, 'Middle East trading hub services'),
    (15, 'CTR-2024-007', 'Equipment Supply', '2024-01-01', '2025-12-31', 1900000.00, 'Active', 'Net 30', true, 'Renewable energy equipment and maintenance'),
    (16, 'CTR-2024-008', 'Component Supply', '2024-03-15', '2025-03-14', 980000.00, 'Active', 'Net 30', false, 'Electronic component manufacturing and supply')
  `);

  // Seed audit trail (16)
  await pool.query(`
    INSERT INTO audit_trail (user_id, entity_type, entity_id, action, changes, ip_address, created_at) VALUES
    (1, 'supplier', 8, 'UPDATE', 'Risk level changed from High to Critical due to sanctions escalation', '192.168.1.100', '2024-01-10 09:15:00'),
    (2, 'delivery', 2, 'CREATE', 'New delivery record PO-2024-002 created for Shanghai MegaSteel', '192.168.1.101', '2024-01-20 14:30:00'),
    (1, 'geopolitical', 8, 'UPDATE', 'Sanctions status updated to Full for Russia/Moscow Energy Corp', '192.168.1.100', '2024-02-01 10:00:00'),
    (3, 'esg', 6, 'UPDATE', 'ESG compliance status changed to Non-Compliant for Lagos Logistics', '192.168.1.102', '2024-02-15 11:45:00'),
    (1, 'supplier', 12, 'UPDATE', 'Financial health score adjusted from 45 to 31 based on Q4 results', '192.168.1.100', '2024-02-20 16:00:00'),
    (2, 'delivery', 8, 'CREATE', 'Delivery record PO-2024-008 logged with significant delay', '192.168.1.101', '2024-03-10 09:30:00'),
    (1, 'alert', 1, 'CREATE', 'Critical sanctions alert triggered for Moscow Energy Corp', '192.168.1.100', '2024-01-10 09:20:00'),
    (3, 'contract', 8, 'UPDATE', 'Contract CTR-2023-006 status changed to Suspended', '192.168.1.102', '2024-03-05 14:00:00'),
    (1, 'supplier', 1, 'UPDATE', 'TechNova Solutions health score updated to 88 after Q1 review', '192.168.1.100', '2024-04-01 10:30:00'),
    (2, 'esg', 1, 'UPDATE', 'TechNova B Corp certification verified and recorded', '192.168.1.101', '2024-04-02 11:00:00'),
    (1, 'watchlist', 8, 'CREATE', 'Moscow Energy Corp added to watchlist - sanctions monitoring', '192.168.1.100', '2024-01-11 08:00:00'),
    (3, 'geopolitical', 2, 'UPDATE', 'China trade restrictions escalated from Medium to High', '192.168.1.102', '2024-04-05 15:30:00'),
    (2, 'delivery', 12, 'CREATE', 'Delivery record PO-2024-012 logged with quality concerns', '192.168.1.101', '2024-04-05 10:00:00'),
    (1, 'report', 1, 'CREATE', 'Q1 2024 Comprehensive Risk Report generated', '192.168.1.100', '2024-04-10 09:00:00'),
    (3, 'supplier', 15, 'UPDATE', 'Vancouver Green Energy health score increased to 82', '192.168.1.102', '2024-04-15 14:00:00'),
    (1, 'alert', 14, 'UPDATE', 'Certification renewal alert acknowledged for TechNova', '192.168.1.100', '2024-04-16 10:00:00')
  `);

  // Seed risk reports (16)
  await pool.query(`
    INSERT INTO risk_reports (title, report_type, supplier_id, content, generated_by, status, created_at) VALUES
    ('Q1 2024 Vendor Risk Overview', 'Quarterly', NULL, 'Comprehensive quarterly risk assessment covering all 16 vendors. Key findings: 3 high-risk vendors identified, sanctions impact on Moscow Energy Corp requires immediate action.', 1, 'Published', '2024-04-01'),
    ('Moscow Energy Corp - Sanctions Impact', 'Incident', 8, 'Detailed analysis of sanctions impact on supply chain. Recommendation: Begin transition to alternative energy suppliers within 90 days.', 1, 'Published', '2024-01-15'),
    ('Shanghai MegaSteel Trade Risk', 'Assessment', 2, 'Assessment of escalating trade tensions impact on steel supply. Price increases of 12-18% expected. Diversification strategy recommended.', 2, 'Published', '2024-02-05'),
    ('Lagos Logistics ESG Audit', 'Audit', 6, 'ESG compliance audit findings: Major gaps in labor practices, environmental standards, and governance. Corrective action plan required.', 3, 'Published', '2024-03-10'),
    ('Nairobi AgriTech Financial Review', 'Assessment', 12, 'Financial stability review reveals limited cash runway. Recommend reducing order volumes and requiring advance payment terms.', 1, 'Published', '2024-02-20'),
    ('Tokyo Electronics Partnership Review', 'Review', 7, 'Annual partnership review - excellent performance across all metrics. Recommend contract extension with expanded scope.', 2, 'Published', '2024-03-15'),
    ('Munich AutoParts Quality Report', 'Assessment', 4, 'Quality assessment confirms premium standards maintained. 99.2% quality score on last delivery. Best-in-class supplier.', 3, 'Published', '2024-03-20'),
    ('Global Supply Chain Risk Map Q1', 'Quarterly', NULL, 'Geographic risk mapping of entire vendor portfolio. Concentration risk identified in East Asia (3 vendors). Diversification recommended.', 1, 'Published', '2024-04-05'),
    ('Istanbul Textiles Currency Analysis', 'Assessment', 10, 'Currency risk analysis for Turkish Lira exposure. Hedging strategy proposed to mitigate 15% depreciation impact.', 2, 'Draft', '2024-04-10'),
    ('ESG Compliance Summary H1 2024', 'Quarterly', NULL, 'Half-year ESG compliance summary. 7 compliant, 5 partial, 4 non-compliant vendors. Overall ESG score improving.', 1, 'Draft', '2024-04-12'),
    ('Bangkok Components Capacity Review', 'Assessment', 16, 'Manufacturing capacity assessment shows growing capabilities but quality consistency needs improvement.', 3, 'Published', '2024-04-15'),
    ('Vancouver Green Energy Sustainability', 'Review', 15, 'Sustainability practices review - top performer. Carbon neutral certified. Model supplier for ESG compliance.', 2, 'Published', '2024-04-18'),
    ('Vendor Concentration Risk Analysis', 'Assessment', NULL, 'Analysis of supplier concentration by industry and region. Electronics sector has highest concentration risk.', 1, 'Draft', '2024-04-20'),
    ('Dubai Trade Hub Performance', 'Review', 14, 'Performance review of Dubai Trade Hub operations. Reliable partner with consistent delivery and competitive pricing.', 3, 'Published', '2024-04-22'),
    ('Seoul Semiconductor Innovation Review', 'Review', 9, 'Technology innovation assessment. Strong R&D pipeline. Strategic importance for next-gen product development.', 2, 'Draft', '2024-04-25'),
    ('Warsaw Pharma Compliance Check', 'Audit', 13, 'Regulatory compliance verification for pharmaceutical supply chain. All GMP standards met. EU compliance confirmed.', 1, 'Published', '2024-04-28')
  `);

  // Seed watchlist (16)
  await pool.query(`
    INSERT INTO watchlist (supplier_id, user_id, reason, priority, status) VALUES
    (8, 1, 'Under comprehensive sanctions - requires continuous monitoring', 'Critical', 'Active'),
    (6, 1, 'Financial instability and ESG non-compliance concerns', 'High', 'Active'),
    (12, 1, 'Limited financial runway - startup risk', 'High', 'Active'),
    (2, 2, 'Escalating trade tensions with China affecting supply', 'High', 'Active'),
    (10, 2, 'Currency volatility and regional instability', 'Medium', 'Active'),
    (5, 2, 'Consistent delivery delays and moderate financial stability', 'Medium', 'Active'),
    (16, 3, 'Quality score declining trend in recent deliveries', 'Medium', 'Active'),
    (8, 2, 'Sanctions monitoring and contract suspension follow-up', 'Critical', 'Active'),
    (6, 3, 'Labor practice investigation ongoing', 'High', 'Active'),
    (12, 2, 'Financial review follow-up and pilot program evaluation', 'High', 'Active'),
    (10, 1, 'Turkish Lira hedging strategy implementation monitoring', 'Medium', 'Active'),
    (3, 1, 'Contract renewal evaluation - service level review', 'Low', 'Active'),
    (5, 3, 'Brazilian Real currency risk monitoring', 'Medium', 'Active'),
    (1, 2, 'ISO 14001 certification renewal tracking', 'Low', 'Active'),
    (9, 1, 'Korean Peninsula situation monitoring', 'Low', 'Active'),
    (13, 3, 'Pharmaceutical compliance regulatory updates tracking', 'Low', 'Active')
  `);

  // Seed compliance documents (16)
  await pool.query(`
    INSERT INTO compliance_documents (supplier_id, document_name, document_type, expiry_date, status, issuing_authority, file_url, notes) VALUES
    (1, 'ISO 14001:2015 Certificate', 'Certificate', '2025-06-15', 'Valid', 'BSI Group', 'https://docs.example.com/technova-iso14001.pdf', 'Environmental management system certification'),
    (1, 'B Corp Certification', 'Certificate', '2025-09-30', 'Valid', 'B Lab', 'https://docs.example.com/technova-bcorp.pdf', 'Verified social and environmental performance'),
    (4, 'IATF 16949 Certificate', 'Certificate', '2026-01-20', 'Valid', 'TUV Rheinland', 'https://docs.example.com/munich-iatf.pdf', 'Automotive quality management system'),
    (4, 'ISO 50001 Energy Certificate', 'Certificate', '2025-03-10', 'Expiring Soon', 'DQS', 'https://docs.example.com/munich-iso50001.pdf', 'Energy management certification - renewal needed'),
    (7, 'ISO 45001 Safety Certificate', 'Certificate', '2026-03-15', 'Valid', 'JQA', 'https://docs.example.com/tokyo-iso45001.pdf', 'Occupational health and safety management'),
    (7, 'UN Global Compact Report', 'Audit Report', '2025-12-31', 'Valid', 'United Nations', 'https://docs.example.com/tokyo-ungc.pdf', 'Annual Communication on Progress'),
    (3, 'SOC 2 Type II Report', 'Audit Report', '2025-04-30', 'Valid', 'Deloitte', 'https://docs.example.com/bangalore-soc2.pdf', 'Service organization control report'),
    (9, 'K-ESG Certification', 'Certificate', '2025-11-30', 'Valid', 'KCGS', 'https://docs.example.com/seoul-kesg.pdf', 'Korean ESG certification standard'),
    (11, 'GRI Standards Report', 'Audit Report', '2025-08-15', 'Valid', 'GRI', 'https://docs.example.com/sydney-gri.pdf', 'Global Reporting Initiative sustainability report'),
    (13, 'GMP Compliance Certificate', 'Certificate', '2025-07-20', 'Valid', 'EMA', 'https://docs.example.com/warsaw-gmp.pdf', 'Good Manufacturing Practice compliance'),
    (13, 'EU Pharmaceutical License', 'License', '2026-02-28', 'Valid', 'European Medicines Agency', 'https://docs.example.com/warsaw-eulicense.pdf', 'Manufacturing and import authorization'),
    (15, 'Carbon Neutral Certificate', 'Certificate', '2025-12-31', 'Valid', 'Climate Active', 'https://docs.example.com/vancouver-carbon.pdf', 'Carbon neutral organization certification'),
    (2, 'ISO 9001 Certificate', 'Certificate', '2024-12-15', 'Expired', 'SGS', 'https://docs.example.com/shanghai-iso9001.pdf', 'Quality management - expired, renewal pending'),
    (6, 'Business License Nigeria', 'License', '2025-01-31', 'Expiring Soon', 'CAC Nigeria', 'https://docs.example.com/lagos-license.pdf', 'Corporate Affairs Commission registration'),
    (14, 'Trade License UAE', 'License', '2025-10-15', 'Valid', 'Dubai DED', 'https://docs.example.com/dubai-trade.pdf', 'Department of Economic Development trade license'),
    (5, 'Environmental Permit', 'License', '2024-11-30', 'Expired', 'IBAMA Brazil', 'https://docs.example.com/saopaulo-env.pdf', 'Environmental operating permit - expired')
  `);

  // Seed supplier contacts (16)
  await pool.query(`
    INSERT INTO supplier_contacts (supplier_id, name, title, email, phone, department, is_primary, notes) VALUES
    (1, 'Jennifer Chen', 'VP of Sales', 'j.chen@technova.com', '+1-415-555-0101', 'Executive', true, 'Primary point of contact for all commercial matters'),
    (1, 'Mike Rodriguez', 'Account Manager', 'm.rodriguez@technova.com', '+1-415-555-0102', 'Procurement', false, 'Day-to-day operational contact'),
    (2, 'Wei Zhang', 'Export Director', 'w.zhang@megasteel.cn', '+86-21-5555-0201', 'Executive', true, 'Primary contact for international trade'),
    (4, 'Hans Mueller', 'Head of Sales EMEA', 'h.mueller@munichap.de', '+49-89-5555-0401', 'Executive', true, 'Key account manager for European operations'),
    (7, 'Yuki Tanaka', 'Chief Commercial Officer', 'y.tanaka@tokyoelec.jp', '+81-3-5555-0701', 'Executive', true, 'Strategic partnership lead'),
    (7, 'Kenji Watanabe', 'Quality Director', 'k.watanabe@tokyoelec.jp', '+81-3-5555-0702', 'Quality', false, 'Quality assurance and compliance contact'),
    (9, 'Min-Jun Park', 'VP Business Development', 'm.park@seoulsc.kr', '+82-2-5555-0901', 'Executive', true, 'New technology and licensing discussions'),
    (3, 'Priya Sharma', 'Delivery Manager', 'p.sharma@bangit.in', '+91-80-5555-0301', 'Operations', true, 'Primary operations and delivery contact'),
    (11, 'James Wilson', 'CFO', 'j.wilson@sydneymg.au', '+61-2-5555-1101', 'Finance', true, 'Financial and contract negotiations'),
    (13, 'Anna Kowalski', 'Regulatory Affairs', 'a.kowalski@warsawph.pl', '+48-22-5555-1301', 'Legal', true, 'Pharmaceutical compliance and regulatory contact'),
    (14, 'Ahmed Al-Rashid', 'Managing Director', 'a.alrashid@dubaith.ae', '+971-4-555-1401', 'Executive', true, 'Senior relationship manager'),
    (15, 'Sarah Thompson', 'Operations Director', 's.thompson@vcgreen.ca', '+1-604-555-1501', 'Operations', true, 'Supply chain and operations lead'),
    (5, 'Carlos Santos', 'Commercial Manager', 'c.santos@spchemicals.br', '+55-11-5555-0501', 'Procurement', true, 'Primary commercial contact'),
    (6, 'Chioma Okafor', 'General Manager', 'c.okafor@lagoslog.ng', '+234-1-555-0601', 'Executive', true, 'Main point of contact for all operations'),
    (12, 'David Mwangi', 'CEO', 'd.mwangi@nairobiat.ke', '+254-20-555-1201', 'Executive', true, 'Founder and CEO - startup direct contact'),
    (16, 'Somchai Patel', 'Export Manager', 's.patel@bangkokcomp.th', '+66-2-555-1601', 'Logistics', true, 'Shipping and export coordination')
  `);

  // Seed spend analysis (16)
  await pool.query(`
    INSERT INTO spend_analysis (supplier_id, period, category, amount, budget, currency, department, notes) VALUES
    (1, '2024-Q1', 'Technology', 625000.00, 650000.00, 'USD', 'IT', 'Cloud infrastructure services - under budget'),
    (2, '2024-Q1', 'Raw Materials', 2150000.00, 2000000.00, 'USD', 'Manufacturing', 'Steel supply - over budget due to tariff increases'),
    (3, '2024-Q1', 'Services', 300000.00, 310000.00, 'USD', 'IT', 'IT outsourcing services - within budget'),
    (4, '2024-Q1', 'Raw Materials', 1400000.00, 1350000.00, 'EUR', 'Manufacturing', 'Automotive parts - slight overspend on premium components'),
    (7, '2024-Q1', 'Technology', 3000000.00, 2800000.00, 'JPY', 'R&D', 'Electronics supply for new product line'),
    (9, '2024-Q1', 'Technology', 950000.00, 1000000.00, 'USD', 'R&D', 'Semiconductor licensing and components'),
    (11, '2024-Q1', 'Raw Materials', 5500000.00, 5200000.00, 'AUD', 'Manufacturing', 'Mining output purchase - commodity price increase'),
    (14, '2024-Q1', 'Services', 1625000.00, 1700000.00, 'USD', 'Procurement', 'Trading hub services - favorable pricing'),
    (1, '2024-Q2', 'Technology', 610000.00, 650000.00, 'USD', 'IT', 'Continued cloud services - improved efficiency'),
    (2, '2024-Q2', 'Raw Materials', 1980000.00, 2000000.00, 'USD', 'Manufacturing', 'Steel supply - normalized pricing'),
    (5, '2024-Q1', 'Raw Materials', 450000.00, 480000.00, 'USD', 'Manufacturing', 'Chemical supply for production'),
    (6, '2024-Q1', 'Logistics', 87500.00, 90000.00, 'USD', 'Operations', 'Warehousing and regional logistics'),
    (13, '2024-Q1', 'Raw Materials', 700000.00, 720000.00, 'EUR', 'Manufacturing', 'Pharmaceutical ingredients - compliant sourcing'),
    (15, '2024-Q1', 'Technology', 475000.00, 500000.00, 'CAD', 'Operations', 'Renewable energy equipment procurement'),
    (16, '2024-Q1', 'Raw Materials', 245000.00, 260000.00, 'USD', 'Manufacturing', 'Electronic components supply'),
    (10, '2024-Q1', 'Raw Materials', 130000.00, 140000.00, 'USD', 'Manufacturing', 'Textile supply - currency impact absorbed')
  `);

  // Seed notifications
  await pool.query(`
    INSERT INTO notifications (user_id, supplier_id, type, title, message, severity, read, link) VALUES
    (NULL, 8, 'sanctions', 'Sanctions Alert: Moscow Energy Corp', 'New sanctions package announced affecting Russian energy sector suppliers. Immediate review required.', 'critical', false, '/suppliers/8'),
    (NULL, 6, 'delivery', 'Delivery Delay: Lagos Logistics Ltd', 'Order PO-2024-006 delayed by 11 days. Quality score below threshold at 71%.', 'high', false, '/delivery'),
    (NULL, 12, 'financial', 'Low Financial Health: Nairobi AgriTech', 'Financial health score dropped to 31. Credit rating at B level. Monitor closely.', 'high', false, '/suppliers/12'),
    (NULL, 2, 'geopolitical', 'Trade Tension Update: China', 'New trade restrictions may impact Shanghai MegaSteel operations. Review supply alternatives.', 'medium', false, '/geopolitical'),
    (NULL, 5, 'esg', 'ESG Score Decline: São Paulo Chemicals', 'Environmental compliance score decreased. Carbon footprint exceeds industry benchmark.', 'medium', false, '/esg'),
    (NULL, 10, 'financial', 'Currency Risk: Istanbul Textiles', 'Turkish Lira volatility affecting supplier cost projections. Budget variance at 15%.', 'medium', false, '/suppliers/10'),
    (NULL, 4, 'contract', 'Contract Renewal: Munich AutoParts GmbH', 'Contract expiring in 30 days. Auto-renewal clause active. Review terms before renewal.', 'low', false, '/contracts'),
    (NULL, 7, 'delivery', 'Exceptional Performance: Tokyo Electronics', 'Consistent on-time delivery with 98.8% quality score. Consider preferred vendor status.', 'info', true, '/delivery'),
    (NULL, 1, 'compliance', 'Document Expiring: TechNova Solutions', 'ISO 27001 certification expires in 45 days. Request renewal documentation.', 'low', false, '/documents'),
    (NULL, 11, 'esg', 'ESG Commendation: Sydney Mining Group', 'Achieved top-tier sustainability rating. Strong governance and environmental practices.', 'info', true, '/esg'),
    (NULL, NULL, 'system', 'Monthly Risk Report Ready', 'The automated monthly risk assessment report is available for review.', 'info', false, '/reports'),
    (NULL, 3, 'delivery', 'Delivery Milestone: Bangalore InfoTech', '100% on-time delivery rate maintained for Q1 2024.', 'info', true, '/delivery')
  `);

  console.log('Seed data inserted successfully!');
  console.log('Default login: admin@vendorrisk.com / password123');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
