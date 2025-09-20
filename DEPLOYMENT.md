# Deployment Guide

This guide explains how to deploy the Social App to production using Vercel (frontend) and Render (backend).

## 🚀 Quick Deployment Checklist

### Backend Deployment on Render

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Create New Web Service**:
   - Connect your GitHub repository
   - Select the `backend` folder as the root directory
   - Choose Node.js environment
   - Set build command: `npm install`
   - Set start command: `npm start`

3. **Environment Variables** (Set in Render Dashboard):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ```

4. **Deploy**: Click "Deploy" and wait for deployment to complete

### Frontend Deployment on Vercel

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)

2. **Import Project**:
   - Connect your GitHub repository
   - Select the `frontend` folder as the root directory
   - Framework preset should auto-detect as "Next.js"

3. **Environment Variables** (Set in Vercel Dashboard):
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com/api
   ```

4. **Deploy**: Click "Deploy" and wait for deployment to complete

### Post-Deployment Setup

1. **Update Backend FRONTEND_URL**:
   - Copy your Vercel deployment URL
   - Update the `FRONTEND_URL` environment variable in Render
   - Redeploy the backend service

2. **Update Frontend API URL**:
   - Copy your Render backend URL
   - Update the `NEXT_PUBLIC_API_URL` environment variable in Vercel
   - Redeploy the frontend

3. **Test the Application**:
   - Visit your Vercel frontend URL
   - Test user registration, login, and core features
   - Check that API calls are working properly

## 🔧 Configuration Files

### Frontend Configuration (`frontend/vercel.json`)
- Handles Next.js routing for Vercel
- Configures API rewrites to backend
- Sets security headers
- Optimizes build settings

### Backend Configuration (`backend/render.yaml`)
- Defines Render service configuration
- Sets build and start commands
- Configures environment variables

## 📋 Environment Variables Reference

### Required Backend Variables
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `FRONTEND_URL`: Your Vercel frontend URL

### Required Frontend Variables
- `NEXT_PUBLIC_API_URL`: Your Render backend API URL

### Optional Variables
- Email service configuration for password reset
- Cloudinary for image uploads
- Firebase for push notifications

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure `FRONTEND_URL` in backend matches your Vercel URL
   - Check that the backend allows your frontend domain

2. **API Connection Errors**:
   - Verify `NEXT_PUBLIC_API_URL` points to correct Render URL
   - Ensure backend service is running and accessible

3. **Build Failures**:
   - Check that all environment variables are set
   - Verify Node.js version compatibility
   - Review build logs for specific errors

4. **Database Connection Issues**:
   - Confirm MongoDB Atlas connection string is correct
   - Ensure database allows connections from Render IPs

### Vercel Specific Issues

1. **404 on Direct URL Access**:
   - The `vercel.json` file should handle this
   - Ensure routing configuration is correct

2. **Environment Variables Not Loading**:
   - Check that variables are set in Vercel dashboard
   - Ensure variables start with `NEXT_PUBLIC_` for client-side access

### Render Specific Issues

1. **Service Won't Start**:
   - Check that `npm start` command works locally
   - Verify all required environment variables are set
   - Review service logs in Render dashboard

2. **Database Connection Timeout**:
   - Increase MongoDB connection timeout settings
   - Ensure MongoDB Atlas allows Render IP addresses

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/)

## 🔄 Continuous Deployment

Both Vercel and Render support automatic deployments:
- **Vercel**: Automatically deploys on push to main branch
- **Render**: Automatically deploys on push to main branch

Configure webhooks or branch protection rules as needed for your workflow.