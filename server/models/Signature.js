import mongoose from 'mongoose';

const signatureSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  page: {
    type: Number,
    required: true,
  },
  x: {
    type: Number,
    required: true, // Decimal representing % from left (0 to 1)
  },
  y: {
    type: Number,
    required: true, // Decimal representing % from top (0 to 1)
  },
  width: {
    type: Number,
    required: true, // Decimal representing % of page width
  },
  height: {
    type: Number,
    required: true, // Decimal representing % of page height
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'signed'],
    default: 'pending',
  },
  signatureImage: {
    type: String, // Base64 data URL
  },
  signedAt: {
    type: Date,
  },
});

const Signature = mongoose.model('Signature', signatureSchema);
export default Signature;
