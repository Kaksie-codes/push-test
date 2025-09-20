/**
 * Avatar generation utilities
 */

// Generate a simple SVG avatar based on user initials and a color
const generateSVGAvatar = (displayName, email) => {
  // Get initials (first letter of first and last name, or first 2 letters)
  const initials = getInitials(displayName);
  
  // Generate a consistent color based on email
  const color = generateColorFromString(email);
  
  // Create SVG avatar
  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
            text-anchor="middle" dominant-baseline="central" fill="white">
        ${initials}
      </text>
    </svg>
  `;
  
  // Convert to base64 data URL
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

// Extract initials from display name
const getInitials = (displayName) => {
  if (!displayName) return 'U';
  
  const names = displayName.trim().split(' ');
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  } else {
    return displayName.substring(0, 2).toUpperCase();
  }
};

// Generate a consistent color from a string
const generateColorFromString = (str) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate Gravatar URL as fallback
const generateGravatarUrl = (email, size = 100) => {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`;
};

module.exports = {
  generateSVGAvatar,
  generateGravatarUrl,
  getInitials,
  generateColorFromString
};