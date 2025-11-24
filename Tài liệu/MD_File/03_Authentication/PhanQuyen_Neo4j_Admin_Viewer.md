# Phân quyền truy cập Neo4j: Admin & Viewer

Tài liệu này mô tả **mô hình phân quyền ở tầng database (Neo4j)** để team backend dựa vào đó triển khai logic phân quyền trong API / chatbot.

Mục tiêu:

- Có 1 user **Admin** duy nhất có quyền **chỉnh sửa dữ liệu Neo4j** (CREATE / MERGE / DELETE…).
- 40 nhân viên còn lại là **Viewer**: **chỉ được đọc** dữ liệu (MATCH… RETURN…), không được sửa.

> Lưu ý: Phân quyền thực tế (chặn API, kiểm tra token, v.v.) vẫn nằm ở **backend**.  
> Neo4j chỉ đóng vai trò **lưu thông tin role** và cho phép backend query ra role của user.

---

## 1. Mô hình dữ liệu phân quyền trong Neo4j

### 1.1. Các label & quan hệ liên quan

**Node label:**

- `NguoiDung`
  - Đại diện cho account đăng nhập hệ thống (chatbot / web).
  - Thuộc tính gợi ý:
    - `username`: _string, duy nhất_ (VD: `"admin"`, `"NS001"`…)
    - `ho_ten`: _string_
    - `trang_thai`: _string_ (`"Active"`, `"Locked"`, …)
    - `mat_khau`: _string_ (trong môi trường demo đang lưu plaintext để tiện phát triển; production nên dùng hash).

- `VaiTro`
  - Đại diện cho **role** trong hệ thống.
  - Thuộc tính:
    - `ma`: _string, duy nhất_ (VD: `"ADMIN"`, `"VIEWER"`)
    - `ten`: _string_ (ví dụ: `"Quản trị hệ thống"`)
    - `mo_ta`: _string_

**Quan hệ:**

- `(:NguoiDung)-[:CO_VAI_TRO]->(:VaiTro)`
  - Một user có 1 (hoặc nhiều) role.
  - Trong hệ hiện tại: 1 user = 1 role.

- `(:NguoiDung)-[:LA_NHAN_SU]->(:NhanSu)`
  - _Optional_ – dùng để map account với nhân sự trong Knowledge Graph.
  - Ví dụ: `username = "NS001"` tương ứng với node `NhanSu {id:"NS001"}`.

---

## 2. Cypher seed phân quyền

### 2.1. Constraint

```cypher
// Mỗi vai trò có mã duy nhất
CREATE CONSTRAINT vaitro_ma IF NOT EXISTS
FOR (r:VaiTro)
REQUIRE r.ma IS UNIQUE;

// Mỗi người dùng có username duy nhất
CREATE CONSTRAINT user_username IF NOT EXISTS
FOR (u:NguoiDung)
REQUIRE u.username IS UNIQUE;
```

---

### 2.2. Tạo 2 Vai trò: ADMIN & VIEWER

```cypher
WITH [
  {
    ma:'ADMIN',
    ten:'Quản trị hệ thống',
    mo_ta:'Có quyền chỉnh sửa dữ liệu đồ thị tri thức (tạo/sửa/xoá node & quan hệ).'
  },
  {
    ma:'VIEWER',
    ten:'Người dùng nội bộ',
    mo_ta:'Chỉ được phép truy vấn và xem dữ liệu, không được chỉnh sửa.'
  }
] AS roles

UNWIND roles AS r
MERGE (role:VaiTro {ma: r.ma})
  ON CREATE SET
    role.ten   = r.ten,
    role.mo_ta = r.mo_ta;
```

---

### 2.3. Tạo 1 tài khoản Admin

- Admin **không gắn** với `NhanSu` (quản trị hệ thống riêng).
- Username: `admin`.

```cypher
MATCH (rAdmin:VaiTro {ma:'ADMIN'})

MERGE (admin:NguoiDung {username:'admin'})
  ON CREATE SET
    admin.ho_ten     = 'Admin hệ thống APTX',
    admin.trang_thai = 'Active'

MERGE (admin)-[:CO_VAI_TRO]->(rAdmin);
```

---

### 2.4. Tạo 40 tài khoản Viewer tương ứng 40 `NhanSu`

Quy ước:

- Mỗi `NhanSu` có 1 tài khoản `NguoiDung` tương ứng.
- `username = id` của `NhanSu` (VD: `NS001`, `NS002`, …).
- Tất cả gán role `VIEWER`.

