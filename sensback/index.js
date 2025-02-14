const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/users', userRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err); // Log the error for debugging
  
    // Set the response status and send the error message
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });
  
  // Not Found Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Not Found',
    });
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
