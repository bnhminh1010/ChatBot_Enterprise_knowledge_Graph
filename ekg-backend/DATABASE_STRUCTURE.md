# CẤU TRÚC DATABASE NEO4J - EKG SYSTEM

## 🏗️ CÁC NODE (Đối tượng)

### 1. PhongBan (Phòng ban)
- **Properties**: code (unique), ten
- **Ví dụ**: {code: 'ENG', ten: 'Engineering'}

### 2. NhanSu (Nhân sự)
- **Properties**: empId (unique), ten, chucDanh, email, ngayTao
- **Ví dụ**: {empId: 'E001', ten: 'Nguyen Van A', chucDanh: 'Backend Engineer'}

### 3. KyNang (Kỹ năng)
- **Properties**: ten (unique)
- **Ví dụ**: {ten: 'Node.js'}

### 4. DuAn (Dự án)
- **Properties**: key (unique), ten, trangThai, ngayBatDau
- **Ví dụ**: {key: 'P001', ten: 'EKG Analytics', trangThai: 'Active'}

### 5. CongNghe (Công nghệ)
- **Properties**: ten (unique)
- **Ví dụ**: {ten: 'NestJS'}

### 6. User (User hệ thống)
- **Properties**: id (unique), email, hoTen, matKhau (hashed), trangThai
- **Ví dụ**: {id: 'U001', email: 'admin@aptx.com'}

### 7. Role (Phân quyền)
- **Properties**: ten (unique), moTa
- **Ví dụ**: {ten: 'admin', moTa: 'Administrator'}

## 🔗 CÁC RELATIONSHIP (Mối quan hệ)

### 1. CO_NHAN_SU (Phòng ban có nhân sự)
- **Direction**: PhongBan → NhanSu
- **Properties**: (không có)
- **Ví dụ**: (eng:PhongBan)-[:CO_NHAN_SU]->(e1:NhanSu)

### 2. CO_KY_NANG (Nhân sự có kỹ năng)
- **Direction**: NhanSu → KyNang
- **Properties**: level (1-5)
- **Ví dụ**: (e1:NhanSu)-[:CO_KY_NANG {level: 4}]->(sNode:KyNang)

### 3. LAM_DU_AN (Nhân sự làm dự án)
- **Direction**: NhanSu → DuAn
- **Properties**: (không có)
- **Ví dụ**: (e1:NhanSu)-[:LAM_DU_AN]->(p1:DuAn)

### 4. SU_DUNG_CONG_NGHE (Dự án sử dụng công nghệ)
- **Direction**: DuAn → CongNghe
- **Properties**: (không có)
- **Ví dụ**: (p1:DuAn)-[:SU_DUNG_CONG_NGHE]->(tNest:CongNghe)

### 5. CO_ROLE (User có role)
- **Direction**: User → Role
- **Properties**: (không có)
- **Ví dụ**: (admin:User)-[:CO_ROLE]->(roleAdmin:Role)

## 📊 SỐ LIỆU HIỆN TẠI
- PhongBan: 1
- NhanSu: 1  
- KyNang: 5
- DuAn: 1
- CongNghe: 2
- User: 3
- Role: 3

## 🔍 CÁC QUERY HỮU ÍCH

### 1. Tìm nhân sự theo kỹ năng
```cypher
MATCH (ns:NhanSu)-[:CO_KY_NANG]->(kn:KyNang {ten: 'Node.js'})
RETURN ns.ten, ns.chucDanh
```

### 2. Tìm dự án của nhân viên
```cypher
MATCH (ns:NhanSu {empId: 'E001'})-[:LAM_DU_AN]->(da:DuAn)
RETURN da.ten, da.trangThai
```

### 3. Tìm kỹ năng của phòng ban
```cypher
MATCH (pb:PhongBan {code: 'ENG'})-[:CO_NHAN_SU]->(ns:NhanSu)-[:CO_KY_NANG]->(kn:KyNang)
RETURN DISTINCT kn.ten
```

### 4. Thống kê nhân viên theo phòng ban
```cypher
MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(ns:NhanSu)
RETURN pb.ten as PhongBan, count(ns) as SoNhanVien
```

### 5. Tìm công nghệ liên quan đến kỹ năng
```cypher
MATCH (kn:KyNang)-[:CO_KY_NANG]->(ns:NhanSu)-[:LAM_DU_AN]->(da:DuAn)-[:SU_DUNG_CONG_NGHE]->(cn:CongNghe)
RETURN kn.ten as KyNang, collect(DISTINCT cn.ten) as CongNghes
```

## 🚀 CÁC SCRIPT ĐÃ CÓ
1. `constraints.cypher` - Tạo constraints
2. `seed-core.cypher` - Data nhân sự, kỹ năng, dự án
3. `seed-users.cypher` - Data user & roles
4. `seed-additional.cypher` - Data DevOps engineer
5. `seed-more-data.cypher` - Data thêm nhiều nhân viên

## 📝 CÁCH THÊM DATA MỚI

### Cách 1: Tạo file .cypher mới
1. Tạo file trong `scripts/cypher/`
2. Viết query Cypher
3. Chạy: `docker exec -it ekg-neo4j cypher-shell -u neo4j -p neo4j123 -f scripts/cypher/ten_file.cypher`

### Cách 2: Dùng Neo4j Browser
1. Mở http://localhost:7474
2. Login: neo4j/neo4j123
3. Gõ query trực tiếp

### Cách 3: Cập nhật script seed
1. Thêm vào file seed hiện có
2. Chạy: `npm run seed:full`