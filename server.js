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

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/incomeRecords';

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true, // Enable TLS/SSL
    tlsAllowInvalidCertificates: true, // Allow self-signed certificates (if needed)
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Define schema and model
const incomeSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  date: String,
});
const IncomeRecord = mongoose.model('IncomeRecord', incomeSchema);

// API endpoints
app.post('/api/records', async (req, res) => {
  try {
    const { description, amount, date } = req.body;
    const record = new IncomeRecord({ description, amount, date });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ error: 'Failed to add record' });
  }
});

app.get('/api/records', async (req, res) => {
  try {
    const records = await IncomeRecord.find();
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await IncomeRecord.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
