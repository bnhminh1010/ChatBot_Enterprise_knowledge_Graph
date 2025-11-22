# 🔐 Hệ thống phân quyền - Quick Start

## Các file đã tạo

✅ **Auth Module**: JWT authentication với guards và decorators  
✅ **Users Module**: Query user data từ Neo4j  
✅ **Seed Script**: Tạo admin + 40 viewer users  
✅ **Protected Controllers**: Tất cả endpoints đã được bảo vệ

## Setup nhanh (3 bước)

### 1. Chạy script tự động
```bash
.\setup-auth.bat
```

Script này sẽ tự động:
- Cài đặt passport dependencies
- Chạy seed script tạo users
- Hiển thị credentials mặc định

### 2. Start server
```bash
npm run start:dev
```

### 3. Test hệ thống
```bash
npm run test:auth
```

## Credentials mặc định

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Viewers | `NS001-NS040` | `User@123` |

## API Endpoints

### Authentication
- `POST /auth/login` - Đăng nhập, nhận JWT token
- `GET /auth/profile` - Xem thông tin user hiện tại

### Protected Endpoints
- **Read (GET)**: ADMIN và VIEWER đều được phép
- **Write (POST/PUT/DELETE)**: Chỉ ADMIN

## Test thủ công

### Login
```bash
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"Admin@123\"}"
```

### Dùng token
```bash
curl -X GET http://localhost:3000/employees ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Tài liệu đầy đủ

Xem [`walkthrough.md`](file:///C:/Users/AnhKhoa/.gemini/antigravity/brain/2a20435f-858b-4e6e-9152-ea0a261ac60c/walkthrough.md) để biết chi tiết đầy đủ về implementation.
