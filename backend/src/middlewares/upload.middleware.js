const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.resolve('uploads/goal_evidence');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'text/plain',
  'text/csv'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|jpg|jpeg|png|webp|gif|svg|txt|csv)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed types: PDF, DOCX, XLSX, PPT, ZIP, TXT, CSV, Images.'), false);
  }
};

const policyUploadDir = path.resolve('uploads/hr_policies');
if (!fs.existsSync(policyUploadDir)) {
  fs.mkdirSync(policyUploadDir, { recursive: true });
}

const policyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, policyUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

const uploadEvidence = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
  fileFilter: fileFilter
}).array('attachments', 10);

const uploadPolicyDoc = multer({
  storage: policyStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max for policy PDF/DOCX
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.match(/\.(pdf|doc|docx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC/DOCX documents are allowed for company policies.'), false);
    }
  }
}).single('document');

module.exports = {
  uploadEvidence,
  uploadPolicyDoc,
  uploadDir,
  policyUploadDir
};
