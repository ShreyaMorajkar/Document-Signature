import express from 'express';
import auth from '../middleware/auth.js';
import Document from '../models/Document.js';

const router = express.Router();

// GET /api/audit/:docId - Get audit logs for document
router.get('/:docId', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.docId, sender: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document.auditLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
