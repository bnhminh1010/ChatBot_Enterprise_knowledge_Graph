# 🎯 Quick Start Guide - Frontend-Backend Integration

## ⚡ 3 Bước Khởi Động

### 1️⃣ Backend

```bash
cd ekg-backend
npm install
docker-compose up -d  # Start Neo4j
npm run start:dev
```

✅ Backend sẽ chạy trên `http://localhost:3002`

### 2️⃣ Frontend

```bash
cd ekg-frontend/apps/web
npm install
npm run dev
```

✅ Frontend sẽ chạy trên `http://localhost:3000`

### 3️⃣ Test

Mở http://localhost:3000 và thử chat:

```
"Danh sách nhân viên"
"Danh sách phòng ban"
"Danh sách kỹ năng"
"Danh sách dự án"
"Tìm [keyword]"
```

---

## 🧪 Verify Connection

**Console (DevTools F12):**

```javascript
import { testConnection } from "@/lib/connection-test";
await testConnection();
```

---

## 📁 Key Files Created

### Backend Integration Files

```
ekg-frontend/apps/web/
├── .env.local                      (API_URL=localhost:3002)
├── src/lib/
│   ├── api-client.ts               (HTTP wrapper)
│   ├── api-config.ts               (Endpoints)
│   ├── chat-helper.ts              (Query handling)
│   └── connection-test.ts          (Test suite)
└── src/server/services/
    ├── employees.ts
    ├── departments.ts
    ├── skills.ts
    ├── projects.ts
    └── search.ts
```

---

## 💬 Supported Chat Commands

| Command                | Result                      |
| ---------------------- | --------------------------- |
| `Danh sách nhân viên`  | List employees from backend |
| `Danh sách phòng ban`  | List departments            |
| `Danh sách kỹ năng`    | List skills                 |
| `Danh sách dự án`      | List projects               |
| `Tìm [text]`           | Global search               |
| `Tìm nhân viên [name]` | Search employees            |
| `Tìm kỹ năng [name]`   | Search skills               |
| `Tìm phòng ban [name]` | Search departments          |

---

## 📊 Architecture Overview

```
Frontend Chat ➜ Chat Helper ➜ Services ➜ API Client ➜ Backend API
```

1. **Frontend Chat** (Chat.tsx)

   - Nhập tin nhắn → gửi

2. **Chat Helper** (chat-helper.ts)

   - Phát hiện loại query
   - Gọi hàm xử lý phù hợp

3. **Services** (employees.ts, etc.)

   - Gọi API với endpoint cụ thể
   - Format dữ liệu

4. **API Client** (api-client.ts)

   - Fetch HTTP
   - Tự động thêm JWT token
   - Xử lý lỗi

5. **Backend** (NestJS + Neo4j)
   - Xử lý request
   - Query database
   - Trả dữ liệu

---

## 🔗 Important URLs

| URL                        | Purpose           |
| -------------------------- | ----------------- |
| http://localhost:3000      | Frontend Chat     |
| http://localhost:3002      | Backend API       |
| http://localhost:3002/docs | API Documentation |
| http://localhost:7687      | Neo4j Database    |

---

## ❌ If Something Goes Wrong

### Backend not responding?

```bash
# Check if backend is running
curl http://localhost:3002/employees

# Check environment
cat ekg-frontend/apps/web/.env.local
# Should have: NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Neo4j connection error?

```bash
# Check docker logs
docker-compose logs neo4j

# Restart services
docker-compose down
docker-compose up -d
```

### CORS error?

- Backend CORS is already enabled ✅
- Check that API_URL matches backend port

---

## 📖 For More Details

- See **SETUP_GUIDE.md** for comprehensive guide
- See **INTEGRATION_SUMMARY.md** for architecture details
- Backend docs: http://localhost:3002/docs

---

## ✅ Status

All integration is **READY**! Start from Step 1 above.
