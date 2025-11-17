// Create Roles
MERGE (roleAdmin:Role {ten: 'admin'})
  ON CREATE SET roleAdmin.moTa = 'Administrator - Full access';

MERGE (roleManager:Role {ten: 'manager'})
  ON CREATE SET roleManager.moTa = 'Manager - Department access';

MERGE (roleUser:Role {ten: 'user'})
  ON CREATE SET roleUser.moTa = 'User - Read-only access';

// Create Admin User
MERGE (admin:User {id: 'U001', email: 'admin@aptx.com'})
  ON CREATE SET
    admin.hoTen = 'System Administrator',
    admin.matKhau =
      '$2b$10$p9U5I8F8RQkFZuP0mVYaYum3P8JZKvG8QzW7KJO2Lb5PqQI.qQ9jy',
    admin.trangThai = 'active',
    admin.taoLuc = datetime()
  ON MATCH SET admin.capNhatLuc = datetime();

MERGE (admin)-[:CO_ROLE]->(roleAdmin);

// Create Manager User
MERGE (manager:User {id: 'U002', email: 'manager@aptx.com'})
  ON CREATE SET
    manager.hoTen = 'Engineering Manager',
    manager.matKhau =
      '$2b$10$p9U5I8F8RQkFZuP0mVYaYum3P8JZKvG8QzW7KJO2Lb5PqQI.qQ9jy',
    manager.trangThai = 'active',
    manager.taoLuc = datetime()
  ON MATCH SET manager.capNhatLuc = datetime();

MERGE (manager)-[:CO_ROLE]->(roleManager);

// Create Regular User
MERGE (user:User {id: 'U003', email: 'user@aptx.com'})
  ON CREATE SET
    user.hoTen = 'Regular User',
    user.matKhau =
      '$2b$10$p9U5I8F8RQkFZuP0mVYaYum3P8JZKvG8QzW7KJO2Lb5PqQI.qQ9jy',
    user.trangThai = 'active',
    user.taoLuc = datetime()
  ON MATCH SET user.capNhatLuc = datetime();

MERGE (user)-[:CO_ROLE]->(roleUser);