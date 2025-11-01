// server/src/middleware/errorHandler.js
/**
 * Error handling middleware
 * Catches and formats all application errors
 */

/**
 * Express error handling middleware
 * Should be the last middleware in the app
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
  
    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let details = {};
  
    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation error';
      details = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      statusCode = 400;
      message = 'Database error';
    } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else if (err.statusCode) {
      statusCode = err.statusCode;
      message = err.message;
    } else if (err.message) {
      message = err.message;
    }
  
    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV === 'development' && { details: err.toString() }),
    });
  }
  
  module.exports = { errorHandler };