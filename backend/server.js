require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const sequelize = require('./src/config/db');
require('./src/models'); // registers all models + associations

const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const organizationRoutes = require('./src/routes/organizationRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const allocationRoutes = require('./src/routes/allocationRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const maintenanceRoutes = require('./src/routes/maintenanceRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const activityLogRoutes = require('./src/routes/activityLogRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'AssetFlow API is running.' }));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', organizationRoutes); // /api/departments, /api/categories, /api/employees
app.use('/api/assets', assetRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenance-requests', maintenanceRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    // For hackathon speed: sync schema automatically. Swap for migrations in production.
    await sequelize.sync();
    console.log('Database connected & synced.');

    app.listen(PORT, () => {
      console.log(`AssetFlow API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
