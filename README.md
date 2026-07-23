# InfoStuffs - Information Manager Web App
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Destroyer795/InfoStuffs/blob/main/LICENSE)

InfoStuffs is a privacy-first, zero-knowledge / end-to-end encrypted (E2EE) information management system. Unlike traditional cloud storage, it allows users to store sensitive notes, images, and documents without trusting the server with plaintext data.

The application employs client-side AES-256 encryption with user-derived keys, ensuring that the backend database and file storage providers never see the actual contents, original filenames, or unencrypted media paths. While the backend manages access control and coordinates synchronization, it only operates on encrypted ciphertext for all sensitive fields.

**Technical Write-up / Case Study:**  
Designing a Zero-Knowledge Personal Information Manager with Client-Side Encryption  
→ [Read the full case study](https://dev.to/pranav_kishan_f81e2fc8327/designing-a-zero-trust-personal-information-manager-with-client-side-encryption-4pb5)

*Explains the security model, architectural decisions, and deployment tradeoffs in detail.*

---

## Tech Stack

**Frontend:** React (Vite), Material UI, Framer Motion  

**Backend:** Node.js, Express.js  

**Database:** MongoDB (Mongoose)  

**Authentication:** Clerk  

**Storage:** Supabase (Obfuscated paths + client-side encrypted blobs + Ephemeral Signed URLs) & IndexedDB (`idb` for secure offline caching)  

**Cryptography:** Web Crypto API (AES-GCM + PBKDF2) using Web Workers

**Offline Capabilities:** Progressive Web App (PWA) with Service Worker asset caching, automatic offline detection & Clerk auth bypass, offline cryptographic key derivation using cached user identifiers as PBKDF2 salt.

**DevOps:** Docker, Google Cloud Platform (Cloud Run & Build), Vercel (Serverless Monolith Deployment)

---

## Zero-Knowledge & End-to-End Encrypted (E2EE) Architecture

This project implements a strict Zero-Knowledge/E2EE model to minimize server trust and ensure data privacy in cloud-hosted environments.

### 1. Client-Side Encryption (The Vault)

- **No Static Keys:** The application does not store encryption keys on the server.  
- **User-Derived Keys:** Upon login, users provide a Vault Password. This password is processed in the browser (using a dedicated Web Worker to maintain UI responsiveness) utilizing the native Web Crypto API and PBKDF2 (Password-Based Key Derivation Function 2) to derive a temporary 256-bit AES-GCM key in memory.  
- **Encryption:** This key securely encrypts (and authenticates via GCM) text content, titles, categories, and file paths (used for media references) before any data leaves the client device.

### 2. Secure File & Media Handling

- **Encrypted Paths in Database:** The database stores encrypted strings (for example, `U2FsdGVk...`) instead of plaintext storage paths.
- **Obfuscated Storage Paths:** When files are uploaded to Supabase, the app generates randomized UUID storage paths (e.g., `images/UUID.ext`). The storage provider receives and stores the client-side encrypted binary payloads directly. Thus, while Supabase knows the file extension, size, and opaque storage path, it never sees the original filenames or plaintext file contents.
- **Ephemeral Access:** When a user unlocks their vault, the client decrypts the database-stored storage path and requests a signed URL from Supabase.  
- **Time-Limited URLs:** Signed URLs are valid for one hour. If a URL is leaked, it expires quickly, and if the database is compromised, the encrypted paths remain unreadable.

### 3. Nuclear Reset

- **Irrecoverable Keys:** Since the server cannot recover lost vault passwords, the application provides a Nuclear Reset option.  
- **Data Wipe:** This allows users to permanently delete all encrypted and inaccessible data and reinitialize the vault with a new encryption key.

### 4. Zero-Knowledge Offline Vault (PWA)

- **Offline Caching:** During an online session, the raw encrypted ciphertexts of the user's notes are saved into IndexedDB. Plaintext content is never stored on disk.
- **Immediate Offline Detection:** The application uses a module-level event interceptor, physical network state listeners, and a fast Google `clients3` connectivity probe (2.5-second abort timer) to detect offline states (or Lie-Fi conditions) instantly.
- **Clerk Authentication Bypass:** If offline or if Clerk's script fails to load, the app skips Clerk initialization entirely and mounts a custom Offline Vault.
- **Dynamic Local Key Derivation:** The user's offline password is derived with PBKDF2 using the Clerk User ID cached within the notes' `userId` field as the salt, regenerating the exact AES-GCM key without needing internet access. Note: The `userId` is a public unique identifier stored in plaintext in the database (standard practice for cryptographic salts).

### 5. Plaintext Metadata Visibility (Security Model Trade-offs)

To support server-side query routing, access control, and vault management, the application does not encrypt all database fields. The following metadata remains visible to the backend server and MongoDB database in plaintext:
- **`userId`:** The unique Clerk identifier of the vault owner.
- **`importance`:** The user-assigned importance level (`High`, `Medium`, or `Low`).
- **`type`:** The note type (`text`, `image`, or `file`).
- **`isTemporary`:** A boolean flag indicating if the note is temporary.
- **Timestamps:** Standard MongoDB database creation (`createdAt`) and update (`updatedAt`) timestamps.

---

## Features

- **Zero-Knowledge Vault:** Data is unlocked locally; the server only ever processes ciphertext for sensitive fields.  
- **Encrypted Sensitive Data:** Content, titles, categories, and file references are fully encrypted client-side.  
- **Secure Media Storage:** Client-side encrypted image and document uploads with randomized storage paths.  
- **Real-Time Decryption:** Data is decrypted on the client side for authenticated users.  
- **Search and Filter:** Client-side searching and filtering on decrypted data.  
- **Profile Management:** Secure identity and session management using Clerk.  
- **Full Offline PWA Support:** Access and search your decrypted text vault completely offline.
- **Intersection Observer Deferral:** Encrypted image attachments are only requested, downloaded, and decrypted when they scroll into the viewport, optimizing network usage and UI thread performance.
- **High Performance Base64 Parser:** Custom loops replace slow native `Uint8Array.from()` callbacks to perform decryption with minimal CPU overhead.
- **Responsive UI:** Clean, modern interface with dark mode support.

---

## DevOps and Deployment

**Containerization:** Docker  

**Cloud Provider (Initial Deployment):**  
- Google Cloud Platform (GCP) - Cloud Run  

**CI/CD:**  
- Google Cloud Build for automated builds and deployments  

**Current Hosting Setup:**  
- **Frontend:** Vercel  
- **Backend:** Vercel  

> The application was initially containerized and deployed on Google Cloud Run to validate production readiness and CI/CD workflows. It was later migrated to Vercel for cost-efficient hosting while retaining the same architecture and security guarantees.

---
### Running Locally with Docker

To run this project locally in a fully containerized environment, ensure you have Docker Desktop installed:

#### 1. Clone the repository:
```bash
git clone https://github.com/Destroyer795/InfoStuffs.git
cd InfoStuffs
```

#### 2. Configure Environment Variables:
Create a `.env` file in the root directory based on `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your_supabase_project_id.supabase.co
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/infostuffs?retryWrites=true&w=majority
CLERK_SECRET_KEY=your_clerk_secret_key
PORT=5000
NODE_ENV=development
```

#### 3. Run with Docker Compose:
To build and start all services in detached mode:
```bash
docker compose up -d --build
```

#### 4. Perform a Complete Clean Rebuild (Zero Cache):
To rebuild all container layers completely from scratch without cache:
```bash
docker compose down -v && docker compose build --no-cache && docker compose up -d --force-recreate
```

#### 5. Monitor & Manage Containers:
* **Check Health Status:** `docker compose ps`
* **View Live Logs:** `docker compose logs -f`
* **Stop Containers:** `docker compose down`

#### 6. Application Endpoints:
* **Frontend (Nginx Web Server):** `http://localhost:8080`
* **Backend API (Express / Node.js):** `http://localhost:5000`
* **Health Check API:** `http://localhost:5000/health` (Returns JSON status, uptime, & ISO timestamp)

---
