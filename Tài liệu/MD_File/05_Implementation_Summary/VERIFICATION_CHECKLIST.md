# ✅ AI Chat Implementation - Verification Checklist

## Phase 1: Setup (Day 1)

### 1.1 Environment Setup

- [ ] Clone repo & navigate to project
- [ ] `.env` file exists with:
  - [ ] `GEMINI_API_KEY=AIzaSyCgfQsbwmulX0qdWQOIx_-LODiVWhryBxc`
  - [ ] `OLLAMA_URL=http://localhost:11434`
  - [ ] `OLLAMA_MODEL=mistral`
  - [ ] `CHROMADB_PATH=./data/chromadb`

### 1.2 Dependencies

- [ ] Backend: `npm install` completed
  - [ ] `@google/generative-ai` installed
  - [ ] `axios` installed
  - [ ] `chromadb` installed
- [ ] Frontend: `npm install` completed

### 1.3 Ollama Setup

- [ ] Docker installed
- [ ] Ollama container running:
  ```bash
  docker ps | grep ollama  # Should show "ekg-ollama"
  ```
- [ ] Model downloaded:
  ```bash
  curl http://localhost:11434/api/tags  # Should return models list
  ```
- [ ] Ollama health check passing

---

## Phase 2: Backend Verification (Day 1-2)

### 2.1 Code Compilation

- [ ] Backend builds without errors:
  ```bash
  cd ekg-backend
  npm run build  # Should complete successfully
  ```
- [ ] No TypeScript errors in:
  - [ ] `src/ai/` folder
  - [ ] `src/chat/` folder
  - [ ] `src/search/` folder

### 2.2 Module Registration

- [ ] Check `src/app.module.ts`:
  - [ ] `import { AiModule }` present
  - [ ] `import { ChatModule }` present
  - [ ] Both in `@Module({ imports: [...] })`

### 2.3 Service Availability

- [ ] All services exported:
  - [ ] `QueryClassifierService`
  - [ ] `OllamaService`
  - [ ] `ChromaDBService`
  - [ ] `GeminiService`
  - [ ] `ChatService`
  - [ ] `SearchService`

### 2.4 Start Backend

- [ ] Backend starts without errors:
  ```bash
  npm run start:dev
  # Should log: "🚀 API ready at http://localhost:3002/docs"
  ```
- [ ] Swagger API available:
  ```bash
  curl http://localhost:3002/docs  # Status 200
  ```

---

## Phase 3: API Testing (Day 2)

### 3.1 Chat Endpoint

- [ ] Health check works:

  ```bash
  curl http://localhost:3002/chat/health
  # Response: { "status": "ok", "services": {...} }
  ```

- [ ] Index endpoint works:

  ```bash
  curl -X POST http://localhost:3002/chat/index
  # Response: { "message": "Entities indexed successfully..." }
  ```

- [ ] Verify ChromaDB files created:
  ```bash
  ls -la ekg-backend/data/chromadb/
  # Should show: employees.json, skills.json, departments.json, projects.json
  ```

### 3.2 Chat Processing

- [ ] Simple query works:

  ```bash
  curl -X POST http://localhost:3002/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Danh sách nhân viên"}'
  # Response: { "response": "...", "queryLevel": "simple", ... }
  ```

- [ ] Search query works:

  ```bash
  curl -X POST http://localhost:3002/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Tìm Java developer"}'
  # Response: { "response": "...", "queryLevel": "simple" or "medium", ... }
  ```

- [ ] Complex query works (needs Gemini):
  ```bash
  curl -X POST http://localhost:3002/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Tư vấn cho tôi"}'
  # Response: { "response": "...", "queryLevel": "complex", ... }
  ```

### 3.3 Response Structure

- [ ] All responses include:
  - [ ] `message` - original user message
  - [ ] `response` - AI response
  - [ ] `queryType` - classification type
  - [ ] `queryLevel` - "simple"/"medium"/"complex"
  - [ ] `processingTime` - milliseconds
  - [ ] `timestamp` - ISO date

---

## Phase 4: Frontend Integration (Day 3)

### 4.1 Service Files

- [ ] `ekg-frontend/apps/web/src/server/services/chat.ts` exists
- [ ] Functions available:
  - [ ] `sendChatMessage(message)`
  - [ ] `indexEntitiesToChroma()`
  - [ ] `checkChatHealth()`

