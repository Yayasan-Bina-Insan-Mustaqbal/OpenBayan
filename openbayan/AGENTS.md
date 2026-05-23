<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Deployment Rules

- **Target Server:** Deployments must always target the production Tailscale host `100.101.207.74` using the password from `.env`.
- **Target Port:** The app must run on port **`3000`** (accessible at `http://100.101.207.74:3000`, publicly mapped to the production domain **`https://openbayan.insanmustaqbal.or.id`**).
- **Automation:** Always use the automated script `./deploy.sh` (or `npm run deploy:prod`) to build and launch production Docker containers on the server.

