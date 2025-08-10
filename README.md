# InfoStuffs – Information Manager Web App

InfoStuffs is a full-stack web application for securely storing and managing categorized information. Users can create, view, update, and delete entries that may contain text, images, or files. All text content is encrypted before being saved, ensuring enhanced privacy.

---

## Tech Stack

- **Frontend**: React.js, Material UI
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: Clerk
- **Image and File Storage**: Supabase Storage
- **Text Encrpyption/Decryption**: Crypto-js
- **Deployment**: Render (exploring other options)

---

## Features

- Multi-User Authentication - Secure sign-up and login via Clerk
- Create entries with:
  - Encrypted text content
  - Image uploads
  - Document uploads
- Categorized Info Cards - Display name, category, and importance, sorted by most recent
- Detailed View - Click a card to view full details (decrypted text, file download, or image preview)
- Edit and update the card contents
- Delete entries with file cleanup in Supabase
- Responsive design using Material UI
- Light/dark mode toggle
- Custom cursor using React.js
- Profile Management - Update username, email, password, and profile image
- Supabase integration for secure media storage

---

## Security
- Private Supabase Bucket with signed URLs for time-limited access
- AES Text Encryption using crypto-js before saving to MongoDB
- User-Scoped File Storage to ensure isolation between accounts

---
