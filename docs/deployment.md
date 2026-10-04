# WaterFlow OS Deployment Guide

## 1. Supabase (Database)
1. Create a new Supabase project.
2. In Project Settings -> Database, locate your Connection String (URI).
3. Ensure transaction pooling (pgbouncer/Supavisor) is enabled for serverless compatibility.
4. Execute the schema migration via SQL Editor or CLI: `supabase/migrations/20261004000000_deployment_schema.sql`
5. (Optional) Run `node scripts/seed_demo_data.js` to populate Seed 42 Demo Data.
6. Set `DATABASE_URL` in your backend environment.

## 2. Vercel (Backend API)
1. From the project root (`stitch_waterflow_os_municipal_operations_dashboard`), deploy to Vercel.
2. Ensure the framework preset is set to `Other`.
3. Vercel will use the provided `vercel.json` to route API requests to `backend/server.js` using `@vercel/node`.
4. **Environment Variables Required**:
   - `DATABASE_URL` (Supabase Connection String)
   - `FRONTEND_ORIGIN` (Your Render frontend URL)
   - `AI_ENGINE_URL` (Your FastAPI URL)
   - `DEMO_EXECUTIVE_AUTH` (Demo PIN)
5. Verify deployment via `GET https://<your-vercel-domain>/health`.

## 3. Render (Static Site Frontend)
1. Create a new "Static Site" on Render.
2. Connect the repository.
3. **Build Command**: `npm --prefix frontend run build`
4. **Publish Directory**: `frontend/dist`
5. **Environment Variables**:
   - `VITE_API_URL` (Your Vercel backend URL)
6. Under Redirects/Rewrites, set:
   - Source: `/*`
   - Destination: `/index.html`
   - Status: `200` (for SPA client-side routing fallback)

## 4. Render / Other (FastAPI Engine)
1. Deploy the `ai_engine` directory as a standalone Python web service (e.g., Render Web Service).
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the public URL and set it as `AI_ENGINE_URL` in your Vercel backend environment.

## 5. Local Verification
- **Postgres**: Run a local Postgres instance, export `DATABASE_URL`, and run migrations.
- **FastAPI**: `cd ai_engine && uvicorn main:app --reload` (Runs on 8000)
- **Node API**: `npm --prefix backend run dev` (Runs on 3001)
- **React**: `npm --prefix frontend run dev` (Runs on 5173)
