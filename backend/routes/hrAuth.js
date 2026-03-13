const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const HR = require('../models/HR');

const router = express.Router();

const generateToken = (hr) => {
  return jwt.sign(
    { id: hr._id, email: hr.email, role: 'hr' },
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
    body('company').trim().notEmpty().withMessage('Company name is required'),
    body('designation').trim().notEmpty().withMessage('Designation is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
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

      const { name, email, password, company, designation, phone } = req.body;

      const existing = await HR.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'An HR account with this email already exists.' });
      }

      const hr = await HR.create({ name, email, password, company, designation, phone });

      const token = generateToken(hr);

      res.status(201).json({
        message: 'HR registration successful',
        token,
        hr: {
          id: hr._id,
          name: hr.name,
          email: hr.email,
          company: hr.company,
          designation: hr.designation,
          phone: hr.phone,
        },
      });
    } catch (error) {
      console.error('HR Signup error:', error);
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

      const hr = await HR.findOne({ email }).select('+password');
      if (!hr) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await hr.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = generateToken(hr);

      res.json({
        message: 'Login successful',
        token,
        hr: {
          id: hr._id,
          name: hr.name,
          email: hr.email,
          company: hr.company,
          designation: hr.designation,
          phone: hr.phone,
        },
      });
    } catch (error) {
      console.error('HR Login error:', error);
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
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hr = await HR.findById(decoded.id);
    if (!hr) {
      return res.status(404).json({ message: 'HR user not found.' });
    }

    res.json({
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        company: hr.company,
        designation: hr.designation,
        phone: hr.phone,
      },
    });
  } catch (error) {
    console.error('HR Profile error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
