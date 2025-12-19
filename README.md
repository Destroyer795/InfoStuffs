# InfoStuffs - Information Manager Web App
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Destroyer795/InfoStuffs/blob/main/LICENSE)

InfoStuffs is a privacy-first, zero-trust information management system. Unlike traditional cloud storage, it allows users to store sensitive notes, images, and documents without trusting the server with plaintext data.

The application employs client-side AES-256 encryption with user-derived keys, ensuring that the backend database and file storage providers never see the actual content, metadata, or file paths.

---

## Tech Stack

**Frontend:** React (Vite), Material UI, Framer Motion  

**Backend:** Node.js, Express.js  

**Database:** MongoDB (Mongoose)  

**Authentication:** Clerk  

**Storage:** Supabase (Encrypted Paths + Ephemeral Signed URLs)  

**Cryptography:** crypto-js (AES-256 + PBKDF2)  

**DevOps:** Docker, Google Cloud Platform (Cloud Run & Build), Vercel/Render (Hybrid Architecture)

---

## Zero-Trust Security Architecture

This project implements a strict Zero-Trust model to address data privacy in cloud-hosted applications.

### 1. Client-Side Encryption (The Vault)

- **No Static Keys:** The application does not store encryption keys on the server.  
- **User-Derived Keys:** Upon login, users provide a Vault Password. This password is processed in the browser using PBKDF2 (Password-Based Key Derivation Function 2) to derive a temporary 256-bit AES key in memory.  
- **Encryption:** This key encrypts text content, titles, categories, and file paths before any data leaves the client device.

### 2. Secure File Handling

- **Encrypted Paths:** The database stores encrypted strings (for example, `U2FsdGVk...`) instead of plaintext file paths such as `user/123/image.jpg`.  
- **Ephemeral Access:** When a user unlocks their vault, the client decrypts the file path and requests a signed URL from Supabase.  
- **Time-Limited URLs:** Signed URLs are valid for one hour. If a URL is leaked, it expires quickly, and if the database is compromised, the encrypted paths remain unreadable.

### 3. Nuclear Reset

- **Irrecoverable Keys:** Since the server cannot recover lost vault passwords, the application provides a Nuclear Reset option.  
- **Data Wipe:** This allows users to permanently delete all encrypted and inaccessible data and reinitialize the vault with a new encryption key.

---

## Features

- **Zero-Trust Vault:** Data is unlocked locally; the server only ever processes ciphertext.  
- **Encrypted Everything:** Content, titles, categories, and file references are fully encrypted.  
- **Secure Media Storage:** Image and document uploads with strict access isolation.  
- **Real-Time Decryption:** Data is decrypted on the client side for authenticated users.  
- **Search and Filter:** Client-side searching and filtering on decrypted metadata.  
- **Profile Management:** Secure identity and session management using Clerk.  
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
- **Backend:** Render  

> The application was initially containerized and deployed on Google Cloud Run to validate production readiness and CI/CD workflows. It was later migrated to Vercel and Render for cost-efficient hosting while retaining the same architecture and security guarantees.

---
## Running Locally with Docker
To run this project in a local containerized environment, ensure you have Docker Desktop installed and follow these steps:

### Clone the repository:
```
git clone https://github.com/Destroyer795/InfoStuffs.git
cd InfoStuffs
```
This will download the project files to your local machine.

### Create Environment Files:
Create a `.env` file in the root directory. You can use the `.env.example` file as a template.

Populate the file with your own keys and secrets (e.g., MongoDB URI, Clerk keys, etc.).

### Build and Run the Containers:
From the root directory, run the following command. This will build the Docker images for both the frontend and backend and start them.

```
docker-compose up --build
```
The `--build` flag ensures that the images are built from the latest version of your code.

### Access the Application:
Once the containers are running, the application will be available at:
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`

---
