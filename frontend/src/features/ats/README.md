# ATS — Applicant Tracking System (Frontend)

## Overview
This folder contains all frontend logic for the **ATS (Applicant Tracking System)** module of **Insight HCM**.

ATS is part of the same platform as HRMS and PMS. It shares the same:
- Authentication & session (`useAuthStore`)
- Organization/tenant context
- Employee & department data (from HRMS features in `../features/`)
- Module-gate hook (`useModules`)
- Sidebar layout (`ClientAdminSidebar`)

### Licensing flexibility (future)
ATS can be enabled independently or bundled with other products:
- `HRMS only`
- `HRMS + ATS`
- `HRMS + PMS`
- `HRMS + PMS + ATS` (full suite)

It is **not isolated** — it can share HRMS components (employee pickers, department selectors) and PMS context where needed (e.g. linking a hired candidate to an employee record).

---

## How to Start

### 1. Check the module gate
ATS pages must only render if the module is enabled for the org.
Use the existing `useModules()` hook — same pattern as PMS modules:
```jsx
const { isEnabled } = useModules();
if (!isEnabled('ats')) return <AccessDenied />;
```

### 2. Add the route
In `src/App.jsx` or `src/routes/index.jsx`, add:
```jsx
{isEnabled('ats') && (
  <Route path="/ats/*" element={<AtsRoutes />} />
)}
```

### 3. Add a sidebar link
In `ClientAdminSidebar.jsx`, add one block (same pattern as existing PMS links):
```jsx
isEnabled('ats') && {
  id: 'ats',
  icon: FiBriefcase,
  label: 'Recruitment',
  path: '/ats'
}
```

### 4. Create sub-modules here
Follow the same pattern used in `../features/` — each module gets:
```
ats/
└── <module>/
    ├── pages/            ← Full page components
    ├── components/       ← Sub-components
    ├── <module>.store.js
    └── <module>.api.js
```

---

## Planned Sub-Modules
| Sub-Module    | Description                                           |
|---------------|-------------------------------------------------------|
| `job`         | Job postings, job description management              |
| `candidate`   | Candidate profiles, resume parsing                    |
| `pipeline`    | Kanban hiring stages                                  |
| `interview`   | Interview scheduling, feedback collection             |
| `offer`       | Offer letters, digital signing                        |
| `onboarding`  | Pre-boarding checklist → links to HRMS employee       |

---

## Rules
- Every API call goes through `../axiosSetup.js` (JWT is attached automatically)
- Always gate pages and sidebar links with `isEnabled('ats')`
- You **may** import shared HRMS components (e.g. employee dropdowns from `../features/employee/`) — do not duplicate them
- Follow the same Zustand store pattern used across PMS and HRMS features
