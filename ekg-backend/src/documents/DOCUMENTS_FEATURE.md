# 📄 Backend Document Reading Feature - Implementation Guide

## 🎯 Tổng Quan

Hệ thống backend hiện tại đã được nâng cấp để **đọc và phân tích nội dung tài liệu** từ URL được lưu trong Neo4j.

### 📊 Quy Trình Xử Lý

```
User Request
    ↓
GET /documents/projects/:projectId/docs/:docId/content
    ↓
Backend kiểm tra TaiLieu trong Neo4j
    ↓
Lấy duong_dan (URL) từ thuộc tính
    ↓
Download file từ URL (GitHub/HTTP)
    ↓
Parse nội dung (.docx, .pdf, .txt, .md, .json)
    ↓
Return content + metadata
```

---

## 🚀 Installation & Setup

### 1. Cài đặt Dependencies

```bash
cd ekg-backend
npm install docx-parser pdfjs-dist
```

**Dependencies được thêm:**
- `docx-parser@^3.5.7` - Parse file .docx
- `pdfjs-dist@^4.0.379` - Parse file .pdf
- `axios` (đã có) - Download file từ URL

### 2. Module Import

DocumentsModule đã được thêm vào AppModule, không cần cấu hình thêm.

---

## 📁 Files & Structure

```
src/documents/
├── document-reader.service.ts    # Service xử lý download/parse file
├── documents.service.ts          # Service xử lý queries Neo4j
├── documents.controller.ts        # Controller với endpoints
└── documents.module.ts           # Module definition
```

### Service Descriptions

#### 1. **DocumentReaderService** - `document-reader.service.ts`

Xử lý tất cả việc liên quan đến file:

```typescript
// Download file từ URL
async downloadFile(url: string): Promise<string>

// Parse file content
async parseFile(filePath: string): Promise<string>

// Main method: Download + Parse
async readDocumentFromUrl(url: string): Promise<{
  content: string;
  fileType: string;
  fileName: string;
  size: number;
}>
```

**Supported formats:**
- ✅ `.docx` - Word documents
- ✅ `.pdf` - PDF files
- ✅ `.txt` - Plain text
- ✅ `.md` - Markdown
- ✅ `.json` - JSON files

#### 2. **DocumentsService** - `documents.service.ts`

Xử lý Neo4j queries:

```typescript
// Lấy tất cả documents của project
async getProjectDocuments(projectId: string): Promise<any>

// Lấy document theo ID
async getDocumentById(projectId: string, docId: string): Promise<DocumentResult>

// 🔥 Main Feature: Lấy nội dung từ URL
async getDocumentContent(projectId: string, docId: string): Promise<DocumentContent>

// Tìm kiếm documents
async searchProjectDocuments(projectId: string, searchTerm: string): Promise<any[]>

// Lấy documents có duong_dan
async getAccessibleDocuments(projectId: string): Promise<any[]>

// Check xem có path hay không
async hasValidPath(projectId: string, docId: string): Promise<boolean>
```

#### 3. **DocumentsController** - `documents.controller.ts`

API Endpoints:

```
GET  /documents/projects/:projectId
     → Lấy tất cả documents

GET  /documents/projects/:projectId/accessible
     → Chỉ lấy documents có duong_dan

GET  /documents/projects/:projectId/search/:searchTerm
     → Tìm kiếm documents

GET  /documents/projects/:projectId/docs/:docId
     → Lấy metadata document

GET  /documents/projects/:projectId/docs/:docId/content
     → 🔥 Lấy nội dung từ URL

GET  /documents/projects/:projectId/docs/:docId/check-path
     → Kiểm tra xem có path hay không
```

---

## 📚 API Documentation

### 1. Lấy Documents của Project

```http
GET /documents/projects/PROJECT_ID
```

**Response:**
```json
{
  "projectId": "DuAn001",
  "projectName": "EKG System",
  "documents": [
    {
      "id": "doc001",
      "name": "Requirements.docx",
      "duong_dan": "https://raw.githubusercontent.com/...",
      "loai": "docx",
      "mo_ta": "Project requirements",
      "ngay_tao": "2025-01-01",
      "co_duong_dan": true
    }
  ]
}
```

### 2. 🔥 Lấy Nội Dung Document (Main Feature)

```http
GET /documents/projects/DuAn001/docs/doc001/content
```

**Response:**
```json
{
  "documentId": "doc001",
  "documentName": "Requirements.docx",
  "documentType": "docx",
  "description": "Project requirements specification",
  "sourceUrl": "https://raw.githubusercontent.com/user/repo/main/docs/requirements.docx",
  "fileInfo": {
    "type": "docx",
    "fileName": "requirements.docx",
    "size": 15240
  },
  "content": "Project Title: EKG System\n\n1. Overview\n...\n(Full extracted text from the document)",
  "retrievedAt": "2025-11-25T10:30:00.000Z"
}
```

### 3. Lấy Documents có Path

```http
GET /documents/projects/DuAn001/accessible
```

**Chỉ trả về documents có `duong_dan` attribute**

### 4. Tìm Kiếm Documents

```http
GET /documents/projects/DuAn001/search/requirements
```

---

## 🗄️ Neo4j Schema Requirements

Để sử dụng feature này, Neo4j cần có:

### Node TaiLieu (Document)

