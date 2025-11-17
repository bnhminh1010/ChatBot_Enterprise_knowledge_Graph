# 📚 JWT Auth - Step-by-Step Learning Guide

Hướng dẫn này giải thích **từng bước** cách JWT authentication hoạt động. Dành cho người muốn **hiểu sâu** về hệ thống.

---

## Phần 1: Kiến Thức Nền Tảng (5 phút)

### ❓ JWT là gì?

**JWT = JSON Web Token**

Một chuỗi ký tự dùng để xác minh user đã login. Thay vì lưu session trên server, chúng ta lưu JWT token ở client.

**Ví dụ JWT token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IlUwMDEiLCJlbWFpbCI6ImFkbWluQGFwdHguY29tIn0.
5mG-qzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzq
```

Token gồm 3 phần cách nhau bằng `.`:
1. **Header** - Loại token (JWT) và algorithm (HS256)
2. **Payload** - Data (id, email, roles)
3. **Signature** - Chữ ký (dùng secret key để tạo)

### ❓ Tại sao dùng JWT?

| Cách cũ (Session) | JWT (Mới) |
|---|---|
| Lưu data trên server | Lưu data trên token |
| Request: gửi session ID | Request: gửi token |
| Backend tìm session | Backend verify token |
| Mất session nếu restart server | Token vẫn hợp lệ |
| Khó scale (cần shared session) | Dễ scale (stateless) |

### ❓ RBAC là gì?

**RBAC = Role-Based Access Control**

Phân quyền dựa vào role (vai trò) của user. Ví dụ:
- **admin** → Có quyền xóa user
- **manager** → Chỉ sửa employee của phòng mình
- **user** → Chỉ xem dữ liệu

---

## Phần 2: Login Flow Chi Tiết (10 phút)

### Step 1: User gõ email/password

```typescript
// ekg-frontend/apps/web/src/app/login/page.tsx

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // User nhập: admin@aptx.com / 123456
  const response = await authService.login({
    email,
    password
  });
}
```

**Điều gì xảy ra:**
- User nhập email: `admin@aptx.com`
- User nhập password: `123456`
- User click nút "Đăng nhập"

### Step 2: Frontend gọi API login

```typescript
// ekg-frontend/apps/web/src/lib/auth.ts

async login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    '/auth/login',
    credentials
  );
  // ...
}
```

**Điều gì xảy ra:**
- Frontend ghi nhớ email/password
- Gọi backend API: `POST /auth/login`
- Gửi `{email: "admin@aptx.com", password: "123456"}`

### Step 3: Backend tìm user trong Neo4j

```typescript
// ekg-backend/src/auth/auth.service.ts

async login(loginDto: LoginDto) {
  // Bước 1: Tìm user
  const user = await this.findUserByEmail(email);
  
  // Neo4j query:
  // MATCH (u:User {email: "admin@aptx.com"})
  // RETURN u
}
```

**Điều gì xảy ra:**
- Backend chạy Cypher query
- Tìm User node có email = `admin@aptx.com`
- Tìm được: `{id: "U001", email: "admin@aptx.com", matKhau: "$2b$10...", roles: ["admin"]}`

### Step 4: Backend so sánh password

```typescript
// ekg-backend/src/auth/auth.service.ts

const isPasswordValid = await bcrypt.compare(password, user.matKhau);
// bcrypt.compare("123456", "$2b$10$p9U...")
// → true ✅
```

**Điều gì xảy ra:**
- Backend lấy password gửi từ frontend: `"123456"`
- Backend lấy password lưu trong database: `"$2b$10$p9U5I8F8RQkFZuP0mVYaYum3P8JZKvG8QzW7KJO2Lb5PqQI.qQ9jy"` (bcrypt hash)
- dùng bcrypt.compare() để so sánh
- Kết quả: `true` (password đúng!)

**Tại sao dùng bcrypt?**
- Không thể reverse hash để lấy password gốc
- Ngay cả có hash cũng không thể so sánh trực tiếp
- Hacker không thể dùng hash để login

### Step 5: Backend tạo JWT token

```typescript
// ekg-backend/src/auth/auth.service.ts

const token = this.jwtService.sign(
  {
    id: user.id,
    email: user.email,
    roles: user.roles
  },
  { expiresIn: '7d' }
);

