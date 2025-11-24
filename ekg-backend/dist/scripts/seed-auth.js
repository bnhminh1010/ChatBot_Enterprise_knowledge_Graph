"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function runStatement(driver, statement, params = {}) {
    const session = driver.session({
        database: process.env.NEO4J_DATABASE || 'neo4j',
    });
    try {
        await session.run(statement, params);
    }
    finally {
        await session.close();
    }
}
async function main() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;
    const driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
    try {
        console.log('🔐 Starting authorization seed...');
        console.log('Creating constraints...');
        await runStatement(driver, `
      CREATE CONSTRAINT vaitro_ma IF NOT EXISTS
      FOR (r:VaiTro)
      REQUIRE r.ma IS UNIQUE
    `);
        await runStatement(driver, `
      CREATE CONSTRAINT user_username IF NOT EXISTS
      FOR (u:NguoiDung)
      REQUIRE u.username IS UNIQUE
    `);
        console.log('  ✅ Constraints created');
        console.log('Creating roles...');
        await runStatement(driver, `
      WITH [
        {
          ma:'ADMIN',
          ten:'Quản trị hệ thống',
          mo_ta:'Có quyền chỉnh sửa dữ liệu đồ thị tri thức (tạo/sửa/xoá node & quan hệ).'
        },
        {
          ma:'VIEWER',
          ten:'Người dùng nội bộ',
          mo_ta:'Chỉ được phép truy vấn và xem dữ liệu, không được chỉnh sửa.'
        }
      ] AS roles
      
      UNWIND roles AS r
      MERGE (role:VaiTro {ma: r.ma})
        ON CREATE SET
          role.ten   = r.ten,
          role.mo_ta = r.mo_ta
    `);
        console.log('  ✅ Roles created: ADMIN, VIEWER');
        console.log('Creating admin user...');
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
        const hashedPassword = await bcrypt_1.default.hash(adminPassword, 10);
        await runStatement(driver, `
      MATCH (rAdmin:VaiTro {ma:'ADMIN'})
      
      MERGE (admin:NguoiDung {username:'admin'})
        ON CREATE SET
          admin.ho_ten     = 'Admin hệ thống APTX',
          admin.trang_thai = 'Active',
          admin.password   = $password
      
      MERGE (admin)-[:CO_VAI_TRO]->(rAdmin)
    `, { password: hashedPassword });
        console.log(`  ✅ Admin user created (password: ${adminPassword})`);
        console.log('Creating viewer users from NhanSu...');
        const viewerPassword = 'User@123';
        const hashedViewerPassword = await bcrypt_1.default.hash(viewerPassword, 10);
        await runStatement(driver, `
      MATCH (rViewer:VaiTro {ma:'VIEWER'})
      MATCH (ns:NhanSu)
      MERGE (u:NguoiDung {username: ns.id})
        ON CREATE SET
          u.ho_ten     = ns.ho_ten,
          u.trang_thai = 'Active',
          u.password   = $password
      MERGE (u)-[:CO_VAI_TRO]->(rViewer)
      MERGE (u)-[:LA_NHAN_SU]->(ns)
    `, { password: hashedViewerPassword });
        console.log(`  ✅ Viewer users created (password for all: ${viewerPassword})`);
        console.log('\nVerifying created users...');
        const session = driver.session({
            database: process.env.NEO4J_DATABASE || 'neo4j',
        });
        try {
            const result = await session.run(`
        MATCH (u:NguoiDung)-[:CO_VAI_TRO]->(r:VaiTro)
        RETURN r.ma AS role, count(u) AS user_count
        ORDER BY role
      `);
            result.records.forEach(record => {
                console.log(`  ${record.get('role')}: ${record.get('user_count')} users`);
            });
        }
        finally {
            await session.close();
        }
        console.log('\n🌱 Authorization seed completed successfully!');
        console.log('\nDefault credentials:');
        console.log(`  Admin: username=admin, password=${adminPassword}`);
        console.log(`  Viewers: username=NS001-NS040, password=${viewerPassword}`);
    }
    catch (err) {
        console.error('❌ Seed error:', err);
        process.exitCode = 1;
    }
    finally {
        await driver.close();
    }
}
main();
//# sourceMappingURL=seed-auth.js.map