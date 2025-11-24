# EKG APTX – Tích hợp tài liệu doanh nghiệp & hướng dẫn cho backend

## 1. Bối cảnh & Mô hình hiện tại (do nhóm Database đã làm)

Hệ thống Enterprise Knowledge Graph (EKG) của công ty giả lập **APTX3107** đang chạy trên Neo4j, với các label và quan hệ chính (tóm tắt):

- Thực thể tổ chức & nhân sự:
  - `CongTy`, `DonVi`, `PhongBan`, `Nhom`
  - `ChucDanh`, `NhanSu`, `KyNang`
  - `DuAn`, `CongNghe`, `DiaDiem`
- Thực thể phân quyền:
  - `NguoiDung`, `VaiTro`
- Quan hệ tiêu biểu:
  - Cấu trúc tổ chức: `(:CongTy)-[:CO_DON_VI]->(:DonVi)-[:CO_PHONG_BAN]->(:PhongBan)-[:CO_NHOM]->(:Nhom)`
  - Nhân sự – tổ chức: `(:NhanSu)-[:THUOC_PHONG_BAN]->(:PhongBan)`, `(:NhanSu)-[:THAM_GIA_NHOM]->(:Nhom)`, `(:NhanSu)-[:GIU_CHUC_DANH]->(:ChucDanh)`
  - Kỹ năng: `(:NhanSu)-[:CO_KY_NANG]->(:KyNang)`, `(:ChucDanh)-[:YEU_CAU_KY_NANG]->(:KyNang)`
  - Dự án – công nghệ: `(:CongTy)-[:CO_DU_AN]->(:DuAn)`, `(:Nhom)-[:LAM_DU_AN]->(:DuAn)`, `(:DuAn)-[:SU_DUNG_CONG_NGHE]->(:CongNghe)`
  - Phân quyền: `(:NguoiDung)-[:CO_VAI_TRO]->(:VaiTro)`, `(:NguoiDung)-[:LA_NHAN_SU]->(:NhanSu)`

### 1.1. Phân quyền hiện có

- Có 2 vai trò chính trong Neo4j:
  - `ADMIN`: 1 tài khoản admin, có quyền **ghi** (tạo/sửa/xoá node & relationship) trên đồ thị.
  - `VIEWER`: ~40 tài khoản tương ứng với 40 nhân sự, chỉ có quyền **đọc** dữ liệu.
- Thông tin phân quyền (user, role) đã được lưu trong Neo4j để backend có thể kiểm tra vai trò trước khi cho phép thao tác ghi.

> Backend **phải tôn trọng phân quyền này**: chỉ cho phép tài khoản có role `ADMIN` thực hiện các API tạo/sửa/xoá trên Neo4j. Người dùng role `VIEWER` chỉ được phép gọi các API truy vấn.

---

## 2. Mở rộng mô hình: Quản lý tài liệu doanh nghiệp

Nhóm Database đã mở rộng mô hình đồ thị tri thức để mô tả **tài liệu nội bộ** (file `.docx`, `.pdf`, `.xlsx`, `.pptx`, …) trong Neo4j.

### 2.1. Label mới: `TaiLieu`

Thực thể `TaiLieu` đại diện cho 1 tài liệu nội bộ của công ty: quy định, quy trình, báo cáo, thiết kế hệ thống, tài liệu dự án,…

**Thuộc tính gợi ý:**

```text
(:TaiLieu {
  id:        string   // Mã tài liệu, duy nhất, ví dụ: "TL001"
  ten:       string   // Tên hiển thị: "Quy định nghỉ phép 2025"
  loai_file: string   // "docx" | "pdf" | "xlsx" | "pptx" | ...
  duong_dan: string   // URL / path đến file do backend quản lý
  mo_ta:     string   // Mô tả ngắn nội dung tài liệu
  created_at: date    // Ngày ban hành / tạo tài liệu
  created_by: string  // (optional) Mã nhân sự hoặc username người tạo
  version:   string   // Phiên bản, ví dụ "v1.0"
  tag:       [string] // Tag nhanh: ["QuyDinh", "HR"]
})
```

**Constraint đã thiết lập trong Neo4j:**

```cypher
CREATE CONSTRAINT tai_lieu_id_unique
IF NOT EXISTS
FOR (t:TaiLieu)
REQUIRE t.id IS UNIQUE;
```

### 2.2. Quan hệ tài liệu với các thực thể khác

Các quan hệ được sử dụng trong mô hình hiện tại:

```text
(:PhongBan)-[:CO_TAI_LIEU]->(:TaiLieu)
(:DuAn)-[:DINH_KEM_TAI_LIEU]->(:TaiLieu)
(:CongTy)-[:BAN_HANH]->(:TaiLieu)
```

Ý nghĩa:

