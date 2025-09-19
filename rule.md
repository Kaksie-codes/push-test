# Project brief — Full-stack social app with
cross-platform push notifications
Hi Replit team — I’d like to commission a full-stack web app. Below is a clear, ready-to-implement
spec: features, tech stack, architecture, data models, API surface, push-notification design (with special
attention to Apple/iOS), deployment & testing notes, and a suggested milestone plan. Please review
and tell me what you’d change or estimate.
---
## 1) High-level summary
Build a social-style fullstack web app where users can register, follow other users, post short
messages, and receive push notifications when someone they follow posts. Target platforms: desktop
browsers (Windows, macOS), Android (Chrome/Edge/etc.), and **Apple devices (Safari on macOS,
iOS/iPadOS)** — pay special attention to Apple push limitations.
**Tech stack**
- Frontend: Next.js (React)
- Backend: Node.js + Express
- Database: MongoDB (Atlas or managed Mongo)
- Notifications: Firebase Cloud Messaging (FCM) + APNs for Apple where required
- Hosting: Replit for development / demo; production-ready suggestions included

---
## 2) Primary features (MVP)
1. User accounts: sign up, log in (email + password), profile (display name, bio, avatar)
2. Follow system: follow / unfollow other users
3. Post messages: short posts (e.g., 280 chars), with timestamp
4. Feed: show posts from followed users
5. Real-time notification push: when user B posts, ALL followers of B should receive a push notification
on their devices (desktop, Android, iOS)
6. Notification settings: opt-in / opt-out individual or global notifications
7. Token management: store device/web push tokens per user and per device

---
## 3) Architecture & data flow (overview)
1. User action (create post) → Frontend sends POST /api/posts.
2. Backend saves post in MongoDB.
3. Backend queries followers of poster → obtains list of follower IDs and their push tokens.
4. Backend enqueues notification delivery (preferably via a job queue like Bull or Bee-Queue in Node
with Redis) to send notifications to each push token.
5. Notification worker sends messages through:
- FCM Web Push (for browsers and Android)
- FCM→APNs (or direct APNs) for iOS devices if using native iOS app OR web push support on Apple
browsers (note: Apple’s web push support historically differs; see special notes below).
6. Frontend subscribes to push (Service Worker + Push API for web) and registers tokens with
backend.
Diagram (conceptual):
Frontend (Next.js client) ↔ Backend (Express + API) ↔ MongoDB
Backend → Notification Queue → FCM / APNs → Devices

---
## 4) Data models (MongoDB — simplified)
**User**
```
{
"_id": ObjectId,
"email": "user@example.com",
"passwordHash": "...",
"displayName": "Alice",
"avatarUrl": "...",
"followers": [ObjectId],
"following": [ObjectId],
"devices": [
    {
"deviceId": "uuid-or-random",
"platform": "web" | "android" | "ios" | "mac",
"pushToken": "fcm_or_apns_token_or_vapid_key",
"lastActiveAt": ISODate,
"enabled": true
}
],
"notificationSettings": {
"follows": true,
"postsFromFollowed": true
}
}
```
**Post**
```
{
"_id": ObjectId,
"authorId": ObjectId,
"text": "Hello world",
"createdAt": ISODate,
"meta": { "attachments": [] }
}
```
**NotificationLog**
```
{
"_id": ObjectId,
"userId": ObjectId,
"deviceId": "string",
"postId": ObjectId,
"status": "pending|sent|failed",
"attempts": 0,
"lastAttemptedAt": ISODate
}
```
---
## 5) API endpoints (suggested)
- POST /api/auth/register — register
- POST /api/auth/login — login (returns JWT cookie or token)
- GET /api/users/:id — get profile
- POST /api/users/:id/follow — follow a user
- POST /api/users/:id/unfollow — unfollow
- POST /api/posts — create post
- GET /api/feed — get posts from following
- POST /api/devices/register — register device push token
- POST /api/devices/unregister — remove device token
- GET /api/notifications/settings — get
- PATCH /api/notifications/settings — update

---
## 6) Push notification design — important details & Apple focus
(Details on web push, Android FCM, Apple APNs, fallback strategies, retry logic, security, etc.)

---
## 7) Reliability & scale
- Use a queue (Redis + Bull) so posting is fast and notifications are processed asynchronously.
- Batch FCM requests.
- Monitor delivery errors and cleanup tokens.
---

## 8) Dev & deployment plan (milestones)
- Milestone 1: MVP backend & DB
- Milestone 2: Frontend MVP
- Milestone 3: Push subscription & worker
- Milestone 4: Apple push & hard cases
- Milestone 5: Polish & monitoring
---
## 9) Testing checklist
- Device tokens work on all platforms
- Android & iOS devices receive pushes
- Opt-in/out respected
- Tokens cleaned up
- Queue protects backend from spikes
---
## 10) Questions for Replit
1. Will you implement native iOS or web-only push?
2. Hosting strategy?
3. Credentials needed (Firebase, APNs, MongoDB Atlas)?
---
## 11) Sample message/email
(Commission request wording to Replit team.)
---
## 12) Extra tips
(Service Worker scope, VAPID keys, APNs keys, UX for asking push permissions, etc.)