### 4.2 Chat Component

- [ ] `src/components/chat/Chat.tsx` updated:
  - [ ] Import: `import { sendChatMessage }`
  - [ ] handleSendMessage uses `sendChatMessage()`
  - [ ] Response displays correctly

### 4.3 Environment

- [ ] `.env.local` has:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3002
  ```

### 4.4 Frontend Start

- [ ] Frontend starts:
  ```bash
  npm run dev
  # Should show: "▲ Next.js 15.0.0"
  ```
- [ ] No console errors
- [ ] Chat page loads: `http://localhost:3000`

---

## Phase 5: End-to-End Testing (Day 3-4)

### 5.1 Chat Interface

- [ ] Chat loads and renders
- [ ] Can type messages
- [ ] Send button works
- [ ] Messages appear in chat history
- [ ] Bot responses display

### 5.2 Different Query Types

- [ ] Simple query ("Danh sách nhân viên"):

  - [ ] Response appears (should be <200ms)
  - [ ] Shows employee list
  - [ ] `queryLevel` is "simple"

- [ ] Medium query ("Tìm Java"):

  - [ ] Response appears (should be <500ms)
  - [ ] Uses semantic search
  - [ ] `queryLevel` is "simple" or "medium"

- [ ] Complex query ("Tư vấn"):
  - [ ] Response appears (may take 1-2s, using Gemini)
  - [ ] Intelligent reasoning
  - [ ] `queryLevel` is "complex"

### 5.3 Chat Features

- [ ] New chat button works
- [ ] Can switch between chats
- [ ] Chat titles update
- [ ] Delete chat works
- [ ] Dark/light theme toggle works
- [ ] Mobile responsive

### 5.4 Error Handling

- [ ] Invalid query shows error gracefully
- [ ] Network error shows message
- [ ] Timeout shows message
- [ ] No JavaScript errors in console

---

## Phase 6: Performance (Day 4)

### 6.1 Latency

- [ ] Simple queries: <200ms
- [ ] Medium queries: <500ms
- [ ] Complex queries: 1-3 seconds (Gemini + context)

### 6.2 Resource Usage

- [ ] Backend memory usage: <500MB
- [ ] Ollama memory usage: <2GB
- [ ] Frontend loads in <3s

### 6.3 ChromaDB

- [ ] Vector files persist in `data/chromadb/`
- [ ] Indexing completes successfully
- [ ] Search results improve with more data

---

## Phase 7: Production Readiness (Day 5+)

### 7.1 Security

- [ ] Gemini API key not exposed in frontend
- [ ] CORS configured correctly
- [ ] Rate limiting in place (optional)
- [ ] Input validation working

### 7.2 Logging

- [ ] Backend logs are informative
- [ ] Errors logged properly
- [ ] No sensitive data in logs
- [ ] Log rotation configured (optional)

### 7.3 Documentation

- [ ] OLLAMA_SETUP.md complete
- [ ] FRONTEND_CHAT_SETUP.md complete
- [ ] IMPLEMENTATION_SUMMARY.md complete
- [ ] QUICK_START.md complete
- [ ] Code commented

### 7.4 Deployment Prep

- [ ] `.env.production` prepared (if deploying)
- [ ] Build process tested
- [ ] Docker image ready (optional)
- [ ] CI/CD setup (optional)

---

## Troubleshooting Quick Reference

| Issue                        | Solution                                      |
| ---------------------------- | --------------------------------------------- |
| Ollama not responding        | `docker restart ollama` or run `ollama serve` |
| Model not found              | `docker exec ollama ollama pull mistral`      |
| 404 on /chat                 | Check backend running & ChatModule imported   |
| Slow responses               | Ollama warming up (normal first time)         |
| Gemini API error             | Check API key in `.env`                       |
| ChromaDB errors              | Run `POST /chat/index` to re-index            |
| Frontend can't reach backend | Check NEXT_PUBLIC_API_URL & CORS              |

---

## Success Criteria

✅ All items checked = **Ready for Production**

Your AI chat system is fully operational when:

1. ✅ Backend running without errors
2. ✅ All `/chat` endpoints responding
3. ✅ ChromaDB persisting data
4. ✅ Frontend displaying responses
5. ✅ All 3 query levels working
6. ✅ Performance acceptable
7. ✅ No console errors

---

**You're all set! 🎉**
