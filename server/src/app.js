// server/src/app.js
/**
 * Express application setup
 * Main entry point for the server
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const passport = require('passport');

const { connectDB, ensureConnection } = require('./config/database');
const passportConfig = require('./config/passport');
const { errorHandler } = require('./middleware/errorHandler');
const { verifyJWT } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const emailRoutes = require('./routes/emails');
const accountRoutes = require('./routes/accounts');

// Initialize Express app
const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// Security and middleware setup
app.use(helmet()); // Security headers

// CORS configuration
// Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'https://emailaifront.vercel.app',
];

// Add custom origin from environment variable if provided
if (process.env.CORS_ORIGIN) {
  const customOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Database connection middleware for serverless environments
// Ensures DB connection is established before processing any API request
app.use('/api/', async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Unable to connect to database. Please try again later.',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/accounts', accountRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Start server
 */
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Start listening on all interfaces (0.0.0.0) for Docker/containerized environments
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`📧 Email Sorter API ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;