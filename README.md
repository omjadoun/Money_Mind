## Money Mind

A modern personal finance dashboard built with React, Vite, Tailwind, and Supabase.

### Backend OCR Integration

The project includes a lightweight Node/Express OCR backend in `backend/index.js` that exposes `POST /ocr-upload` for receipt OCR using Tesseract.

1) Start the backend

```bash
cd backend && npm install && npm start
```

By default it runs on `http://localhost:5000`.

2) Configure frontend to reach backend (optional)

Create a `.env` in the project root with:

```
VITE_BACKEND_URL=http://localhost:5000
```

3) Start the frontend

```bash
npm install && npm run dev
```

4) Use the Dashboard → Upload Receipt button to send a PDF/JPG/PNG. On success, OCR text is parsed for an amount and a new expense transaction is added so KPIs/charts update immediately.
