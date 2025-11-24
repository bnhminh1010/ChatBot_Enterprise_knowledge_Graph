# 🔧 Khắc phục lỗi "Database connection error"

## ❌ Lỗi thường gặp

Khi bạn thấy lỗi: **"Có lỗi xảy ra: Database connection error"** hoặc **"Không thể kết nối đến Neo4j database"**

## ✅ Các bước khắc phục

### 1. Kiểm tra Neo4j có đang chạy không

```bash
# Kiểm tra container Neo4j
docker ps | grep neo4j

# Hoặc kiểm tra tất cả containers
docker ps
```

**Nếu không thấy container neo4j chạy:**

```bash
cd ekg-backend
docker-compose up -d
```

**Kiểm tra logs:**

```bash
docker-compose logs neo4j
```

### 2. Kiểm tra file .env

Đảm bảo file `.env` trong thư mục `ekg-backend` có đầy đủ các biến sau:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j123
NEO4J_DATABASE=neo4j
```

**Lưu ý:**
- Nếu dùng Neo4j Aura (cloud), URI sẽ là: `neo4j+s://xxxxx.databases.neo4j.io`
- Nếu dùng Docker local, URI là: `bolt://localhost:7687`

### 3. Kiểm tra kết nối Neo4j

**Cách 1: Truy cập Neo4j Browser**

Mở trình duyệt và truy cập: http://localhost:7474

- Username: `neo4j`
- Password: `neo4j123` (hoặc password bạn đã set trong .env)

**Cách 2: Chạy script test**

```bash
cd ekg-backend
node test-neo4j.js
```

**Cách 3: Test bằng curl**

```bash
# Kiểm tra Neo4j Browser
curl http://localhost:7474

# Kiểm tra Bolt port
telnet localhost 7687
```

### 4. Kiểm tra port có bị chiếm không

```bash
# Windows PowerShell
netstat -ano | findstr :7687
netstat -ano | findstr :7474

# Linux/Mac
lsof -i :7687
lsof -i :7474
```

Nếu port bị chiếm, bạn có thể:
- Dừng process đang dùng port đó
- Hoặc đổi port trong `docker-compose.yml`

### 5. Khởi động lại Neo4j

```bash
cd ekg-backend

# Dừng Neo4j
docker-compose down

# Xóa volumes (CẨN THẬN: sẽ mất dữ liệu)
# docker-compose down -v

# Khởi động lại
docker-compose up -d

# Xem logs
docker-compose logs -f neo4j
```

### 6. Kiểm tra firewall/antivirus

Đảm bảo firewall hoặc antivirus không chặn:
- Port 7687 (Bolt protocol)
- Port 7474 (HTTP/Neo4j Browser)

### 7. Kiểm tra dữ liệu đã được seed chưa

Sau khi Neo4j chạy, cần seed dữ liệu:

```bash
cd ekg-backend
npm run seed
```

Kiểm tra dữ liệu trong Neo4j Browser:

```cypher
MATCH (n) RETURN count(n) as total_nodes;
```

Nếu trả về 0, cần chạy seed script.

## 🔍 Debug chi tiết

### Xem logs backend

```bash
cd ekg-backend
npm run start:dev
```

Tìm các dòng log có chứa:
- `Neo4j connection verification failed`
- `Neo4j query error`
- `Database connection error`

### Test kết nối từ code

Tạo file test: `test-connection.js`

```javascript
require('dotenv').config();
const neo4j = require('neo4j-driver');

(async () => {
  const URI = process.env.NEO4J_URI;
  const USER = process.env.NEO4J_USER;
  const PASSWORD = process.env.NEO4J_PASSWORD;

  console.log('🔍 Testing Neo4j connection...');
  console.log('URI:', URI);
  console.log('USER:', USER);
  console.log('PASSWORD:', PASSWORD ? '***' : 'NOT SET');

  if (!URI || !USER || !PASSWORD) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
  }

  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

  try {
    const serverInfo = await driver.getServerInfo();
    console.log('✅ Connected to Neo4j!');
    console.log('Server info:', serverInfo);
    
    // Test query
    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Query test successful:', result.records[0].get('test'));
    await session.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await driver.close();
  }
})();
```

Chạy:

```bash
node test-connection.js
```

## 📋 Checklist nhanh

- [ ] Neo4j container đang chạy (`docker ps`)
- [ ] File `.env` có đầy đủ `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- [ ] Có thể truy cập http://localhost:7474
- [ ] Port 7687 không bị chặn
- [ ] Đã chạy `npm run seed` để có dữ liệu
- [ ] Backend đã restart sau khi sửa .env

## 🆘 Vẫn không được?

1. **Kiểm tra version Neo4j:**
   ```bash
   docker exec ekg-neo4j neo4j version
   ```

2. **Xem logs chi tiết:**
   ```bash
   docker-compose logs neo4j | tail -50
   ```

3. **Reset hoàn toàn (CẨN THẬN - mất dữ liệu):**
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run seed
   ```

4. **Kiểm tra disk space:**
   ```bash
   docker system df
   ```

## 💡 Lưu ý

- Nếu dùng Neo4j Aura (cloud), đảm bảo IP whitelist đã được cấu hình
- Nếu dùng Docker trên Windows, đảm bảo WSL2 đã được cài đặt và cấu hình đúng
- Một số antivirus có thể chặn Docker network, cần thêm exception

