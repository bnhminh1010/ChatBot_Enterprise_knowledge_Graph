# 🧠 Enterprise Knowledge Graph (EKG) – APTX3107 Company

> 🚀 **Đồ án chuyên ngành HUTECH**  
> **Đề tài:** Xây dựng hệ thống Đồ thị Tri thức Doanh nghiệp (Enterprise Knowledge Graph) cho công ty phần mềm APTX3107.  
> **Công nghệ:** Neo4j · Next.js · React Native · Node.js (TypeScript)

---

## 📚 Giới thiệu đề tài

### 🎯 Mục tiêu

- Biểu diễn **tri thức doanh nghiệp phần mềm** dưới dạng **Knowledge Graph** (Neo4j) gồm các thực thể: Nhân sự, Phòng ban, Kỹ năng, Dự án, Chức danh, Công nghệ,...
- Xây dựng hệ thống **API + Web + Mobile** để tra cứu, trực quan hóa và phân tích tri thức.
- Ứng dụng **AI / Chatbot** để hỏi–đáp tri thức doanh nghiệp bằng ngôn ngữ tự nhiên.

### 🧩 Ý nghĩa

- Giúp công ty hiểu rõ **năng lực nội bộ**, **mối quan hệ nhân sự – kỹ năng – dự án**.
- Hỗ trợ **ra quyết định nhanh** về nhân sự, đào tạo, và phân bổ nguồn lực.
- Là nền tảng cho **Talent Intelligence** và **Enterprise Search**.

---

## 👨‍💻 Nhóm thực hiện

| STT | Họ và Tên                 | Vai trò                      | Nhiệm vụ chính                                                               |
| --- | ------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 1   | **Nguyễn Bình Minh**      | Frontend & Backend Developer | Xây dựng Web (Next.js), Mobile (React Native), Backend API (Node.js).        |
| 2   | **Lại Vũ Hoàng Minh**     | Database Engineer            | Thiết kế Ontology, xây dựng đồ thị tri thức bằng Neo4j, viết Cypher queries. |
| 3   | **Nguyễn Hoàng Anh Khoa** | Tester                       | Kiểm thử hệ thống, viết test case, đánh giá hiệu năng và độ chính xác.       |

---

## 🏗️ Kiến trúc tổng thể

```mermaid
graph TD
  A[Web App (Next.js)] -->|HTTP/GraphQL| B[Backend API (Node.js + TypeScript)]
  C[Mobile App (React Native)] -->|HTTP/GraphQL| B
  B -->|Cypher Queries| D[(Neo4j Database)]
  D --> E[(Enterprise Knowledge Graph)]
```

---

## 🧠 Ontology tổng quát (Domain Model)

**Các Node chính:**

- `CongTy`, `DonVi`, `PhongBan`, `Nhom`
- `NhanSu`, `ChucDanh`, `KyNang`
- `DuAn`, `CongNghe`

**Các Quan hệ (Relationships):**

| Quan hệ             | Ý nghĩa                   |
| ------------------- | ------------------------- |
| `BAO_CAO_CHO`       | Nhân sự báo cáo cấp trên  |
| `THAM_GIA_NHOM`     | Nhân sự thuộc nhóm        |
| `GIU_CHUC_DANH`     | Giữ vai trò/chức danh     |
| `CO_KY_NANG`        | Nhân sự có kỹ năng        |
| `YEU_CAU_KY_NANG`   | Kỹ năng cần cho chức danh |
| `LAM_DU_AN`         | Nhân sự tham gia dự án    |
| `SU_DUNG_CONG_NGHE` | Dự án sử dụng công nghệ   |

---

## ⚙️ Tech Stack chi tiết

| Thành phần              | Công nghệ                                                | Mô tả                                              |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **Frontend Web**        | Next.js + TypeScript + TailwindCSS                       | Giao diện Dashboard, trực quan hóa đồ thị tri thức |
| **Mobile App**          | React Native (Expo)                                      | Tìm kiếm tri thức trên thiết bị di động            |
| **Backend API**         | Node.js (Express/NestJS) + `neo4j-driver`, `zod`, `tRPC` | Kết nối Neo4j, xử lý logic và trả dữ liệu          |
| **Database**            | Neo4j + Cypher + APOC                                    | Lưu trữ tri thức doanh nghiệp                      |
| **AI Layer (Tùy chọn)** | Gemini / OpenAI / Ollama local                           | Chatbot hỏi–đáp tri thức                           |
| **Dev Tools**           | Docker Compose, Turbo/Nx, ESLint, Prettier               | Quản lý monorepo, môi trường và CI/CD              |
| **Testing**             | Jest, React Testing Library                              | Viết test cho API, Web, Mobile                     |

