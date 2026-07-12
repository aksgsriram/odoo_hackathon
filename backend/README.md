# AssetFlow — Backend API

Node.js + Express + Sequelize (SQLite by default, Postgres-ready) backend for the AssetFlow
Enterprise Asset & Resource Management System.

## Stack

- **Runtime:** Node.js + Express
- **Database:** SQLite via Sequelize (zero-config, file-based — great for a hackathon demo).
  Swap to Postgres by changing three env vars — no code changes needed.
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs` password hashing
- **No ORM migrations required** — `sequelize.sync()` builds the schema automatically on boot.

## Getting started

```bash
cd assetflow-backend
npm install
cp .env.example .env      # already done for you, but review values
npm run seed               # creates the Admin account + starter departments/categories
npm run dev                 # or: npm start
```

The API will be running at `http://localhost:5000`. Health check: `GET /api/health`.

**Default admin login** (from seed, override in `.env`):
- Email: `admin@assetflow.com`
- Password: `Admin@123`

### Switching to Postgres

In `.env`:
```
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assetflow
DB_USER=postgres
DB_PASSWORD=postgres
```
Then `npm install pg pg-hstore` (not included by default to keep the SQLite path dependency-free).

## Auth model (per spec)

- `POST /api/auth/signup` **always** creates a plain `Employee` account — there is no role field
  accepted at signup, by design.
- Only `PATCH /api/employees/:id/role` (Admin-only) can promote someone to `DepartmentHead` or
  `AssetManager`. This is the single place roles are ever assigned in the whole system.
- JWT is required on every route except `signup`, `login`, `forgot-password`, `reset-password`.
  Send it as `Authorization: Bearer <token>`.

## Roles

`Employee` · `DepartmentHead` · `AssetManager` · `Admin`

## Folder structure

```
src/
  config/db.js            Sequelize connection (SQLite/Postgres)
  models/                 One file per table + index.js wiring all associations
  middleware/              auth (JWT verify), roleCheck (RBAC), errorHandler
  utils/                    jwt, password hashing, asset-tag generator, activity logger
  controllers/              business logic, one file per feature area
  routes/                   Express routers, one file per feature area
  seed/seed.js              creates default Admin + starter master data
server.js                  app bootstrap
```

## API Reference

All responses are JSON: `{ success: boolean, ...data }` on success, `{ success: false, message }` on error.

### Auth — `/api/auth`
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/signup` | Public | Creates an `Employee` account only |
| POST | `/login` | Public | Returns JWT |
| POST | `/forgot-password` | Public | Returns a demo reset token (wire up email in prod) |
| POST | `/reset-password` | Public | `{ resetToken, newPassword }` |
| GET | `/me` | Auth | Session validation / current user |

### Dashboard — `/api/dashboard`
| GET | `/` | Auth | KPI cards + overdue returns (highlighted separately) + upcoming returns |

### Organization Setup — `/api`  (Admin-only writes)
| Method | Path | Notes |
|---|---|---|
| GET/POST/PUT/DELETE | `/departments` | Tab A — hierarchy via `parentDepartmentId` |
| GET/POST/PUT | `/categories` | Tab B — `customFields` JSON per category |
| GET | `/employees` | Tab C — directory, filter by department/role/status |
| PATCH | `/employees/:id/role` | **The only role-assignment endpoint** |
| PATCH | `/employees/:id/status` | Activate/deactivate |

### Assets — `/api/assets`
| Method | Path | Notes |
|---|---|---|
| POST | `/` | Auto-generates `assetTag` (AF-0001, ...) |
| GET | `/?q=&categoryId=&status=&departmentId=&location=&isBookable=` | Search/filter |
| GET | `/:id` | Includes allocation + maintenance history |
| PUT | `/:id` | Edit details |
| PATCH | `/:id/status` | Explicit lifecycle transition, validated against the allowed state machine |

Lifecycle states: `Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed`.
Allowed transitions are enforced server-side (see `src/models/Asset.js`).

### Allocation & Transfer — `/api/allocations`
| Method | Path | Notes |
|---|---|---|
| POST | `/` | Blocks with `409` + current holder + suggestion if already allocated |
| GET | `/?assetId=&employeeId=&departmentId=&status=` | |
| GET | `/overdue` | Also auto-flags `Active → Overdue` |
| POST | `/:id/return` | Return flow with condition notes, asset reverts to `Available` |
| POST | `/transfer-requests` | Requested → ... |
| GET | `/transfer-requests?status=&assetId=` | |
| PATCH | `/transfer-requests/:id/decision` | Approve → re-allocates + updates history automatically; Reject |

### Resource Booking — `/api/bookings`
| Method | Path | Notes |
|---|---|---|
| POST | `/` | Overlap validation: rejects if start < existing end AND end > existing start |
| GET | `/?assetId=&status=&from=&to=` | Calendar view; status computed live (Upcoming/Ongoing/Completed) |
| PATCH | `/:id/reschedule` | Re-validates overlap |
| PATCH | `/:id/cancel` | |

### Maintenance — `/api/maintenance-requests`
| Method | Path | Notes |
|---|---|---|
| POST | `/` | Any holder can raise |
| GET | `/?status=&assetId=&priority=` | |
| PATCH | `/:id/decision` | Approve flips asset to `Under Maintenance` immediately |
| PATCH | `/:id/assign-technician` | |
| PATCH | `/:id/start` | → In Progress |
| PATCH | `/:id/resolve` | → Resolved, asset back to `Available` |

### Audits — `/api/audits`
| Method | Path | Notes |
|---|---|---|
| POST | `/` | Creates cycle + assigns auditors + pre-populates `Pending` items for in-scope assets |
| GET | `/` , `/:id` | `:id` returns discrepancy report + summary counts |
| PATCH | `/:cycleId/items/:itemId` | Auditor marks Verified/Missing/Damaged (auditor-only, checked server-side) |
| PATCH | `/:id/close` | Locks cycle; `Missing` → asset status `Lost`, `Damaged` → condition updated |

### Reports — `/api/reports` (Admin/AssetManager/DepartmentHead)
`/utilization` · `/maintenance-frequency` · `/upcoming` · `/department-allocation` ·
`/booking-heatmap` · `/export?type=assets|maintenance|bookings&format=json|csv`

### Notifications — `/api/notifications`
`GET /?unreadOnly=true` · `PATCH /:id/read` · `PATCH /read-all`

### Activity Logs — `/api/activity-logs` (Admin only)
`GET /?userId=&entityType=&action=` — full audit trail of who did what, when.

## Design notes for the demo/judges

- **Conflict handling** (Allocation): returns `409` with the current holder's name and a
  `suggestion` pointing at the transfer-request endpoint — matches the Priya/Raj example in the spec.
- **Overlap validation** (Booking): classic interval-overlap check, matches the Room B2 example exactly
  (9:30–10:30 rejected, 10:00–11:00 accepted).
- **State machine** for asset lifecycle lives in `Asset.ALLOWED_TRANSITIONS` — easy to point to in a
  demo/code walkthrough as "proper ERP architecture."
- **Every mutating action** writes to `ActivityLog` and, where relevant, creates a `Notification` —
  satisfies Screen 10 (Activity Logs & Notifications) without bolting it on separately.
