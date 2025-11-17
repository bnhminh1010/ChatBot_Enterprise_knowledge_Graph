# 🔐 JWT Authentication & RBAC Implementation

## 📋 Giới thiệu

Hệ thống đã implement đầy đủ **JWT Authentication + Role-Based Access Control (RBAC)** cho phép:

1. **Người dùng đăng nhập** bằng email/password
2. **Backend tạo JWT token** có chứa role
3. **Frontend lưu token** và gửi theo mỗi request
4. **Backend xác minh token** trước khi cho phép truy cập
5. **Phân quyền dựa trên role** (admin, manager, user)

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────┐
│  Frontend (Next.js)         │
│  ├─ Login Form              │
│  ├─ Protected Routes        │
│  └─ User Menu               │
└──────────────┬──────────────┘
               │ HTTP
               │ {email, password}
┌──────────────▼──────────────┐
│  Backend (NestJS)           │
│  ├─ /auth/login            │
│  ├─ /auth/me               │
│  ├─ /auth/verify           │
│  └─ @Roles, @JwtGuard      │
└──────────────┬──────────────┘
               │ Cypher Queries
┌──────────────▼──────────────┐
│  Neo4j Database             │
│  ├─ User nodes              │
│  ├─ Role relationships      │
│  └─ bcrypt hash passwords   │
└─────────────────────────────┘
```

---

## 📊 Database Schema

### User Node
```cypher
MATCH (u:User)
RETURN u.id, u.email, u.hoTen, u.trangThai, u.taoLuc
```

**Thuộc tính:**
- `id` (String) - Định danh user
- `email` (String) - Email duy nhất
- `matKhau` (String) - Password hash (bcrypt)
- `hoTen` (String) - Họ tên
- `trangThai` (String) - "active" hoặc "inactive"
- `taoLuc` (DateTime) - Thời gian tạo
- `capNhatLuc` (DateTime) - Thời gian cập nhật cuối

### Role Node
```cypher
MATCH (r:Role)
RETURN r.ten, r.moTa
```

**Roles có sẵn:**
1. `admin` - Full access (quản lý toàn hệ thống)
2. `manager` - Department access (quản lý phòng ban)
3. `user` - Read-only (chỉ xem)

### User-Role Relationship
```cypher
MATCH (u:User)-[:CO_ROLE]->(r:Role)
RETURN u.email, collect(r.ten)
```

---

## 🔑 Demo Tài Khoản

| Email | Password | Role |
|-------|----------|------|
| admin@aptx.com | 123456 | admin |
| manager@aptx.com | 123456 | manager |
| user@aptx.com | 123456 | user |

**Ghi chú:** Tất cả password đã được mã hóa bằng **bcrypt** (10 salt rounds).

---

## 🚀 Cách hoạt động - Chi tiết từng bước

### **Bước 1: Đăng Nhập (Frontend)**

```typescript
// ekg-frontend/apps/web/src/app/login/page.tsx
const handleSubmit = async (e) => {
  const response = await authService.login({ 
    email: 'admin@aptx.com', 
    password: '123456' 
  });
  // → {access_token, user, expiresIn}
};
```

### **Bước 2: Backend Xác minh (NestJS)**

```typescript
// ekg-backend/src/auth/auth.service.ts
async login(loginDto: LoginDto) {
  // 1. Tìm user trong Neo4j
  const user = await this.findUserByEmail(loginDto.email);
  
  // 2. So sánh password với bcrypt
  const isValid = await bcrypt.compare(loginDto.password, user.matKhau);
  
  // 3. Nếu hợp lệ, tạo JWT token
  const token = this.jwtService.sign(
    { id: user.id, email: user.email, roles: user.roles },
    { expiresIn: '7d' }
  );
  
  // 4. Trả về token + user info
  return { access_token: token, user };
}
```

### **Bước 3: Frontend Lưu Token**

```typescript
// ekg-frontend/apps/web/src/lib/auth.ts
async login(credentials) {
  const response = await apiClient.post('/auth/login', credentials);
  
  // Lưu token vào localStorage
  localStorage.setItem('auth_token', response.access_token);
  localStorage.setItem('auth_user', JSON.stringify(response.user));
  
  return response;
}
```

### **Bước 4: API Client Auto-Inject Token**

```typescript
// ekg-frontend/apps/web/src/lib/api-client.ts
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

async function apiCall(endpoint, method, options) {
  const token = getAuthToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: JSON.stringify(options.body),
  });
  
  return response.json();
}
```

### **Bước 5: Backend Xác minh Token (Guard)**

```typescript
// ekg-backend/src/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    
    // Format: "Bearer <token>"
    const [scheme, token] = authHeader.split(' ');
    
    // Xác minh token
    const payload = this.jwtService.verify(token);
    
    // Gắn user vào request object
    request.user = payload;
    return true;
  }
}
```

### **Bước 6: Sử dụng Guards & Decorators**

```typescript
// ekg-backend/src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  
  // Public endpoint - không cần auth
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  
  // Protected endpoint - cần JWT token
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    return req.user; // User từ JWT payload
  }
  
  // Admin only endpoint - cần role admin
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getUsers() {
    return await this.userService.findAll();
  }
}
```

---

## 💻 Code Examples

### **Frontend - Login Form**

```typescript
'use client';

import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Gọi login
      const response = await authService.login({ email, password });
      console.log('✅ Logged in:', response.user);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### **Frontend - Protected Route**

