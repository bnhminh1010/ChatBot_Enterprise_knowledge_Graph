# 🚀 AI Chat System - Setup Guide

## Overview

Hệ thống chat AI hybrid với 3 mức độ xử lý:

- **Simple** (Danh sách, tìm kiếm): Neo4j + API
- **Medium** (So sánh, phân tích): ChromaDB + Neo4j
- **Complex** (Giới thiệu, lý luận): Gemini API

---

## 📋 Prerequisites

### 1. Backend Dependencies (✅ Đã cài)

```bash
npm install --save @google/generative-ai axios chromadb dotenv
```

### 2. Environment Variables (✅ Đã cập nhật .env)

```dotenv
# AI & Chat Configuration
GEMINI_API_KEY=AIzaSyCgfQsbwmulX0qdWQOIx_-LODiVWhryBxc
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
CHROMADB_PATH=./data/chromadb
```

---

## 🐳 Step 1: Setup Ollama (Local LLM Model)

### Option A: Docker (Recommended)

1. **Cài Docker** (nếu chưa có):
   - Windows: https://www.docker.com/products/docker-desktop
   - Tải và cài đặt

2. **Run Ollama Container**:

   ```bash
   # Pull Ollama image
   docker pull ollama/ollama

   # Run container (port 11434)
   docker run -d \
     --name ollama \
     -p 11434:11434 \
     -v ollama:/root/.ollama \
     ollama/ollama
   ```

3. **Download Model** (chọn 1 trong các sau):

   ```bash
   # Mistral (7B, ~5GB, nhanh, chất lượng tốt) - RECOMMENDED
   docker exec ollama ollama pull mistral

   # Neural Chat (7B, ~5GB, tối ưu cho chat)
   docker exec ollama ollama pull neural-chat

   # Phi (3.8B, ~2.5GB, nhẹ, nhanh)
   docker exec ollama ollama pull phi
   ```

4. **Test Ollama**:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Output sẽ là danh sách models đã download.

---

### Option B: Direct Installation (Nếu không có Docker)

1. **Download Ollama**:
   - https://ollama.ai/download
   - Cài đặt cho Windows/Mac/Linux

2. **Run Ollama**:

   ```bash
   ollama serve
   ```

   Mặc định sẽ listen ở `http://localhost:11434`

3. **Download Model** (trong terminal khác):
   ```bash
   ollama pull mistral
   ```

---

## 🔄 Step 2: Verify Backend Setup

1. **Backend đã cấu hình**:
   - ✅ `.env` có `GEMINI_API_KEY`, `OLLAMA_URL`
   - ✅ Dependencies cài đặt
   - ✅ Services tạo: AI, Chat modules
   - ✅ Endpoints: `POST /chat`, `POST /chat/index`

2. **Start Backend**:

   ```bash
   cd ekg-backend
   npm run start:dev
   ```

   Check logs:

   ```
   🚀 API ready at http://localhost:3002/docs
   ```

---

## 📦 Step 3: Index Entities to ChromaDB

ChromaDB lưu vector embeddings của employees, skills, departments, projects để semantic search nhanh hơn.

1. **Call index endpoint**:

   ```bash
   curl -X POST http://localhost:3002/chat/index
   ```

   Response:

   ```json
   {
     "message": "Entities indexed successfully to ChromaDB"
   }
   ```

2. **Check ChromaDB files**:
   ```bash
   ls -la ekg-backend/data/chromadb/
   # Sẽ thấy: employees.json, skills.json, departments.json, projects.json
   ```

---

## 💬 Step 4: Test Chat System

### Test via API (Postman/Curl):

```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Danh sách nhân viên"
  }'
```

Response:

```json
{
  "message": "Danh sách nhân viên",
  "response": "Danh sách nhân viên (42):\n• Nguyễn Văn A - Senior Dev\n• Trần Thị B - PM\n...",
  "queryType": "list-employees",
  "queryLevel": "simple",
  "processingTime": 145,
  "timestamp": "2024-11-20T..."
}
```

### Test via Frontend:

1. **Start Frontend**:

   ```bash
   cd ekg-frontend
   npm run dev
   ```

2. **Open Chat**:
   - Vào `http://localhost:3000`
   - Gửi tin nhắn: "Danh sách nhân viên"
   - Bot sẽ respond từ `/chat` API

---

## 🧪 Test Cases

### Simple Queries (instant)

- "Danh sách nhân viên" → list-employees
- "Tìm Nguyễn" → search-global
- "Có bao nhiêu nhân viên" → aggregate (medium)

### Medium Queries (ChromaDB)

- "Tìm nhân viên có kỹ năng Java" → filter-search
- "So sánh 2 dự án" → compare

### Complex Queries (Gemini)

- "Tư vấn cho tôi một nhân viên phù hợp" → recommend
- "Phân tích năng lực của team" → analyze
- "Tại sao cần tuyển thêm nhân viên?" → reasoning

---

## 🔧 Troubleshooting

### 1. **Ollama not responding**

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If error, restart:
# Docker:
docker restart ollama

# Direct:
ollama serve
```

### 2. **Model not found**

```bash
# Check available models
curl http://localhost:11434/api/tags

# Pull missing model
docker exec ollama ollama pull mistral
# or
ollama pull mistral
```

### 3. **Gemini API Error**

- Check `.env` có `GEMINI_API_KEY` không
- Key có bị hết quota không (check Google Cloud Console)

### 4. **ChromaDB not persisting**

- Check `CHROMADB_PATH=./data/chromadb` trong `.env`
- Folder `ekg-backend/data/chromadb` phải tồn tại
- Nếu không, backend sẽ tạo tự động

### 5. **Backend starts slowly**

- Lần đầu tiên load Ollama model → chậm (normal)
- Cached lần sau sẽ nhanh

---

## 📊 Architecture

```
User Input (Chat.tsx)
    ↓
POST /chat endpoint
    ↓
QueryClassifier (phân loại độ khó)
    ↓
    ├─ Simple → handleSimpleQuery (Neo4j)
    ├─ Medium → handleMediumQuery (ChromaDB + Neo4j)
    └─ Complex → handleComplexQuery (Gemini API)
    ↓
Response
```

---

## 🚀 Next Steps

1. ✅ Cài Ollama
2. ✅ Run backend
3. ✅ Index entities: `POST /chat/index`
4. ✅ Test chat
5. (Optional) Fine-tune query classifier trong `query-classifier.service.ts`
6. (Optional) Add more entity types tới ChromaDB

---

## 📝 API Endpoints

| Method | Endpoint       | Description                |
| ------ | -------------- | -------------------------- |
| POST   | `/chat`        | Process user query         |
| POST   | `/chat/index`  | Index entities to ChromaDB |
| GET    | `/chat/health` | Check system health        |

---

## 💡 Tips

- **Vector search slow?** → Increase batch size trong `ChromaDBService.addDocuments()`
- **Response quality poor?** → Verify Ollama model loaded: `curl http://localhost:11434/api/tags`
- **Want better quality?** → Use Gemini API cho complex queries (mặc định đã setup)

---

**Happy chatting! 🎉**
