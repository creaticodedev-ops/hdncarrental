import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter,
});

export const handleMulterError = (err, _req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image must be under 5MB' });
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ success: false, message: err.message });
  }
  return res.status(400).json({ success: false, message: 'File upload failed' });
};

export const cleanupUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
};

export default upload;
