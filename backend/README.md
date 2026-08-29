# Backend — Refactor Notes

This folder contains the backend for the HRMS application. The AI assistant has been integrated with the existing auth and tenant model without bypassing the HRMS authorization layer.

## Key updates

- Migrations moved to `src/database/migrations` with runner `src/database/runMigrations.js`.
- Seeds moved to `src/database/seeders` with runner `src/database/runSeeds.js`.
- Centralized DB helper in `src/config/db.js` with `getPool`, `query`, and `withTransaction`.
- AI chat is protected by authenticated backend context and organization-scoped role checks.
- Policy retrieval and prompt generation are tenant-scoped and reject unauthorized employee-salary questions.
- Ollama chat and embedding calls include timeout handling and dimension validation.

## Required environment variables

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=60m

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrms
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hrms

OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
AI_TIMEOUT_MS=20000
RAG_TOP_K=8
RAG_MIN_SIMILARITY=0.45
```

## Quick commands

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

- Start backend:
```powershell
npm start
```

- Run tests:
```powershell
npm test
```

- Run focused AI regression:
```powershell
npm test -- --runTestsByPath src/ai/__tests__/ai.service.test.js
```

## AI chat endpoint

```http
POST /api/ai/chat
Authorization: Bearer <jwt>
Content-Type: application/json
```

Example body:
```json
{
  "message": "How many leaves do I have?"
}
```

The API trusts the authenticated backend session and rejects client-supplied role or organization overrides.
