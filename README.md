# NuCalorie

Telegram Bot + Mini App MVP: calorie coach, meal/workout recs, weekly challenges.

## Local Mini App (browser)

```bash
node src/server.js
```

Open http://localhost:3000

Demo auth is on (`DEV_BYPASS_AUTH=true`) so the UI works outside Telegram.

## Deploy to Vercel (beginner)

Vercel is a free host. You upload the project, they give a public `https://....vercel.app` link.

You need two free accounts: **GitHub** (to store the code) and **Vercel** (to publish it).

### 1. Create a GitHub account

1. Open https://github.com/signup
2. Register with email.
3. Confirm the email.

### 2. Put this project on GitHub

1. Open https://github.com/new
2. Repository name: `nucalorie`
3. Public.
4. Do **not** add README / .gitignore (the project already has them).
5. Create repository.
6. On the next page choose **uploading an existing file**.
7. Open the folder `nucalorie` on your computer, select **all files inside it** (not the parent `Новая папка`).
8. Commit changes.

Do not upload the `.env` file (it is ignored). Tokens stay on your computer.

### 3. Create a Vercel account

1. Open https://vercel.com/signup
2. Choose **Continue with GitHub**.
3. Allow Vercel to see your repositories.

### 4. Import and deploy

1. Open https://vercel.com/new
2. Find `nucalorie` → **Import**.
3. Leave Framework Preset as Other.
4. Open **Environment Variables** and add:

   - Name: `DEV_BYPASS_AUTH`  
     Value: `true`

5. Click **Deploy**.
6. Wait until the status is Ready.
7. Click the screenshot / **Visit**. The public link looks like:

   `https://nucalorie-xxxxx.vercel.app`

That is the URL you can open in any browser and later paste into BotFather as the Mini App URL.

### After deploy (optional, for the Telegram bot)

In Vercel → Project → Settings → Environment Variables you can later add `BOT_TOKEN`, `WEBHOOK_SECRET`, `PUBLIC_URL`, `WEBAPP_URL` (both URLs = your `https://....vercel.app`). Then Redeploy.

## Telegram bot

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Put `BOT_TOKEN` and an `https` `PUBLIC_URL` in `.env` (local) or Vercel env vars.
3. Restart / redeploy. Webhook path is `/webhook`. Commands: `/start` `/profile` `/recommend` `/challenges`.
