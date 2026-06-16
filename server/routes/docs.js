import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import auth from '../middleware/auth.js';
import Document from '../models/Document.js';
import Signature from '../models/Signature.js';
import { saveFile, getFileStream, getFileBytes } from '../utils/storage.js';

const router = express.Router();

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
  },
});

// 1. Upload Document (Protected)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const originalHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const storedPath = await saveFile(req.file.path, req.file.filename);

    const newDoc = new Document({
      title: req.body.title || req.file.originalname,
      originalPath: storedPath,
      originalHash,
      sender: req.user.id,
      status: 'draft',
      auditLog: [
        {
          action: 'uploaded',
          actor: req.user.email,
          ip: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'],
          details: `Original PDF uploaded to server. SHA-256 Checksum: ${originalHash}`,
        },
      ],
    });

    const savedDoc = await Document.create(newDoc);
    res.status(201).json(savedDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get All Documents for Logged-in User (Protected)
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({ sender: req.user.id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Document by ID (Protected)
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, sender: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Send Document / Define Signature Layout (Protected)
router.post('/send', auth, async (req, res) => {
  try {
    const { documentId, recipientName, recipientEmail, fields } = req.body;

    if (!documentId || !recipientName || !recipientEmail || !fields || fields.length === 0) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const document = await Document.findOne({ _id: documentId, sender: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Save fields in Signatures collection
    const signatureFields = fields.map(f => ({
      document: documentId,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      status: 'pending',
    }));

    await Signature.deleteMany({ document: documentId }); // Clear old placeholders
    await Signature.insertMany(signatureFields);

    const token = uuidv4();
    document.status = 'sent';
    document.recipientName = recipientName;
    document.recipientEmail = recipientEmail;
    document.signingToken = token;
    document.auditLog.push({
      action: 'sent',
      actor: req.user.email,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      details: `Document sent to recipient ${recipientName} (${recipientEmail}).`,
    });

    await document.save();

    // Mock Nodemailer email console simulation
    console.log(`
============================================================
📧 MOCK NODEMAILER TRANSCEIVER
============================================================
To:      ${recipientEmail} (${recipientName})
From:    SignFlow Trust Services <no-reply@signflow.domain>
Subject: Action Required: Signature Request for "${document.title}"

Hello ${recipientName},

${req.user.name} (${req.user.email}) has requested your signature on "${document.title}".

Please click the secure, audited link below to review, sign, or decline this agreement:
${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${token}

Auditing Notice: This transmission operates under token-based access. All views, signatures, or rejections are cryptographically tracked with timestamps, IP address mappings, and browser headers.
============================================================
`);

    res.json({
      message: 'Document sent successfully',
      signingLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${token}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Public: Get Document & Fields by Token (Recipient Flow)
router.get('/sign/:token', async (req, res) => {
  try {
    const document = await Document.findOne({ signingToken: req.params.token });
    if (!document) {
      return res.status(404).json({ message: 'Invalid or expired signing link' });
    }

    if (document.status === 'signed') {
      return res.status(400).json({ message: 'This document has already been signed.', document });
    }

    const fields = await Signature.find({ document: document._id });

    // Add viewed audit trail once (per IP/session or just on GET)
    document.auditLog.push({
      action: 'viewed',
      actor: document.recipientEmail,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      details: 'Recipient opened the signature portal.',
    });
    await document.save();

    res.json({
      document: {
        id: document._id,
        title: document.title,
        recipientName: document.recipientName,
        recipientEmail: document.recipientEmail,
        status: document.status,
      },
      fields,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Public: Process Recipient Signature & Finalize PDF (Recipient Flow)
router.post('/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { signatures } = req.body; // Array of { fieldId, signatureImage (base64 PNG) }

    if (!signatures || signatures.length === 0) {
      return res.status(400).json({ message: 'No signature data provided' });
    }

    const document = await Document.findOne({ signingToken: token });
    if (!document) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    if (document.status === 'signed') {
      return res.status(400).json({ message: 'This document is already signed' });
    }

    // Load PDF bytes
    const originalPdfBytes = await getFileBytes(document.originalPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    // Map signatures and write to pdf
    for (const sig of signatures) {
      const field = await Signature.findById(sig.fieldId);
      if (!field || field.document.toString() !== document._id.toString()) {
        continue;
      }

      // Convert base64 data url to bytes
      const base64Data = sig.signatureImage.replace(/^data:image\/png;base64,/, "");
      const imageBytes = Buffer.from(base64Data, 'base64');
      const signatureImage = await pdfDoc.embedPng(imageBytes);

      // Get page sizes
      const pageIndex = field.page;
      const page = pages[pageIndex];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert relative coordinate percentages to pdf-lib (bottom-left origin)
      const absX = field.x * pageWidth;
      const absY = (1 - field.y - field.height) * pageHeight;
      const absW = field.width * pageWidth;
      const absH = field.height * pageHeight;

      // Draw the PNG onto the page
      page.drawImage(signatureImage, {
        x: absX,
        y: absY,
        width: absW,
        height: absH,
      });

      // Update individual field
      field.status = 'signed';
      field.signatureImage = sig.signatureImage;
      field.signedAt = new Date();
      await field.save();
    }

    const signedPdfBytes = await pdfDoc.save();
    const filename = `signed-${uuidv4()}.pdf`;
    const signedPath = path.join(uploadsDir, filename);

    fs.writeFileSync(signedPath, signedPdfBytes);

    const storedSignedPath = await saveFile(signedPath, filename);
    const signedHash = crypto.createHash('sha256').update(signedPdfBytes).digest('hex');

    // Update Document state
    document.status = 'signed';
    document.signedPath = storedSignedPath;
    document.signedHash = signedHash;
    document.auditLog.push({
      action: 'signed',
      actor: document.recipientEmail,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      details: `Recipient completed signing all fields. Signed document generated. SHA-256 Checksum: ${signedHash}`,
    });

    await document.save();

    res.json({
      message: 'Document signed successfully',
      document,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Public: Decline Document
router.post('/decline/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const document = await Document.findOne({ signingToken: token });
    if (!document) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    document.status = 'declined';
    document.declineReason = reason || 'No reason provided';
    document.auditLog.push({
      action: 'declined',
      actor: document.recipientEmail,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      details: `Document declined by recipient. Reason: ${document.declineReason}`,
    });

    await document.save();

    res.json({
      message: 'Document declined successfully',
      document,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Public Document Verification Audit Log View
router.get('/verify/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('sender', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Downloads
// Download Original (Protected)
router.get('/download/original/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, sender: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.title)}"`);
    await getFileStream(document.originalPath, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download Signed (Public)
router.get('/download/signed/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || !document.signedPath) {
      return res.status(404).json({ message: 'Signed document not found' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="Signed-${encodeURIComponent(document.title)}"`);
    await getFileStream(document.signedPath, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve Original PDFs statically (Protected / only PDF.js uses it)
// We will serve static files via custom auth to protect uploads
router.get('/view/:id', async (req, res) => {
  try {
    // Both sender and signer should see original. Let's make it look up token or ID
    const { id } = req.params;
    const { token } = req.query;

    let doc;
    if (token) {
      // Recipient/Signer flow: validated via signing token
      doc = await Document.findOne({ _id: id, signingToken: token });
    } else {
      // Sender/Owner flow: require JWT authentication (via header or query param jwt)
      const authHeader = req.headers.authorization;
      let jwtToken = req.query.jwt;
      
      if (!jwtToken && authHeader && authHeader.startsWith('Bearer ')) {
        jwtToken = authHeader.split(' ')[1];
      }

      if (!jwtToken) {
        return res.status(401).json({ message: 'Authentication token required' });
      }

      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'doc_sign_jwt_super_secret_key_123456');
      doc = await Document.findOne({ _id: id, sender: decoded.id });
    }

    if (!doc) {
      return res.status(404).json({ message: 'Access denied' });
    }

    await getFileStream(doc.originalPath, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
