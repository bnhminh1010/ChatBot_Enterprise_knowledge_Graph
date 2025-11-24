# Quick Start Scripts - Updated với Redis

## 🚀 Windows (Recommended)

```cmd
start-dev.bat
```

**Script này tự động**:

- ✅ Start **Neo4j** (database)
- ✅ Start **Redis** (refresh tokens + conversation cache)
- ✅ Start **Ollama** (local LLM)
- ✅ Start **Backend** (NestJS API)

## ⚙️ Manual Start (nếu cần)

```bash
# Start all Docker services
cd ekg-backend
docker-compose up -d

# Start backend
npm run start:dev

# Start frontend (terminal khác)
cd ekg-frontend/apps/web
npx next dev
```

## ✅ Verify Services Running

```bash
docker ps

# Should see 3 containers:
# - ekg-neo4j
# - ekg-redis
# - ekg-ollama
```

## 🛑 Stop All Services

```bash
cd ekg-backend
docker-compose down
```
