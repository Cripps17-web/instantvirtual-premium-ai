# instantvirtual.premium ai

Starter full-stack website with:
- Customer upload page
- AI-analysis integration point
- Telecel Cash payment instructions and payment submission
- Admin login and dashboard
- SQLite database for analyses and payments

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and change ADMIN_PASSWORD and SESSION_SECRET.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000
6. Admin: http://localhost:3000/admin.html

## Production notes
- Put the site behind HTTPS.
- Set secure session cookies in production.
- Replace the analysis placeholder in `server.js` with your chosen vision AI provider.
- Do not put API keys in frontend code.
- The Telecel Cash number is displayed as payment instructions; this starter does not claim to verify mobile-money transactions automatically.
