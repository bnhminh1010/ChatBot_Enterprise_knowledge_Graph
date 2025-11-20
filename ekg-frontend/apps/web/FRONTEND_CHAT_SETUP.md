# Frontend Chat Integration - Quick Start

## ✅ Changes Made

### 1. New Service: `src/server/services/chat.ts`

- `sendChatMessage(message)` - Gửi message đến backend `/chat` API
- `indexEntitiesToChroma()` - Trigger indexing
- `checkChatHealth()` - Check system health

### 2. Updated Component: `src/components/chat/Chat.tsx`

- Thay thế `chat-helper.ts` bằng `sendChatMessage()` API call
- Auto-update chat title based on user input
- Integrated processing time display

### 3. New Chat Endpoint

- `POST /chat` - AI response endpoint
- Auto-classifies query (simple/medium/complex)
- Returns structured response with metadata

---

## 🎯 How It Works

### Before (Local Processing)

```
User Message
    ↓
detectQueryType() → chatHelper.ts
    ↓
Backend API calls
    ↓
Format & Display
```

### Now (Server-Side AI)

```
User Message
    ↓
sendChatMessage() → POST /chat
    ↓
Backend:
  - Classify query
  - Route to appropriate handler
  - Get data from Neo4j/ChromaDB/Gemini
    ↓
Return structured response
    ↓
Display
```

---

## 🚀 Usage

Chat component đã ready to use. Giao diện không thay đổi, chỉ backend logic thay đổi.

### Simple Message

```
User: "Danh sách nhân viên"
Bot: "Danh sách nhân viên (42):
     • Nguyễn Văn A - Senior Dev
     • Trần Thị B - PM
     ..."
```

### Complex Message

```
User: "Tư vấn cho tôi một nhân viên phù hợp cho dự án Java"
Bot: "Dựa trên dữ liệu hiện có, tôi gợi ý:
     • Nguyễn Văn C - 8 năm kinh nghiệm Java
     • Có kỹ năng: Java, Spring Boot, Microservices
     ..."
```

---

## 🔧 Configuration

Không cần config thêm. Đã setup trong:

- `.env` (Backend): `GEMINI_API_KEY`, `OLLAMA_URL`
- `src/lib/api-config.ts`: API endpoint `http://localhost:3002`

---

## 📋 Troubleshooting Frontend

### 1. **404 on /chat endpoint**

- Check backend running: `http://localhost:3002/docs`
- Check `NEXT_PUBLIC_API_URL=http://localhost:3002` trong .env.local

### 2. **Slow responses**

- Ollama starting? (First time slow)
- ChromaDB indexing in progress?
- Check backend logs

### 3. **Error: "Cannot POST /chat"**

- Backend module not imported? Check `app.module.ts` imports
- Chat controller not registered? Check `chat.controller.ts`

---

## 📊 Response Example

```typescript
// Response structure
{
  message: string; // Original user message
  response: string; // AI response
  queryType: string; // list-employees, search-global, etc.
  queryLevel: "simple" | "medium" | "complex";
  processingTime: number; // ms
  timestamp: Date;
}
```

---

## 🎨 Display Processing Time (Optional)

In Chat component, can show processing time:

```tsx
// Add this to ChatMessage component to show response time
<div className="text-xs text-muted-foreground">
  Processing time: {response.processingTime}ms
</div>
```

---

## 🚀 Next Features

- [ ] Streaming responses (long queries)
- [ ] Conversation history (multi-turn)
- [ ] User preferences (tone, language)
- [ ] Analytics dashboard
- [ ] Voice input/output
- [ ] Regenerate response button

---

**Everything is ready! Start chatting! 🎉**
