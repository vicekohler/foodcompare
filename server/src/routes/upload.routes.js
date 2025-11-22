// server/src/routes/upload.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middlewares/authJwt.js"; // adapta el import

const router = Router();

const uploadsRoot = path.join(process.cwd(), "uploads");
const avatarsDir = path.join(uploadsRoot, "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const base = `u${req.userId || "anon"}_${Date.now()}`;
    cb(null, base + ext.toLowerCase());
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Solo se permiten imágenes"), false);
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});

router.post(
  "/avatar",
  verifyToken,
  upload.single("avatar"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, error: "No se recibió ningún archivo" });
    }

    const baseUrl = process.env.APP_URL || "http://localhost:4000";
    const url = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    return res.json({ ok: true, url });
  }
);

export default router;
