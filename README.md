# Enterprise Knowledge Graph (EKG) - APTX3107 Company

> **Đồ án chuyên ngành** - Khoa Công nghệ Thông tin, Đại học Công nghệ TP.HCM (HUTECH)

**Đề tài:** Xây dựng hệ thống Đồ thị Tri thức Doanh nghiệp cho công ty phần mềm APTX3107

**Công nghệ chính:** Neo4j • NestJS • Next.js • AI (Gemini + Ollama)

---

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Nhóm thực hiện](#nhóm-thực-hiện)
3. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
4. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
5. [Cấu trúc dự án](#cấu-trúc-dự-án)
6. [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
7. [Mô hình dữ liệu](#mô-hình-dữ-liệu)
8. [Hệ thống AI Chat](#hệ-thống-ai-chat)
9. [Các chế độ Chat](#các-chế-độ-chat)
10. [Phân quyền](#phân-quyền)
11. [API Reference](#api-reference)
12. [Tính năng đã triển khai](#tính-năng-đã-triển-khai)
13. [Liên hệ](#liên-hệ)

---

## Giới thiệu

### Mục tiêu

- Biểu diễn tri thức doanh nghiệp phần mềm dưới dạng Knowledge Graph (Neo4j) gồm các thực thể: Nhân sự, Phòng ban, Kỹ năng, Dự án, Chức danh, Công nghệ, Tài liệu.
- Xây dựng hệ thống API, Web và AI Chatbot để tra cứu, trực quan hóa và phân tích tri thức.
- Ứng dụng AI Agent với Function Calling để hỏi-đáp tri thức doanh nghiệp bằng ngôn ngữ tự nhiên.

### Ý nghĩa thực tiễn

- Giúp doanh nghiệp hiểu rõ năng lực nội bộ, mối quan hệ nhân sự - kỹ năng - dự án.
- Hỗ trợ ra quyết định nhanh về nhân sự, đào tạo và phân bổ nguồn lực.
- Là nền tảng cho Talent Intelligence và Enterprise Search.

---

## Nhóm thực hiện

| STT | Họ và Tên | Vai trò | Nhiệm vụ chính |
|-----|-----------|---------|----------------|
| 1 | Nguyễn Bình Minh | Frontend & Backend Developer | Xây dựng Web (Next.js), Backend API (NestJS), AI Chat Integration |
| 2 | Lại Vũ Hoàng Minh | Database Engineer | Thiết kế Ontology, xây dựng đồ thị tri thức Neo4j, viết Cypher queries |
| 3 | Nguyễn Hoàng Anh Khoa | Tester | Kiểm thử hệ thống, viết test case, đánh giá hiệu năng |

**Giảng viên hướng dẫn:** Nguyễn Đình Ánh

---

## Kiến trúc hệ thống

### Tổng quan kiến trúc

```
┌─────────────────┐     HTTP/REST     ┌──────────────────┐
│   Frontend      │ ←───────────────→ │   Backend API    │
│   (Next.js)     │                   │   (NestJS)       │
└─────────────────┘                   └────────┬─────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
            │   Neo4j       │          │   Redis       │          │   AI Layer    │
            │   Database    │          │   Cache       │          │               │
            └───────────────┘          └───────────────┘          └───────┬───────┘
                                                                          │
                                               ┌──────────────────────────┼──────────────────────────┐
                                               │                          │                          │
                                               ▼                          ▼                          ▼
                                       ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
                                       │   Gemini      │          │   Ollama      │          │   ChromaDB    │
                                       │   (Cloud)     │          │   (Local)     │          │   (Vector)    │
                                       └───────────────┘          └───────────────┘          └───────────────┘
```

### Luồng xử lý AI Chat (Agent Architecture)

```
User Query
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ChatService.processQuery()                │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Query Analyzer                            │
│         (Intent Detection + Entity Extraction)               │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Planner                             │
│              (Quyết định cần tools nào)                      │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│            Gemini Function Calling (40+ Tools)               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Employee    │  │ Project     │  │ Document    │   ...    │
│  │ Tools       │  │ Tools       │  │ Tools       │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Neo4j Cypher Query                        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Natural Language Response                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ | Mô tả |
|------------|-----------|-------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS | Giao diện Dashboard và Chat |
| Backend | NestJS 10, TypeScript, neo4j-driver | RESTful API, Business Logic |
| Database | Neo4j 5.x, APOC | Knowledge Graph Storage |
| Cache | Redis 7.x | Conversation History, Token Cache |
| AI - Cloud | Google Gemini API | Function Calling, Complex Queries |
| AI - Local | Ollama (qwen2.5) | Embeddings, Simple Queries |
| Vector DB | ChromaDB (File-based) | Semantic Search |
| File Storage | AWS S3 | Document Upload |
| Authentication | JWT, Passport.js | RBAC (Admin/Viewer) |
| DevOps | Docker Compose | Neo4j + Redis + Ollama |

---

## Cấu trúc dự án

```
ChatBot_Enterprise_knowledge_Graph/
│
├── ekg-backend/                        # NestJS Backend API
│   ├── src/
│   │   ├── ai/                         # AI Services
│   │   │   ├── agent/                  # Agent Planner & Executor
│   │   │   ├── gemini.service.ts       # Gemini API (Function Calling)
│   │   │   ├── gemini-tools.service.ts # 40+ Tool Definitions
│   │   │   ├── ollama.service.ts       # Ollama Embeddings
│   │   │   ├── openrouter.service.ts   # OpenRouter Fallback
│   │   │   └── chroma-db.service.ts    # Vector Database
│   │   │
│   │   ├── chat/                       # Chat Module
│   │   │   ├── chat.controller.ts      # API Endpoints
│   │   │   ├── chat.service.ts         # Main Processing Logic
│   │   │   └── services/               # 20+ Support Services
│   │   │       ├── query-analyzer.service.ts
│   │   │       ├── redis-conversation.service.ts
│   │   │       ├── recommendation.service.ts
│   │   │       ├── scheduler.service.ts
│   │   │       └── ...
│   │   │
│   │   ├── auth/                       # JWT Authentication
│   │   ├── employees/                  # Employee CRUD
│   │   ├── departments/                # Department CRUD
│   │   ├── projects/                   # Project CRUD
│   │   ├── skills/                     # Skills CRUD
│   │   ├── documents/                  # Document Upload (S3)
│   │   ├── positions/                  # Position CRUD
│   │   ├── technologies/               # Technology CRUD
│   │   └── core/neo4j/                 # Neo4j Connection
│   │
│   ├── data/chromadb/                  # Vector Embeddings
│   └── docker-compose.yml              # Infrastructure
│
├── ekg-frontend/                       # Next.js Frontend
│   └── apps/web/src/
│       ├── components/
│       │   ├── chat/                   # Chat Components
│       │   │   ├── Chat.tsx            # Main Chat Container
│       │   │   ├── ChatInput.tsx       # Mode Selector + Input
│       │   │   ├── ChatMessages.tsx    # Message List
│       │   │   ├── MessageContent.tsx  # Markdown + Chart Render
│       │   │   ├── ChartRenderer.tsx   # Recharts Integration
│       │   │   ├── DocumentUploadModal.tsx
│       │   │   ├── RecommendationCard.tsx
│       │   │   └── TaskCard.tsx
│       │   │
│       │   └── graph/                  # Knowledge Graph Viz
│       │
│       ├── server/services/            # API Client
│       ├── hooks/                      # React Hooks
│       └── lib/                        # Utilities
│
├── Tài liệu/MD_File/                   # Documentation
│   ├── 00_Getting_Started/
│   ├── 01_Setup_Installation/
│   ├── 02_Database_Setup/
│   ├── 03_Authentication/
│   ├── 04_AI_Chat_System/
│   └── 05_Implementation_Summary/
│
└── README.md
```

---

## Hướng dẫn cài đặt

### Yêu cầu hệ thống

- Node.js >= 18.x
- Docker & Docker Compose
- Git

### Bước 1: Clone repository

```bash
git clone https://github.com/[your-repo]/ChatBot_Enterprise_knowledge_Graph.git
cd ChatBot_Enterprise_knowledge_Graph
```

### Bước 2: Khởi động Backend

```bash
cd ekg-backend

# Cài đặt dependencies
npm install

# Copy và cấu hình environment
cp .env.example .env
# Chỉnh sửa: GEMINI_API_KEY, NEO4J_PASSWORD, etc.

# Khởi động infrastructure
docker-compose up -d

# Chờ Neo4j khởi động (~30 giây)
npm run start:dev
```

**Kiểm tra:** http://localhost:3002/docs (Swagger)

### Bước 3: Khởi động Frontend

```bash
cd ekg-frontend/apps/web

npm install
cp .env.example .env.local
npm run dev
```

**Kiểm tra:** http://localhost:3000

### Bước 4: Index dữ liệu vào ChromaDB

```bash
# Gọi API để index entities cho semantic search
curl -X POST http://localhost:3002/chat/index \
  -H "Authorization: Bearer <your-token>"
```

---

## Mô hình dữ liệu

### Các Node (Entity)

| Node | Mô tả | Thuộc tính chính |
|------|-------|------------------|
| NhanSu | Nhân viên | id, name, email, phone, empId |
| PhongBan | Phòng ban | id, name, code |
| DuAn | Dự án | id, name, status, startDate, endDate |
| KyNang | Kỹ năng | name, category, level |
| ChucDanh | Chức danh | name, level |
| CongNghe | Công nghệ | name, type |
| TaiLieu | Tài liệu | id, name, url, content |
| NguoiDung | User đăng nhập | username, role |

### Các Relationship

| Relationship | Từ → Đến | Ý nghĩa |
|--------------|----------|---------|
| THUOC_PHONG_BAN | NhanSu → PhongBan | Nhân sự thuộc phòng ban |
| CO_KY_NANG | NhanSu → KyNang | Nhân sự có kỹ năng |
| GIU_CHUC_DANH | NhanSu → ChucDanh | Nhân sự giữ chức danh |
| THAM_GIA | NhanSu → DuAn | Nhân sự tham gia dự án |
| SU_DUNG | DuAn → CongNghe | Dự án sử dụng công nghệ |
| BAO_CAO_CHO | NhanSu → NhanSu | Cấu trúc quản lý |
| CO_TAI_LIEU | DuAn → TaiLieu | Dự án có tài liệu |

---

## Hệ thống AI Chat

### Agent Architecture

Hệ thống sử dụng **Agent-based Architecture** với Gemini Function Calling:

1. **Query Analyzer:** Phân tích intent và trích xuất entities từ câu hỏi
2. **Agent Planner:** Quyết định cần sử dụng tools nào
3. **Gemini Function Calling:** Thực thi tools và lấy dữ liệu từ Neo4j
4. **Response Generator:** Tạo câu trả lời tự nhiên từ dữ liệu

### Danh sách Tools (40+)

| Category | Tools | Mô tả |
|----------|-------|-------|
| Universal | `universal_search`, `get_system_overview` | Vector search toàn hệ thống |
| Employee | `search_employees_by_skill`, `count_employees`, `get_employee_by_id` | Query nhân viên |
| Department | `list_departments`, `get_department_by_id` | Query phòng ban |
| Project | `search_projects`, `get_project_by_id`, `list_project_members` | Query dự án |
| Document | `search_documents`, `rag_document_search` | Tìm kiếm tài liệu |
| Advanced | `execute_cypher_query`, `generate_chart` | Query phức tạp, tạo biểu đồ |
| Recommendation | `recommend_employee_for_project`, `find_skill_gaps` | Gợi ý thông minh |
| Scheduler | `find_available_slots`, `suggest_meeting_time` | Lên lịch họp |

### Ví dụ câu hỏi

```
"Có bao nhiêu nhân viên trong công ty?"
"Ai biết React trong phòng Frontend?"
"Thống kê kỹ năng theo phòng ban"
"Gợi ý người phù hợp cho dự án E-commerce"
"Tìm lịch họp phù hợp cho team Backend"
```

---

## Các chế độ Chat

Frontend hỗ trợ 5 chế độ chat:

| Mode | Mô tả | Đặc điểm |
|------|-------|----------|
| **Chat** | Trò chuyện thông thường | Agent tự động routing |
| **Vision** | Phân tích hình ảnh | Upload ảnh + câu hỏi |
| **Document** | Phân tích tài liệu | PDF, Word, Excel + câu hỏi |
| **Sequential Thinking** | Suy luận từng bước | Chain-of-Thought prompting |
| **Deeper Research** | Nghiên cứu sâu | (Đang phát triển) |

### Sequential Thinking Mode

Chế độ này sử dụng Chain-of-Thought prompting để AI:
- Phân tích câu hỏi
- Liệt kê các bước suy luận
- Giải thích lý do từng bước
- Đưa ra kết luận cuối cùng

Phù hợp cho các câu hỏi phức tạp cần reasoning nhiều bước.

---

## Phân quyền

### Mô hình RBAC

| Role | Quyền hạn |
|------|-----------|
| ADMIN | Full CRUD trên tất cả entities, quản lý user |
| VIEWER | Read-only, sử dụng chat, upload tài liệu |

### Tài khoản demo

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | ADMIN |
| NS001 | NS001@123 | VIEWER |

---

## API Reference

### Authentication

```
POST /auth/login          # Đăng nhập → JWT token
GET  /auth/profile        # Thông tin user hiện tại
```

### Chat Endpoints

```
POST /chat                # Chat thông thường (Agent)
POST /chat/with-file      # Chat với file (Vision/Document)
POST /chat/thinking       # Chat với Sequential Thinking
POST /chat/index          # Index entities vào ChromaDB
GET  /chat/health         # Health check
```

### Entity Endpoints

```
GET  /employees           # Danh sách nhân viên
GET  /employees/:id       # Chi tiết nhân viên
POST /employees           # Tạo nhân viên (Admin)

GET  /departments         # Danh sách phòng ban
GET  /projects            # Danh sách dự án
GET  /skills              # Danh sách kỹ năng
GET  /technologies        # Danh sách công nghệ

GET  /search?q=keyword    # Tìm kiếm toàn cục
```

### Document Endpoints

```
POST /documents/upload    # Upload tài liệu lên S3
GET  /documents/project/:id  # Tài liệu theo dự án
```

**Swagger Documentation:** http://localhost:3002/docs

---

## Tính năng đã triển khai

### Backend

- [x] Knowledge Graph Neo4j với đầy đủ entities và relationships
- [x] RESTful API với NestJS
- [x] Agent Architecture với 40+ Function Tools
- [x] Multi-provider AI (Gemini + Ollama + OpenRouter)
- [x] Vector Search với ChromaDB
- [x] Conversation History với Redis
- [x] Document Upload với AWS S3
- [x] JWT Authentication với RBAC
- [x] Query Caching và Compression

### Frontend

- [x] Chat Interface với multi-mode
- [x] Mode Selector (Chat/Vision/Document/Thinking)
- [x] File Upload (Ảnh, PDF, Word, Excel)
- [x] Markdown Rendering
- [x] Chart Rendering (Recharts)
- [x] Document Upload Modal
- [x] Recommendation Cards
- [x] Dark Mode

---

## Hướng phát triển

- [ ] Deeper Research mode với multi-step reasoning
- [ ] Dashboard phân tích kỹ năng - nhân sự - dự án
- [ ] Knowledge Graph Visualization
- [ ] Mobile App (React Native)
- [ ] Real-time collaboration
- [ ] Advanced analytics và reporting

---

## Liên hệ

**Dự án thuộc Đồ án chuyên ngành - Khoa Công nghệ Thông tin**

Trường Đại học Công nghệ TP.HCM (HUTECH)

**Email:** pata10102004@gmail.com

---

*Mục tiêu: EKG trở thành "bộ não tri thức doanh nghiệp", giúp công ty APTX3107 ra quyết định dựa trên dữ liệu tri thức nội bộ với hỗ trợ AI.*
