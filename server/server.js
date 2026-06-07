import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.js';
import docRoutes from './routes/docs.js';
import signatureRoutes from './routes/signatures.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

// Enforce production security boundaries
if (process.env.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is required in production mode!');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'doc_sign_jwt_super_secret_key_123456') {
    console.error('FATAL ERROR: A secure, custom JWT_SECRET is required in production mode!');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Support base64 canvas signature upload limits
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doc_sign';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB database successfully'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    console.error('Make sure you have started your local MongoDB service (mongod).');
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/audit', auditRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Document Signature API is active.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