// Kết quả:
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlUwMDEiLCJlbWFpbCI6ImFkbWluQGFwdHguY29tIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNzAwMjA2ODAwLCJleHAiOjE3MDA4MTE2MDB9.5mG-qzqz..."
```

**Điều gì xảy ra:**
- Backend tạo JWT token chứa:
  - User ID: `U001`
  - Email: `admin@aptx.com`
  - Roles: `["admin"]`
  - Issued at: `1700206800` (bây giờ)
  - Expires at: `1700811600` (7 ngày sau)
- Token được ký bằng secret key: `JWT_SECRET=your-super-secret-key`

### Step 6: Backend gửi token về frontend

```typescript
// Backend response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "U001",
    "email": "admin@aptx.com",
    "hoTen": "System Administrator",
    "roles": ["admin"]
  },
  "expiresIn": 604800  // 7 ngày (giây)
}
```

**Điều gì xảy ra:**
- Backend trả response HTTP 200
- Gồm token + user info
- Frontend nhận response

### Step 7: Frontend lưu token

```typescript
// ekg-frontend/apps/web/src/lib/auth.ts

localStorage.setItem(TOKEN_KEY, response.access_token);
localStorage.setItem(USER_KEY, JSON.stringify(response.user));
```

**Điều gì xảy ra:**
- Frontend lưu token vào **localStorage**
  - Key: `auth_token`
  - Value: `eyJhbGciOiJIUzI1NiIs...`
- Frontend lưu user info vào **localStorage**
  - Key: `auth_user`
  - Value: `{"id":"U001","email":"admin@aptx.com",...}`

**localStorage là gì?**
- Bộ nhớ dành cho website
- Lưu dữ liệu text (key-value)
- Tồn tại cho đến khi xóa
- Có thể truy cập bằng JS: `localStorage.getItem('auth_token')`

### Step 8: Frontend redirect to dashboard

```typescript
router.push('/dashboard');
```

**Điều gì xảy ra:**
- User được đưa đến trang dashboard
- User thấy "Chào mừng, System Administrator!"
- User có thể click menu thấy tên, email, role

---

## Phần 3: Protected Request Chi Tiết (10 phút)

### Step 1: User request dữ liệu

```typescript
// Frontend component
const getEmployees = async () => {
  const response = await apiClient.get('/employees');
}
```

**Điều gì xảy ra:**
- Component gọi API: `GET /employees`
- Request gửi đi

### Step 2: API Client tự động thêm token

```typescript
// ekg-frontend/apps/web/src/lib/api-client.ts

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function apiCall<T = any>(
  endpoint: string,
  method: string = 'GET',
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 👇 Quan trọng: Auto-inject token
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,  // Token đã được thêm vào đây
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}
```

**Điều gì xảy ra:**
- API client lấy token từ localStorage
- Thêm token vào header: `Authorization: Bearer eyJh...`
- Gửi request HTTP

**HTTP Request trông như vậy:**
```
GET /employees HTTP/1.1
Host: localhost:3002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlUwMDEiLCJlbWFpbCI6ImFkbWluQGFwdHguY29tIn0.5mG-qz...
Content-Type: application/json
```

### Step 3: Backend JwtAuthGuard kiểm tra token

```typescript
// ekg-backend/src/auth/guards/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    // authHeader = "Bearer eyJhbGciOiJIUzI1NiIs..."
    
    // Tách token
    const [scheme, token] = authHeader.split(' ');
    // scheme = "Bearer"
    // token = "eyJhbGciOiJIUzI1NiIs..."
    
    // Verify token
    const payload = this.jwtService.verify(token);
    // Kết quả: {id: "U001", email: "admin@aptx.com", roles: ["admin"], iat: ..., exp: ...}
    
    // Gắn user vào request
    request.user = payload;
    // Giờ request.user = {id, email, roles}
    
    return true; // Cho phép tiếp tục
  }
}
```

**Điều gì xảy ra:**
- Backend nhận request từ frontend
- Guard lấy token từ header `Authorization: Bearer ...`
- Guard gọi `jwtService.verify(token)` để kiểm tra:
  - ✅ Token signature hợp lệ không?
  - ✅ Token chưa hết hạn không?
  - ✅ Token chứa dữ liệu gì?
- Nếu hợp lệ → giải mã token → lấy user data
- Gắn user data vào request object
- Cho phép tiếp tục xử lý request

**Nếu token không hợp lệ:**
```typescript
throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
// → Return HTTP 401 Unauthorized
```

### Step 4: Backend RolesGuard kiểm tra role

```typescript
// ekg-backend/src/auth/guards/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    // Lấy từ @Roles('admin', 'manager')
    // requiredRoles = ['admin', 'manager']
    
    const { user } = context.switchToHttp().getRequest();
    // user = {id: "U001", email: "admin@aptx.com", roles: ["admin"], ...}
    
    // Check nếu user có 1 trong roles được yêu cầu
    const hasRole = requiredRoles.some(role => user.roles?.includes(role));
    // user.roles = ["admin"]
    // requiredRoles = ['admin', 'manager']
    // "admin" in ["admin"] → true ✅
    
    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
      // → Return HTTP 403 Forbidden
    }
    
    return true; // Cho phép tiếp tục
  }
}
```

**Điều gì xảy ra:**
- Guard kiểm tra decorator `@Roles('admin', 'manager')`
- Guard lấy user roles từ JWT payload
- So sánh: User có 1 trong required roles không?
- Nếu có → cho phép
- Nếu không → 403 Forbidden error

### Step 5: Backend endpoint xử lý request

```typescript
// ekg-backend/src/employees/employees.controller.ts

