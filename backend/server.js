const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const newsletterRoutes = require('./routes/newsletter');
const articleRoutes = require('./routes/articles');
const categoryRoutes = require('./routes/categories');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for credentials / HTTP-only cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
if (typeof cookieParser === 'function') {
  app.use(cookieParser());
}

// Mount Express API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'London BigBen Express.js Backend Server is running smoothly!',
    timestamp: new Date(),
    port: PORT,
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 London BigBen Express.js Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Auth API:     http://localhost:${PORT}/api/auth/login`);
  console.log(`   Admin API:    http://localhost:${PORT}/api/admin/users`);
  console.log(`   Articles API: http://localhost:${PORT}/api/articles`);
  console.log(`====================================================`);
});
