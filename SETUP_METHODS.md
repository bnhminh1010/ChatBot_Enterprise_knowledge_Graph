# 🎯 Complete Setup Guide - Choose Your Method

## 🚀 Method 1: Fully Automated (RECOMMENDED)

### Requires:

- Docker Desktop installed
- That's it!

### Windows (PowerShell)

```powershell
# From project root
.\start-dev.ps1
```

### Windows (CMD)

```cmd
cd /d "path\to\project"
start-dev.bat
```

### Linux/Mac

```bash
chmod +x start-dev.sh
./start-dev.sh
```

**What happens automatically:**

1. ✅ Checks Docker installed
2. ✅ Starts/creates Ollama container
3. ✅ Downloads 'mistral' model (if needed)
4. ✅ Starts backend server
5. ✅ Listens on http://localhost:3002

**Output:**

```
✅ Docker found
✅ Ollama is running!
✅ Model 'mistral' is ready!
✅ Ollama is fully configured and ready!
🚀 API ready at http://localhost:3002/docs
```

---

## 🐳 Method 2: Docker Compose (Simple)

### Requires:

- Docker Desktop installed
- docker-compose.ollama.yml

### Start Everything

```bash
docker-compose -f docker-compose.ollama.yml up -d
```

### Download Model

```bash
docker exec ollama ollama pull mistral
```

### Start Backend (separate terminal)

```bash
cd ekg-backend
npm run start:dev
```

---

## 🔧 Method 3: Manual (Full Control)

### Step 1: Start Ollama

```bash
docker pull ollama/ollama

docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama
```

### Step 2: Download Model

```bash
docker exec ollama ollama pull mistral
```

### Step 3: Verify Ollama

```bash
curl http://localhost:11434/api/tags
# Should return models list
```

### Step 4: Start Backend

```bash
cd ekg-backend
npm run start:dev
```

### Step 5: Start Frontend (new terminal)

```bash
cd ekg-frontend/apps/web
npm run dev
```

---

## ✅ Verification

### Check Ollama Running

```bash
# Should return models list
curl http://localhost:11434/api/tags

# Or via Docker
docker ps | grep ollama
```

### Check Backend Running

```bash
# Should return 200
curl http://localhost:3002/docs

# Or test chat API
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### Check Frontend Running

```bash
# Open in browser
http://localhost:3000
```

---

## 🎯 Recommended Setup

### For Windows Users

**Use Method 1:**

```powershell
.\start-dev.ps1
```

Then in another terminal:

```powershell
cd ekg-frontend\apps\web
npm run dev
```

### For Mac/Linux Users

**Use Method 1:**

```bash
./start-dev.sh
```

Then in another terminal:

```bash
cd ekg-frontend/apps/web
npm run dev
```

### For Docker Enthusiasts

**Use Method 2:**

```bash
docker-compose -f docker-compose.ollama.yml up -d
docker exec ollama ollama pull mistral
cd ekg-backend && npm run start:dev
```

---

## 📊 Startup Times

| Method                    | Total Time    | Setup Complexity |
| ------------------------- | ------------- | ---------------- |
| Method 1 (Automated)      | 30-60 seconds | ⭐ Very Easy     |
| Method 2 (Docker Compose) | 45-90 seconds | ⭐⭐ Easy        |
| Method 3 (Manual)         | 5-10 minutes  | ⭐⭐⭐ Moderate  |

---

## 🆘 Quick Troubleshooting

| Issue                       | Solution                                      |
| --------------------------- | --------------------------------------------- |
| "Docker not found"          | Install Docker Desktop                        |
| "Port 11434 in use"         | `docker stop ollama` then retry               |
| "Model not found"           | `docker exec ollama ollama pull mistral`      |
| "Cannot connect to backend" | Check http://localhost:3002 in browser        |
| "Frontend can't reach API"  | Check CORS, NEXT_PUBLIC_API_URL in .env.local |

---

## 🚀 Next Steps After Starting

### 1. Index Entities (one-time)

```bash
curl -X POST http://localhost:3002/chat/index
```

### 2. Test Chat API

```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Danh sách nhân viên"}'
```

### 3. Open Frontend

```
http://localhost:3000
```

### 4. Start Chatting! 🎉

- Try: "Danh sách nhân viên"
- Try: "Tìm Java developer"
- Try: "Tư vấn cho tôi"

---

## 📚 Additional Resources

| Document                    | Purpose                   |
| --------------------------- | ------------------------- |
| `AUTOMATED_STARTUP.md`      | Automated startup details |
| `OLLAMA_SETUP.md`           | Ollama installation guide |
| `QUICK_START.md`            | 3-step quick start        |
| `IMPLEMENTATION_SUMMARY.md` | Architecture & examples   |
| `VERIFICATION_CHECKLIST.md` | Testing checklist         |

---

## 💡 Pro Tips

1. **Keep Ollama running**: Don't stop the container between restarts
2. **Persistent volumes**: Docker stores model in `ollama:/root/.ollama`
3. **Change model**: Set `OLLAMA_MODEL=phi` in `.env` for lighter model
4. **Check logs**: `docker logs ollama` for troubleshooting
5. **Restart everything**: `docker-compose -f docker-compose.ollama.yml down` then up

---

## ✨ Summary

**Recommended: Use Method 1 (Fully Automated)**

Just run:

```
.\start-dev.ps1    # Windows PowerShell
./start-dev.sh     # Linux/Mac
start-dev.bat      # Windows CMD
```

Everything else is automatic! 🚀

---

**Questions? Check the docs or review the logs!**