---

## 🗂️ Cấu trúc thư mục (Monorepo)

```
ekg-aptx3107/
├── apps/
│   ├── web/           # Next.js app (frontend web)
│   ├── mobile/        # React Native app (Expo)
│   └── api/           # Node.js backend (Express/NestJS)
├── packages/
│   ├── types/         # Shared domain types & zod schemas
│   ├── ui/            # Shared UI components (RN + web)
│   └── config/        # ESLint, tsconfig, env
├── docker/
│   └── neo4j/         # Docker Compose + init scripts
├── README.md
└── package.json
```

---

## 🚀 Cách cài đặt & sử dụng repo

### 1️⃣ Cài đặt ban đầu

```bash
# Clone repo
git clone https://github.com/<username>/ekg-aptx3107.git
cd ekg-aptx3107

# Cài dependencies (chạy 1 lần cho toàn monorepo)
npm install
```

### 2️⃣ Cấu hình môi trường

Tạo file `.env` trong thư mục `/apps/api`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=123456
PORT=4000
```

### 3️⃣ Khởi chạy Neo4j bằng Docker

```bash
cd docker/neo4j
docker-compose up -d
```

Truy cập Neo4j Browser tại: http://localhost:7474  
Tài khoản mặc định: neo4j / 123456

### 4️⃣ Chạy backend API

```bash
cd apps/api
npm run dev
# Server chạy tại http://localhost:4000
```

### 5️⃣ Chạy web app

```bash
cd apps/web
npm run dev
# Web chạy tại http://localhost:3000
```

### 6️⃣ Chạy mobile app (Expo)

```bash
cd apps/mobile
npm start
# Mở bằng Expo Go hoặc trình giả lập
```

---

## 🔗 Frontend-Backend Integration (NEW)

### ✨ Mới! Kết nối Frontend-Backend hoàn toàn

Frontend (Next.js) đã được tích hợp đầy đủ với Backend (NestJS) để hỗ trợ:

✅ Chat interface tương tác với backend  
✅ API client wrapper cho HTTP requests  
✅ Service layer cho tất cả endpoints  
✅ Query detection & intelligent routing  
✅ Real-time error handling & logging  
✅ TypeScript type safety

### 📚 Tài liệu Kết nối

Để bắt đầu với frontend-backend integration, xem các file sau:

| File                         | Mục đích                                |
| ---------------------------- | --------------------------------------- |
| `QUICK_START.md`             | Hướng dẫn khởi động nhanh 3 bước        |
| `SETUP_GUIDE.md`             | Hướng dẫn chi tiết cấu hình & sử dụng   |
| `DATABASE_SETUP.md`          | Hướng dẫn setup Neo4j & seeding dữ liệu |
| `INTEGRATION_SUMMARY.md`     | Tổng quan kiến trúc & API endpoints     |
| `IMPLEMENTATION_COMPLETE.md` | Danh sách đầy đủ những gì đã implement  |
| `INTEGRATION_CHECKLIST.md`   | Checklist xác minh tính năng            |

### 🎯 Cách bắt đầu

1. **Khởi động Backend:**

   ```bash
   cd ekg-backend
   npm install
   docker-compose up -d
   npm run start:dev
   ```

2. **Khởi động Frontend:**

   ```bash
   cd ekg-frontend/apps/web
   npm install
   npm run dev
   ```

3. **Test kết nối:**
   - Mở http://localhost:3000
   - Thử chat: "Danh sách nhân viên"
   - Xem dữ liệu từ backend

### 💬 Hỗ trợ các câu lệnh chat

```
"Danh sách nhân viên"   → Lấy danh sách nhân viên từ backend
"Danh sách phòng ban"   → Lấy danh sách phòng ban
"Danh sách kỹ năng"     → Lấy danh sách kỹ năng
"Danh sách dự án"       → Lấy danh sách dự án
"Tìm [keyword]"         → Tìm kiếm toàn bộ
```

### 🧪 Xác minh kết nối

```javascript
// Mở DevTools Console (F12) và chạy:
import { testConnection } from "@/lib/connection-test";
await testConnection();
```

### 📁 File tạo mới

```
ekg-frontend/apps/web/
├── .env.local                           (Config API URL)
├── src/lib/
│   ├── api-client.ts                   (HTTP wrapper)
│   ├── api-config.ts                   (Endpoints config)
│   ├── chat-helper.ts                  (Query handler)
│   └── connection-test.ts              (Test suite)
└── src/server/services/
    ├── employees.ts                    (Employee API)
    ├── departments.ts                  (Department API)
    ├── skills.ts                       (Skills API)
    ├── projects.ts                     (Projects API)
    └── search.ts                       (Search API)
