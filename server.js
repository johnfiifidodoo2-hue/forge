require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const ideaTankRoutes = require('./routes/ideaTank');
const resourceRoutes = require('./routes/resources');
const bookingRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Core middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

// Rate limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/auth', authLimiter);

// --- Static frontend assets ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/ideatank', ideaTankRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'forge-api' });
});

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// --- Frontend fallback ---
// Any non-API route serves the single-page dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Central error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🔨 Forge server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

