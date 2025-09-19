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

module.exports = {
  generateToken,
  generateResetToken,
  verifyResetToken
};