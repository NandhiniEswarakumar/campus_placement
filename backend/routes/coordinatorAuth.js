const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Coordinator = require('../models/Coordinator');

const router = express.Router();

const generateToken = (coordinator) => {
  return jwt.sign(
    { id: coordinator._id, email: coordinator.email, role: 'coordinator' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ==================== SIGNUP ====================
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('college').trim().notEmpty().withMessage('College name is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: errors.array()[0].msg,
          errors: errors.array(),
        });
      }

      const { name, email, password, college, department } = req.body;

      const existing = await Coordinator.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'A coordinator account with this email already exists.' });
      }

      const coordinator = await Coordinator.create({ name, email, password, college, department });

      const token = generateToken(coordinator);

      res.status(201).json({
        message: 'Coordinator registration successful',
        token,
        coordinator: {
          id: coordinator._id,
          name: coordinator.name,
          email: coordinator.email,
          college: coordinator.college,
          department: coordinator.department,
        },
      });
    } catch (error) {
      console.error('Coordinator Signup error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// ==================== LOGIN ====================
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: errors.array()[0].msg,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      const coordinator = await Coordinator.findOne({ email }).select('+password');
      if (!coordinator) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await coordinator.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = generateToken(coordinator);

      res.json({
        message: 'Login successful',
        token,
        coordinator: {
          id: coordinator._id,
          name: coordinator.name,
          email: coordinator.email,
          college: coordinator.college,
          department: coordinator.department,
        },
      });
    } catch (error) {
      console.error('Coordinator Login error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// ==================== GET PROFILE (protected) ====================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const coordinator = await Coordinator.findById(decoded.id);
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found.' });
    }

    res.json({
      coordinator: {
        id: coordinator._id,
        name: coordinator.name,
        email: coordinator.email,
        college: coordinator.college,
        department: coordinator.department,
      },
    });
  } catch (error) {
    console.error('Coordinator Profile error:', error);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

module.exports = router;