```cypher
CREATE (doc:TaiLieu {
  id: 'doc001',
  ten: 'Project Requirements',
  loai: 'docx',
  mo_ta: 'Specification document',
  duong_dan: 'https://raw.githubusercontent.com/...',
  ngay_tao: date()
})
```

### Relationship CO_TAI_LIEU

```cypher
MATCH (p:DuAn {id: 'DuAn001'})
MATCH (doc:TaiLieu {id: 'doc001'})
CREATE (p)-[:CO_TAI_LIEU]->(doc)
```

### Seed Script Example

```cypher
// Tạo Project
CREATE (p:DuAn {
  id: 'DuAn001',
  ten: 'EKG System',
  ma: 'EKG',
  trang_thai: 'Active'
})

// Tạo Documents
CREATE (doc1:TaiLieu {
  id: 'doc001',
  ten: 'Project Requirements',
  loai: 'docx',
  mo_ta: 'System requirements specification',
  duong_dan: 'https://raw.githubusercontent.com/bnhminh1010/docs/main/requirements.docx',
  ngay_tao: date()
})

CREATE (doc2:TaiLieu {
  id: 'doc002',
  ten: 'Architecture Design',
  loai: 'pdf',
  mo_ta: 'System architecture',
  duong_dan: 'https://raw.githubusercontent.com/bnhminh1010/docs/main/architecture.pdf',
  ngay_tao: date()
})

// Create relationships
MATCH (p:DuAn {id: 'DuAn001'})
MATCH (doc1:TaiLieu {id: 'doc001'})
MATCH (doc2:TaiLieu {id: 'doc002'})
CREATE (p)-[:CO_TAI_LIEU]->(doc1)
CREATE (p)-[:CO_TAI_LIEU]->(doc2)
```

---

## 💻 Usage Examples

### Using curl

```bash
# Lấy tất cả documents của project
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3002/documents/projects/DuAn001

# Lấy nội dung document từ URL
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3002/documents/projects/DuAn001/docs/doc001/content
```

### Using JavaScript/Fetch

```javascript
// Lấy document content
const response = await fetch(
  '/documents/projects/DuAn001/docs/doc001/content',
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log('Document content:', data.content);
```

### Using TypeScript/Axios

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

// Lấy nội dung
const { data } = await client.get(
  '/documents/projects/DuAn001/docs/doc001/content'
);

console.log('Content:', data.content);
console.log('File size:', data.fileInfo.size);
console.log('Retrieved at:', data.retrievedAt);
```

---

## 🔒 Security Features

### 1. **File Type Validation**
- Chỉ accept các file type được hỗ trợ
- Reject unknown file types
- Size limit kiểm tra

### 2. **URL Validation**
- Validate URL format
- Support GitHub raw URLs
- Support direct HTTP(S) URLs
- Reject invalid URLs

### 3. **Error Handling**
- Graceful fallback khi parse thất bại
- Cleanup temp files
- Timeout protection (30 seconds)

### 4. **Authentication**
- Tất cả endpoints require JWT token
- Role-based access control
- Protected by JwtAuthGuard

---

## 🐛 Troubleshooting

### Issue: "Document does not have a path configured"

**Giải pháp:**
1. Kiểm tra Neo4j có `duong_dan` attribute không
2. Đảm bảo relationship `CO_TAI_LIEU` tồn tại
3. Check xem duong_dan có phải URL hợp lệ không

### Issue: "Failed to download file"

**Possible causes:**
- URL không tồn tại hoặc không accessible
- Timeout (file quá lớn)
- Network issues

**Giải pháp:**
1. Verify URL từ browser
2. Kiểm tra GitHub access token nếu repo private
3. Tăng timeout nếu file quá lớn

### Issue: "PDF parsing requires pdfjs-dist"

**Giải pháp:**
```bash
npm install pdfjs-dist
```

### Issue: "Unsupported file type"

**Supported types:**
- .docx
- .pdf
- .txt
- .md
- .json

---

## 📊 Performance Considerations

### File Size Limits
- Default timeout: 30 seconds
- Temp files cleaned up automatically
- Memory efficient streaming for large files

### Caching Strategy
- Documents cached in Neo4j
- File content not cached (always fresh)
- URL validated each request

### Optimization Tips
1. Store files on GitHub for fast CDN access
2. Use raw.githubusercontent.com for direct links
3. Compress large documents
4. Consider archiving old documents

---

## 🚀 Future Enhancements

- [ ] Caching document content
- [ ] Bulk document processing
- [ ] OCR for scanned documents
- [ ] Document version control
- [ ] Full-text search indexing
- [ ] Webhook notifications
- [ ] Async processing with queues

---

## 📞 Support & Issues

For issues or questions:
1. Check this guide's troubleshooting section
2. Review Neo4j queries in documents.service.ts
3. Check browser console for detailed errors
4. Contact: team4.ekg.aptx3107@gmail.com

---

## ✅ Verification Checklist

Before deploying:

- [ ] Dependencies installed (`npm install`)
- [ ] DocumentsModule imported in AppModule
- [ ] Neo4j has TaiLieu nodes with duong_dan
- [ ] CO_TAI_LIEU relationships created
- [ ] JWT authentication configured
- [ ] URLs in duong_dan are valid and accessible
- [ ] File download timeout appropriate (30s default)
- [ ] Supported file types match your use case

---

**Last Updated:** November 25, 2025  
**Status:** ✅ Production Ready
