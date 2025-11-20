# 🤖 Kiến trúc Chatbot AI - Tài liệu kỹ thuật

## 📋 Tổng quan

Chatbot AI sử dụng kiến trúc **3-tier intelligent routing** để xử lý các loại query khác nhau với độ phức tạp tăng dần.

## 🏗️ Kiến trúc tổng thể

```
User Input (Frontend)
    ↓
POST /chat
    ↓
ChatController.processQuery()
    ↓
ChatService.processQuery()
    ↓
QueryClassifierService.classifyQuery()  ← Phân loại độ khó
    ↓
    ├─ SIMPLE → handleSimpleQuery() → Neo4j (nhanh, <100ms)
    ├─ MEDIUM → handleMediumQuery() → ChromaDB + Neo4j (trung bình, <500ms)
    └─ COMPLEX → handleComplexQuery() → Gemini API (chậm, 1-3s)
    ↓
Response → Frontend
```

## 🔍 Các thành phần chính

### 1. QueryClassifierService (`src/ai/query-classifier.service.ts`)

**Chức năng:** Phân loại query thành 3 mức độ dựa trên keywords và patterns.

**Cách hoạt động:**
- Sử dụng regex patterns để nhận diện intent
- Trả về: `level`, `type`, `value`, `keywords`

**Các loại query được nhận diện:**

#### SIMPLE Queries (Neo4j)
- `list-employees`: "Danh sách nhân viên", "List employees"
- `list-departments`: "Danh sách phòng ban"
- `list-skills`: "Danh sách kỹ năng"
- `list-projects`: "Danh sách dự án"
- `search-global`: "Tìm [tên]", "Search [keyword]"
- `get-employee`: "Nhân viên tên [tên]"
- `get-department`: "Phòng ban tên [tên]"

#### MEDIUM Queries (ChromaDB + Neo4j)
- `aggregate`: "Có bao nhiêu nhân viên", "Count employees"
- `filter-search`: "Tìm nhân viên có kỹ năng Java"
- `compare`: "So sánh 2 dự án"
- `relationship`: "Dự án của nhân viên X"

#### COMPLEX Queries (Gemini API)
- `recommend`: "Tư vấn nhân viên phù hợp", "Đề xuất team"
- `analyze`: "Phân tích năng lực team"
- `create`: "Tạo kế hoạch", "Lên kế hoạch"
- `reasoning`: "Tại sao cần tuyển thêm nhân viên?"
- `unknown`: Mặc định cho các query không nhận diện được

### 2. ChatService (`src/chat/chat.service.ts`)

**Chức năng:** Xử lý logic chính của chatbot.

#### Flow xử lý:

```typescript
async processQuery(message: string) {
  1. Phân loại query → QueryClassifierService
  2. Xử lý theo level:
     - simple → handleSimpleQuery()
     - medium → handleMediumQuery()
     - complex → handleComplexQuery()
  3. Trả về response với metadata
}
```

#### handleSimpleQuery()
- **Dữ liệu:** Lấy trực tiếp từ Neo4j qua các Services
- **Ví dụ:**
  - `list-employees` → `employeesService.list()`
  - `search-global` → `searchService.search()`
- **Tốc độ:** < 100ms

#### handleMediumQuery()
- **Dữ liệu:** Kết hợp ChromaDB (semantic search) + Neo4j
- **Ví dụ:**
  - `filter-search` → ChromaDB search → Fallback Neo4j nếu lỗi
  - `aggregate` → Tổng hợp từ nhiều services
  - `compare` → Dùng Gemini để so sánh
- **Tốc độ:** < 500ms

#### handleComplexQuery()
- **Dữ liệu:** Gemini API với context từ Neo4j
- **Context:** Số lượng employees, departments, projects
- **Ví dụ:**
  - "Tư vấn team phù hợp" → Gemini với context về nhân viên
- **Tốc độ:** 1-3s

### 3. ChromaDBService (`src/ai/chroma-db.service.ts`)

**Chức năng:** Vector database cho semantic search.

**Cách hoạt động:**
1. **Indexing:** 
   - Lấy dữ liệu từ Neo4j (employees, skills, departments, projects)
   - Tạo embedding bằng Ollama (Mistral)
   - Lưu vào file JSON (mỗi collection = 1 file)

2. **Searching:**
   - Tạo embedding cho query text
   - Tính cosine similarity với tất cả vectors
   - Trả về top K kết quả

**Collections:**
- `employees.json`
- `skills.json`
- `departments.json`
- `projects.json`

**Lưu ý:** Cần chạy `POST /chat/index` để index dữ liệu lần đầu.

### 4. GeminiService (`src/ai/gemini.service.ts`)

**Chức năng:** Gọi Gemini API cho complex queries.

**Model:** `gemini-1.5-flash` (có thể config qua `GEMINI_MODEL`)

**Methods:**
- `generateResponse(prompt, context)` - Generate text
- `chat(messages)` - Conversational chat
- `streamResponse()` - Streaming response
- `extractInfo()` - Extract structured data
- `classify()` - Text classification
- `summarize()` - Text summarization

**Error handling:** Đã được cải thiện với thông báo lỗi chi tiết.

### 5. OllamaService (`src/ai/ollama.service.ts`)

**Chức năng:** Gọi Ollama local cho embeddings.

**Model:** `mistral` (config qua `OLLAMA_MODEL`)

