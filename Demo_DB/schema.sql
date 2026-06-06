-- MySQL schema for SQL Builder demo data

CREATE TABLE IF NOT EXISTS cases (
  id INT PRIMARY KEY,
  age INT,
  sex VARCHAR(10),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  order_date VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS accession (
  id INT PRIMARY KEY,
  accession_path VARCHAR(255),
  source VARCHAR(100),
  accession_machine VARCHAR(100),
  scan_type VARCHAR(100),
  scan_site VARCHAR(100),
  birads4 VARCHAR(50),
  breast_oncotype VARCHAR(100),
  breast_sln VARCHAR(100),
  glioma VARCHAR(100),
  lung VARCHAR(100),
  skin VARCHAR(100),
  skin_buttocks VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  reoriented TINYINT DEFAULT 0,
  new_lung VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS slide (
  id INT PRIMARY KEY,
  slide_path VARCHAR(255),
  cases_id INT,
  jar_num VARCHAR(50),
  block_nm VARCHAR(50),
  slide_nm VARCHAR(50),
  stain_type VARCHAR(100),
  stc_procedure VARCHAR(100),
  tumor_subtype VARCHAR(100),
  source VARCHAR(100),
  slide_machine VARCHAR(100),
  origin VARCHAR(100),
  birads4 VARCHAR(50),
  breast_oncotype VARCHAR(100),
  breast_sln VARCHAR(100),
  glioma VARCHAR(100),
  lung VARCHAR(100),
  skin VARCHAR(100),
  skin_buttocks VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  tumor_morphology VARCHAR(100),
  stomach VARCHAR(100),
  sigmoid VARCHAR(100),
  new_lung VARCHAR(100),
  vasculitis VARCHAR(100),
  FOREIGN KEY (cases_id) REFERENCES cases(id)
);

CREATE TABLE IF NOT EXISTS link_case_accession (
  case_id INT,
  accession_id INT,
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  PRIMARY KEY (case_id, accession_id),
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (accession_id) REFERENCES accession(id)
);

CREATE TABLE IF NOT EXISTS datasource_parameter (
  id INT PRIMARY KEY AUTO_INCREMENT,
  data_type VARCHAR(100),
  data_point VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS lung (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  IHC_case_id INT,
  NGS_case_id INT,
  EGFR_NGS VARCHAR(100),
  FISH_ALK VARCHAR(100),
  ALK_NGS VARCHAR(100),
  ROS1_IHC VARCHAR(100),
  ROS1_NGS VARCHAR(100),
  ROS_variant VARCHAR(100),
  tumor_content DOUBLE,
  necrosis VARCHAR(100),
  stroma VARCHAR(100),
  mucin_production VARCHAR(100),
  PDL1_low DOUBLE,
  PDL1_high DOUBLE,
  TTF1 VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS skin_buttocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  site VARCHAR(100),
  dx_diagnosis VARCHAR(255),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS birads4 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS skin (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  sun_damage VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS new_lung (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS glioma (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  IDH VARCHAR(100),
  IDH_immunostain VARCHAR(100),
  AX VARCHAR(100),
  MGMT VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  AZ_tested_slide VARCHAR(100),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS breast_oncotype (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  oncotype DOUBLE,
  oncotype_ER_RT_PCR VARCHAR(100),
  oncotype_PR_RT_PCR VARCHAR(100),
  oncotype_HER2_RT_PCR VARCHAR(100),
  tumor_size DOUBLE,
  grade INT,
  ER VARCHAR(100),
  PR VARCHAR(100),
  HER2_IHC VARCHAR(100),
  HER2_FISH VARCHAR(100),
  nodal_status VARCHAR(100),
  lymph_node_status_for_oncotypeDX VARCHAR(100),
  proliferation_Ki_67_low DOUBLE,
  proliferation_Ki_67_high DOUBLE,
  neoadjuvant VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS stomach (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  fake_id VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS sigmoid (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS vasculitis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  IgA VARCHAR(100),
  IgG VARCHAR(100),
  IgM VARCHAR(100),
  C3 VARCHAR(100),
  fibrinogen VARCHAR(100),
  classification VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);

CREATE TABLE IF NOT EXISTS breast_sln (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slide_id INT,
  diagnosis VARCHAR(255),
  malignancy VARCHAR(100),
  last_updated VARCHAR(40),
  created_on VARCHAR(40),
  FOREIGN KEY (slide_id) REFERENCES slide(id)
);
