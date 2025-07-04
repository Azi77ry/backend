const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Enhanced Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev')); // More concise logging

// Enhanced Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased limit for better UX
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// MongoDB connection with enhanced options
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/incomeRecords';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Force IPv4
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Enhanced Schema with validation and timestamps
const incomeSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [100, 'Description cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  category: {
    type: String,
    enum: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other'],
    default: 'Other'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better performance
incomeSchema.index({ date: 1 });
incomeSchema.index({ category: 1 });

const IncomeRecord = mongoose.model('IncomeRecord', incomeSchema);

// Enhanced API endpoints with error handling
const router = express.Router();

// Create record
router.post('/records', async (req, res, next) => {
  try {
    const { description, amount, date, category } = req.body;
    const record = await IncomeRecord.create({ 
      description, 
      amount, 
      date: date || new Date(),
      category
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        record
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get all records with filtering and sorting
router.get('/records', async (req, res, next) => {
  try {
    // 1) Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 2) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = IncomeRecord.find(JSON.parse(queryStr));

    // 3) Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-date'); // Default: newest first
    }

    // 4) Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const records = await query;
    const total = await IncomeRecord.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: 'success',
      results: records.length,
      total,
      data: {
        records
      }
    });
  } catch (err) {
    next(err);
  }
});

// Delete record
router.delete('/records/:id', async (req, res, next) => {
  try {
    const record = await IncomeRecord.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        status: 'fail',
        message: 'No record found with that ID'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
});

// Mount router
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', err => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => console.log('💥 Process terminated'));
});