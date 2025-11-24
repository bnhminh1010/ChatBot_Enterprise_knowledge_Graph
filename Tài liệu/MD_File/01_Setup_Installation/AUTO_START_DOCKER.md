# Auto-Start Docker Services với NPM

## ✅ Setup Complete!

**package.json** đã được update với:
```json
"prestart:dev": "docker-compose up -d"
```

## 🚀 Cách sử dụng

**Từ giờ, CHỈ CẦN**:
```bash
cd ekg-backend
npm run start:dev
```

**NPM tự động**:
1. ✅ Chạy `docker-compose up -d` (start Neo4j, Redis, Ollama)
2. ✅ Chạy `ts-node-dev` (start backend)

## 🔄 Test ngay

**Stop backend hiện tại** (Ctrl+C), rồi:
```bash
npm run start:dev
```

Output sẽ như:
```
> ekg-backend@0.0.1 prestart:dev
> docker-compose up -d

[+] Running 3/3
 ✔ Container ekg-neo4j   Started
 ✔ Container ekg-redis   Started  
 ✔ Container ekg-ollama  Started

> ekg-backend@0.0.1 start:dev
> ts-node-dev --respawn --transpile-only src/main.ts

[Nest] INFO Starting Nest application...
🚀 API ready at http://localhost:3002/docs
```

## 📝 Lưu ý

- **Lần đầu chạy**: Docker sẽ pull images (có thể mất vài phút)
- **Lần sau**: Containers đã có sẵn → start rất nhanh (~2-3 giây)
- **Frontend**: Vẫn cần start riêng `cd ekg-frontend/apps/web && npx next dev`

## 🛑 Stop services

```bash
# Stop backend: Ctrl+C
# Stop Docker containers:
cd ekg-backend
docker-compose down
```
