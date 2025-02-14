const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { userValidator, validateResult, loginValidator } = require('../validators/userValidator');
const { addUser, login } = require('../controller/userController');
const router = express.Router();

// Create a new user
router.post('/', userValidator, validateResult, addUser )


// login user
router.post('/login',loginValidator, validateResult, login)

// Other user routes (GET, PUT, DELETE) remain unchanged...

module.exports = router;