```cypher
MATCH (rViewer:VaiTro {ma:'VIEWER'})
MATCH (ns:NhanSu)
MERGE (u:NguoiDung {username: ns.id})
  ON CREATE SET
    u.ho_ten     = ns.ho_ten,
    u.trang_thai = 'Active'
MERGE (u)-[:CO_VAI_TRO]->(rViewer)
MERGE (u)-[:LA_NHAN_SU]->(ns);
```

> Sau khi chạy xong:  
> - Có 1 user admin: `username = "admin"`, role = `ADMIN`.  
> - Có 40 user viewer: `username = "NS001"... "NS040"`, role = `VIEWER`.

---

### 2.5. Query kiểm tra

```cypher
MATCH (u:NguoiDung)-[:CO_VAI_TRO]->(r:VaiTro)
OPTIONAL MATCH (u)-[:LA_NHAN_SU]->(ns:NhanSu)
RETURN u.username, u.ho_ten, r.ma AS role, ns.id AS nhan_su_id
ORDER BY role, u.username;
```

---

### 2.6. Quy ước tài khoản & mật khẩu demo

Để team backend dễ triển khai đăng nhập, tạm thời dùng **mật khẩu dạng đơn giản** (plaintext) cho môi trường demo / phát triển.

**Admin:**

- `username = "admin"`
- `password = "Admin@123"`

**40 Viewer (nhân viên):**

- `username = id` của `NhanSu` (`"NS001"`…`"NS040"`).
- `password` theo rule: `<username>@123`  
  Ví dụ:
  - `NS001` → password: `NS001@123`
  - `NS002` → password: `NS002@123`
  - …
  - `NS040` → password: `NS040@123`

Cypher cập nhật mật khẩu demo:

```cypher
// Set mật khẩu cho admin
MATCH (u:NguoiDung {username:'admin'})
SET u.mat_khau = 'Admin@123';

// Set mật khẩu cho tất cả Viewer theo rule <username>@123
MATCH (u:NguoiDung)-[:CO_VAI_TRO]->(:VaiTro {ma:'VIEWER'})
SET u.mat_khau = u.username + '@123';
```

> Ghi chú:
> - Trong môi trường thật, không nên lưu mật khẩu ở dạng plaintext như trên.
> - Backend có thể hash mật khẩu (BCrypt, Argon2, …) và lưu vào trường khác (VD: `mat_khau_hash`), lúc đó phần `mat_khau` này chỉ là bước seed tạm cho demo.

---

## 3. Cách backend sử dụng phân quyền

Phần này dành cho anh em backend.

### 3.1. Luồng chung

1. User đăng nhập (qua hệ thống auth của app).  
2. Backend biết được `username` (VD: `"admin"` hoặc `"NS001"`).  
3. Backend query Neo4j để lấy **role** tương ứng:
   ```cypher
   MATCH (u:NguoiDung {username:$username})-[:CO_VAI_TRO]->(r:VaiTro)
   RETURN r.ma AS role;
   ```
4. Dựa vào `role`, backend quyết định:
   - `ADMIN` → được chạy các query **WRITE** (CREATE / MERGE / DELETE…).
   - `VIEWER` → chỉ chạy các query **READ** (MATCH / OPTIONAL MATCH / RETURN).

Pseudo-code TypeScript/NestJS:

```ts
async function getUserRole(username: string): Promise<'ADMIN' | 'VIEWER' | null> {
  const cypher = `
    MATCH (u:NguoiDung {username:$username})-[:CO_VAI_TRO]->(r:VaiTro)
    RETURN r.ma AS role
  `;
  const res = await neo4jSession.run(cypher, { username });
  if (res.records.length === 0) return null;
  return res.records[0].get('role');
}
```

Ngoài ra, backend có thể đọc luôn `mat_khau` từ Neo4j (hoặc từ DB riêng) để verify khi đăng nhập, tuỳ kiến trúc.

---

### 3.2. Pattern: chỉ cho Admin chạy query write

Ví dụ API: **Thêm nhân sự mới vào 1 phòng ban & nhóm**.  
Luồng:

- Nhận body gồm: `pbId`, `nhomId`, `chucDanhId`, `nhanSuId`, `hoTen`, `email`, `sdt`, `ngaySinh`, `ngayVao`.  
- Lấy `username` từ token.  
- Check `role`.  
- Nếu không phải `ADMIN` → **return 403**.  
- Nếu `ADMIN` → run Cypher create.

Pseudo-code:

