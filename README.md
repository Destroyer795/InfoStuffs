# InfoStuffs - Information Manager Web App
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Destroyer795/InfoStuffs/blob/main/LICENSE)

InfoStuffs is a full-stack web application for securely storing and managing categorized information. Users can create, view, update, and delete entries that may contain text, images, or files. All text content is encrypted before being saved, ensuring enhanced privacy.

---

## Tech Stack

- **Frontend**: React.js, Material UI, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: Clerk
- **Image and File Storage**: Supabase Storage
- **Text Encrpyption/Decryption**: Crypto-js
- **DevOps & Deployment**: 
  - **Containerization:** Docker
  - **Cloud Provider:** Google Cloud Platform (GCP) - Cloud Run
  - **CI/CD:** Google Cloud Build

---

## Features

- Multi-User Authentication - Secure sign-up and login via Clerk.
- Create entries with:
  - Encrypted text content
  - Image uploads
  - Document uploads
- Categorized Info Cards - Display name, category, and importance, sorted by most recent.
- Search and Filter - Real-time search functionality to filter cards by name or category.
- Detailed View - Click a card to view full details (decrypted text, file download, or image preview).
- Edit and update the card contents.
- Delete entries with file cleanup in Supabase.
- Responsive design using Material UI.
- Light/dark mode toggle.
- Custom cursor using React.js.
- Profile Management - Update username, email, password, and profile image.
- Supabase integration for secure media storage.
- Fully containerized with Docker for consistent development and deployment environments.

---
## CI/CD Pipeline
The project utilizes a fully automated **Continuous Integration and Continuous Deployment (CI/CD)** pipeline powered by **Google Cloud Build**.
- **Automated Builds**: Every push to the `main` branch on GitHub automatically triggers a new build sequence.
- **Microservices Architecture**: Separate build triggers are configured for the `frontend` and `backend` services, allowing them to update independently.
- **Secure Secrets Management**: API keys and sensitive environment variables (like Clerk keys and Database URIs) are securely injected into the build process via Cloud Build substitutions.
- **Automatic Deployment**: After the Docker images are built, they’re automatically pushed to **Google Cloud Run**, keeping the live site up-to-date without any manual work.

---

## Security
- Private Supabase Bucket with signed URLs for time-limited access.
- AES Text Encryption using crypto-js before saving to MongoDB.
- User-Scoped File Storage to ensure isolation between accounts.

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
