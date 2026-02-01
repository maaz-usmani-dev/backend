# 🎥 YouTube-Style Backend API

A production-grade **Node.js + Express + MongoDB backend** for a YouTube-like video platform.
Built with **real-world backend practices**, supporting both **web and mobile clients**.



## 🚀 Features

### Authentication & Security

* JWT authentication (Access + Refresh tokens)
* Refresh token **hashed in database** (single-device login)
* HTTP-only cookies for web clients
* Token support via JSON for mobile apps
* Protected routes with middleware

### User Management

* Register, login, logout
* Refresh access tokens
* Change password
* Update profile, avatar, and cover image
* Fetch current user and channel profiles

### Video Management

* Upload videos with thumbnails
* View, edit, and delete videos (owner-only)
* Auto-increment views
* Fetch channel videos

### Watch History

* Track watched videos per user
* Populate video owner details using aggregation

### Media Handling

* Multer for temporary local uploads
* Cloudinary for storage
* Local files deleted immediately after upload


## 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* JWT (jsonwebtoken)
* bcrypt
* Cloudinary
* Multer
* Prettier



## 📂 Project Structure

```
controllers/
models/
routes/
middlewares/
db/
utils/
.env.sample
.prettierrc
.prettierignore
app.js
constants.js
index.js
```

## 🧪 API Overview

### Auth

```
POST /api/v1/users/register
POST /api/v1/users/login
POST /api/v1/users/logout
POST /api/v1/users/refresh-token
```

### Users (Protected)

```
GET   /api/v1/users/current-user
PATCH /api/v1/users/change-password
PATCH /api/v1/users/update-info
PATCH /api/v1/users/update-avatar
PATCH /api/v1/users/update-cover
GET   /api/v1/users/channel/:username
GET   /api/v1/users/history
```

### Videos (Protected)

```
POST   /api/v1/videos/upload
GET    /api/v1/videos/watch/:id
PATCH  /api/v1/videos/video/:id
DELETE /api/v1/videos/remove/:id
```



## 🔒 Auth Design Notes

* Short-lived access tokens
* Long-lived refresh tokens (hashed in DB)
* Single-device login enforced
* Tokens sent via cookies (web) and JSON (mobile)


## ✨ Code Quality

* Prettier enforced to avoid formatting conflicts
* Reusable async handler
* Centralized error & response handling
* Aggregation pipelines for complex queries



## 📌 Status

MVP / Prototype
Designed to scale with features like playlists, comments, likes, subscriptions, and search.



## 👤 Author

**Maaz Usmani**
Backend-focused Full Stack Developer

> Built with production mindset, not tutorial shortcuts.
