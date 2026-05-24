# RightPDFKit Analytics Dashboard

Live analytics dashboard showing which tools people use most on rightpdfkit.com.
Powered by Google Analytics 4 Data API.

## What it shows
- Live users right now (realtime)
- Daily active users chart (14 days)
- Tool usage ranked (all 40 tools)
- Device split (mobile/desktop/tablet)
- Top countries
- Key events (downloads, AI commands, scans)

## Setup

### Step 1 — Get GA4 Property ID
1. Go to analytics.google.com
2. Admin → Property Settings
3. Copy the Property ID (numbers only e.g. 123456789)

### Step 2 — Create a Google Service Account
1. Go to console.cloud.google.com
2. Select or create a project
3. APIs & Services → Enable API → search "Google Analytics Data API" → Enable
4. APIs & Services → Credentials → Create Credentials → Service Account
5. Name it "rightpdfkit-dashboard" → Create
6. Click the service account → Keys tab → Add Key → JSON → Download

### Step 3 — Grant the service account access to GA4
1. Go to analytics.google.com → Admin → Account Access Management
2. Click + Add users
3. Enter the service account email (looks like: name@project.iam.gserviceaccount.com)
4. Set role: Viewer → Add

### Step 4 — Set environment variables
Copy .env.local.example to .env.local and fill in:

```
GA4_PROPERTY_ID=123456789
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...paste entire JSON on one line..."}
DASHBOARD_PASSWORD=choose_a_password
```

For the service account key: open the downloaded JSON file,
copy the ENTIRE contents, and paste it as a single line value.

### Step 5 — Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000 and enter your dashboard password.

### Step 6 — Deploy to Vercel
1. Push to GitHub
2. Connect to Vercel
3. Add the 3 env vars in Vercel dashboard
4. Deploy

The dashboard will be at your-vercel-url.vercel.app
