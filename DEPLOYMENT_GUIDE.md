# 🚀 Next.js Deployment Guide - Kickstarter Scraper

This guide provides step-by-step instructions for deploying your Kickstarter Scraper application.

---

## 🏗️ Option 1: Vercel (Recommended & Easiest)

Vercel is the creator of Next.js and provides the best experience.

### 1. Push to GitHub
If you haven't already, push your code to a GitHub repository.

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/log in.
2. Click **"New Project"**.
3. Import your GitHub repository.

### 3. Configure Environment Variables
During setup, add the following environment variables (from your `.env.local`):

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Project Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL** for syncing & downloads |
| `APIFY_API_TOKEN` | Your new Apify Token |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL (e.g., `https://your-site.vercel.app`) |

### 4. Deploy
Click **"Deploy"**. Vercel will build and launch your site.

---

## 🌐 Option 2: Hostinger (VPS)

If you are using a Hostinger VPS.

### 1. Prepare the Server
Connect via SSH and install required software:
```bash
# Update software
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20+ recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### 2. Clone and Setup
```bash
git clone <your-repo-url>
cd <project-folder>/frontend

# Install dependencies
npm install

# Create environment file
nano .env.local
# (Paste your environment variables here)
```

### 3. Build and Start
```bash
# Build the production application
npm run build

# Start with PM2 (keeps it running 24/7)
pm2 start npm --name "kickstart-leads" -- start

# Save PM2 state
pm2 save
pm2 startup
```

---

## ⚙️ Post-Deployment Settings

### 1. Update Apify Webhook
After deploying, update your `NEXT_PUBLIC_APP_URL` variable in your production environment settings so Apify can send data back to your live site.

### 2. Update Supabase Authentication
1. Go to **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
2. Add your new deployment URL to **Site URL** and **Redirect URLs**.

---

## ✅ Deployment Checklist

- [ ] All API keys are in Environment Variables.
- [ ] Database migrations have been applied to your production Supabase project.
- [ ] Authentication Site URL is updated in Supabase.
- [ ] `NEXT_PUBLIC_APP_URL` matches your actual domain.

---

**Need Help?** If you encounter errors during build, check the "Build Logs" in Vercel or run `npm run build` locally to see if there are any TypeScript errors.
