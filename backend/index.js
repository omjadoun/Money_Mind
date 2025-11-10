import 'dotenv/config';
import express from "express";
import multer from "multer";
import cors from "cors";
import Tesseract from "tesseract.js";
import cron from "node-cron";
import dotenv from "dotenv";
import { checkBudgetAlerts, sendMonthlyReports } from "./services/notificationService.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Email notification routes
app.post("/api/notifications/check-budgets", async (req, res) => {
  try {
    await checkBudgetAlerts();
    res.json({ success: true, message: "Budget alerts checked" });
  } catch (error) {
    console.error("Error checking budgets:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/send-monthly-reports", async (req, res) => {
  try {
    await sendMonthlyReports();
    res.json({ success: true, message: "Monthly reports sent" });
  } catch (error) {
    console.error("Error sending monthly reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// Scheduled jobs
// Check budget alerts every 6 hours
cron.schedule("0 */6 * * *", async () => {
  console.log("⏰ Running scheduled budget alert check...");
  await checkBudgetAlerts();
});

// Send monthly reports on the 1st of each month at 9 AM
cron.schedule("0 9 1 * *", async () => {
  console.log("⏰ Running scheduled monthly report...");
  await sendMonthlyReports();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
  console.log("📧 Email notifications enabled");
  console.log("⏰ Scheduled jobs active:");
  console.log("   - Budget alerts: Every 6 hours");
  console.log("   - Monthly reports: 1st of each month at 9 AM");
});
