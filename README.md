# Social Media App with Push Notifications

A full-stack social media application built with Next.js, Express.js, and MongoDB, featuring web push notifications.

## Features

- User authentication (register, login, password reset) with JWT
- User profiles and follow/unfollow system
- Post creation and feed
- Web push notifications
- Mobile-responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, TypeScript
- **Backend**: Node.js, Express.js, MongoDB Atlas
- **Authentication**: JWT with HTTP-only cookies
- **Push Notifications**: Firebase Cloud Messaging (FCM)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Firebase project with FCM enabled

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd push-test
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:

**Backend** - Copy `backend/.env.example` to `backend/.env` and fill in your values:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret_key_at_least_32_characters
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_firebase_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FRONTEND_URL=http://localhost:3000
```

**Frontend** - Copy `frontend/.env.local.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### Required Setup Steps

#### 1. MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Get your connection string and add it to `MONGODB_URI`

#### 2. Gmail App Password (for password reset emails)
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password for this application
3. Use this app password in `EMAIL_PASS` (not your regular Gmail password)

#### 3. Firebase Project
1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Cloud Messaging
3. Generate Web App credentials and VAPID key
4. Generate a service account key for admin SDK
5. Add all credentials to your environment files

### Development

1. Start both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend app on http://localhost:3000

2. Or run them separately:
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

### Deployment

The app is configured for manual deployment to Render:

1. Build the project locally
2. Deploy backend to Render with environment variables
3. Deploy frontend to Render with API URL pointing to backend

## Project Structure

```
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth and other middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── frontend/
│   ├── pages/           # Next.js pages
│   ├── components/      # React components
│   ├── styles/          # CSS files
│   └── utils/           # Frontend utilities
└── package.json         # Root package.json for scripts
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/follow` - Follow user
- `POST /api/posts` - Create post
- `GET /api/feed` - Get feed
- `POST /api/notifications/subscribe` - Subscribe to push notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License