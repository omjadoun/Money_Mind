import express from "express";
import multer from "multer";
import cors from "cors";
import Tesseract from "tesseract.js";

const app = express();
app.use(cors());

// multer setup for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"]; // OCR expects images
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type. Please upload a JPG or PNG image."));
    }
    cb(null, true);
  },
});

app.get("/", (req, res) => {
  res.send("Backend working ✅");
});

// OCR route
app.post("/ocr-upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received. Field name must be 'receipt' and type JPG/PNG." });
    }
    const { path, originalname, mimetype, size } = req.file;

    console.log("Processing:", { path, originalname, mimetype, size });

    // run OCR
    const result = await Tesseract.recognize(path, "eng");

    res.json({
      text: result.data.text,
      filename: originalname,
      mimetype,
      size,
    });
  } catch (error) {
    console.error("OCR error:", error);
    const message = error?.message || "OCR failed";
    res.status(500).json({ error: message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
