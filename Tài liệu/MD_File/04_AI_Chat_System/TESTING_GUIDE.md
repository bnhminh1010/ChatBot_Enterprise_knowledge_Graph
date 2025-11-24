# Testing Guide cho Conversation History

## 📋 Prerequisites

### 1. Setup Neo4j Database Schema

```bash
# Mở Neo4j Browser: http://localhost:7474
# Chạy script setup-conversation-db.cypher
```

### 2. Kiểm tra Backend Running

```bash
cd ekg-backend
npm run start:dev
```

### 3. Verify Services

Check logs for:

- ✅ `ChatModule dependencies initialised`
- ✅ `ConversationHistoryService` không có errors
- ✅ `Neo4j connection successful`

---

## 🧪 Test Cases

### Test 1: Create New Conversation (First Message)

**Request:**

```http
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "Danh sách nhân viên",
  "userId": "NS001"
}
```

**Expected Response:**

```json
{
  "message": "Danh sách nhân viên",
  "response": "... (employee list)",
  "queryType": "list-employees",
  "queryLevel": "simple",
  "processingTime": 234,
  "conversationId": "CONV_<uuid>", // ← Should have this!
  "timestamp": "2025-11-23T..."
}
```

**Verify in Neo4j:**

```cypher
MATCH (u:NguoiDung {username: 'NS001'})-[:HAS_CONVERSATION]->(c:Conversation)-[:HAS_MESSAGE]->(m:Message)
RETURN c.id, m.role, m.content
ORDER BY m.timestamp
```

---

### Test 2: Continue Conversation (Context should be passed to Gemini)

**Request:**

```http
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "Những người nào có kỹ năng Python?",
  "userId": "NS001",
  "conversationId": "CONV_<uuid from Test 1>"
}
```

**Expected Behavior:**

- Query classified as `complex` → Gemini handles it
- `ConversationHistoryService.getConversationContext()` called
- Gemini receives conversation history:
  ```javascript
  [
    { role: 'user', content: 'Danh sách nhân viên' },
    { role: 'assistant', content: '...' },
  ];
  ```
- Gemini understands context: "Filter từ list nhân viên vừa hỏi"

**Expected Response:**

```json
{
  "message": "Những người nào có kỹ năng Python?",
  "response": "Dựa trên danh sách nhân viên, những người có Python là: ...",
  "queryType": "complex",
  "queryLevel": "complex",
  "conversationId": "CONV_<same uuid>",
  "processingTime": 1523
}
```

**Check Logs:**

```
[ChatService] Retrieved 2 messages from conversation history
[GeminiService] Using history-aware generation with 2 previous messages
```

---

### Test 3: Multi-Turn Complex Conversation

**Turn 1:**

```json
{
  "message": "Phân tích kỹ năng của team",
  "userId": "NS001"
}
```

**Turn 2:**

```json
{
  "message": "Những kỹ năng nào còn thiếu?",
  "userId": "NS001",
  "conversationId": "<from turn 1>"
}
```

**Turn 3:**

```json
{
  "message": "Đề xuất training plan",
  "userId": "NS001",
  "conversationId": "<same>"
}
```

**Expected:**

- Each turn builds on previous context
- Gemini maintains understanding across all 3 turns
- All messages saved to Neo4j

---

### Test 4: Without conversationId (Should create new)

**Request:**

```json
{
  "message": "Hello",
  "userId": "NS002"
  // No conversationId
}
```

**Expected:**

- New conversation created automatically
- Response includes new `conversationId`

---

### Test 5: Without userId (No conversation tracking)

**Request:**

```json
{
  "message": "Test question"
  // No userId, no conversationId
}
```

**Expected:**

- Still works! Returns response
- No `conversationId` in response
- No data saved to Neo4j
- Gemini works without history

---

## 🔍 Debugging

### Check Conversation History trong Neo4j

```cypher
// List all conversations
MATCH (c:Conversation)-[:HAS_MESSAGE]->(m:Message)
RETURN c.id, c.title, count(m) as messageCount, c.createdAt
ORDER BY c.createdAt DESC
LIMIT 10;

// View specific conversation
MATCH (c:Conversation {id: 'CONV_xxx'})-[:HAS_MESSAGE]->(m:Message)
RETURN m.role, m.content, m.timestamp, m.queryType
ORDER BY m.timestamp;

// Check user conversations
MATCH (u:NguoiDung {username: 'NS001'})-[:HAS_CONVERSATION]->(c:Conversation)
RETURN c.id, c.title, c.createdAt
ORDER BY c.createdAt DESC;
```

### Backend Logs to Monitor

```bash
# Watch for these log messages:
[ConversationHistoryService] Created conversation: CONV_xxx for user NS001
[ConversationHistoryService] Added message to conversation CONV_xxx
[ChatService] Created new conversation: CONV_xxx
[ChatService] Retrieved 5 messages from conversation history
[GeminiService] Using history-aware generation
```

### Common Issues

#### ❌ "User NS001 not found"

**Fix:** Tạo NguoiDung node trước:

```cypher
CREATE (u:NguoiDung {username: 'NS001', hoTen: 'Test User'})
```

#### ❌ "conversationId undefined in response"

**Check:**

- Did `createConversation()` succeed?
- Check logs for errors
- Verify `activeConversationId` is set

#### ❌ Gemini không có context

**Check:**

- `conversationId` được pass vào request?
- `getConversationContext()` returns messages?
- Logs show "Retrieved X messages"?

#### ❌ Messages không được save

**Check:**

- Neo4j running?
- Constraints created?
- Check error logs

---

## ✅ Success Criteria

### Functional Tests PASSED if:

- ✅ New conversation created khi có `userId` nhưng không có `conversationId`
- ✅ `conversationId` returned trong response
- ✅ Messages saved to Neo4j (verify với Cypher queries)
- ✅ Conversation history retrieved correctly
- ✅ Gemini receives conversation context
- ✅ Multi-turn conversations maintain context
- ✅ System works WITHOUT userId/conversationId (degraded mode)

### Logs PASSED if:

- ✅ No errors from ConversationHistoryService
- ✅ "Retrieved X messages" appears for follow-up queries
- ✅ "Using history-aware generation" for complex queries with history

### Neo4j PASSED if:

```cypher
// Should return data:
MATCH (c:Conversation)-[:HAS_MESSAGE]->(m:Message)
RETURN count(c) as conversations, count(m) as messages

// Should show relationships:
MATCH path = (u:NguoiDung)-[:HAS_CONVERSATION]->(c:Conversation)-[:HAS_MESSAGE]->(m:Message)
RETURN path
LIMIT 5
```

---

## 📊 Performance Checks

### Response Time Expectations:

- Simple query (no history): 100-500ms
- Complex query (no history): 1-3s (Gemini API)
- Complex query (with history): 1.5-4s (Gemini + history retrieval)

### Database Queries:

- `getConversationContext()`: Should return in < 50ms
- `addMessage()`: Should complete in < 100ms

---

## 🎯 Manual Testing Checklist

- [ ] Run `setup-conversation-db.cypher` trong Neo4j Browser
- [ ] Create test NguoiDung node
- [ ] Test 1: New conversation creation
- [ ] Test 2: Conversation continuation
- [ ] Test 3: Multi-turn conversation
- [ ] Test 4: Auto-create conversation
- [ ] Test 5: No user tracking
- [ ] Verify data in Neo4j
- [ ] Check backend logs
- [ ] Test Gemini context awareness

---

**Next:** Chạy tests và report kết quả!
