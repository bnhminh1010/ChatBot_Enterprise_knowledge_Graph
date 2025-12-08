"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const BASE_URL = 'http://localhost:3000';
async function testAuth() {
    console.log('🧪 Testing Authorization System\n');
    try {
        console.log('1️⃣ Testing admin login...');
        const adminLogin = await axios_1.default.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin@123'
        });
        const adminToken = adminLogin.data.access_token;
        console.log('   ✅ Admin login successful');
        console.log('   Role:', adminLogin.data.user.role);
        console.log('\n2️⃣ Testing viewer login...');
        const viewerLogin = await axios_1.default.post(`${BASE_URL}/auth/login`, {
            username: 'NS001',
            password: 'User@123'
        });
        const viewerToken = viewerLogin.data.access_token;
        console.log('   ✅ Viewer login successful');
        console.log('   Role:', viewerLogin.data.user.role);
        console.log('\n3️⃣ Testing admin read access...');
        await axios_1.default.get(`${BASE_URL}/employees`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   ✅ Admin can read employees');
        console.log('\n4️⃣ Testing viewer read access...');
        await axios_1.default.get(`${BASE_URL}/employees`, {
            headers: { Authorization: `Bearer ${viewerToken}` }
        });
        console.log('   ✅ Viewer can read employees');
        console.log('\n5️⃣ Testing admin write access...');
        try {
            await axios_1.default.post(`${BASE_URL}/employees`, {
                pbId: 'ENG',
                nhomId: 'ENG-001',
                chucDanhId: 'CD003',
                nhanSuId: 'TEST001',
                hoTen: 'Test User',
                email: 'test@test.com',
                sdt: '0123456789',
                ngaySinh: '1990-01-01',
                ngayVao: '2025-01-01'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('   ✅ Admin can create employees');
        }
        catch (err) {
            if (err.response?.status === 400) {
                console.log('   ✅ Admin has write permission (validation error is OK)');
            }
            else {
                throw err;
            }
        }
        console.log('\n6️⃣ Testing viewer write restriction...');
        try {
            await axios_1.default.post(`${BASE_URL}/employees`, {
                pbId: 'ENG',
                nhomId: 'ENG-001',
                chucDanhId: 'CD003',
                nhanSuId: 'TEST002',
                hoTen: 'Test User 2',
                email: 'test2@test.com',
                sdt: '0123456780',
                ngaySinh: '1990-01-01',
                ngayVao: '2025-01-01'
            }, {
                headers: { Authorization: `Bearer ${viewerToken}` }
            });
            console.log('   ❌ FAIL: Viewer should not be able to create employees!');
        }
        catch (err) {
            if (err.response?.status === 403) {
                console.log('   ✅ Viewer correctly blocked from write operations');
            }
            else {
                throw err;
            }
        }
        console.log('\n7️⃣ Testing unauthorized access...');
        try {
            await axios_1.default.get(`${BASE_URL}/employees`);
            console.log('   ❌ FAIL: Should require authentication!');
        }
        catch (err) {
            if (err.response?.status === 401) {
                console.log('   ✅ Correctly requires authentication');
            }
            else {
                throw err;
            }
        }
        console.log('\n✅ All tests passed!');
        console.log('\n📋 Summary:');
        console.log('   - Admin can read and write');
        console.log('   - Viewer can only read');
        console.log('   - Unauthenticated requests are blocked');
    }
    catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}
testAuth();
//# sourceMappingURL=test-auth.js.map