@Get()
@UseGuards(JwtAuthGuard)
async getEmployees(@Request() req) {
  // Nếu tới đây, có nghĩa:
  // ✅ Token hợp lệ
  // ✅ User đã được verify
  // ✅ request.user = {id, email, roles}
  
  const employees = await this.employeeService.findAll();
  return employees;
}
```

**Điều gì xảy ra:**
- Endpoint handler được gọi
- Có thể truy cập `request.user` (JWT payload)
- Query database
- Return dữ liệu

### Step 6: Backend gửi dữ liệu về frontend

```typescript
// HTTP Response
{
  "statusCode": 200,
  "data": [
    {"id": "E001", "ten": "Nguyen Van A", ...},
    {"id": "E002", "ten": "Tran Thi B", ...},
    ...
  ]
}
```

### Step 7: Frontend nhận dữ liệu

```typescript
// Frontend
const response = await apiClient.get('/employees');
// response = [employee1, employee2, ...]

// Hiển thị trên UI
return (
  <ul>
    {response.map(emp => <li>{emp.ten}</li>)}
  </ul>
);
```

---

## Phần 4: Role Check Flow (5 phút)

### Ví dụ: Admin-only endpoint

```typescript
// Backend
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RolesGuard)  // 2 guards
@Roles('admin')  // Chỉ admin
async deleteUser(@Param('id') id: string) {
  await this.userService.delete(id);
  return { message: 'Deleted' };
}
```

**Nếu admin delete:**
```
1. Frontend: DELETE /users/U002
   Authorization: Bearer (admin token)

2. Backend: JwtAuthGuard
   ✅ Token valid
   ✅ request.user = {id: "U001", roles: ["admin"]}

3. Backend: RolesGuard
   @Roles('admin')
   user.roles = ["admin"]
   "admin" in ["admin"] → ✅ True
   
4. Endpoint executes
   Delete user U002
   
5. Response: {"message": "Deleted"}
```

**Nếu manager delete:**
```
1. Frontend: DELETE /users/U002
   Authorization: Bearer (manager token)

2. Backend: JwtAuthGuard
   ✅ Token valid
   ✅ request.user = {id: "U002", roles: ["manager"]}

3. Backend: RolesGuard
   @Roles('admin')
   user.roles = ["manager"]
   "admin" in ["manager"] → ❌ False
   
4. Throw ForbiddenException

5. Response (403):
   {
     "statusCode": 403,
     "message": "Bạn không có quyền truy cập"
   }
```

---

## Phần 5: Token Expiry (5 phút)

### Khi token hết hạn

```
Scenario: Token tạo lúc 1:00 PM, hết hạn 7 ngày sau

T+1 hour (2:00 PM):
- User request API
- Token còn hợp lệ
- ✅ Request thành công

T+7 days (1:00 PM next week):
- User request API
- Guard check: token.exp <= now?
- ✅ Yes, token expired
- ❌ Throw UnauthorizedException (401)

T+7d+1 hour:
- User click logout
- Frontend: localStorage.removeItem('auth_token')
- User redirected to /login

User must login again to get new token
```

### Refresh Token (Future Enhancement)

```typescript
// Có thể thêm refresh token flow:

POST /auth/refresh
Body: {refresh_token: "..."}

