const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure that email is unique across users
  },
  image: {
    type: String, // Store the URL of the user's image
    default: '', // Default to an empty string if no image is provided
  },
  passwordHash: {
    type: String,
    required: true, // Password hash is required for authentication
  },
});

// Create the User model
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
