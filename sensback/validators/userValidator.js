const { body, check } = require('express-validator');
const { validationResult } = require('express-validator');


const User = require('../models/User'); // Import the User model

// Validation rules for user creation
const userValidator = [
  check('name')
    .isString()
    .withMessage('Name must be a string.')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name cannot be empty.'),

check('email')
    .isEmail()
    .withMessage('Invalid email address.')
    .normalizeEmail()
    .trim()
    .custom(async (value) => {
      const existingUser = await User.findOne({ email: value });
      if (existingUser) {
        throw new Error('Email is already in use.'); // Custom error message
      }
      return true; // If no existing user, return true
    }),

check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
    .trim(),
];

const loginValidator = [
  check('email')
      .isEmail()
      .withMessage('Invalid email address.')
      .normalizeEmail()
      .trim(),
  
  check('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.')
      .trim(),
  ];


// Function to check for validation errors
const validateResult = (req, res, next) => {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
       
        res.status(400).json({ errors: errors.array() });
    }
    
    next(); // Return null if there are no errors
  };


module.exports ={ userValidator,loginValidator, validateResult};
