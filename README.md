# RightPDFKit Analytics Dashboard

Sign in with your Google account — no service accounts needed.

## Setup

### Step 1 — Create OAuth credentials in Google Cloud

1. Go to console.cloud.google.com
2. Select project odogwu-493618
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Name: RightPDFKit Dashboard
6. Authorised redirect URIs — add:
   - http://localhost:3000/api/auth/callback/google (for local dev)
   - https://your-dashboard.vercel.app/api/auth/callback/google (replace with your Vercel URL)
7. Click Create — copy the Client ID and Client Secret

### Step 2 — Enable Google Analytics Data API

1. console.cloud.google.com → APIs & Services → Library
2. Search "Google Analytics Data API" → Enable

### Step 3 — Set environment variables in Vercel

GA4_PROPERTY_ID=395397759
GOOGLE_CLIENT_ID=paste_client_id_here
GOOGLE_CLIENT_SECRET=paste_client_secret_here
NEXTAUTH_SECRET=any_random_string_32_chars
NEXTAUTH_URL=https://your-dashboard.vercel.app
ALLOWED_EMAIL=azubuikedavies@gmail.com

### Step 4 — Deploy

Push to GitHub → connect to Vercel → add env vars → deploy.

### Step 5 — Use it

Open your dashboard URL → click "Sign in with Google" → 
sign in with azubuikedavies@gmail.com → dashboard loads.
