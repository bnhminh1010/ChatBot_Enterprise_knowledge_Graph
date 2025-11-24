# Hướng dẫn Manual Integration cho ChatService

Do complexity của ChatService, đây là guide từng bước để integrate conversation history manually.

## Bước 1: Thêm ConversationHistoryService vào ChatService constructor

```typescript
// In chat.service.ts, thêm vào imports:
import { ConversationHistoryService } from './services/conversation-history.service';

// Trong constructor, thêm:
constructor(
  private queryClassifier: QueryClassifierService,
  private ollamaService: OllamaService,
  private chromaDBService: ChromaDBService,
  private geminiService: GeminiService,
  private employeesService: EmployeesService,
  private skillsService: SkillsService,
  private departmentsService: DepartmentsService,
  private projectsService: ProjectsService,
  private searchService: SearchService,
  private conversationHistoryService: ConversationHistoryService, // ADD THIS LINE
) {}
```

## Bước 2: Update processQuery method signature

Thay đổi signature từ:
```typescript
async processQuery(message: string): Promise<{
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
}>
```

Thành:
```typescript
async processQuery(
  message: string,
  conversationId?: string,
  userId?: string,
): Promise<{
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
  conversationId?: string;
}>
```

## Bước 3: Thêm logic conversation management đầu processQuery

Ngay sau `const startTime = Date.now();`, thêm:

```typescript
// Bước 0: Tạo hoặc lấy conversation
let activeConversationId = conversationId;

if (userId && !conversationId) {
  // Tạo conversation mới nếu chưa có
  try {
    const conversation = await this.conversationHistoryService.createConversation(userId);
    activeConversationId = conversation.id;
    this.logger.debug(`Created new conversation: ${activeConversationId}`);
  } catch (error) {
    this.logger.warn(`Could not create conversation: ${error}`);
    // Continue without conversation tracking
  }
}

// Lưu user message vào history
if (activeConversationId) {
  try {
    await this.conversationHistoryService.addMessage(
      activeConversationId,
      'user',
      message,
    );
  } catch (error) {
    this.logger.warn(`Could not save user message: ${error}`);
    // Continue without saving
  }
}
```

## Bước 4: Update handleComplexQuery để nhận conversationId

Thay đổi signature từ:
```typescript
private async handleComplexQuery(
  type: string,
  value: string | undefined,
  message: string,
): Promise<string>
```

Thành:
```typescript
private async handleComplexQuery(
  type: string,
  value: string | undefined,
  message: string,
  conversationId?: string,
): Promise<string>
```

## Bước 5: Update call handleComplexQuery trong switch

Trong switch statement, đổi:
```typescript
case 'complex':
  response = await this.handleComplexQuery(classified.type, classified.value, message);
  break;
```

Thành:
```typescript
case 'complex':
  response = await this.handleComplexQuery(
    classified.type,
    classified.value,
    message,
    activeConversationId, // Pass conversationId
  );
  break;
```

## Bước 6: Update handleComplexQuery implementation

Đầu method `handleComplexQuery`, thêm logic để lấy conversation history:

```typescript
private async handleComplexQuery(
  type: string,
  value: string | undefined,
  message: string,
  conversationId?: string,
): Promise<string> {
  try {
    // Get conversation context if available
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (conversationId) {
      try {
        const context = await this.conversationHistoryService.getConversationContext(conversationId);
        conversationHistory = context.recentMessages;
        this.logger.debug(`Retrieved ${conversationHistory.length} messages from conversation history`);
      } catch (error) {
        this.logger.warn(`Could not retrieve conversation context: ${error}`);
        // Continue without history
      }
    }

    // Tạo context từ data hiện có
    let databaseContext = `Bạn là một trợ lý thông minh cho hệ thống quản lý nhân sự và dự án (EKG).\n\n`;
    
    // ... existing context building code ...
    
    // Use generateResponseWithHistory instead of generateResponse
    const response = conversationHistory.length > 0
      ? await this.geminiService.generateResponseWithHistory(message, conversationHistory, databaseContext)
      : await this.geminiService.generateResponse(message, databaseContext);
      
    return response;
  } catch (error) {
    this.logger.error(`Error handling complex query: ${error}`);
    throw error;
  }
}
```

## Bước 7: Lưu assistant response

Sau khi có `response` và trước return, thêm:

```typescript
// Lưu assistant response vào history (sau khi có response, trước return)
if (activeConversationId) {
  try {
    await this.conversationHistoryService.addMessage(
      activeConversationId,
      'assistant',
      response,
      {
        queryType: classified.type,
        queryLevel: classified.level,
        processingTime,
      },
    );
  } catch (error) {
    this.logger.warn(`Could not save assistant response: ${error}`);
    // Continue anyway
  }
}
```

## Bước 8: Update return statement

Thay đổi return từ:
```typescript
return {
  response,
  queryType: classified.type,
  queryLevel: classified.level,
  processingTime,
};
```

Thành:
```typescript
return {
  response,
  queryType: classified.type,
  queryLevel: classified.level,
  processingTime,
  conversationId: activeConversationId,
};
```

## Bước 9: Update ChatController

In `chat.controller.ts`, update processQuery method:

```typescript
@Post()
async processQuery(@Body() dto: ChatQueryDto): Promise<ChatResponseDto> {
  try {
    const result = await this.chatService.processQuery(
      dto.message,
      dto.conversationId,  // ADD
      dto.userId,          // ADD
    );

    return {
      message: dto.message,
      response: result.response,
      queryType: result.queryType,
      queryLevel: result.queryLevel,
      processingTime: result.processingTime,
      conversationId: result.conversationId, // ADD
      timestamp: new Date(),
    };
  } catch (error) {
    this.logger.error(`Error processing chat query: ${error}`);
    throw error;
  }
}
```

## Bước 10: Update ChatResponseDto

In `chat-query.dto.ts`, add conversationId to response:

```typescript
export class ChatResponseDto {
  message: string;
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
  conversationId?: string; // ADD THIS
  timestamp: Date;
}
```

## Testing

Sau khi implement, test bằng cách:

1. **First message (creates conversation):**
```bash
POST http://localhost:3000/chat
{
  "message": "Danh sách nhân viên",
  "userId": "NS001"
}

# Response should include conversationId
```

2. **Follow-up message (uses existing conversation):**
```bash
POST http://localhost:3000/chat
{
  "message": "Những người nào có kỹ năng Python?",
  "userId": "NS001",
  "conversationId": "<conversationId from step 1>"
}

# Gemini should have context from previous message
```

3. **Check conversation history:**
```sql
// In Neo4j Browser
MATCH (c:Conversation {id: "<conversationId>"})-[:HAS_MESSAGE]->(m:Message)
RETURN m
ORDER BY m.timestamp
```

## Troubleshooting

- **"Cannot find conversationHistoryService"**: Check ChatModule có add service vào providers chưa
- **"User not found"**: Cần có NguoiDung node với username matching userId
- **Messages không được lưu**: Check Neo4j constraints đã được tạo chưa
- **Gemini vẫn không có context**: Check logs để ensure conversationHistory được pass vào  generateResponseWithHistory

---

**Completed Steps:**
- ✅ Neo4jService.runRaw() added
- ✅ ConversationHistoryService updated to use runRaw
- ✅ ChatModule providers updated

**Next Manual Steps:** Follow guide trên từ Bước 1 → Bước 10
