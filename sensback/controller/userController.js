const User = require("../models/User");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

const addUser= async (req, res) => {
    const { name, email, image, password } = req.body; // Assume password is sent in the body
    console.log(name)
    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10); // 10 is the salt rounds
  
      // Create a new user instance
      const user = new User({
        name,
        email,
        image,
        passwordHash,
      });
  
      // Save the user to the database
      await user.save();
      res.status(201).json(user);
    } catch (error) {
        
      res.status(400).json({ message: error.message });
    }
  };


  // Login Route
const login =async (req, res, next) => {
    const { email, password } = req.body;
  
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }
  
      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }
  
     
      // Inside your login route after successful password verification
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
            name: user.name,
            email: user.email,
            image: user.image,
        },
        });
    } catch (error) {
        console.log(error)
     res.status(500).json("Internal server erorors")
    }
  }
  

  module.exports ={
    addUser,
    login
  }