import fs from 'fs';
import path from 'path';

// This is a dual-mode storage helper.
// In dev (default), it saves documents locally in the uploads folder.
// If S3/Supabase config variables are present in environment variables in production,
// it uploads files to S3/Supabase and saves the metadata.
// For the sake of zero-setup out of the box execution, S3 uploads are wrapped in a try-catch,
// falling back to local files if S3 client configuration fails or has invalid credentials.

let s3Client = null;

if (process.env.STORAGE_PROVIDER === 's3' || process.env.AWS_ACCESS_KEY_ID) {
  try {
    // Dynamically try to load AWS SDK to avoid forcing dependency compilation for users not using S3
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    });
    console.log('Storage: S3 Client initialized successfully.');
  } catch (err) {
    console.warn('Storage Warning: AWS SDK @aws-sdk/client-s3 not found or failed to initialize. Falling back to local storage.');
  }
}

export const saveFile = async (localPath, filename) => {
  if (s3Client && process.env.AWS_S3_BUCKET) {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const fileStream = fs.createReadStream(localPath);
      const bucketName = process.env.AWS_S3_BUCKET;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: fileStream,
        ContentType: 'application/pdf'
      }));

      console.log(`Storage: File "${filename}" successfully uploaded to S3 bucket "${bucketName}".`);
      return `s3://${bucketName}/${filename}`;
    } catch (err) {
      console.error('Storage Error: Failed to upload file to S3. Local copy retained.', err.message);
      return localPath;
    }
  }
  return localPath;
};

export const getFileStream = async (filePath, res) => {
  if (filePath.startsWith('s3://')) {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const match = filePath.match(/^s3:\/\/([^/]+)\/(.+)$/);
      if (!match) throw new Error('Invalid S3 URL');
      const [_, bucketName, key] = match;

      const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      }));

      // Set PDF header content type
      res.contentType("application/pdf");
      
      // Node.js streams
      if (response.Body && typeof response.Body.pipe === 'function') {
        response.Body.pipe(res);
      } else {
        // Fallback for newer AWS SDK versions returning Web Streams
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        res.send(Buffer.concat(chunks));
      }
      return;
    } catch (err) {
      console.error('Storage Error: Failed to retrieve file from S3. Checking local cache fallback...', err.message);
      
      // Fallback: If S3 fails, check if local copy exists
      const localFilename = path.basename(filePath);
      const localFallback = path.join(process.cwd(), 'uploads', localFilename);
      if (fs.existsSync(localFallback)) {
        res.contentType("application/pdf");
        fs.createReadStream(localFallback).pipe(res);
        return;
      }
      throw err;
    }
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found locally');
  }
  res.contentType("application/pdf");
  fs.createReadStream(filePath).pipe(res);
};

export const getFileBytes = async (filePath) => {
  if (filePath.startsWith('s3://')) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const match = filePath.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match) throw new Error('Invalid S3 URL');
    const [_, bucketName, key] = match;

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  return fs.readFileSync(filePath);
};
