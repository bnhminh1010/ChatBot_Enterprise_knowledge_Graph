# 🔐 JWT Authentication Flow - Visual Guide

## 1️⃣ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Login Page (login/page.tsx)                             │   │
│  │ - Email input field                                     │   │
│  │ - Password input field                                  │   │
│  │ - Login button                                          │   │
│  └────────────┬────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────┘
                │ User clicks Login
                │
┌───────────────▼──────────────────────────────────────────────────┐
│                   FRONTEND CODE                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ handleSubmit()                                          │    │
│  │ └─> authService.login({email, password})               │    │
│  │     └─> apiClient.post('/auth/login', ...)             │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTP POST /auth/login
                │ {email: "admin@aptx.com", password: "123456"}
                │
┌───────────────▼──────────────────────────────────────────────────┐
│                   BACKEND - LOGIN                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /auth/login (POST)                                      │    │
│  │ ↓                                                       │    │
│  │ 1. Find user by email in Neo4j                         │    │
│  │    MATCH (u:User {email: $email})                      │    │
│  │ ↓                                                       │    │
│  │ 2. Compare password with bcrypt                        │    │
│  │    bcrypt.compare(password, user.matKhau)              │    │
│  │ ↓ (if valid)                                           │    │
│  │ 3. Generate JWT token                                  │    │
│  │    jwtService.sign({id, email, roles}, {expiresIn})    │    │
│  │ ↓                                                       │    │
│  │ 4. Return token + user info                            │    │
│  │    {access_token, user, expiresIn}                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTP Response (200)
                │ {
                │   "access_token": "eyJhbGciOiJIUzI1NiI...",
                │   "user": {
                │     "id": "U001",
                │     "email": "admin@aptx.com",
                │     "hoTen": "System Admin",
                │     "roles": ["admin"]
                │   },
                │   "expiresIn": 604800
                │ }
                │
┌───────────────▼──────────────────────────────────────────────────┐
│               FRONTEND - STORE TOKEN                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ localStorage.setItem('auth_token', response.access_token)│  │
│  │ localStorage.setItem('auth_user', JSON.stringify(user))  │  │
│  │ router.push('/dashboard')                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ✅ Token stored in localStorage                                │
│  ✅ User redirected to dashboard                               │
└───────────────┬──────────────────────────────────────────────────┘
                │ Subsequent requests
                │
┌───────────────▼──────────────────────────────────────────────────┐
│           API CLIENT - AUTO-INJECT TOKEN                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ apiGet('/employees')                                    │    │
│  │ ↓                                                       │    │
│  │ 1. Get token from localStorage                         │    │
│  │    const token = localStorage.getItem('auth_token')     │    │
│  │ ↓                                                       │    │
│  │ 2. Add to request header                               │    │
│  │    headers['Authorization'] = `Bearer ${token}`         │    │
│  │ ↓                                                       │    │
│  │ 3. Send request                                        │    │
│  │    fetch(url, {headers})                               │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTP GET /employees
                │ Authorization: Bearer eyJhbGciOi...
                │
┌───────────────▼──────────────────────────────────────────────────┐
│              BACKEND - VERIFY TOKEN (JWT GUARD)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ @UseGuards(JwtAuthGuard)                                │    │
│  │ ↓                                                       │    │
│  │ 1. Extract token from Authorization header             │    │
│  │    const token = authHeader.split(' ')[1]              │    │
│  │ ↓                                                       │    │
│  │ 2. Verify token signature                              │    │
│  │    const payload = jwtService.verify(token)            │    │
│  │    (checks expiry, signature, etc.)                    │    │
│  │ ↓ (if valid)                                           │    │
│  │ 3. Extract user info from payload                      │    │
│  │    {id, email, roles}                                  │    │
│  │ ↓                                                       │    │
│  │ 4. Attach user to request                              │    │
│  │    request.user = payload                              │    │
│  │ ↓                                                       │    │
│  │ 5. Proceed to next handler                             │    │
│  │    next()                                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ├─ Token valid? → Continue
                │
                └─ Token invalid? → Throw UnauthorizedException
                                    (401 Unauthorized)
                │
