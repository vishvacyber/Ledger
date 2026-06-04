# Deploying Ledger to Render

## Step 1 — Push to GitHub

```bash
cd ledger
git init
git add .
git commit -m "initial ledger build"
# create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ledger.git
git push -u origin main
```

---

## Step 2 — Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs — add:
   ```
   https://YOUR-APP-NAME.onrender.com/auth/google/callback
   ```
   (you'll get this URL in Step 3 — you can come back and add it)
6. Copy the **Client ID** and **Client Secret**

---

## Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) → New → **Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` and create:
   - A **web service** (Node.js)
   - A **PostgreSQL** database
4. Set these environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from Step 2 |
| `GOOGLE_CLIENT_SECRET` | from Step 2 |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-APP.onrender.com/auth/google/callback` |
| `CLIENT_URL` | `https://YOUR-APP.onrender.com` |

5. Deploy — Render will run `npm install` then `node src/server.js`
6. The DB schema is applied automatically on first boot

---

## Step 4 — Go back and update Google OAuth

Once Render gives you your URL (e.g. `https://ledger-abc.onrender.com`):

1. Return to Google Cloud Console → your OAuth credential
2. Add the callback URL: `https://ledger-abc.onrender.com/auth/google/callback`
3. Save

---

## Local Development

```bash
cp .env.example .env
# fill in your values, then:
npm install
npm run dev
```

For local Google OAuth, add `http://localhost:3000/auth/google/callback` to your Google OAuth authorized redirect URIs.
