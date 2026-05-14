require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const supplierRoutes = require('./routes/suppliers');
const deliveryRoutes = require('./routes/delivery');
const geopoliticalRoutes = require('./routes/geopolitical');
const esgRoutes = require('./routes/esg');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const contractRoutes = require('./routes/contracts');
const auditRoutes = require('./routes/audit');
const reportRoutes = require('./routes/reports');
const watchlistRoutes = require('./routes/watchlist');
const documentRoutes = require('./routes/documents');
const contactRoutes = require('./routes/contacts');
const heatmapRoutes = require('./routes/heatmap');
const spendRoutes = require('./routes/spend');
const comparisonRoutes = require('./routes/comparison');
const notificationRoutes = require('./routes/notifications');
const exportRoutes = require('./routes/export');
const timelineRoutes = require('./routes/timeline');
const profileRoutes = require('./routes/profile');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/geopolitical', geopoliticalRoutes);
app.use('/api/esg', esgRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/spend', spendRoutes);
app.use('/api/comparison', comparisonRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/financial-distress', require('./routes/financialDistress')); app.use('/api/supply-chain-network-risk', require('./routes/supplyChainNetworkRisk')); app.use('/api/esg-controversy-monitor', require('./routes/esgControversyMonitor')); app.use('/api/supplier-consolidation-engine', require('./routes/supplierConsolidationEngine')); app.use('/api/risk-adjusted-pricing', require('./routes/riskAdjustedPricing')); app.use('/api/n-tier-supply-mapping', require('./routes/nTierSupplyMapping'));

// === Batch 08 Gaps & Frontend Mounts ===
app.use('/api/gap-no-predictive-bankruptcy-scoring', require('./routes/gapNoPredictiveBankruptcyScoring'));
app.use('/api/gap-no-supply-chain-network-n-tier-risk-analysis-ai', require('./routes/gapNoSupplyChainNetworkNTierRiskAnalysisAi'));
app.use('/api/gap-no-esg-controversy-news-scanner-ai', require('./routes/gapNoEsgControversyNewsScannerAi'));
app.use('/api/gap-no-integration-with-dun-bradstreet-or-financial-data', require('./routes/gapNoIntegrationWithDunBradstreetOrFinancialData'));
app.use('/api/gap-no-supplier-onboarding-workflow-with-automated-document-collection', require('./routes/gapNoSupplierOnboardingWorkflowWithAutomatedDocumentCollection'));
app.use('/api/gap-no-supplier-portal-for-self-service-compliance-updates', require('./routes/gapNoSupplierPortalForSelfServiceComplianceUpdates'));
app.use('/api/gap-no-third-party-risk-aggregation-feeds-pci-certifications', require('./routes/gapNoThirdPartyRiskAggregationFeedsPciCertifications'));
app.use('/api/gap-no-webhooks-for-alert-delivery', require('./routes/gapNoWebhooksForAlertDelivery'));
app.use('/api/gap-no-e-signature-workflow-for-contract-obligations', require('./routes/gapNoESignatureWorkflowForContractObligations'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
