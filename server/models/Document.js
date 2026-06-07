import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  action: {
    type: String,
    required: true,
    enum: ['uploaded', 'sent', 'viewed', 'signed', 'declined'],
  },
  actor: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  details: {
    type: String,
  },
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'signed', 'declined'],
    default: 'draft',
  },
  originalPath: {
    type: String,
    required: true,
  },
  originalHash: {
    type: String,
  },
  signedPath: {
    type: String,
  },
  signedHash: {
    type: String,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientName: {
    type: String,
  },
  recipientEmail: {
    type: String,
  },
  signingToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  declineReason: {
    type: String,
  },
  auditLog: [auditLogSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
