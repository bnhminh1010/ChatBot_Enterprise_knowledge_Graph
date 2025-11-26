/**
 * Example Cypher Script to Seed Document Data for Testing
 * Run this in Neo4j Browser to add sample TaiLieu nodes
 * 
 * Thay đổi:
 * 1. Địa chỉ URL thành địa chỉ thực tế của các documents
 * 2. Project ID để match với projects hiện tại
 * 3. Document metadata (tên, mô tả, loại)
 */

// ============================================
// 1. Create Sample Project (nếu chưa có)
// ============================================
MERGE (p:DuAn {id: 'DuAn_test_001'})
ON CREATE SET
  p.ten = 'EKG Test Project',
  p.ma = 'EKG-TEST',
  p.trang_thai = 'Active',
  p.khach_hang = 'APTX3107',
  p.linh_vuc = 'Knowledge Management',
  p.loai = 'Internal',
  p.start_date = date()

RETURN p.ten as 'Project Created'

// ============================================
// 2. Create Sample Documents with duong_dan
// ============================================

// Document 1: Text File (README)
MERGE (doc1:TaiLieu {id: 'doc_readme_001'})
ON CREATE SET
  doc1.ten = 'README - Project Overview',
  doc1.loai = 'txt',
  doc1.mo_ta = 'Project overview and quick start guide',
  doc1.duong_dan = 'https://raw.githubusercontent.com/bnhminh1010/ekg-test-docs/main/README.txt',
  doc1.ngay_tao = date(),
  doc1.trang_thai = 'Active'

RETURN doc1.ten as 'Document 1 Created'

// Document 2: Markdown File (Setup Guide)
MERGE (doc2:TaiLieu {id: 'doc_setup_001'})
ON CREATE SET
  doc2.ten = 'SETUP_GUIDE.md',
  doc2.loai = 'md',
  doc2.mo_ta = 'Installation and setup instructions',
  doc2.duong_dan = 'https://raw.githubusercontent.com/bnhminh1010/ekg-test-docs/main/SETUP_GUIDE.md',
  doc2.ngay_tao = date(),
  doc2.trang_thai = 'Active'

RETURN doc2.ten as 'Document 2 Created'

// Document 3: JSON File (Configuration)
MERGE (doc3:TaiLieu {id: 'doc_config_001'})
ON CREATE SET
  doc3.ten = 'Configuration.json',
  doc3.loai = 'json',
  doc3.mo_ta = 'System configuration settings',
  doc3.duong_dan = 'https://raw.githubusercontent.com/bnhminh1010/ekg-test-docs/main/config.json',
  doc3.ngay_tao = date(),
  doc3.trang_thai = 'Active'

RETURN doc3.ten as 'Document 3 Created'

// Document 4: Word Document (NOT TESTED - requires docx-parser)
MERGE (doc4:TaiLieu {id: 'doc_requirements_001'})
ON CREATE SET
  doc4.ten = 'Project_Requirements.docx',
  doc4.loai = 'docx',
  doc4.mo_ta = 'System requirements specification',
  doc4.duong_dan = 'https://example.com/docs/requirements.docx',
  doc4.ngay_tao = date(),
  doc4.trang_thai = 'Draft'

RETURN doc4.ten as 'Document 4 Created'

// Document 5: Document WITHOUT duong_dan (for testing error handling)
MERGE (doc5:TaiLieu {id: 'doc_no_path_001'})
ON CREATE SET
  doc5.ten = 'Internal Memo - No Path',
  doc5.loai = 'txt',
  doc5.mo_ta = 'This document has no duong_dan attribute',
  doc5.ngay_tao = date(),
  doc5.trang_thai = 'Active'

RETURN doc5.ten as 'Document 5 Created'

// ============================================
// 3. Create Relationships
// ============================================

// Link documents to project
MATCH (p:DuAn {id: 'DuAn_test_001'})
MATCH (doc1:TaiLieu {id: 'doc_readme_001'})
MATCH (doc2:TaiLieu {id: 'doc_setup_001'})
MATCH (doc3:TaiLieu {id: 'doc_config_001'})
MATCH (doc4:TaiLieu {id: 'doc_requirements_001'})
MATCH (doc5:TaiLieu {id: 'doc_no_path_001'})

MERGE (p)-[:DINH_KEM_TAI_LIEU]->(doc1)
MERGE (p)-[:DINH_KEM_TAI_LIEU]->(doc2)
MERGE (p)-[:DINH_KEM_TAI_LIEU]->(doc3)
MERGE (p)-[:DINH_KEM_TAI_LIEU]->(doc4)
MERGE (p)-[:DINH_KEM_TAI_LIEU]->(doc5)

RETURN COUNT(*) as 'Relationships Created'

// ============================================
// 4. Verify Data
// ============================================

MATCH (p:DuAn {id: 'DuAn_test_001'})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
RETURN 
  p.ten as ProjectName,
  doc.id as DocumentID,
  doc.ten as DocumentName,
  doc.loai as FileType,
  doc.mo_ta as Description,
  CASE 
    WHEN doc.duong_dan IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END as HasPath,
  doc.duong_dan as URL
ORDER BY doc.ten

// ============================================
// 5. Count Documents by Project
// ============================================

MATCH (p:DuAn {id: 'DuAn_test_001'})-[:DINH_KEM_TAI_LIEU]->(doc:TaiLieu)
WITH 
  COUNT(doc) as TotalDocs,
  COUNT(CASE WHEN doc.duong_dan IS NOT NULL THEN 1 END) as DocsWithPath
RETURN 
  TotalDocs,
  DocsWithPath,
  (TotalDocs - DocsWithPath) as DocsWithoutPath