```ts
async function createNhanSu(username: string, payload: CreateNhanSuDto) {
  const role = await getUserRole(username);
  if (role !== 'ADMIN') {
    throw new ForbiddenException('Bạn không có quyền chỉnh sửa dữ liệu');
  }

  const cypher = `
    MATCH (pb:PhongBan {id:$pbId})
    MATCH (n:Nhom {id:$nhomId})
    MATCH (cd:ChucDanh {id:$chucDanhId})

    CREATE (ns:NhanSu {
      id: $nhanSuId,
      ho_ten: $hoTen,
      email_cong_ty: $email,
      so_dien_thoai: $sdt,
      ngay_sinh: date($ngaySinh),
      ngay_vao_cong_ty: date($ngayVao),
      trang_thai_lam_viec: 'Active',
      cap_bac_hien_tai: cd.cap_bac
    })
    MERGE (ns)-[:THUOC_PHONG_BAN]->(pb)
    MERGE (ns)-[:THAM_GIA_NHOM]->(n)
    MERGE (ns)-[:GIU_CHUC_DANH {tu_ngay:date($ngayVao)}]->(cd)
    RETURN ns
  `;

  const params = {
    pbId: payload.pbId,
    nhomId: payload.nhomId,
    chucDanhId: payload.chucDanhId,
    nhanSuId: payload.nhanSuId,
    hoTen: payload.hoTen,
    email: payload.email,
    sdt: payload.sdt,
    ngaySinh: payload.ngaySinh,
    ngayVao: payload.ngayVao,
  };

  return neo4jSession.run(cypher, params);
}
```

---

### 3.3. (Tuỳ chọn) Check quyền ngay trong Cypher với APOC

Nếu môi trường Neo4j có **APOC**, có thể kiểm tra quyền ngay trong Cypher:

```cypher
WITH $username AS username,
     $pbId        AS pbId,
     $nhomId      AS nhomId,
     $chucDanhId  AS chucDanhId,
     $nhanSuId    AS nhanSuId,
     $hoTen       AS hoTen,
     $email       AS email,
     $sdt         AS sdt,
     $ngaySinh    AS ngaySinh,
     $ngayVao     AS ngayVao

// 1) Check user có phải ADMIN không
MATCH (u:NguoiDung {username:username})-[:CO_VAI_TRO]->(r:VaiTro {ma:'ADMIN'})
WITH u, pbId, nhomId, chucDanhId, nhanSuId, hoTen, email, sdt, ngaySinh, ngayVao
CALL apoc.util.validate(u IS NULL, 'ACCESS_DENIED: User khong co quyen ADMIN', [])
YIELD value
WITH pbId, nhomId, chucDanhId, nhanSuId, hoTen, email, sdt, ngaySinh, ngayVao

// 2) Nếu qua được validate thì mới tạo nhân sự
MATCH (pb:PhongBan {id:pbId})
MATCH (n:Nhom {id:nhomId})
MATCH (cd:ChucDanh {id:chucDanhId})

CREATE (ns:NhanSu {
  id: nhanSuId,
  ho_ten: hoTen,
  email_cong_ty: email,
  so_dien_thoai: sdt,
  ngay_sinh: date(ngaySinh),
  ngay_vao_cong_ty: date(ngayVao),
  trang_thai_lam_viec: 'Active',
  cap_bac_hien_tai: cd.cap_bac
})
MERGE (ns)-[:THUOC_PHONG_BAN]->(pb)
MERGE (ns)-[:THAM_GIA_NHOM]->(n)
MERGE (ns)-[:GIU_CHUC_DANH {tu_ngay:date(ngayVao)}]->(cd)
RETURN ns;
```

---

## 4. Tóm tắt cho team backend

- Neo4j đã có sẵn:
  - `NguoiDung(username, ho_ten, trang_thai, mat_khau)`  
  - `VaiTro(ma)` với 2 giá trị: `ADMIN`, `VIEWER`
  - Quan hệ:
    - `NguoiDung-[:CO_VAI_TRO]->VaiTro`
    - `NguoiDung-[:LA_NHAN_SU]->NhanSu` (map sang KG)

- Phân quyền:
  - `ADMIN` → full quyền chỉnh sửa đồ thị tri thức.
  - `VIEWER` → chỉ được đọc.

- Mật khẩu demo:
  - Admin: `admin / Admin@123`
  - Viewer: `NSxxx / NSxxx@123` (xxx = 001…040)

- Việc cần làm ở backend:
  - Sau khi auth, lấy `username` từ token/session.
  - Dùng Cypher để lấy role từ Neo4j.
  - Dựa trên role:
    - Cho phép / chặn các endpoint **write** (tạo, sửa, xoá).
    - Endpoint đọc (search, query KG) thì cả ADMIN & VIEWER đều dùng được.
  - (Optional) Chuyển sang lưu & verify mật khẩu dạng hash khi lên môi trường thật.
