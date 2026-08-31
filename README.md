# Zest Design Generator

## Deploy to Vercel (Free)

### Step 1: GitHub
1. Go to github.com → New repository → Name: `zest-generator`
2. Upload all files from this folder
3. Click "Commit changes"

### Step 2: Vercel
1. Go to vercel.com → "Add New Project"
2. Import your GitHub repo `zest-generator`
3. Click "Deploy"

### Step 3: Add KV Database
1. In Vercel dashboard → your project → "Storage" tab
2. Click "Create Database" → choose "KV"
3. Name it `zest-kv` → Connect to project
4. Vercel auto-adds environment variables

### Step 4: Set Password
1. In Vercel → Settings → Environment Variables
2. Add: `APP_PASSWORD` = `your_chosen_password`
3. Redeploy

### Step 5: Use!
1. Open your Vercel URL (e.g. zest-generator.vercel.app)
2. Go to Settings → enter your password → Test Connection
3. All data now saves to cloud automatically!

## Features
- 390+ businesses from Ordere
- 12 design templates
- Facebook scheduling via Ordere API
- Cloud storage (any browser, any device)
