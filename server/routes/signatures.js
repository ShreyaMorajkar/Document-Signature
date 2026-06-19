import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, degrees } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

// Helper to translate relative visual coordinates into rotated physical PDF coordinates
function getRotatedDrawOptions(page, field) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const rotationAngle = (page.getRotation().angle || 0) % 360;

  let vPageW = pageWidth;
  let vPageH = pageHeight;
  if (rotationAngle === 90 || rotationAngle === 270) {
    vPageW = pageHeight;
    vPageH = pageWidth;
  }

  const vLeft = field.x * vPageW;
  const vTop = field.y * vPageH;
  const vWidth = field.width * vPageW;
  const vHeight = field.height * vPageH;

  let pdfX, pdfY, pdfW, pdfH, imageRotate;

  if (rotationAngle === 90) {
    pdfX = vTop;
    pdfY = vLeft + vWidth;
    pdfW = vHeight;
    pdfH = vWidth;
    imageRotate = degrees(270);
  } else if (rotationAngle === 180) {
    pdfX = pageWidth - vLeft;
    pdfY = pageHeight - vTop;
    pdfW = vWidth;
    pdfH = vHeight;
    imageRotate = degrees(180);
  } else if (rotationAngle === 270) {
    pdfX = pageWidth - vTop;
    pdfY = pageHeight - vLeft - vWidth;
    pdfW = vHeight;
    pdfH = vWidth;
    imageRotate = degrees(90);
  } else {
    // 0 degrees
    pdfX = vLeft;
    pdfY = vPageH - vTop - vHeight;
    pdfW = vWidth;
    pdfH = vHeight;
    imageRotate = degrees(0);
  }

  return {
    x: pdfX,
    y: pdfY,
    width: pdfW,
    height: pdfH,
    rotate: imageRotate
  };
}
import auth from '../middleware/auth.js';
import Signature from '../models/Signature.js';
import Document from '../models/Document.js';
import { saveFile, getFileBytes } from '../utils/storage.js';

const router = express.Router();

// 1. POST /api/signatures - Save signature position
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, fields } = req.body;
    if (!documentId || !fields || fields.length === 0) {
      return res.status(400).json({ message: 'Missing documentId or fields' });
    }

    const document = await Document.findOne({ _id: documentId, sender: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const signatureFields = fields.map((f) => ({
      document: documentId,
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      status: 'pending',
    }));

    await Signature.deleteMany({ document: documentId });
    const savedFields = await Signature.insertMany(signatureFields);

    res.status(201).json(savedFields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/signatures/:id - Get signatures for document
router.get('/:id', async (req, res) => {
  try {
    const fields = await Signature.find({ document: req.params.id });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/signatures/finalize - Embed signature into PDF
router.post('/finalize', async (req, res) => {
  try {
    const { documentId, signatures } = req.body; // signatures: array of { fieldId, signatureImage }
    if (!documentId || !signatures || signatures.length === 0) {
      return res.status(400).json({ message: 'Missing documentId or signatures' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.status === 'signed') {
      return res.status(400).json({ message: 'Document is already signed' });
    }

    const originalPdfBytes = await getFileBytes(document.originalPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const field = await Signature.findById(sig.fieldId);
      if (!field || field.document.toString() !== document._id.toString()) {
        continue;
      }

      const base64Data = sig.signatureImage.replace(/^data:image\/png;base64,/, "");
      const imageBytes = Buffer.from(base64Data, 'base64');
      const signatureImage = await pdfDoc.embedPng(imageBytes);

      const page = pages[field.page];
      if (!page) continue;

      const drawOptions = getRotatedDrawOptions(page, field);

      page.drawImage(signatureImage, drawOptions);

      field.status = 'signed';
      field.signatureImage = sig.signatureImage;
      field.signedAt = new Date();
      await field.save();
    }

    const signedPdfBytes = await pdfDoc.save();
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filename = `signed-${uuidv4()}.pdf`;
    const signedPath = path.join(uploadsDir, filename);

    fs.writeFileSync(signedPath, signedPdfBytes);

    const storedSignedPath = await saveFile(signedPath, filename);
    const signedHash = crypto.createHash('sha256').update(signedPdfBytes).digest('hex');

    document.status = 'signed';
    document.signedPath = storedSignedPath;
    document.signedHash = signedHash;
    document.auditLog.push({
      action: 'signed',
      actor: document.recipientEmail || 'Recipient',
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

export default router;