┌───────────────▼──────────────────────────────────────────────────┐
│         BACKEND - CHECK ROLES (ROLES GUARD)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ @Roles('admin')                                         │    │
│  │ @UseGuards(JwtAuthGuard, RolesGuard)                    │    │
│  │ ↓                                                       │    │
│  │ 1. Get required roles from @Roles decorator            │    │
│  │    requiredRoles = ['admin']                           │    │
│  │ ↓                                                       │    │
│  │ 2. Get user roles from request.user                    │    │
│  │    userRoles = request.user.roles                      │    │
│  │ ↓                                                       │    │
│  │ 3. Check if user has required role                     │    │
│  │    if (userRoles.includes('admin'))                    │    │
│  │ ↓                                                       │    │
│  │ 4a. (if yes) Execute endpoint handler                  │    │
│  │ 4b. (if no) Throw ForbiddenException (403)             │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ├─ Has role? → Execute endpoint, return data
                │
                └─ No role? → 403 Forbidden error
                     "Bạn không có quyền truy cập"
                │
┌───────────────▼──────────────────────────────────────────────────┐
│              FRONTEND - HANDLE RESPONSE                           │
│  ✅ Success (200)                                                │
│     └─> Display employees list in chat                          │
│                                                                   │
│  ❌ Error (401 Unauthorized)                                    │
│     └─> Clear token, redirect to /login                         │
│                                                                   │
│  ❌ Error (403 Forbidden)                                       │
│     └─> Show "You don't have permission" message                │
│     └─> Redirect to /unauthorized                               │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ JWT Token Structure

```
JWT Token Format: header.payload.signature

┌──────────────────────────────────────────────────────┐
│ HEADER                                               │
├──────────────────────────────────────────────────────┤
│ {                                                    │
│   "alg": "HS256",     // Algorithm                  │
│   "typ": "JWT"        // Type                       │
│ }                                                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ PAYLOAD (User Info)                                  │
├──────────────────────────────────────────────────────┤
│ {                                                    │
│   "id": "U001",                                      │
│   "email": "admin@aptx.com",                         │
│   "roles": ["admin"],                                │
│   "iat": 1700206800,      // Issued at              │
│   "exp": 1700811600       // Expires at             │
│ }                                                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ SIGNATURE                                            │
├──────────────────────────────────────────────────────┤
│ HMACSHA256(                                          │
│   base64(header) + "." + base64(payload),            │
│   "your-secret-key-change-this"                      │
│ )                                                    │
└──────────────────────────────────────────────────────┘

Full Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IlUwMDEiLCJlbWFpbCI6ImFkbWluQGFwdHguY29tIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNzAwMjA2ODAwLCJleHAiOjE3MDA4MTE2MDB9.
5mG-qzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzq
```

---

## 3️⃣ Database Schema (Neo4j)

```
User Nodes:
┌────────────────────────────┐
│ :User                      │
├────────────────────────────┤
│ id: "U001"                 │
│ email: "admin@aptx.com"    │
│ matKhau: "$2b$10$..."      │ (bcrypt hash)
│ hoTen: "System Admin"      │
│ trangThai: "active"        │
│ taoLuc: 2025-11-17...      │
└─────────────┬──────────────┘
              │
              │ [:CO_ROLE]
              ↓
┌────────────────────────────┐
│ :Role                      │
├────────────────────────────┤
│ ten: "admin"               │
│ moTa: "Full access"        │
└────────────────────────────┘

Role Types:
┌──────────────────────────────────────────┐
│ :Role {ten: "admin"}                     │
│ - Full access to everything              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ :Role {ten: "manager"}                   │
│ - Department-level access                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ :Role {ten: "user"}                      │
│ - Read-only access                       │
└──────────────────────────────────────────┘

Relationships:
┌──────────────────────────────────────────┐
│ User -[:CO_ROLE]-> Role                  │
│ User -[:BAO_CAO_CHO]-> User (Manager)   │
│ User -[:THAM_GIA_NHOM]-> Nhom            │
└──────────────────────────────────────────┘
```

---

## 4️⃣ Component Communication

```
Frontend:
┌─────────────────────────────────────┐
│ Login Form (login/page.tsx)         │
│ - Displays email/password inputs    │
│ - Calls authService.login()         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Auth Service (lib/auth.ts)          │
│ - Calls apiClient.post()            │
│ - Stores token in localStorage      │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ API Client (lib/api-client.ts)      │
│ - Gets token from localStorage      │
│ - Adds Authorization header         │
│ - Makes HTTP request                │
└────────────┬────────────────────────┘
             │ HTTP with token
             │
┌─────────────────────────────────────┐
│ Backend: AuthController             │
│ - Receives login request            │
│ - Calls authService.login()         │
│ - Returns token + user              │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Auth Service (auth.service.ts)      │
│ - Finds user in Neo4j               │
│ - Verifies bcrypt password          │
│ - Signs JWT token                   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ Neo4j Database                      │
│ - Stores User nodes                 │
│ - Stores Role relationships         │
└─────────────────────────────────────┘
```

