// Departments
MERGE (eng:PhongBan {code:'ENG'}) ON CREATE SET eng.ten = 'Engineering';
MERGE (hr:PhongBan {code:'HR'}) ON CREATE SET hr.ten = 'Human Resources';

// Employees
MERGE (e1:NhanSu {empId:'E001'}) ON CREATE SET e1.ten='Nguyen Van A', e1.chucDanh='Backend Engineer';
MERGE (e2:NhanSu {empId:'E002'}) ON CREATE SET e2.ten='Tran Thi B', e2.chucDanh='Frontend Engineer';
MERGE (eng)-[:CO_NHAN_SU]->(e1);
MERGE (hr)-[:CO_NHAN_SU]->(e2);

// Skills
MERGE (sNode:KyNang {ten:'Node.js'});
MERGE (sTS:KyNang {ten:'TypeScript'});
MERGE (sNeo4j:KyNang {ten:'Neo4j'});
MERGE (sReact:KyNang {ten:'React'});
MERGE (sDocker:KyNang {ten:'Docker'});

// Employee skills
MERGE (e1)-[r1:CO_KY_NANG]->(sNode) SET r1.level = 4;
MERGE (e1)-[r2:CO_KY_NANG]->(sTS) SET r2.level = 3;
MERGE (e1)-[r3:CO_KY_NANG]->(sNeo4j) SET r3.level = 2;
MERGE (e2)-[r4:CO_KY_NANG]->(sReact) SET r4.level = 4;
MERGE (e2)-[r5:CO_KY_NANG]->(sNode) SET r5.level = 2;
MERGE (e2)-[r6:CO_KY_NANG]->(sDocker) SET r6.level = 3;

// Projects & Technologies
MERGE (p1:DuAn {key:'P001'}) ON CREATE SET p1.ten='EKG Analytics', p1.trangThai='Active';
MERGE (tNest:CongNghe {ten:'NestJS'});
MERGE (tNeo4j:CongNghe {ten:'Neo4j'});
MERGE (p1)-[:SU_DUNG_CONG_NGHE]->(tNest);
MERGE (p1)-[:SU_DUNG_CONG_NGHE]->(tNeo4j);

// Assign employees to project
MERGE (e1)-[:LAM_DU_AN]->(p1);
MERGE (e2)-[:LAM_DU_AN]->(p1);