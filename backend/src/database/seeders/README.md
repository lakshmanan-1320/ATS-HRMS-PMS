# Database Seeders

Seeders are scripts that populate the database with initial data needed for the application to function.

## Seeder Files

| File | Purpose | Creates |
|------|---------|---------|
| `001_verify_super_admin.js` | Verifies default super admin exists | None (created in migration) |
| `002_default_client_admin.js` | Creates a demo client admin for testing | 1 client admin user |
| `003_default_hierarchy_levels.js` | Creates standard org hierarchy levels | L1-L5 hierarchy levels |
| `004_sample_departments.js` | Creates sample departments | 3 top-level departments |
| `seedSubDepartments.js` | Creates sub-departments under main depts | Sub-departments |
| `seedL1Employee.js` | Creates sample employees | L1-L5 employees |

## Usage

### Run All Seeders (Recommended for First Setup)

```bash
npm run db:seed all
# or simply
npm run db:seed
```

**Execution Order:**
1. Verify super admin exists
2. Create default client admin
3. Create hierarchy levels (L1-L5)
4. Create sample departments
5. Create sub-departments
6. Create sample employees

### Run Individual Seeders

```bash
# Verify admin
npm run db:seed verify-admin

# Create specific level employees
npm run db:seed L1
npm run db:seed L2
npm run db:seed L3

# Create sub-departments
npm run db:seed sub-depts
```

## Default Credentials

### Super Admin
- **Email**: `admin@insighttechnology.in`
- **Password**: See migration (created in 001_schema.sql)
- **Role**: SUPER_ADMIN

### Demo Client Admin
- **Email**: `demo@insight.local`
- **Password**: `Demo@12345`
- **Role**: CLIENT_ADMIN
- **⚠️ WARNING**: Change this password in production immediately!

## Seeder Details

### 001_verify_super_admin.js
- Verifies the default super admin exists (created in migration)
- Does NOT create; only validates
- If not found, exits with error (run migrations first)

### 002_default_client_admin.js
- Creates a demo client admin if none exist
- **Email**: demo@insight.local
- **Password**: Demo@12345
- Used for testing the multi-tenant setup
- Skipped if any client admin already exists

### 003_default_hierarchy_levels.js
- Creates 5 hierarchy levels for the client admin:
  - **L1**: CEO
  - **L2**: Director
  - **L3**: Manager
  - **L4**: Executive
  - **L5**: Associate
- Skips if already exist

### 004_sample_departments.js
- Creates 3 top-level departments:
  - Tech Consulting
  - HR Recruitment
  - Digital Marketing
- Parent departments for sub-departments
- Skipped if already exist

### seedSubDepartments.js
- Creates sub-departments under the top-level departments
- Example:
  - Tech Consulting → Software Development
  - HR Recruitment → Talent Acquisition
  - Digital Marketing → SEO & Content

### seedL1Employee.js
- Creates sample employees at specified hierarchy levels
- Accepts level: L1, L2, L3, L4, or L5
- Default (no arg): Creates L1 employees

## Re-running Seeders

Seeders are **idempotent**—they check if data already exists before creating:

```bash
# Safe to run multiple times
npm run db:seed all
# Only creates data that doesn't exist yet
```

## Troubleshooting

### Error: "No client admin found"
- Run migrations first: `npm run db:migrate`
- Run seeders in order: `npm run db:seed all`

### Error: "No super admin found"
- Verify migration 001_schema.sql ran successfully
- Check that super_admins table was created

### Duplicate key error
- Database already seeded
- Safe to ignore or run `npm run db:seed all` again (idempotent)

## Production Setup

For production:

1. **Run migrations**: `npm run db:migrate`
2. **Verify admin**: `npm run db:seed` (runs all)
3. **Create real admin users** via UI or separate script
4. **Delete demo account**: `demo@insight.local`
5. **Set proper hierarchy levels** for your org structure
6. **Import real departments** from your org chart

## Adding New Seeders

To add a new seeder:

1. Create file in `seeders/`: `005_my_seeder.js`
2. Export async function that performs seeding
3. Use existing pattern with error handling
4. Add to `runSeeds.js` in correct order
5. Update this README

Example:

```javascript
// seeders/005_my_seeder.js
const { query } = require('../../config/db')

async function seed() {
  try {
    // Your seeding logic
    console.log('✅ Seeder completed')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

module.exports = seed
```

Then in `runSeeds.js`, add to the "all" section:

```javascript
const mySeed = require('./seeders/005_my_seeder')
await mySeed()
```