```typescript
// Wrap any page with ProtectedRoute
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <h1>Admin Dashboard</h1>
      {/* Only admins can see this */}
    </ProtectedRoute>
  );
}
```

### **Frontend - Check User Role**

```typescript
import { authService } from '@/lib/auth';

export function MyComponent() {
  const user = authService.getCurrentUser();
  const isAdmin = authService.hasRole('admin');

  return (
    <div>
      <p>User: {user?.hoTen}</p>
      {isAdmin && <button>Delete User</button>}
    </div>
  );
}
```

### **Frontend - Logout**

```typescript
import { authService } from '@/lib/auth';

const handleLogout = () => {
  authService.logout(); // Xóa token
  router.push('/login');
};
```

### **Backend - Protected Endpoint**

```typescript
@Get('employees')
@UseGuards(JwtAuthGuard)
async getEmployees(@Request() req) {
  // req.user.id = user's ID from JWT
  // req.user.roles = ['admin', 'manager']
  
  const employees = await this.employeeService.findAll();
  return employees;
}
```

### **Backend - Admin Only Endpoint**

```typescript
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async deleteUser(@Param('id') id: string) {
  // Chỉ admin mới có thể xóa user
  await this.userService.delete(id);
  return { message: 'User deleted' };
}
```

### **Backend - Multiple Roles**

```typescript
@Patch('employees/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
async updateEmployee(@Param('id') id: string) {
  // Admin và manager có thể sửa employee
  return await this.employeeService.update(id);
}
```

---

## 🧪 Testing Login Flow

### **Test 1: Successful Login**

```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aptx.com",
    "password": "123456"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "U001",
    "email": "admin@aptx.com",
    "hoTen": "System Administrator",
    "roles": ["admin"]
  },
  "expiresIn": 604800
}
```

### **Test 2: Protected Endpoint**

```bash
curl -X GET http://localhost:3002/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "user": {
    "id": "U001",
    "email": "admin@aptx.com",
    "roles": ["admin"]
  }
}
```

### **Test 3: Invalid Token**

```bash
curl -X GET http://localhost:3002/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Token không hợp lệ hoặc hết hạn"
}
```

---

## 🔄 JWT Token Flow

```
Login → Generate Token → Store in localStorage
                              ↓
                        Include in Headers
                              ↓
                        Backend Verifies
                              ↓
                        Extract User/Roles
                              ↓
                        Check @Roles Decorator
                              ↓
                        Grant/Deny Access
```

---

## 📁 File Structure

```
ekg-backend/src/auth/
├── dto/
│   ├── login.dto.ts                 # Login input
│   ├── auth-response.dto.ts         # Login response
│   └── index.ts
├── guards/
│   ├── jwt-auth.guard.ts            # JWT verification
│   └── roles.guard.ts               # Role checking
├── decorators/
│   ├── roles.decorator.ts           # @Roles(...)
│   └── index.ts
├── auth.service.ts                  # Business logic
├── auth.controller.ts               # HTTP endpoints
└── auth.module.ts                   # Module definition

ekg-frontend/apps/web/src/
├── app/
│   ├── login/page.tsx               # Login page
│   ├── dashboard/page.tsx           # Protected dashboard
│   └── unauthorized/page.tsx        # 403 error page
├── lib/
│   └── auth.ts                      # Auth service
└── components/auth/
    ├── ProtectedRoute.tsx           # Route wrapper
    └── UserMenu.tsx                 # User menu + logout
```

---

## 🛡️ Security Best Practices

1. **JWT Secret**: Thay đổi `JWT_SECRET` trong `.env` (production)
2. **Token Expiry**: Token hết hạn sau 7 ngày (configurable)
3. **Password Hashing**: Dùng bcrypt (10 salt rounds)
4. **HTTPS**: Luôn dùng HTTPS khi deploy (không HTTP)
5. **Token Storage**: Lưu ở localStorage (hoặc httpOnly cookie)
6. **CORS**: Backend đã enable CORS cho frontend

---

## 📝 Next Steps

1. **Tạo User Management Page** (admin có thể thêm/sửa/xóa user)
2. **Implement Role Management** (tạo role tùy chỉnh)
3. **Add Department-Level Filtering** (user chỉ thấy dữ liệu phòng ban mình)
4. **Email Verification** (gửi email xác nhận khi tạo user)
5. **Password Reset Flow** (reset password qua email)
6. **Two-Factor Authentication** (tăng security)
7. **Audit Logging** (ghi lại tất cả hoạt động user)

---

## 🆘 Troubleshooting

### Lỗi: "Token không hợp lệ"
- Kiểm tra xem token có được gửi đúng định dạng: `Bearer <token>`
- Kiểm tra token có hết hạn không
- Kiểm tra `JWT_SECRET` trong backend & frontend phải giống nhau

### Lỗi: "Email hoặc mật khẩu không đúng"
- Kiểm tra email có tồn tại trong Neo4j không
- Kiểm tra mật khẩu (demo: 123456)
- Kiểm tra trangThai = 'active'

### Lỗi: "Bạn không có quyền truy cập"
- Kiểm tra user có role được yêu cầu không
- Kiểm tra `@Roles` decorator đúng không
- Kiểm tra `RolesGuard` được apply chưa

---

## 📚 References

- [JWT.io](https://jwt.io) - JWT specification
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password hashing
- [Neo4j RBAC](https://neo4j.com/docs) - Role-based access

---

**Status**: ✅ Implementation Complete  
**Created**: November 17, 2025  
**Last Updated**: Today
