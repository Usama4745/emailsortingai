// server/src/config/database.js
/**
 * Database configuration and connection management
 * Handles MongoDB connection setup and error handling
 */

const mongoose = require('mongoose');

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
 * Connect to MongoDB
 * @returns {Promise} MongoDB connection promise
 */
async function connectDB() {
  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/email-sorter';
    await mongoose.connect(dbUrl);
    console.log('✅ MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
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
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
    throw error;
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  User,
  Account,
  Category,
  Email,
};