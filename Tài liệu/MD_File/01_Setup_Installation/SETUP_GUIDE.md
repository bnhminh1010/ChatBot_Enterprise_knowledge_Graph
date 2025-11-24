# 🚀 Hướng Dẫn Kết Nối Frontend-Backend

## 📋 Tính năng đã implement

### 1. **API Client Service** (`src/lib/api-client.ts`)

- HTTP client wrapper cho tất cả requests
- Tự động thêm JWT token từ localStorage
- Xử lý error và logging
- Support GET, POST, PUT, PATCH, DELETE

### 2. **Service Files** (trong `src/server/services/`)

- `employees.ts` - Quản lý nhân viên
- `departments.ts` - Quản lý phòng ban
- `skills.ts` - Quản lý kỹ năng
- `projects.ts` - Quản lý dự án
- `search.ts` - Tìm kiếm toàn bộ hệ thống

### 3. **Chat Helper** (`src/lib/chat-helper.ts`)

- `detectQueryType()` - Phát hiện loại query
- `handleQuery()` - Xử lý query và gọi API

### 4. **Cấu hình Environment**

- `.env.local` - Cấu hình API URL (http://localhost:3002)

---

## 🏃 Cách Sử Dụng

### Chuẩn bị

1. **Khởi động Backend**

   ```bash
   cd ekg-backend
   npm install
   npm run start:dev
   ```

   Backend sẽ chạy trên `http://localhost:3002`

2. **Khởi động Frontend**

   ```bash
   cd ekg-frontend/apps/web
   npm install
   npm run dev
   ```

   Frontend sẽ chạy trên `http://localhost:3000`

3. **Khởi động Neo4j** (nếu chưa)
   ```bash
   cd ekg-backend
   docker-compose up
   ```

### Test Chat

Mở http://localhost:3000 và thử các câu lệnh:

**Danh sách:**

- "Danh sách nhân viên"
- "Danh sách phòng ban"
- "Danh sách kỹ năng"
- "Danh sách dự án"

**Tìm kiếm:**

- "Tìm [tên hoặc từ khóa]"
- "Tìm nhân viên [tên]"
- "Tìm kỹ năng [tên]"

---

## 🔧 Cấu trúc API

### Backend Endpoints

```
GET    /employees              - Lấy danh sách nhân viên
GET    /employees/:id          - Lấy chi tiết nhân viên
POST   /employees              - Tạo nhân viên
PUT    /employees/:id          - Cập nhật nhân viên
DELETE /employees/:id          - Xóa nhân viên

GET    /departments            - Lấy danh sách phòng ban
GET    /departments/:id        - Lấy chi tiết phòng ban
POST   /departments            - Tạo phòng ban
PUT    /departments/:id        - Cập nhật phòng ban
DELETE /departments/:id        - Xóa phòng ban

GET    /skills                 - Lấy danh sách kỹ năng
GET    /skills/:id             - Lấy chi tiết kỹ năng
POST   /skills                 - Tạo kỹ năng
DELETE /skills/:id             - Xóa kỹ năng

GET    /projects               - Lấy danh sách dự án
GET    /projects/:id           - Lấy chi tiết dự án
POST   /projects               - Tạo dự án
PUT    /projects/:id           - Cập nhật dự án
DELETE /projects/:id           - Xóa dự án

POST   /search                 - Tìm kiếm toàn bộ hệ thống
```

### Swagger Documentation

- URL: http://localhost:3002/docs

---

## 📝 Ví dụ Sử Dụng Service

### Lấy danh sách nhân viên

```typescript
import { getEmployees } from "@/server/services/employees";

const employees = await getEmployees();
```

### Tìm kiếm

```typescript
import { searchGlobal } from "@/server/services/search";

const results = await searchGlobal({
  query: "John",
  limit: 10,
});
```

### Phát hiện query và xử lý

```typescript
import { detectQueryType, handleQuery } from "@/lib/chat-helper";

const queryDetection = detectQueryType("Danh sách nhân viên");
const response = await handleQuery(queryDetection.type);
```

---

## 🎯 Query Types

| Type                 | Ví dụ                 | Kết quả                    |
| -------------------- | --------------------- | -------------------------- |
| `list-employees`     | "Danh sách nhân viên" | Danh sách tất cả nhân viên |
| `list-departments`   | "Danh sách phòng ban" | Danh sách tất cả phòng ban |
| `list-skills`        | "Danh sách kỹ năng"   | Danh sách tất cả kỹ năng   |
| `list-projects`      | "Danh sách dự án"     | Danh sách tất cả dự án     |
| `search-global`      | "Tìm John"            | Tìm kiếm toàn bộ           |
| `search-employees`   | "Tìm nhân viên John"  | Tìm nhân viên              |
| `search-skills`      | "Tìm kỹ năng Java"    | Tìm kỹ năng                |
| `search-departments` | "Tìm phòng ban IT"    | Tìm phòng ban              |

---

## 🔐 Authentication

Hiện tại chưa implement authentication. Để thêm JWT:

1. Đăng nhập và lấy token từ backend
2. Lưu token vào localStorage
3. API client sẽ tự động thêm token vào header

```typescript
localStorage.setItem("auth_token", token);
// API client sẽ tự động thêm: Authorization: Bearer {token}
```

---

## ⚠️ Troubleshooting

### Lỗi CORS

- Kiểm tra backend có bật CORS không (✅ đã bật)
- Kiểm tra port backend (3002) có đúng không

### Lỗi 404

- Kiểm tra endpoint có tồn tại không
- Xem Swagger docs: http://localhost:3002/docs

### API không trả về dữ liệu

- Kiểm tra Neo4j có chạy không
- Kiểm tra backend logs
- Seed database: `npm run seed` trong ekg-backend

---

## 📌 Tiếp theo

- [ ] Thêm authentication/login
- [ ] Thêm create, update, delete từ chat
- [ ] Thêm advanced query processing (NLP)
- [ ] Caching responses với React Query
- [ ] Pagination cho danh sách lớn
- [ ] Export kết quả (PDF, Excel)

---

## 📚 Tài liệu

- Backend API Docs: http://localhost:3002/docs
- Next.js Docs: https://nextjs.org/docs
- NestJS Docs: https://docs.nestjs.com