Response:
{
  "access_token": "new_token_eyJ...",
  "expiresIn": 604800
}
```

---

## Phần 6: Security Best Practices (5 phút)

### ✅ DO (Cần làm)

1. **Luôn hash password**
   ```typescript
   const hashed = await bcrypt.hash(password, 10);
   // Không bao giờ lưu plain password
   ```

2. **Luôn verify token**
   ```typescript
   @UseGuards(JwtAuthGuard)  // Luôn protect endpoint
   ```

3. **Kiểm tra role**
   ```typescript
   @Roles('admin')
   @UseGuards(RolesGuard)  // Kiểm tra permission
   ```

4. **Dùng HTTPS** (production)
   ```
   https://api.aptx.com/...  // Secured
   // http://api.aptx.com/...  // Không an toàn
   ```

5. **Thay đổi secret key** (production)
   ```env
   JWT_SECRET=your-super-secret-key-change-in-production
   ```

### ❌ DON'T (Không nên làm)

1. **Không lưu plain password**
   ```typescript
   // ❌ SAI
   user.password = "123456";
   
   // ✅ ĐÚNG
   user.password = bcrypt.hash("123456", 10);
   ```

2. **Không để token trong URL**
   ```typescript
   // ❌ SAI
   GET /api/data?token=eyJ...
   
   // ✅ ĐÚNG
   GET /api/data
   Authorization: Bearer eyJ...
   ```

3. **Không expose secret key**
   ```typescript
   // ❌ SAI
   // JWT_SECRET="key" ở frontend hoặc public repo
   
   // ✅ ĐÚNG
   // JWT_SECRET ở backend .env file (gitignore)
   ```

4. **Không trust client data**
   ```typescript
   // ❌ SAI
   if (req.body.isAdmin) {  // Client có thể giả mạo
   
   // ✅ ĐÚNG
   if (req.user.roles.includes('admin')) {  // Từ JWT
   ```

---

## Phần 7: Practical Examples (10 phút)

### Example 1: Check if user logged in

```typescript
// Frontend component
import { authService } from '@/lib/auth';

export function MyComponent() {
  // Method 1: Check token
  if (!authService.isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  
  // Method 2: Get user
  const user = authService.getCurrentUser();
  if (!user) {
    return <p>Not logged in</p>;
  }
  
  return <p>Welcome, {user.hoTen}!</p>;
}
```

### Example 2: Protect a route

```typescript
// Frontend route
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Dashboard } from './Dashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

### Example 3: Conditional rendering based on role

```typescript
// Frontend component
import { authService } from '@/lib/auth';

export function UserActions() {
  const isAdmin = authService.hasRole('admin');
  const isManager = authService.hasRole('manager');
  
  return (
    <div>
      {isAdmin && (
        <button onClick={deleteUser}>Delete User</button>
      )}
      
      {(isAdmin || isManager) && (
        <button onClick={editEmployee}>Edit Employee</button>
      )}
      
      <button onClick={viewProfile}>View Profile</button>
    </div>
  );
}
```

### Example 4: Backend protected endpoint

```typescript
// Backend controller
@Get('employees')
@UseGuards(JwtAuthGuard)
async getEmployees(@Request() req) {
  // req.user = {id, email, roles}
  
  if (req.user.roles.includes('admin')) {
    // Admin sees all employees
    return this.employeeService.findAll();
  } else if (req.user.roles.includes('manager')) {
    // Manager sees only their department
    return this.employeeService.findByDepartment(req.user.departmentId);
  } else {
    // User sees only public info
    return this.employeeService.findPublic();
  }
}
```

### Example 5: Admin-only endpoint

```typescript
// Backend controller
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')  // Only admin can access
async deleteUser(
  @Param('id') id: string,
  @Request() req
) {
  // If code reaches here:
  // ✅ Token is valid
  // ✅ User has 'admin' role
  
  this.logger.log(`Admin ${req.user.email} deleted user ${id}`);
  return this.userService.delete(id);
}
```

---

## Summary

| Step | Action | Who | Result |
|------|--------|-----|--------|
| 1 | User enters credentials | User | Email + password submitted |
| 2 | Frontend sends login request | Frontend | POST /auth/login |
| 3 | Backend validates | Backend | Check Neo4j + bcrypt |
| 4 | Backend generates token | Backend | JWT token created |
| 5 | Frontend stores token | Frontend | localStorage.setItem |
| 6 | Frontend redirects | Frontend | Navigate to /dashboard |
| 7 | User makes API request | User | Click "Get Employees" |
| 8 | API client adds token | Frontend | Authorization header |
| 9 | Backend verifies token | Backend | JwtAuthGuard |
| 10 | Backend checks role | Backend | RolesGuard |
| 11 | Endpoint executes | Backend | Query database |
| 12 | Response sent | Backend | Return data |
| 13 | Frontend displays | Frontend | Show employees list |

---

**Now you understand JWT auth completely!** 🎉

