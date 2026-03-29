import multer from "multer";
import path from "path";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",      // .jpg / .jpeg
  "image/jpg",       // some browsers send this
  "image/bmp",
  "image/tiff",
]);

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // Preserve original name but sanitise spaces
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, safe);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type "${ext}". Please upload a PNG, JPG, BMP, or TIFF floor plan image.`
      ),
      false
    );
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});