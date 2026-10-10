# NJMS Rollback Runbook
**Document Reference:** [14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md](file:///C:/Users/saubh/Downloads/files/14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md) §3  
**Product:** Narayan Jewellers Management System (NJMS)

---

## 1. Code Rollback

If a release causes runtime errors or regression:

### Via SSH:
```bash
ssh -p 65002 u148306822@92.249.46.120
cd ~/njms

# Revert to the previous stable git commit
git checkout <PREVIOUS_COMMIT_HASH>

# Rebuild and restart
npm install
npm run build
```
Restart the Node.js application in Hostinger hPanel.

---

## 2. Database Rollback

### If a migration caused failures:
1. Identify the failed migration in `_prisma_migrations`:
   ```sql
   SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
   ```
2. Mark the migration as rolled back if necessary:
   ```bash
   npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
   ```
3. If restoring from an hPanel snapshot:
   - Go to **Hostinger hPanel → Databases → Backups**.
   - Select the automated snapshot taken prior to deployment.
   - Click **Restore**.

---

## 3. Post-Rollback Verification
Run the verification smoke tests to confirm healthy state:
```bash
node scripts/verify-deploy.mjs https://yourdomain.com
```