---

## 5️⃣ Security Layers

```
Layer 1: Transport Security
┌─────────────────────────────────────┐
│ HTTPS (in production)               │
│ Prevents token interception         │
└─────────────────────────────────────┘
         ↓
Layer 2: Authentication
┌─────────────────────────────────────┐
│ JWT Token Verification              │
│ - Signature validation              │
│ - Expiry check                      │
│ - Payload extraction                │
└─────────────────────────────────────┘
         ↓
Layer 3: Authorization
┌─────────────────────────────────────┐
│ Role-Based Access Control           │
│ - @Roles decorator                  │
│ - RolesGuard                        │
│ - Permission checking               │
└─────────────────────────────────────┘
         ↓
Layer 4: Password Security
┌─────────────────────────────────────┐
│ Bcrypt Password Hashing             │
│ - 10 salt rounds                    │
│ - Never store plain password        │
│ - Secure comparison                 │
└─────────────────────────────────────┘
```

---

## 6️⃣ Error Handling Flow

```
Request
  ↓
┌─────────────────────────────────┐
│ JWT Guard                       │
│ - Check header exists?          │
│ - Verify token signature?       │
│ - Check token expiry?           │
└──┬──────────────────────┬───────┘
   │                      │
   ✅ Valid              ❌ Invalid
   ↓                      ↓
Continue           401 Unauthorized
   ↓                      ↓
Roles Guard         {"statusCode": 401,
   ↓                "message": "Token invalid"}
┌─────────────────────────────────┐
│ Check required roles            │
└──┬──────────────────────┬───────┘
   │                      │
   ✅ Has role          ❌ No role
   ↓                      ↓
Execute endpoint    403 Forbidden
Return data        {"statusCode": 403,
                    "message": "No permission"}
```

---

## 7️⃣ Session Lifecycle

```
Timeline:

T=0      User clicks Login
├─ Email: admin@aptx.com
├─ Password: 123456
│
T=1      Backend validates credentials
├─ Neo4j query: MATCH (u:User {email})
├─ bcrypt.compare(password, hash)
├─ Success!
│
T=2      JWT token generated
├─ payload = {id, email, roles}
├─ expiresIn = 7 days
├─ sign(payload, secret)
│
T=3      Token returned to frontend
├─ {access_token, user, expiresIn}
│
T=4      Frontend stores token
├─ localStorage.setItem('auth_token', token)
├─ User redirected to /dashboard
│
T=5~T+7d User makes authenticated requests
├─ Every request includes: Authorization: Bearer <token>
├─ Backend verifies token
├─ User data extracted from JWT
├─ Endpoint executed
│
T+7d     Token expires
├─ Next request with expired token
├─ Backend rejects: "Token expired"
├─ Frontend clears localStorage
├─ User redirected to /login
│
T+7d+1   User must login again
└─ Cycle repeats
```

---

## 8️⃣ Protected vs Public Endpoints

```
PUBLIC ENDPOINTS (no auth needed):
┌─────────────────────────────────────┐
│ POST /auth/login                    │
│ └─> Anyone can access               │
│                                     │
│ POST /auth/register (future)        │
│ └─> Anyone can access               │
└─────────────────────────────────────┘

PROTECTED ENDPOINTS (JWT required):
┌─────────────────────────────────────┐
│ GET /auth/me                        │
│ GET /auth/verify                    │
│ GET /employees                      │
│ GET /departments                    │
│ └─> Requires: @UseGuards(JwtAuthGuard)
└─────────────────────────────────────┘

ADMIN-ONLY ENDPOINTS (JWT + admin role):
┌─────────────────────────────────────┐
│ POST /admin/users                   │
│ PATCH /admin/users/:id              │
│ DELETE /admin/users/:id             │
│ └─> Requires: @Roles('admin')       │
│     + @UseGuards(JwtAuthGuard, RolesGuard)
└─────────────────────────────────────┘

MANAGER-ONLY ENDPOINTS:
┌─────────────────────────────────────┐
│ PATCH /employees/:id                │
│ └─> Requires: @Roles('admin', 'manager')
│     + @UseGuards(JwtAuthGuard, RolesGuard)
└─────────────────────────────────────┘
```

---

**This visual guide explains every step of JWT authentication!** 🎯

