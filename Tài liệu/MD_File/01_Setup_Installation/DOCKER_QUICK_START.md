# 🚀 Quick Start - All Services

## Start tất cả services (Neo4j + Redis + Ollama)

```bash
cd ekg-backend
docker-compose up -d
```

## Verify containers running

```bash
docker ps

# Should see:
# - ekg-neo4j (port 7474, 7687)
# - ekg-redis (port 6379)
# - ekg-ollama (port 11434)
```

## Access services

- **Neo4j Browser**: http://localhost:7474
  - Username: `neo4j`
  - Password: `neo4j123`

- **Redis CLI**:

  ```bash
  docker exec -it ekg-redis redis-cli
  ```

- **Ollama**:

  ```bash
  # Check models
  docker exec -it ekg-ollama ollama list

  # Pull Mistral (if needed)
  docker exec -it ekg-ollama ollama pull mistral

  # Pull llama3.1 for RAG
  docker exec -it ekg-ollama ollama pull llama3.1
  ```

## Stop all services

```bash
docker-compose down

# With data cleanup
docker-compose down -v
```

---

**Note:** Tất cả services giờ chỉ trong **1 file duy nhất**: `docker-compose.yml` 🎉
