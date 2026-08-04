# ATS — Applicant Tracking System (Backend)

## Overview
This folder contains all backend logic for the **ATS (Applicant Tracking System)** module of **Insight HCM**.

ATS is part of the same platform as HRMS and PMS. It shares the same:
- Authentication & JWT (`req.user`)
- Organization context (`req.user.organizationId`)
- Employee & department data (from HRMS modules in `../modules/`)
- Module registry middleware (`requireModule`)

### Licensing flexibility (future)
ATS can be enabled independently or bundled:
- `HRMS only`
- `HRMS + ATS`
- `HRMS + PMS`
- `HRMS + PMS + ATS` (full suite)

It is **not isolated** — it can freely read shared HRMS data (employees, departments, hierarchy) to power features like candidate-to-employee conversion on hire.

---

## How to Start

### 1. Register the module
Add `ats` to the `organization_modules` table for any tenant that has ATS enabled:
```sql
INSERT INTO organization_modules (org_id, module_name, is_enabled)
VALUES ('<org_id>', 'ats', true);
```

### 2. Mount the router
In `../routes/index.js`, add at the bottom:
```js
const atsRoutes = require('../ats');
router.use('/ats', requireAuth, requireModule('ats'), atsRoutes);
```

### 3. Create sub-modules here
Follow the same pattern used in `../modules/` — each sub-module gets its own folder with:
```
ats/
└── <module>/
    ├── <module>.controller.js
    ├── <module>.service.js
    ├── <module>.repository.js
    └── <module>.routes.js
```

### 4. Create the master router
Create `ats/index.js` that mounts all ATS sub-routers:
```js
const express = require('express');
const router = express.Router();

// router.use('/jobs',       require('./job/job.routes'));
// router.use('/candidates', require('./candidate/candidate.routes'));
// router.use('/pipeline',   require('./pipeline/pipeline.routes'));
// router.use('/interviews', require('./interview/interview.routes'));
// router.use('/offers',     require('./offer/offer.routes'));

module.exports = router;
```

---

## Planned Sub-Modules
| Sub-Module   | Description                                          |
|--------------|------------------------------------------------------|
| `job`        | Job postings, descriptions, requirements             |
| `candidate`  | Candidate profiles, sourcing, resume parsing         |
| `pipeline`   | Hiring stages (Kanban board)                         |
| `interview`  | Scheduling, slots, interviewer feedback              |
| `offer`      | Offer letters, approval flow                         |
| `onboarding` | Pre-boarding tasks → links to HRMS employee on hire  |

---

## Rules
- **Always** filter by `req.user.organizationId` in every repository query (tenant isolation)
- **Always** use `requireModule('ats')` guard on every route — already applied at the top-level mount
- You **may** import HRMS services (e.g. `../modules/employee/employee.service.js`) to read shared data — do not duplicate employee/department logic
- Auth (`requireAuth`) is inherited from the top-level mount — do not re-apply inside sub-routes
