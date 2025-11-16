# 🗄️ Database Setup & Seeding Guide

## Neo4j Database

### 1. Start Neo4j

```bash
cd ekg-backend
docker-compose up -d
```

### 2. Access Neo4j

- **Browser**: http://localhost:7474
- **Default Credentials**:
  - Username: `neo4j`
  - Password: `neo4j123` (as per .env)

### 3. Seed Sample Data

```bash
cd ekg-backend
npm run seed
```

This will:

- Create constraints (unique indexes)
- Insert sample data:
  - Employees
  - Departments
  - Skills
  - Projects
  - Relationships

### 4. Verify Data

In Neo4j Browser, run:

```cypher
MATCH (n) RETURN count(n) as total_nodes;
```

Should return a number > 0

---

## Database Schema

### Nodes

**Employee**

```
{
  id: string
  name: string
  email: string
  position: string
  department: string
}
```

**Department**

```
{
  id: string
  name: string
  description: string
}
```

**Skill**

```
{
  id: string
  name: string
  category: string
}
```

**Project**

```
{
  id: string
  name: string
  description: string
  status: string
}
```

### Relationships

```
Employee --WORKS_IN--> Department
Employee --HAS_SKILL--> Skill
Employee --ASSIGNED_TO--> Project
Project --USES_SKILL--> Skill
```

---

## Cypher Queries

### View All Employees

```cypher
MATCH (e:Employee) RETURN e LIMIT 10;
```

### View All Departments

```cypher
MATCH (d:Department) RETURN d;
```

### View Skills and Related Employees

```cypher
MATCH (s:Skill)<-[:HAS_SKILL]-(e:Employee)
RETURN s.name, collect(e.name) as employees;
```

### Find Employee by Name

```cypher
MATCH (e:Employee {name: "John Doe"}) RETURN e;
```

### Get Employee's Skills

```cypher
MATCH (e:Employee {id: "emp_123"})-[:HAS_SKILL]->(s:Skill)
RETURN s.name;
```

### Get Department's Employees

```cypher
MATCH (d:Department {id: "dept_123"})<-[:WORKS_IN]-(e:Employee)
RETURN e.name, e.position;
```

---

## Seed Script Details

Located at: `ekg-backend/scripts/seed.ts`

Runs two files:

1. **constraints.cypher** - Creates indexes and constraints
2. **seed-core.cypher** - Inserts sample data

### To Manually Seed:

1. Open Neo4j Browser (http://localhost:7474)
2. Copy contents of `scripts/cypher/constraints.cypher`
3. Execute in browser
4. Copy contents of `scripts/cypher/seed-core.cypher`
5. Execute in browser

---

## Troubleshooting

### Neo4j Container Won't Start

```bash
# Check logs
docker-compose logs neo4j

# Force recreate
docker-compose down
docker-compose up -d --force-recreate
```

### "Connection refused" Error

- Ensure Neo4j is running: `docker ps`
- Check port 7687 is available
- Verify .env has correct credentials

### No Data After Seeding

```bash
# Check if seed ran
docker-compose logs neo4j | grep seed

# Re-run seed
npm run seed

# Verify in browser
```

### Clear All Data

```cypher
MATCH (n) DETACH DELETE n;
```

---

## Performance Tips

1. **Indexes**: Already created via constraints.cypher
2. **Query Optimization**: Use MATCH with WHERE for large datasets
3. **Relationships**: Use explicit relationship types for better performance

```cypher
-- Good
MATCH (e:Employee)-[:HAS_SKILL]->(s:Skill)

-- Not optimal
MATCH (e:Employee)-[*]->(s:Skill)
```

---

## Backup & Restore

### Backup

```bash
docker exec neo4j-container neo4j-admin dump \
  --database=neo4j \
  --to=/backups/neo4j.dump
```

### Restore

```bash
docker exec neo4j-container neo4j-admin load \
  --from=/backups/neo4j.dump \
  --database=neo4j \
  --force
```

---

## Next Steps

After seeding:

1. ✅ Start backend: `npm run start:dev`
2. ✅ Start frontend: `npm run dev`
3. ✅ Test: "Danh sách nhân viên" in chat

All data should now be accessible via the API!
