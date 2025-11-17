// Thêm nhiều nhân viên mới
MERGE (e4:NhanSu {empId:'E004'}) 
ON CREATE SET 
  e4.ten='Tran Van E', 
  e4.chucDanh='Full Stack Developer',
  e4.email='trane@company.com',
  e4.ngayTao=datetime();

MERGE (e5:NhanSu {empId:'E005'}) 
ON CREATE SET 
  e5.ten='Le Thi F', 
  e5.chucDanh='Data Scientist',
  e5.email='lethif@company.com',
  e5.ngayTao=datetime();

MERGE (e6:NhanSu {empId:'E006'}) 
ON CREATE SET 
  e6.ten='Nguyen Van G', 
  e6.chucDanh='Mobile Developer',
  e6.email='nguyenvang@company.com',
  e6.ngayTao=datetime();

// Thêm phòng ban mới
MERGE (qa:PhongBan {code:'QA'}) ON CREATE SET qa.ten = 'Quality Assurance';
MERGE (data:PhongBan {code:'DATA'}) ON CREATE SET data.ten = 'Data Science';

// Gán nhân viên vào phòng ban
MATCH (qa:PhongBan {code:'QA'}), (e4:NhanSu {empId:'E004'})
MERGE (qa)-[:CO_NHAN_SU]->(e4);

MATCH (data:PhongBan {code:'DATA'}), (e5:NhanSu {empId:'E005'})
MERGE (data)-[:CO_NHAN_SU]->(e5);

MATCH (eng:PhongBan {code:'ENG'}), (e6:NhanSu {empId:'E006'})
MERGE (eng)-[:CO_NHAN_SU]->(e6);

// Thêm kỹ năng mới
MERGE (sPython:KyNang {ten:'Python'});
MERGE (sML:KyNang {ten:'Machine Learning'});
MERGE (sReactNative:KyNang {ten:'React Native'});
MERGE (sPostgreSQL:KyNang {ten:'PostgreSQL'});

// Gán kỹ năng cho nhân viên
MERGE (e4)-[:CO_KY_NANG {level: 4}]->(sPostgreSQL);
MERGE (e4)-[:CO_KY_NANG {level: 3}]->(sReactNative);

MERGE (e5)-[:CO_KY_NANG {level: 5}]->(sPython);
MERGE (e5)-[:CO_KY_NANG {level: 4}]->(sML);

MERGE (e6)-[:CO_KY_NANG {level: 4}]->(sReactNative);
MERGE (e6)-[:CO_KY_NANG {level: 3}]->(sPython);

// Thêm dự án mới
MERGE (p2:DuAn {key:'P002'}) 
ON CREATE SET 
  p2.ten='AI Recommendation System', 
  p2.trangThai='Planning',
  p2.ngayBatDau=date();

MERGE (p3:DuAn {key:'P003'}) 
ON CREATE SET 
  p3.ten='Mobile Banking App', 
  p3.trangThai='Active',
  p3.ngayBatDau=date();

// Thêm công nghệ mới
MERGE (tPython:CongNghe {ten:'Python'});
MERGE (tTensorFlow:CongNghe {ten:'TensorFlow'});
MERGE (tReactNative:CongNghe {ten:'React Native'});
MERGE (tPostgreSQL:CongNghe {ten:'PostgreSQL'});

// Liên kết dự án với công nghệ
MERGE (p2)-[:SU_DUNG_CONG_NGHE]->(tPython);
MERGE (p2)-[:SU_DUNG_CONG_NGHE]->(tTensorFlow);

MERGE (p3)-[:SU_DUNG_CONG_NGHE]->(tReactNative);
MERGE (p3)-[:SU_DUNG_CONG_NGHE]->(tPostgreSQL);

// Gán nhân viên vào dự án
MERGE (e4)-[:LAM_DU_AN]->(p3);
MERGE (e5)-[:LAM_DU_AN]->(p2);
MERGE (e6)-[:LAM_DU_AN]->(p3);