# Deploying La Shoe de Peugh to GitHub Pages + LaShoeDePeugh.com

This site is a static Vite/React app. GitHub builds and hosts it for free; GoDaddy
points your domain at it. Below is the exact sequence. Steps marked **[you]** need
you; steps marked **[claude]** I can run once git is installed.

---

## 0. One-time setup

- **[you]** Create a GitHub account: https://github.com/signup
- **[claude]** Git for Windows is being installed via winget (approve the UAC prompt).
- The git repo lives in this `web/` folder ONLY — not the Desktop project root —
  so the 284 MB info zip and the "Info" folders never get committed.

## 1. Create the repository

- **[you]** On GitHub: click **+ → New repository**.
  - Name: `lashoedepeugh` (or anything — the custom domain hides it)
  - Visibility: **Public** (required for free Pages)
  - Do NOT add a README/.gitignore/license (this folder already has them)
  - Click **Create repository**, then copy the repo URL
    (e.g. `https://github.com/YOURNAME/lashoedepeugh.git`)

## 2. Push the code

- **[claude]** Once git is installed and you give me the repo URL, I run:
  ```
  git init
  git add .
  git commit -m "Initial commit: La Shoe de Peugh landing site"
  git branch -M main
  git remote add origin https://github.com/YOURNAME/lashoedepeugh.git
  git push -u origin main
  ```
  (First push will open a browser to log into GitHub — **[you]** approve it.)

## 3. Turn on GitHub Pages

- **[you]** Repo → **Settings → Pages**
  - **Source: GitHub Actions** (NOT "Deploy from a branch")
- The included workflow (`.github/workflows/deploy.yml`) then builds and deploys
  automatically. Watch progress under the repo's **Actions** tab. First deploy
  takes ~2 min. Your site goes live at `https://YOURNAME.github.io/lashoedepeugh/`.

## 4. Point the custom domain

- **[you]** Repo → **Settings → Pages → Custom domain**: enter `lashoedepeugh.com`,
  Save. (A `CNAME` file is already in the build so this sticks across deploys.)
- **[you]** In **GoDaddy → your domain → DNS**, set these records:

  | Type  | Name | Value                 |
  |-------|------|-----------------------|
  | A     | @    | 185.199.108.153       |
  | A     | @    | 185.199.109.153       |
  | A     | @    | 185.199.110.153       |
  | A     | @    | 185.199.111.153       |
  | CNAME | www  | YOURNAME.github.io    |

  - Delete any existing "Parked"/forwarding A or CNAME records GoDaddy added.
  - DNS takes 10 min–1 hr to propagate. GitHub then auto-issues a free HTTPS cert
    (can take up to ~15 min more). Tick **Enforce HTTPS** in Pages settings once
    it's available.

## 5. Make the waitlist capture real emails (Formspree)

The "Reserve My Order" box posts to Formspree. Until you set it up, submissions
show a graceful error.

- **[you]** Sign up free at https://formspree.io, create a form, copy its endpoint
  (looks like `https://formspree.io/f/abcdwxyz`).
- **[claude or you]** Paste it into `src/App.jsx`, replacing the `FORMSPREE_ENDPOINT`
  placeholder near the top. Commit + push — auto-redeploys. Done.
- Formspree free tier = 50 submissions/month, emailed to you + a dashboard.

## 6. Future updates

Every time we change the site, I just `git push` and GitHub rebuilds + redeploys
in ~2 min. No manual build, no file uploads.

---

## Still on the roadmap (post-launch)
- **Clover checkout** to replace the waitlist with real payment (needs your Clover
  Developer App ID + Secret).
- **Performance:** lazy-load the 3D hero so the page paints instantly on mobile
  (the Three.js bundle is ~1.1 MB; this would cut first-load dramatically).
