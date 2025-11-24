# Neo4j Knowledge Graph Design

## 1. Node Types

### **Employee**

-   name (String)
-   role (String)
-   department (String)
-   email (String)

### **Department**

-   name (String)
-   description (String)

### **Project**

-   name (String)
-   code (String)
-   status (String)
-   start_date (Date)
-   end_date (Date)

### **Skill**

-   name (String)
-   level (String)

### **Task**

-   title (String)
-   description (String)
-   deadline (Date)
-   status (String)

## 2. Relationship Types

### `WORKS_IN`

(Employee → Department)

### `HAS_SKILL`

(Employee → Skill)

### `ASSIGNED_TO`

(Employee → Task)

### `PART_OF`

(Task → Project)

### `MANAGES`

(Employee → Project)

## 3. Query Patterns for Chatbot

### 3.1 Find employee by name

    MATCH (e:Employee {name: $name})
    RETURN e

### 3.2 List all employees in department

    MATCH (d:Department {name: $dept})<-[:WORKS_IN]-(e:Employee)
    RETURN e

### 3.3 Get all tasks assigned to employee

    MATCH (e:Employee {name: $name})-[:ASSIGNED_TO]->(t:Task)
    RETURN t

### 3.4 Find project details

    MATCH (p:Project {name: $project})
    RETURN p

### 3.5 Get employees with specific skill

    MATCH (e:Employee)-[:HAS_SKILL]->(s:Skill {name: $skill})
    RETURN e

### 3.6 Get tasks in a project

    MATCH (p:Project {name: $project})<-[:PART_OF]-(t:Task)
    RETURN t

## 4. Chatbot Query Handling Strategy

### **Intent Classification**

-   Employee info
-   Project status
-   Task assignment
-   Department lookup
-   Skill search

### **Entity Extraction**

Extract: - employee_name - project_name - department_name - skill_name -
task_title

### **Query Mapping**

Map intent → Cypher template → fill variables.

### **Validation**

If missing entity: - Ask follow-up question - Or search using fuzzy
matching

## 5. Fuzzy Search Examples

    MATCH (e:Employee)
    WHERE e.name CONTAINS $keyword
    RETURN e

    MATCH (p:Project)
    WHERE toLower(p.name) CONTAINS toLower($keyword)
    RETURN p
