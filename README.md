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

**Storage:** Cloudflare R2 (opaque UUID object keys, client-side encrypted blobs, and authenticated S3 presigned URLs) & IndexedDB (`idb` for secure offline caching)

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

- **Encrypted References:** `imageURL` and `file` retain their AES-GCM encrypted reference strings. Separate `storagePaths` metadata contains only the opaque object keys needed for authorization, quota accounting, and deletion without vault keys.
- **Obfuscated Storage Paths:** The browser generates randomized UUID paths such as `images/UUID.ext`, encrypts the entire file in memory, and uploads only the ciphertext. Cloudflare R2 can see the extension, ciphertext size, and opaque object key. Original filenames and plaintext file contents are never uploaded.
- **Authenticated Access:** The browser obtains a Clerk session token and requests presigned URLs from the backend at `/api/files`. The backend checks object ownership. R2 signing and credential configuration happen exclusively on the backend.
- **Time-Limited URLs:** PUT URLs last 15 minutes and GET URLs last one hour. PUT signatures bind the ciphertext byte count and content type, and conditional writes prevent overwriting an existing key. Anyone possessing a presigned URL can use it until it expires.
- **Verified Quotas:** A file's encrypted payload must fit within 100 MiB (`100 * 1024 * 1024` bytes). AES-GCM adds 28 bytes, so the maximum source file is 100 MiB minus 28 bytes. The global limit is 9 GiB (`9 * 1024 * 1024 * 1024` bytes). MongoDB leases serialize upload reservations across server instances. The storage ledger counts pending uploads, abandoned uploads, and unmatched migration copies in addition to saved notes. Saved `byteSize` is verified using R2 object metadata.
- **Storage Cleanup:** Deleting a note removes its R2 objects before its database record. Replacements save the new reference before removing old objects. Failed deletions retain accounting for retry. Local cleanup and the authenticated Vercel cron share the same implementation. Startup replaces the previous MongoDB TTL index with an ordinary expiry index so that TTL deletion cannot bypass R2 cleanup. The database account needs permission to list, drop, and create this index.

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
- **`byteSize`:** The combined size of a note's ciphertext attachments, used for storage accounting.
- **Opaque object metadata:** Random UUID paths, file extensions, ciphertext sizes, ownership, upload reservations, and expiry metadata in `storagePaths` and the storage ledger. These reveal storage relationships and approximate file lengths, but contain no original filenames, file contents, passwords, or vault keys.
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
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_private_bucket_name
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/infostuffs?retryWrites=true&w=majority
CLERK_SECRET_KEY=your_clerk_secret_key
PORT=5000
NODE_ENV=development
```

Keep the bucket private and create an R2 API token scoped to object read and write access for that bucket. Configure the four `R2_` variables on the backend hosting service only. Do not use a `VITE_` prefix for secrets. Missing R2 configuration produces a boot warning and file endpoints return 503; text notes remain available.

Configure the R2 bucket's CORS policy for the exact frontend origins you use. Browser PUTs send `Content-Type` and `If-None-Match`. For example:

```json
[
  {
    "AllowedOrigins": ["https://info-stuffs.vercel.app", "http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "If-None-Match"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

See Cloudflare's [presigned URL guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and [bucket CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/). The frontend build receives only the public Clerk key and API base URL.

AWS Signature Version 4 presigned URLs necessarily contain the access-key ID in `X-Amz-Credential`. The secret access key never leaves the backend. A literal requirement to hide even the public signing identifier is incompatible with direct S3 presigned URLs and would require a different delivery protocol, such as backend proxying. No R2 credential configuration or secret key is bundled into the browser.

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

## Migrating existing ciphertext to Cloudflare R2

Use Node.js 22 or later. The Supabase SDK is a backend-only dependency for this migration tool; the application and browser have no Supabase runtime dependency.

1. Back up MongoDB, stop application writes on the previous deployment, and keep the Supabase bucket `infostuffsende` read-only. Run the migration before enabling the R2 deployment's upload and cleanup flows. Existing plaintext references could otherwise be cleaned before their objects are copied.
2. In a trusted terminal, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in addition to `MONGO_URI` and all four `R2_` variables. `SUPABASE_KEY` is accepted as an alternative, but it must have permission to list and download every user's objects. An anonymous browser key with restricted policies cannot guarantee a complete migration. These source variables are optional outside migration and must never enter a frontend build.
3. From the repository root, install the locked backend dependencies and run:

   ```bash
   npm ci --prefix backend
   node backend/scripts/migrate-supabase-to-r2.mjs
   ```

The script reads the root `.env` when launched from the repository root. It recursively paginates all folders and root objects, copies the exact encrypted bytes to identical R2 keys with `application/octet-stream`, and reads each destination back to verify its SHA-256 hash and byte count. It never decrypts, changes `imageURL` or `file`, deletes source files, or overwrites a differing destination. Reruns verify identical existing copies and resume backfill. A failed copy, incomplete listing, integrity mismatch, or ownership conflict produces a failure count and a nonzero exit code. Review the summary and source inventory before switching storage, especially if zero objects were listed.

**Encrypted legacy reference limitation:** Existing `imageURL` and `file` strings are encrypted in this repository. A password-free script cannot match these strings to plaintext object keys. It backfills matching plaintext references and already mapped `storagePaths`; all other copied blobs are still counted globally through the storage ledger. The summary reports `legacyNotesPending`. When a user next unlocks their vault, the browser recovers its opaque paths locally and syncs the mapping and R2-verified `byteSize`. No passwords or vault keys leave the browser. An unclaimed legacy object key acts as a secret capability during this one-time reconciliation; recorded ownership is enforced afterward. Retain unmatched legacy objects and their encrypted note records until reconciliation succeeds. Deleting, replacing, expiring, or resetting a vault with unmapped attachments returns a conflict or defers cleanup so these files cannot be silently orphaned. If the vault password is lost before mapping, automatic per-user attachment cleanup is impossible without a separate trusted ownership inventory.

The migration copies every source key, including root and nested keys. Application file endpoints deliberately accept only `images/<filename>`, `documents/<filename>`, and `uploads/<filename>` with ASCII letters, digits, dots, underscores, and hyphens. Historical keys outside this format are retained exactly in R2; they need a reviewed compatibility mapping before the application can access them. Do not rename or delete the source copies.

After a zero-failure run, deploy the R2 backend and frontend, verify unlocked vault attachments, and preserve Supabase as a read-only rollback backup. Remove the migration-only source credentials from the application runtime after use. The summary includes files migrated, existing copies verified, bytes copied, records backfilled, pending encrypted notes, and failures.

## Local verification

```bash
npm ci --legacy-peer-deps
npm ci --prefix backend
npm ci --prefix frontend --legacy-peer-deps
npm test
npm run build --prefix frontend
```

Tests use fake storage and database adapters plus real AES-GCM encryption. They cover ownership, authentication, path traversal, quota boundaries, pending reservations, safe replacement and cleanup ordering, TTL index conversion, recursive migration, destination collisions, ciphertext integrity, and note backfill. No production storage or database is contacted by tests. The frontend build may report its existing bundle-size advisory.