- `CO_TAI_LIEU`: Phòng ban sở hữu / quản lý tài liệu nội bộ (ví dụ phòng HR quản lý các quy định nhân sự).
- `DINH_KEM_TAI_LIEU`: Dự án có tài liệu đính kèm (thiết kế, tài liệu phân tích, báo cáo).
- `BAN_HANH`: Tài liệu mang tính toàn công ty, do công ty ban hành (nội quy, handbook,…).

> Lưu ý: Quan hệ giữa `NhanSu` và `TaiLieu` hiện **chưa được sử dụng** trong mô hình. Backend không cần xử lý phần này ở giai đoạn hiện tại.

### 2.3. Ví dụ seed neo4j (đã/ sẽ được chạy bên DB)

```cypher
CREATE (t:TaiLieu {
  id: "TL001",
  ten: "Quy định nghỉ phép 2025",
  loai_file: "docx",
  duong_dan: "<URL hoặc path do backend sinh>",
  mo_ta: "Quy định về chế độ nghỉ phép năm 2025 cho toàn công ty.",
  created_at: date("2025-01-01"),
  version: "v1.0",
  tag: ["QuyDinh", "HR"]
});

MATCH (pb:PhongBan {id:"PB_HR_FIN"}), (t:TaiLieu {id:"TL001"})
CREATE (pb)-[:CO_TAI_LIEU]->(t);
```

---

## 3. Việc backend cần làm (phần tài liệu)

**Mục tiêu:** Xây dựng các API để:

1. Upload file tài liệu lên 1 nơi lưu trữ (local, Firebase, S3, …).
2. Lưu metadata + link file vào Neo4j (node `TaiLieu` + quan hệ với `PhongBan` / `DuAn` / `CongTy`).
3. Cung cấp API cho phép người dùng tra cứu & tải tài liệu theo phòng ban, dự án,…
4. Tôn trọng phân quyền `ADMIN` / `VIEWER` đã lưu trong Neo4j.

### 3.1. Lưu trữ file (bắt buộc dùng Firebase Storage)

Nhóm quyết định chuẩn hoá theo **Firebase Storage** để lưu trữ toàn bộ tài liệu (.docx, .pdf, .xlsx, .pptx, …).

- Backend upload file từ client lên server.
- Server sử dụng Firebase Admin SDK để upload file lên Firebase Storage.
- Sau khi upload thành công, backend lấy **public/signed URL** và lưu vào thuộc tính `duong_dan` của node `TaiLieu` trong Neo4j.

**Yêu cầu chung:**
- Sau khi upload file, backend phải lấy được **URL truy cập file** (hoặc path nội bộ) và ghi vào property `duong_dan` của node `TaiLieu` trong Neo4j.
- Hệ thống có thể sử dụng cùng 1 cơ chế lưu file cho các loại tài liệu khác trong tương lai (không chỉ cho EKG).

### 3.2. API đề xuất

Không bắt buộc phải đúng 100% URL, nhưng logic nên tương đương.

#### 3.2.1. API upload tài liệu cho phòng ban

```http
POST /api/departments/:phongBanId/documents
Content-Type: multipart/form-data
Auth: Bearer <token>
Role required: ADMIN
```

**Request body:**

- `file`: file tài liệu (`.docx`, `.pdf`, …).
- `ten` (optional): nếu không gửi, backend lấy `originalFileName`.
- `mo_ta` (optional)
- `tags` (optional, JSON hoặc chuỗi tách bằng dấu phẩy)
- `duAnId` (optional): nếu gửi, sẽ gắn thêm quan hệ với `DuAn`.

**Luồng xử lý backend (gợi ý):**

1. Xác thực token → lấy `username` / `userId`.
2. Query Neo4j để lấy role của user:

   ```cypher
   MATCH (u:NguoiDung {username:$username})-[:CO_VAI_TRO]->(r:VaiTro)
   RETURN r.ma AS role
   ```

   - Nếu `role != "ADMIN"` → trả HTTP 403.

3. Lưu file lên storage (local / cloud) → nhận lại `fileUrl`.
4. Sinh `taiLieuId` mới, ví dụ `"TL" + randomString`.
5. Gọi Neo4j:

   ```cypher
   MATCH (pb:PhongBan {id:$phongBanId})
   CREATE (t:TaiLieu {
     id: $id,
     ten: $ten,
     loai_file: $loai_file,
     duong_dan: $duong_dan,
     mo_ta: $mo_ta,
     created_at: date(),
     created_by: $created_by,
     version: "v1.0",
     tag: $tags
   })
   CREATE (pb)-[:CO_TAI_LIEU]->(t);
   ```

   Nếu có `duAnId`, tạo thêm:

   ```cypher
   MATCH (da:DuAn {id:$duAnId}), (t:TaiLieu {id:$id})
   CREATE (da)-[:DINH_KEM_TAI_LIEU]->(t);
   ```

