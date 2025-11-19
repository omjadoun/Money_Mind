# 🚀 Money Mind Deployment Guide

## 📋 Project Structure
- **Frontend**: React + Vite + Tailwind
- **Backend**: Node.js + Express + OCR (Tesseract)
- **Database**: Supabase (PostgreSQL)
- **External Services**: Twilio (SMS/WhatsApp)

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)
**Best for**: Quick deployment, free tier, automatic HTTPS

#### Frontend Deployment
1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy Frontend**
```bash
vercel --prod
```

4. **Environment Variables** (Add in Vercel Dashboard)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend Deployment (Serverless Functions)
1. **Create `api/` folder structure**
2. **Move backend code to `api/`**
3. **Update `vercel.json`**

### Option 2: Railway
**Best for**: Full-stack deployment, supports Node.js backend

1. **Connect GitHub Repository**
2. **Set Environment Variables**
3. **Auto-deploy on push**

### Option 3: Netlify + Render
**Best for**: Separated frontend/backend deployment

- **Frontend**: Netlify
- **Backend**: Render

## 🔧 Environment Variables Setup

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=https://your-backend-url.com
```

### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## 🛠️ Pre-deployment Checklist

### 1. Update CORS Settings
Add your production URL to Supabase CORS:
```
https://your-domain.vercel.app
```

### 2. Build Optimization
```bash
# Frontend
npm run build

# Backend (if needed)
cd backend && npm install --production
```

### 3. Test Production Build
```bash
npm run preview
```

## 📱 Deployment Steps

### Vercel Deployment (Step-by-Step)

1. **Prepare Repository**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Deploy to Vercel**
```bash
vercel
```

3. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Add all environment variables
   - Redeploy

4. **Test Deployment**
   - Visit your Vercel URL
   - Test login functionality
   - Test OCR upload feature

### Railway Deployment

1. **Connect GitHub**
   - Go to railway.app
   - Click "Deploy from GitHub"
   - Select your repository

2. **Configure Service**
   - Set build command: `npm run build`
   - Set start command: `npm start`
   - Add environment variables

3. **Deploy**
   - Railway will auto-deploy
   - Get your production URL

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use environment-specific keys
- Rotate keys regularly

### 2. CORS Configuration
```sql
-- Add production URLs to Supabase CORS
UPDATE config 
SET value = '["https://your-domain.vercel.app", "http://localhost:5175"]' 
WHERE key = 'cors_origins';
```

### 3. API Security
- Use HTTPS only
- Implement rate limiting
- Validate all inputs

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check Supabase CORS settings
   - Verify frontend URL matches

2. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly

3. **Build Failures**
   - Check for missing dependencies
   - Verify build commands

4. **Backend Connection**
   - Verify backend URL is accessible
   - Check API endpoints

### Debug Commands

```bash
# Check build
npm run build

# Preview production
npm run preview

# Test backend locally
cd backend && npm start

# Check environment variables
vercel env ls
```

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics
- Performance monitoring
- Error tracking

### Supabase Dashboard
- Database monitoring
- API usage tracking
- Performance metrics

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🎯 Post-Deployment

1. **Test All Features**
   - User authentication
   - Budget management
   - Transaction tracking
   - OCR receipt upload

2. **Monitor Performance**
   - Page load times
   - API response times
   - Error rates

3. **Update Documentation**
   - Update README with production URL
   - Document deployment process

## 📞 Support

For deployment issues:
- Check Vercel/Railway documentation
- Review Supabase dashboard
- Check GitHub Actions logs
- Contact hosting provider support

---

**🎉 Congratulations! Your Money Mind app is now deployed!**