```

---

---

## 🔌 Ví dụ truy vấn Cypher

```cypher
// Ai có nhiều kỹ năng nhất?
MATCH (e:NhanSu)-[:CO_KY_NANG]->(k:KyNang)
RETURN e.ten AS nhan_su, count(k) AS so_ky_nang
ORDER BY so_ky_nang DESC
LIMIT 5;

// Dự án sử dụng công nghệ nào?
MATCH (d:DuAn)-[:SU_DUNG_CONG_NGHE]->(c:CongNghe)
RETURN d.ten AS du_an, collect(c.ten) AS cong_nghe;

// Kỹ năng cần cho chức danh Backend Developer
MATCH (cd:ChucDanh {ten: 'Backend Developer'})-[:YEU_CAU_KY_NANG]->(k:KyNang)
RETURN cd.ten, collect(k.ten);
```

---

## 🧪 Chức năng chính

| Nhóm                   | Mô tả                                                          |
| ---------------------- | -------------------------------------------------------------- |
| **1. Knowledge Graph** | Xây dựng đồ thị tri thức doanh nghiệp (nodes + relationships). |
| **2. API Backend**     | Truy vấn Cypher → REST/GraphQL.                                |
| **3. Web App**         | Tìm kiếm, thống kê, visualize đồ thị.                          |
| **4. Mobile App**      | Tìm kiếm nhân sự, kỹ năng, dự án.                              |
| **5. Testing**         | Kiểm tra độ chính xác, tốc độ truy vấn, và UI.                 |

---

## 🧩 Quy trình làm việc nhóm (Workflow)

| Thành phần            | Quy ước                                                     |
| --------------------- | ----------------------------------------------------------- |
| **Branch**            | `main` (stable), `dev` (develop), `feature/<tên-tính-năng>` |
| **Commit message**    | Dạng `feat:`, `fix:`, `refactor:`, `chore:`                 |
| **Pull Request**      | Mỗi PR kèm mô tả ngắn + ảnh chụp màn hình (nếu có)          |
| **Code review**       | Tối thiểu 1 người khác approve trước khi merge              |
| **Naming convention** | camelCase cho biến, PascalCase cho component/class          |
| **Lint & Format**     | `npm run lint` & `npm run format` trước khi commit          |

---

## 📆 Tiến độ đồ án (15 tuần)

| Tuần  | Nội dung chính                       | Người phụ trách | Trạng thái |
| ----- | ------------------------------------ | --------------- | ---------- |
| 1–3   | Nghiên cứu EKG & Neo4j               | Toàn nhóm       | ✅         |
| 4–6   | Thiết kế Ontology & mô hình dữ liệu  | Hoàng Minh      | ✅         |
| 7–9   | Import dữ liệu & tạo truy vấn Cypher | Hoàng Minh      | 🔄         |
| 10–11 | Xây dựng API & kết nối Neo4j         | Bình Minh       | 🔄         |
| 12–13 | Web & Mobile UI (Next.js + RN)       | Bình Minh       | ⏳         |
| 14    | Test & Fix lỗi                       | Hoàng Anh Khoa  | ⏳         |
| 15    | Demo & Báo cáo                       | Toàn nhóm       | 🔜         |

---

## 📜 Giấy phép & Liên hệ

Dự án thuộc **Đồ án chuyên ngành – Khoa Công nghệ Thông tin, Đại học HUTECH**.  
Tác giả giữ toàn quyền với mã nguồn và nội dung.

📧 **Liên hệ nhóm:** team4.ekg.apxt3107@gmail.com  
📍 **Trường Đại học Công nghệ TP.HCM – HUTECH**

---

## 🏁 Hướng phát triển tương lai

- Thêm **Vector Search (Qdrant / Milvus)** cho tìm kiếm ngữ nghĩa.
- Tích hợp **Chatbot hỏi–đáp tri thức nội bộ** bằng LLM.
- Xây dựng **Dashboard phân tích kỹ năng – nhân sự – dự án**.
- Tích hợp **Role-based Access Control (RBAC)** cho từng người dùng.

> 💡 Mục tiêu cuối: EKG trở thành **“bộ não tri thức doanh nghiệp”**, giúp công ty APTX3107 ra quyết định dựa trên dữ liệu tri thức nội bộ.
