# 🚀 AI Chat System - Automated Startup Guide

## ✨ What's New

Backend giờ **tự động kiểm tra, khởi động, và cấu hình Ollama**! Không cần setup thủ công nữa!

---

## 🎯 Quick Start (Simplest Way)

### Windows (PowerShell)

```powershell
.\start-dev.ps1
```

### Windows (CMD)

```cmd
start-dev.bat
```

### Linux/Mac

```bash
chmod +x start-dev.sh
./start-dev.sh
```

**That's it!** Script sẽ tự động:

1. ✅ Check Docker installed
2. ✅ Start/create Ollama container
3. ✅ Download model (nếu chưa có)
4. ✅ Start backend

---

## 📋 Auto-Init Flow

Khi backend start:

```
Backend Starting
    ↓
OllamaInitService.onModuleInit()
    ↓
Check Ollama running?
    ├─ NO → Try auto-start via Docker
    │   ├─ Container exists? → docker start
    │   └─ Not exists? → docker run (create new)
    ├─ Wait for Ollama ready
    ↓
Check model exists?
    ├─ NO → docker exec ollama ollama pull mistral
    ↓
✅ Ready for chat!
```

---

## 🔍 Console Output Examples

### Successful Startup

```
============================================================
🚀 Initializing Ollama...
============================================================
✅ Ollama is running!
✅ Model 'mistral' is ready!
============================================================
✅ Ollama is fully configured and ready!
============================================================

[Nest] 20 Nov, 16:45:23     LOG [NestFactory] Starting Nest application...
[Nest] 20 Nov, 16:45:24     LOG [InstanceLoader] Neo4jModule dependencies initialized
[Nest] 20 Nov, 16:45:24     LOG [InstanceLoader] AiModule dependencies initialized
[Nest] 20 Nov, 16:45:25     LOG [InstanceLoader] ChatModule dependencies initialized
[Nest] 20 Nov, 16:45:25     LOG [NestFactory] Nest application successfully started
🚀 API ready at http://localhost:3002/docs
```

### First Time (Auto-Pull Model)

```
============================================================
🚀 Initializing Ollama...
============================================================
✅ Ollama is running!
⚠️  Model 'mistral' not found
Pulling model 'mistral'...
Waiting for model... (1/60)
Waiting for model... (2/60)
...
✅ Model 'mistral' pulled successfully!
============================================================
✅ Ollama is fully configured and ready!
============================================================
```

### No Docker (Manual Setup Needed)

```
============================================================
🚀 Initializing Ollama...
============================================================
⚠️  Ollama is not running!
Attempting to auto-start Ollama...
❌ Failed to auto-start Ollama
⚠️  MANUAL SETUP REQUIRED:
1. Install Docker: https://www.docker.com/products/docker-desktop
2. Run: docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
3. Download model: docker exec ollama ollama pull mistral
4. Restart backend: npm run start:dev
```

---

## 🛠️ Manual Steps (If Auto-Init Fails)

### 1. Install Docker

- Windows/Mac: https://www.docker.com/products/docker-desktop
- Linux: https://docs.docker.com/get-docker/

### 2. Start Ollama Manually

```bash
# Create & start container
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama

# Download model
docker exec ollama ollama pull mistral
```

### 3. Start Backend

```bash
cd ekg-backend
npm run start:dev
```

---

## 📂 Startup Scripts

| File            | OS                   | Usage             |
| --------------- | -------------------- | ----------------- |
| `start-dev.ps1` | Windows (PowerShell) | `.\start-dev.ps1` |
| `start-dev.bat` | Windows (CMD)        | `start-dev.bat`   |
| `start-dev.sh`  | Linux/Mac            | `./start-dev.sh`  |

**Choose the one for your OS and run it!**

---

## 🔧 Advanced: Manual Backend Start

If you prefer to start Ollama separately:

```bash
# Terminal 1: Start Ollama
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
docker exec ollama ollama pull mistral

# Terminal 2: Start Backend
cd ekg-backend
npm run start:dev

# Terminal 3: Start Frontend
cd ekg-frontend/apps/web
npm run dev
```

---

## ⚙️ How Auto-Init Works

### OllamaInitService

New file: `src/ai/ollama-init.service.ts`

**Features:**

- ✅ Checks if Ollama is running
- ✅ Auto-starts via Docker if not running
- ✅ Handles existing containers (restart instead of recreate)
- ✅ Auto-pulls model if missing
- ✅ Waits for Ollama to be ready
- ✅ Clear console messages for each step
- ✅ Graceful error handling

---

## 🎯 Startup Scripts Features

### start-dev.ps1 (PowerShell)

```powershell
✅ Colored output (Cyan, Green, Red, Yellow)
✅ Check Docker installed
✅ Create/start Ollama
✅ Auto-navigate to ekg-backend
✅ Start backend with npm run start:dev
```

### start-dev.bat (CMD)

```batch
✅ Simple Windows batch script
✅ Check Docker available
✅ Create/start Ollama
✅ Start backend
```

### start-dev.sh (Bash)

```bash
✅ Cross-platform (Linux/Mac)
✅ Check Docker installed
✅ Create/start Ollama
✅ Start backend
```

---

## 🆘 Troubleshooting

### "Docker is not installed"

→ Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "Cannot find module... OllamaInitService"

→ Make sure you updated `ai.module.ts` with the import

### "Ollama timeout"

→ Docker might be starting slow, wait 10-15 seconds before retrying

### "Port 11434 already in use"

→ Another Ollama is running: `docker ps` to check, then `docker stop <container-id>`

---

## 📊 Comparison

| Method             | Setup Time   | Automation     | Flexibility |
| ------------------ | ------------ | -------------- | ----------- |
| **start-dev.ps1**  | 5 seconds    | Maximum ✅✅✅ | Good        |
| **Manual (old)**   | 5-10 minutes | None           | Full        |
| **Docker Compose** | 10 seconds   | High ✅✅      | Good        |

---

## 🎉 Summary

**Before**: Manual 5-10 minute setup  
**Now**: One command, ~5 seconds total!

```
# Just run ONE of these:
.\start-dev.ps1        # Windows PowerShell
start-dev.bat          # Windows CMD
./start-dev.sh         # Linux/Mac

# Done! Backend auto-configures Ollama and starts! 🚀
```

---

## 📚 Next Steps

1. ✅ Run `start-dev.ps1` (or appropriate script)
2. ✅ Backend starts automatically with Ollama
3. ✅ In another terminal: `cd ekg-frontend/apps/web && npm run dev`
4. ✅ Open http://localhost:3000 and start chatting!

---

**No more manual setup! Everything is automated! 🎉**
