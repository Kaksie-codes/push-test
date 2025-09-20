# Deployment Checklist

Use this checklist to ensure successful deployment to production.

## Pre-Deployment Checklist

### 📋 Environment Setup
- [ ] MongoDB Atlas database created and configured
- [ ] Firebase project set up with FCM enabled
- [ ] Cloudinary account configured (if using image uploads)
- [ ] Email service configured (Gmail App Password recommended)

### 🔧 Backend (Render) Preparation
- [ ] Backend code tested locally
- [ ] All environment variables documented
- [ ] Database connection tested
- [ ] Email service tested (password reset functionality)
- [ ] Push notification service tested

### 🌐 Frontend (Vercel) Preparation
- [ ] Frontend builds successfully locally (`npm run build`)
- [ ] All pages accessible and functional
- [ ] API calls work with local backend
- [ ] Responsive design tested on multiple devices

## Deployment Steps

### Step 1: Deploy Backend to Render
- [ ] Create new Web Service on Render
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Configure build command: `npm install`
- [ ] Configure start command: `npm start`
- [ ] Add all required environment variables
- [ ] Deploy and verify service starts successfully
- [ ] Test health endpoint: `https://your-app.onrender.com/api/health`

### Step 2: Deploy Frontend to Vercel
- [ ] Create new project on Vercel
- [ ] Connect GitHub repository  
- [ ] Set root directory to `frontend`
- [ ] Configure environment variables:
  - `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`
- [ ] Deploy and verify build succeeds
- [ ] Test frontend loads correctly

### Step 3: Cross-Service Configuration
- [ ] Update backend `FRONTEND_URL` environment variable with Vercel URL
- [ ] Redeploy backend service
- [ ] Test CORS - ensure frontend can make API calls to backend
- [ ] Verify authentication flow works end-to-end

## Post-Deployment Testing

### 🧪 Core Features Testing
- [ ] User registration works
- [ ] Email verification works (check spam folder)
- [ ] User login works
- [ ] Password reset flow works
- [ ] User profile pages load
- [ ] Feed page displays correctly
- [ ] Post creation works
- [ ] Image uploads work (if configured)
- [ ] Push notifications work (if configured)

### 🔐 Security Testing
- [ ] HTTPS enabled on both services
- [ ] CORS properly configured
- [ ] Authentication tokens secure
- [ ] Environment variables not exposed in frontend

### 📱 Performance Testing
- [ ] Page load times acceptable
- [ ] API response times reasonable
- [ ] Mobile responsiveness works
- [ ] Images load properly

## Troubleshooting Common Issues

### Backend Issues
- [ ] Check Render service logs
- [ ] Verify environment variables are set
- [ ] Test database connection
- [ ] Check API endpoint accessibility

### Frontend Issues
- [ ] Check Vercel function logs
- [ ] Verify build completed successfully
- [ ] Test API calls in browser network tab
- [ ] Check environment variables in browser

### Integration Issues
- [ ] Verify CORS configuration
- [ ] Check API URL endpoints
- [ ] Test authentication flow
- [ ] Verify cookie settings

## Final Verification

- [ ] All features work as expected
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Performance is acceptable
- [ ] Security best practices followed

## 🎉 Go Live!

Once all checks pass:
- [ ] Share live URLs with team/stakeholders
- [ ] Update documentation with live URLs
- [ ] Set up monitoring/alerts (optional)
- [ ] Plan for future updates and maintenance

---

**Live URLs:**
- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.onrender.com
- Health Check: https://your-backend.onrender.com/api/health