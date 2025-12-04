# Backend Deployment Guide for Render.com

## Steps to Deploy Backend:

1. Go to https://render.com and sign up/login with GitHub

2. Click "New +" → "Web Service"

3. Connect your GitHub repo: `Deepak1242/meetClone`

4. Configure the service:
   - **Name**: meetclone-backend
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. Add Environment Variables:
   - `PORT` = 5001
   - `MONGODB_URI` = mongodb+srv://nextrussdesign_db_user:bhagat1242@videocall.l21dqaa.mongodb.net/?appName=videoCall
   - `JWT_SECRET` = yddfdesdfds
   - `CLIENT_URL` = (will be your Vercel frontend URL, update after deploying frontend)

6. Click "Create Web Service"

7. Wait for deployment, copy the URL (e.g., https://meetclone-backend.onrender.com)

---

## After Backend is Deployed:

Update the frontend with the backend URL and deploy to Vercel.
