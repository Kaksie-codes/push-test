const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// Generate password reset token
const generateResetToken = () => {
  return jwt.sign({ purpose: 'password-reset' }, process.env.JWT_SECRET, {
    expiresIn: '1h' // Reset token expires in 1 hour
  });
};

// Verify password reset token
const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.purpose === 'password-reset';
  } catch (error) {
    return false;
  }
};

// Generate email verification token
const generateEmailVerificationToken = () => {
  return jwt.sign({ purpose: 'email-verification' }, process.env.JWT_SECRET, {
    expiresIn: '24h' // Verification token expires in 24 hours
  });
};

// Verify email verification token
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.purpose === 'email-verification';
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateToken,
  generateResetToken,
  verifyResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken
};