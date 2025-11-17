# 🚀 Quick Start - JWT Auth Implementation

## ⚡ Chạy trong 5 phút

### Step 1: Backend Setup

```bash
cd ekg-backend

# Install dependencies
npm install

# Start Docker (Neo4j)
docker-compose up -d

# Seed database (tạo User & Roles)
npm run seed

# Start backend server
npm run start:dev
```

**Expected output:**
```
[NestFactory] Starting Nest application...
🚀 API ready at http://localhost:3002/docs
```

### Step 2: Frontend Setup

```bash
cd ekg-frontend/apps/web

# Install dependencies
npm install

# Start frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 16.0.0
- Local: http://localhost:3000
```

### Step 3: Test Login

1. Open http://localhost:3000
2. Login với: **admin@aptx.com / 123456**
3. Xem dashboard & user menu
4. Click "Đăng xuất" để logout

---

## 📝 Demo Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@aptx.com` | `123456` | admin |
| `manager@aptx.com` | `123456` | manager |
| `user@aptx.com` | `123456` | user |

---

## 🧪 Test Endpoints

### Login (không cần token)
```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aptx.com","password":"123456"}'
```

### Get Current User (cần token)
```bash
curl -X GET http://localhost:3002/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Verify Token
```bash
curl -X GET http://localhost:3002/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔍 Kiểm tra Neo4j

1. Open http://localhost:7474 (Neo4j Browser)
2. Login: `neo4j` / `neo4j123`
3. Query users:
   ```cypher
   MATCH (u:User)-[:CO_ROLE]->(r:Role)
   RETURN u.email, collect(r.ten) as roles
   ```

---

## 📂 Files Được Thêm Vào

### Backend

```
ekg-backend/src/auth/
├── auth.service.ts
├── auth.controller.ts
├── auth.module.ts
├── dto/
│   ├── login.dto.ts
│   ├── auth-response.dto.ts
│   └── index.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── roles.decorator.ts
    └── index.ts

ekg-backend/scripts/cypher/
└── seed-users.cypher  (Neo4j users & roles)

ekg-backend/
└── .env  (updated JWT_SECRET)
```

### Frontend

```
ekg-frontend/apps/web/src/
├── app/
│   ├── login/page.tsx             (Login form)
│   ├── dashboard/page.tsx         (Protected dashboard)
│   └── unauthorized/page.tsx      (403 error)
├── lib/
│   └── auth.ts                    (Auth service)
└── components/auth/
    ├── ProtectedRoute.tsx         (Route wrapper)
    └── UserMenu.tsx               (User menu)
```

---

## 🎯 Features Implemented

✅ Login form (email/password)  
✅ JWT token generation (7 days)  
✅ Token storage (localStorage)  
✅ Auto-inject token to requests  
✅ JWT verification (guard)  
✅ Role-based access control (RBAC)  
✅ Protected routes (frontend)  
✅ Protected endpoints (backend)  
✅ User menu + logout  
✅ Demo accounts with 3 roles  
✅ Neo4j User & Role nodes  
✅ Password hashing (bcrypt)  

---

## 🔐 Key Files to Understand

| File | Purpose |
|------|---------|
| `auth.service.ts` | Login logic, JWT generation |
| `jwt-auth.guard.ts` | Verify token on every request |
| `roles.guard.ts` | Check user role permissions |
| `auth.ts` (frontend) | Token storage & user utils |
| `api-client.ts` | Auto-inject token to headers |
| `login/page.tsx` | Login form UI |
| `ProtectedRoute.tsx` | Wrapper for protected pages |

---

## 💡 Usage Examples

### Check if user logged in
```typescript
import { authService } from '@/lib/auth';

if (authService.isAuthenticated()) {
  // User is logged in
}
```

### Get current user
```typescript
const user = authService.getCurrentUser();
console.log(user.email, user.roles);
```

### Check user role
```typescript
if (authService.hasRole('admin')) {
  // Show admin features
}
```

### Logout
```typescript
authService.logout();
router.push('/login');
```

### Protect a route
```typescript
<ProtectedRoute requiredRoles={['admin']}>
  <AdminPanel />
</ProtectedRoute>
```

---

## 🐛 Troubleshooting

### Neo4j connection fails
```bash
docker-compose ps  # Check if Neo4j is running
docker-compose logs neo4j  # View logs
```

### Token issues
- Check `.env` JWT_SECRET is set
- Verify token in Browser Console: `localStorage.getItem('auth_token')`
- Try logging in again

### CORS errors
- Backend CORS is already enabled ✅
- Check API_URL in `.env.local` is correct

### Login fails
- Verify database was seeded: `npm run seed`
- Check Neo4j has User nodes: `MATCH (u:User) RETURN u`
- Use demo account: `admin@aptx.com / 123456`

---

## 📊 Architecture Overview

```
User → Login Form → /auth/login → JWT Token
           ↓
       Store Token (localStorage)
           ↓
       Every Request → Authorization Header
           ↓
       Backend JwtAuthGuard → Verify Token
           ↓
       Extract user.id, user.roles
           ↓
       Check @Roles Decorator (RolesGuard)
           ↓
       Allow/Deny Access
```

---

## 📈 Next Steps

1. **Create User Management** - Admin can add/edit/delete users
2. **Implement Role Management** - Create custom roles
3. **Add Department Filtering** - Users see only their department data
4. **Email Verification** - Send confirmation emails
5. **Password Reset** - Implement forgot password flow
6. **Two-Factor Auth** - Add extra security
7. **Audit Logging** - Track all user actions

---

## ✨ Summary

You now have a **complete JWT authentication system** with:

- ✅ Secure login/logout
- ✅ Token-based API access
- ✅ Role-based permissions
- ✅ Protected routes (frontend & backend)
- ✅ Demo accounts for testing

**Start with Step 1-3 above to run the system!** 🚀

---

Last Updated: November 17, 2025