6. Trả response JSON:

   ```json
   {
     "id": "TL001",
     "ten": "...",
     "loai_file": "docx",
     "duong_dan": "https://...",
     "phong_ban_id": "PB_HR_FIN"
   }
   ```

#### 3.2.2. API xem danh sách tài liệu của 1 phòng ban

```http
GET /api/departments/:phongBanId/documents
Auth: Bearer <token>
Role required: ADMIN hoặc VIEWER
```

**Logic:**

```cypher
MATCH (pb:PhongBan {id:$phongBanId})-[:CO_TAI_LIEU]->(t:TaiLieu)
RETURN t
ORDER BY t.created_at DESC
```

Trả về danh sách `{id, ten, loai_file, duong_dan, mo_ta, created_at, version, tag}`.

#### 3.2.3. API xem tài liệu theo dự án

```http
GET /api/projects/:duAnId/documents
Auth: Bearer <token>
```

**Logic:**

```cypher
MATCH (da:DuAn {id:$duAnId})-[:DINH_KEM_TAI_LIEU]->(t:TaiLieu)
RETURN t
```

#### 3.2.4. API chi tiết 1 tài liệu

```http
GET /api/documents/:taiLieuId
Auth: Bearer <token>
```

**Logic:**

```cypher
MATCH (t:TaiLieu {id:$taiLieuId})
OPTIONAL MATCH (pb:PhongBan)-[:CO_TAI_LIEU]->(t)
OPTIONAL MATCH (da:DuAn)-[:DINH_KEM_TAI_LIEU]->(t)
RETURN t, collect(DISTINCT pb) AS phongBans, collect(DISTINCT da) AS duAns
```

---

## 4. Yêu cầu về phân quyền cho tài liệu

- Chỉ user có role `ADMIN` mới được:
  - Upload tài liệu mới.
  - Cập nhật thông tin hoặc đổi link tài liệu.
  - Xoá tài liệu hoặc xoá quan hệ với phòng ban/dự án.
- User role `VIEWER`:
  - Được phép list/view tài liệu (nếu đã đăng nhập thành công).
  - Không được phép thay đổi dữ liệu Neo4j.

Backend có thể dùng middleware/guard để check role 1 lần cho các nhóm route:

- `/api/admin/**` → chỉ `ADMIN`.
- `/api/**` (GET) → `ADMIN` + `VIEWER`.

---

## 5. Hướng phát triển nâng cao (optional – phase 2)

### 5.1. Semantic search trên nội dung tài liệu

Về sau có thể:

1. Backend đọc nội dung file (`.docx`, `.pdf`, …).
2. Tách nội dung thành các đoạn (chunk).
3. Gọi model embedding (Gemini / OpenAI / LLM local) để sinh vector cho từng đoạn nội dung.
4. Lưu các vector này vào Neo4j (dưới dạng node `Chunk` hoặc property `vector`).
5. Tạo **vector index** trong Neo4j để hỗ trợ search theo ngữ nghĩa.
6. Khi user hỏi bằng ngôn ngữ tự nhiên, backend:
   - Embed câu hỏi → vector.
   - Gọi Neo4j để tìm các đoạn văn có vector gần nhất.
   - Trả về đoạn văn + link tài liệu gốc.

> Phần này không bắt buộc trong phase 1, nhưng mô hình dữ liệu hiện tại (tách `TaiLieu` riêng) đã sẵn sàng để mở rộng.

---

## 6. Tóm tắt ngắn cho backend

- Neo4j đã có:
  - Mô hình doanh nghiệp (công ty, đơn vị, phòng ban, nhóm, nhân sự, kỹ năng, dự án, công nghệ,…).
  - Phân quyền `NguoiDung` – `VaiTro` với 2 role `ADMIN` và `VIEWER`.
  - Mở rộng thêm label `TaiLieu` + các quan hệ:
    - `(:PhongBan)-[:CO_TAI_LIEU]->(:TaiLieu)`
    - `(:DuAn)-[:DINH_KEM_TAI_LIEU]->(:TaiLieu)`
    - `(:CongTy)-[:BAN_HANH]->(:TaiLieu)`

- Backend cần triển khai:
  1. Cơ chế upload file (local/Firebase/S3) → lấy URL.
  2. API tạo node `TaiLieu` trong Neo4j + gắn quan hệ với phòng ban/dự án/công ty.
  3. API truy vấn tài liệu theo phòng ban, dự án, id.
  4. Áp dụng phân quyền: chỉ `ADMIN` được ghi, `VIEWER` chỉ đọc.

File này là spec để team backend dựa vào đó triển khai mà không cần chỉnh lại mô hình dữ liệu Neo4j.
