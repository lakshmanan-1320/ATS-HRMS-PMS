# Backend — Refactor Notes

This folder contains the backend for Performance Management System. Changes made during refactor:

- Migrations moved to `src/database/migrations` with runner `src/database/runMigrations.js`.
- Seeds moved to `src/database/seeders` with runner `src/database/runSeeds.js`.
- Centralized DB helper in `src/config/db.js` with `getPool`, `query`, and `withTransaction`.
- Notification code consolidated under `src/modules/notification` (`smtp.repository.js`, `email.service.js`, `otp.service.js`).
- Legacy middleware and route imports replaced to use standardized modules.

Quick commands

- Run migrations:
```powershell
npm run db:migrate
```

- Run seeders:
```powershell
npm run db:seed
# or single seeder
node src/database/runSeeds.js sub-depts
node src/database/runSeeds.js L1
```

- Run tests (unit/integration):
```powershell
npm test
```

Notes

- Some legacy helper files existed under `src/utils/` during refactor. Their functionality has been migrated to `src/modules/notification` and `src/config/db.js`. They can be safely removed after validation.
