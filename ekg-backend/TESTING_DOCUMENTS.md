# 🧪 Testing Guide - Document Reading Feature

## Giới thiệu

Hướng dẫn kiểm thử feature "Đọc nội dung tài liệu từ URL" của backend EKG.

---

## 📋 Prerequisites

1. **Backend đang chạy:**
   ```bash
   npm run start:dev
   ```

2. **Neo4j đang chạy:**
   ```bash
   docker-compose up -d
   ```

3. **Redis đang chạy** (trong Docker Compose)

4. **JWT Token:** Lấy từ login endpoint

---

## 🚀 Bước 1: Seed Test Data

### Option A: Sử dụng Neo4j Browser

1. Truy cập: http://localhost:7474 (Neo4j Browser)
2. Đăng nhập với credentials từ `.env`
3. Copy script từ `scripts/cypher/seed-documents.cypher`
4. Paste vào Neo4j Browser và chạy

### Option B: Chạy via npm script

```bash
cd ekg-backend
npm run seed  # Chạy tất cả seed scripts
```

---

## 🔑 Bước 2: Lấy JWT Token

```bash
# Login để lấy token
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "username": "admin",
    "roles": ["ADMIN"]
  }
}
```

Lưu token để sử dụng trong các request tiếp theo:
```bash
export JWT_TOKEN="<token_từ_response>"
```

---

## 📍 Bước 3: Test Endpoints

### 3.1 Lấy tất cả documents của project

```bash
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "projectId": "DuAn_test_001",
  "projectName": "EKG Test Project",
  "documents": [
    {
      "id": "doc_readme_001",
      "name": "README - Project Overview",
      "duong_dan": "https://raw.githubusercontent.com/...",
      "loai": "txt",
      "mo_ta": "Project overview and quick start guide",
      "ngay_tao": "2025-01-01",
      "co_duong_dan": true
    },
    ...
  ]
}
```

### 3.2 Lấy documents có path (duong_dan)

```bash
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/accessible" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Should only return documents with `co_duong_dan: true`**

### 3.3 Kiểm tra xem document có path hay không

```bash
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_readme_001/check-path" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "documentId": "doc_readme_001",
  "hasPath": true
}
```

### 3.4 🔥 Lấy nội dung document (MAIN FEATURE)

```bash
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_readme_001/content" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (với nội dung từ URL):**
```json
{
  "documentId": "doc_readme_001",
  "documentName": "README - Project Overview",
  "documentType": "txt",
  "description": "Project overview and quick start guide",
  "sourceUrl": "https://raw.githubusercontent.com/...",
  "fileInfo": {
    "type": "txt",
    "fileName": "README.txt",
    "size": 1524
  },
  "content": "# EKG Project\n\nThis is the content extracted from the file...\n...",
  "retrievedAt": "2025-11-25T10:45:30.123Z"
}
```

### 3.5 Tìm kiếm documents

```bash
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/search/Setup" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## ✅ Test Cases & Expected Results

### Test Case 1: ✅ Successfully Read Text Document

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/doc_readme_001/content
```

**Expected:**
- ✅ Status 200
- ✅ Content extracted from file
- ✅ File size > 0
- ✅ fileType = "txt"

### Test Case 2: ✅ Successfully Read Markdown Document

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/doc_setup_001/content
```

**Expected:**
- ✅ Status 200
- ✅ Markdown content extracted
- ✅ fileType = "md"

### Test Case 3: ✅ Successfully Read JSON Document

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/doc_config_001/content
```

**Expected:**
- ✅ Status 200
- ✅ JSON parsed and formatted
- ✅ fileType = "json"

### Test Case 4: ❌ Document Without Path (Error Handling)

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/doc_no_path_001/content
```

**Expected:**
- ❌ Status 404
- ❌ Error: "Document does not have a path (duong_dan) configured"

**This is correct behavior!**

### Test Case 5: ❌ Invalid Project ID

**Endpoint:**
```
GET /documents/projects/invalid_project/docs/doc_readme_001/content
```

**Expected:**
- ❌ Status 404
- ❌ Error: "Project not found"

### Test Case 6: ❌ Invalid Document ID

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/invalid_doc_id/content
```