**Methods:**
- `generateEmbedding(text)` - Tạo embedding vector
- `generateResponse(prompt)` - Generate text (fallback)
- `isHealthy()` - Kiểm tra Ollama server
- `hasModel()` - Kiểm tra model có tồn tại

## 📊 Flow xử lý chi tiết

### Ví dụ 1: Simple Query

```
User: "Danh sách nhân viên"
    ↓
QueryClassifier → { level: 'simple', type: 'list-employees' }
    ↓
handleSimpleQuery('list-employees')
    ↓
employeesService.list()
    ↓
Neo4j Query: MATCH (e:NhanSu) RETURN ...
    ↓
Response: "Danh sách nhân viên (10):\n• Nguyễn Văn A - Developer\n..."
```

### Ví dụ 2: Medium Query

```
User: "Tìm nhân viên có kỹ năng Java"
    ↓
QueryClassifier → { level: 'medium', type: 'filter-search' }
    ↓
handleMediumQuery('filter-search', ..., message)
    ↓
ChromaDBService.search('employees', message, 5)
    ↓
  1. Tạo embedding cho "Tìm nhân viên có kỹ năng Java"
  2. Tính similarity với tất cả employee vectors
  3. Trả về top 5
    ↓
Response: "Nhân viên phù hợp:\n• Nguyễn Văn A (Relevance: 85.2%)\n..."
```

**Fallback:** Nếu ChromaDB lỗi → dùng `searchService.search()` (Neo4j text search)

### Ví dụ 3: Complex Query

```
User: "Tư vấn cho tôi một team phù hợp cho dự án web"
    ↓
QueryClassifier → { level: 'complex', type: 'recommend' }
    ↓
handleComplexQuery('recommend', ..., message)
    ↓
  1. Lấy context: employees.length, departments.length, projects.length
  2. Tạo prompt với context
  3. Gọi GeminiService.generateResponse()
    ↓
Gemini API → Response
    ↓
Response: "Dựa trên dữ liệu hệ thống, tôi đề xuất team gồm..."
```

## 🔧 Cấu hình

### Environment Variables

```env
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j123
NEO4J_DATABASE=neo4j

# Gemini
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-1.5-flash  # hoặc gemini-1.5-pro

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# ChromaDB
CHROMADB_PATH=./data/chromadb
```

## 🚀 API Endpoints

### POST /chat
Xử lý user query

**Request:**
```json
{
  "message": "Danh sách nhân viên"
}
```

**Response:**
```json
{
  "message": "Danh sách nhân viên",
  "response": "Danh sách nhân viên (10):\n• ...",
  "queryType": "list-employees",
  "queryLevel": "simple",
  "processingTime": 45,
  "timestamp": "2025-01-20T10:30:00Z"
}
```

### POST /chat/index
Index entities vào ChromaDB

**Response:**
```json
{
  "message": "Entities indexed successfully to ChromaDB"
}
```

### GET /chat/health
Kiểm tra health của hệ thống

**Response:**
```json
{
  "status": "ok",
  "services": {
    "neo4j": true,
    "env": {
      "NEO4J_URI": true,
      "NEO4J_USER": true,
      "NEO4J_PASSWORD": true,
      "GEMINI_API_KEY": true
    }
  },
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## ⚠️ Vấn đề tiềm ẩn và giải pháp

### 1. ChromaDB chưa được index
**Vấn đề:** Medium queries với `filter-search` sẽ fallback về Neo4j text search.

**Giải pháp:** Chạy `POST /chat/index` sau khi có dữ liệu.

### 2. Ollama không chạy
**Vấn đề:** ChromaDB không thể tạo embedding → fallback về Neo4j.

**Giải pháp:** 
```bash
docker-compose up -d ollama
# hoặc
ollama serve
```

### 3. Gemini API lỗi
**Vấn đề:** Complex queries sẽ fail.

**Giải pháp:** 
- Kiểm tra API key
- Kiểm tra quota
- Model name đúng (gemini-1.5-flash)

### 4. Query không được nhận diện
**Vấn đề:** Query mặc định về `complex` → tốn thời gian và cost.

**Giải pháp:** Cải thiện `QueryClassifierService` với thêm patterns.

## 🔄 Cải thiện đề xuất

### 1. Caching
- Cache kết quả simple queries (Redis/Memory)
- Cache embeddings trong ChromaDB

### 2. Streaming Response
- Sử dụng `streamResponse()` cho complex queries
- Hiển thị response từng phần cho UX tốt hơn

### 3. Context Management
- Lưu conversation history
- Context-aware responses

### 4. Better Error Handling
- Retry logic cho API calls
- Graceful degradation (fallback)

### 5. Monitoring
- Log query types và processing time
- Metrics cho performance

## 📝 Ví dụ sử dụng

### Test Simple Query
```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Danh sách nhân viên"}'
```

### Test Medium Query
```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tìm nhân viên có kỹ năng Java"}'
```

### Test Complex Query
```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tư vấn cho tôi một team phù hợp"}'
```

### Index Data
```bash
curl -X POST http://localhost:3002/chat/index
```

### Check Health
```bash
curl http://localhost:3002/chat/health
```

## 🎯 Kết luận

Chatbot AI sử dụng kiến trúc hybrid:
- **Simple:** Neo4j (nhanh, chính xác)
- **Medium:** ChromaDB + Neo4j (semantic search)
- **Complex:** Gemini API (AI reasoning)

Mỗi tier được tối ưu cho use case riêng, đảm bảo performance và cost-effectiveness.

