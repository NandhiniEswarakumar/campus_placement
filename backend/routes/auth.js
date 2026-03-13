const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (student) => {
  return jwt.sign(
    { id: student._id, email: student.email, role: 'student' },
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
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('graduationYear').isInt().withMessage('Valid graduation year is required'),
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

      const { name, email, password, rollNumber, department, graduationYear, phone } = req.body;

      // Check if student already exists
      const existingStudent = await Student.findOne({
        $or: [{ email }, { rollNumber }],
      });

      if (existingStudent) {
        const field = existingStudent.email === email ? 'email' : 'roll number';
        return res.status(400).json({ message: `A student with this ${field} already exists.` });
      }

      // Create student
      const student = await Student.create({
        name,
        email,
        password,
        rollNumber,
        department,
        graduationYear,
        phone,
      });

      const token = generateToken(student);

      res.status(201).json({
        message: 'Registration successful',
        token,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          department: student.department,
          graduationYear: student.graduationYear,
          phone: student.phone,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
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

      const student = await Student.findOne({ email }).select('+password');

      if (!student) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await student.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = generateToken(student);

      res.json({
        message: 'Login successful',
        token,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          department: student.department,
          graduationYear: student.graduationYear,
          phone: student.phone,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// ==================== GET PROFILE (protected) ====================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        graduationYear: student.graduationYear,
        phone: student.phone,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