**Expected:**
- ❌ Status 404
- ❌ Error: "Document not found in this project"

### Test Case 7: ❌ Invalid URL

**Setup:** Create document với URL invalid
```cypher
CREATE (doc:TaiLieu {
  id: 'doc_invalid_url',
  ten: 'Invalid URL Doc',
  duong_dan: 'https://invalid-url-that-does-not-exist-12345.com/file.txt'
})
```

**Endpoint:**
```
GET /documents/projects/DuAn_test_001/docs/doc_invalid_url/content
```

**Expected:**
- ❌ Status 400
- ❌ Error message about failed download

---

## 🛠️ Manual Testing with Postman

### Import Collection

1. **Create new Postman Collection:** "EKG Documents"

2. **Add Requests:**

#### Request 1: Get Projects Documents
```
GET http://localhost:3002/documents/projects/DuAn_test_001
Headers:
  Authorization: Bearer {{jwt_token}}
  Content-Type: application/json
```

#### Request 2: Get Document Content
```
GET http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_readme_001/content
Headers:
  Authorization: Bearer {{jwt_token}}
  Content-Type: application/json
```

#### Request 3: Check Document Path
```
GET http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_readme_001/check-path
Headers:
  Authorization: Bearer {{jwt_token}}
```

---

## 📊 Performance Testing

### Test: Large File Download

```bash
# Measure time to download and parse
time curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_readme_001/content" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -o response.json

# Check response size
ls -lh response.json
```

**Expectations:**
- Text files: < 100ms
- Large files: < 5 seconds (30s timeout)
- Response size: varies by content

---

## 🐛 Debugging Tips

### 1. Check Backend Logs

```bash
# Watch for DocumentReaderService logs
npm run start:dev | grep -i "document\|download\|parse"
```

### 2. Check Neo4j Queries

```cypher
# Verify documents exist
MATCH (p:DuAn {id: 'DuAn_test_001'})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
RETURN doc.ten, doc.duong_dan, doc.loai
```

### 3. Test URL Manually

```bash
# Test if URL is accessible
curl -I "https://raw.githubusercontent.com/..."

# Download file manually
curl -o test-file.txt "https://raw.githubusercontent.com/..."
```

### 4. Check File Type Support

```bash
# Verify file extensions are correct
curl -X GET "http://localhost:3002/documents/projects/DuAn_test_001/docs/doc_setup_001" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.loai'
```

---

## 📝 Test Report Template

```
Test Date: [DATE]
Tester: [NAME]
Backend Version: [VERSION]

RESULTS:
- [ ] Test Case 1 - PASSED
- [ ] Test Case 2 - PASSED
- [ ] Test Case 3 - PASSED
- [ ] Test Case 4 - PASSED
- [ ] Test Case 5 - PASSED
- [ ] Test Case 6 - PASSED
- [ ] Test Case 7 - PASSED

PERFORMANCE:
- Average response time: [MS]
- Largest file tested: [SIZE]
- Network status: [OK/ISSUES]

NOTES:
[Any additional observations or issues]

APPROVED: [YES/NO]
```

---

## 🎯 Success Criteria

✅ Feature is working correctly when:

1. ✅ Documents can be retrieved from Neo4j
2. ✅ Files are downloaded from URLs successfully
3. ✅ Content is extracted correctly for all supported formats
4. ✅ Error handling works for invalid scenarios
5. ✅ Response includes all required metadata
6. ✅ Temp files are cleaned up properly
7. ✅ Authentication & authorization working
8. ✅ Performance is acceptable (< 5s for most files)

---

## 📞 Reporting Issues

If tests fail, please provide:

1. **Error Message:** Exact error from response
2. **Endpoint:** Which endpoint failed
3. **Request:** Full curl/request details
4. **Logs:** Backend logs around failure time
5. **Environment:** URLs, Neo4j status, etc.

---

**Happy Testing! 🚀**
