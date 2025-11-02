// server/src/config/database.js
/**
 * Database configuration and connection management
 * Handles MongoDB connection setup and error handling
 */

const mongoose = require('mongoose');

// Disable buffering for serverless environments
// This ensures operations fail fast instead of timing out
mongoose.set('bufferCommands', false);

// Connection caching for serverless (Vercel, AWS Lambda, etc.)
let cachedConnection = null;

// Define Mongoose schemas
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  picture: String,
  // OAuth tokens stored securely
  googleAccessToken: {
    type: String,
    required: true,
  },
  googleRefreshToken: String,
  googleTokenExpiresAt: Date,
  // User preferences
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Email address of the connected account
  email: {
    type: String,
    required: true,
  },
  // Access token for this specific account
  accessToken: String,
  refreshToken: String,
  tokenExpiresAt: Date,
  // Account metadata
  isPrimary: {
    type: Boolean,
    default: false,
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'error'],
    default: 'pending',
  },
  lastSyncAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: '#3b82f6',
  },
  icon: {
    type: String,
    default: 'folder',
  },
  emailCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  // Gmail metadata
  gmailId: {
    type: String,
    required: true,
  },
  gmailThreadId: String,
  // Email content
  from: String,
  to: String,
  subject: String,
  body: String,
  snippet: String,
  // AI-generated content
  aiSummary: String,
  aiCategory: String,
  confidenceScore: Number,
  // Status tracking
  isArchived: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  isSpam: {
    type: Boolean,
    default: false,
  },
  // Unsubscribe tracking
  unsubscribeUrl: String,
  hasUnsubscribeLink: {
    type: Boolean,
    default: false,
  },
  unsubscribeAttempted: {
    type: Boolean,
    default: false,
  },
  // Timestamps
  receivedAt: Date,
  importedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create models
const User = mongoose.model('User', userSchema);
const Account = mongoose.model('Account', accountSchema);
const Category = mongoose.model('Category', categorySchema);
const Email = mongoose.model('Email', emailSchema);

/**
 * Connect to MongoDB with serverless support
 * Implements connection caching to reuse connections across invocations
 * @returns {Promise} MongoDB connection promise
 */
async function connectDB() {
  try {
    // If we have a cached connection and it's ready, reuse it
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('♻️  Reusing existing MongoDB connection');
      return cachedConnection;
    }

    // If connection is in progress, wait for it
    if (mongoose.connection.readyState === 2) {
      console.log('⏳ Waiting for pending MongoDB connection...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      return mongoose.connection;
    }

    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/email-sorter';

    // Configure connection options for serverless
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 connection
    };

    console.log('🔌 Establishing new MongoDB connection...');
    await mongoose.connect(dbUrl, options);

    cachedConnection = mongoose.connection;
    console.log('✅ MongoDB connected successfully');

    return cachedConnection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cachedConnection = null;
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise} Disconnect promise
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    cachedConnection = null;
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
    throw error;
  }
}

/**
 * Ensure database connection is established
 * This is critical for serverless environments where each invocation needs a connection
 * @returns {Promise} Resolves when connected
 */
async function ensureConnection() {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  return mongoose.connection;
}

module.exports = {
  connectDB,
  disconnectDB,
  ensureConnection,
  User,
  Account,
  Category,
  Email,
};