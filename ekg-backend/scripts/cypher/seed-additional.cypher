// Thêm dữ liệu nhân viên mới
MERGE (e3:NhanSu {empId:'E003'}) 
ON CREATE SET 
  e3.ten='Le Van C', 
  e3.chucDanh='DevOps Engineer',
  e3.email='levanc@company.com',
  e3.ngayTao=datetime();

// Thêm kỹ năng mới
MERGE (sK8s:KyNang {ten:'Kubernetes'});
MERGE (sAWS:KyNang {ten:'AWS'});

// Gán kỹ năng cho nhân viên mới
MERGE (e3)-[:CO_KY_NANG {level: 4}]->(sK8s);
MERGE (e3)-[:CO_KY_NANG {level: 3}]->(sAWS);

// Thêm vào phòng ban Engineering
MATCH (eng:PhongBan {code:'ENG'}), (e3:NhanSu {empId:'E003'})
MERGE (eng)-[:CO_NHAN_SU]->(e3);