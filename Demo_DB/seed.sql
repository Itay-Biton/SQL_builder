-- Seed data for the small demo database

-- cases
INSERT INTO cases (id, age, sex, last_updated, created_on, order_date) VALUES
(1, 65, 'F', '2024-01-10T10:00:00Z', '2023-12-01T08:00:00Z', '2023-11-30'),
(2, 54, 'M', '2024-02-14T09:30:00Z', '2024-02-01T09:00:00Z', '2024-01-28'),
(3, 72, 'M', '2024-01-20T08:00:00Z', '2023-12-05T09:00:00Z', '2023-12-04'),
(4, 29, 'F', '2024-03-05T11:00:00Z', '2024-02-25T10:00:00Z', '2024-02-20'),
(5, 41, 'M', '2024-03-15T14:20:00Z', '2024-03-10T12:00:00Z', '2024-03-09'),
(6, 58, 'F', '2024-04-01T09:15:00Z', '2024-03-28T08:45:00Z', '2024-03-27'),
(7, 67, 'M', '2024-04-10T16:00:00Z', '2024-04-01T15:00:00Z', '2024-03-30'),
(8, 34, 'F', '2024-04-15T10:30:00Z', '2024-04-10T09:00:00Z', '2024-04-08');

-- accession
INSERT INTO accession (id, accession_path, source, accession_machine, scan_type, scan_site, birads4, last_updated, created_on, reoriented)
VALUES
(1, '/data/accessions/ACC001', 'LabA', 'ScannerX', 'WholeSlide', 'Site1', '4', '2024-02-01T12:00:00Z', '2024-01-01T12:00:00Z', 0),
(2, '/data/accessions/ACC002', 'LabB', 'ScannerY', 'Macro', 'Site2', '3', '2024-03-01T12:00:00Z', '2024-02-15T12:00:00Z', 1),
(3, '/data/accessions/ACC003', 'LabA', 'ScannerZ', 'WholeSlide', 'Site1', '5', '2024-03-10T12:00:00Z', '2024-03-01T12:00:00Z', 0),
(4, '/data/accessions/ACC004', 'LabC', 'ScannerX', 'Macro', 'Site3', '2', '2024-04-01T12:00:00Z', '2024-03-20T12:00:00Z', 1),
(5, '/data/accessions/ACC005', 'LabB', 'ScannerY', 'WholeSlide', 'Site2', '4', '2024-04-10T12:00:00Z', '2024-04-05T12:00:00Z', 0),
(6, '/data/accessions/ACC006', 'LabD', 'ScannerW', 'Macro', 'Site4', '3', '2024-04-20T12:00:00Z', '2024-04-18T12:00:00Z', 1);

-- slide
INSERT INTO slide (id, slide_path, cases_id, jar_num, block_nm, slide_nm, stain_type, source, slide_machine, origin, last_updated, created_on)
VALUES
(1, '/slides/S001.svs', 1, 'J1', 'B1', 'S1', 'H&E', 'LabA', 'ScannerX', 'ORIG1', '2024-02-01T12:00:00Z', '2024-01-02T12:00:00Z'),
(2, '/slides/S002.svs', 2, 'J2', 'B2', 'S2', 'IHC', 'LabB', 'ScannerY', 'ORIG2', '2024-03-01T12:00:00Z', '2024-02-16T12:00:00Z'),
(3, '/slides/S003.svs', 3, 'J3', 'B3', 'S3', 'H&E', 'LabA', 'ScannerZ', 'ORIG3', '2024-03-10T12:00:00Z', '2024-03-02T12:00:00Z'),
(4, '/slides/S004.svs', 4, 'J4', 'B4', 'S4', 'IHC', 'LabC', 'ScannerX', 'ORIG4', '2024-04-01T12:00:00Z', '2024-03-21T12:00:00Z'),
(5, '/slides/S005.svs', 5, 'J5', 'B5', 'S5', 'H&E', 'LabB', 'ScannerY', 'ORIG5', '2024-04-10T12:00:00Z', '2024-04-06T12:00:00Z'),
(6, '/slides/S006.svs', 6, 'J6', 'B6', 'S6', 'IHC', 'LabD', 'ScannerW', 'ORIG6', '2024-04-20T12:00:00Z', '2024-04-19T12:00:00Z'),
(7, '/slides/S007.svs', 7, 'J7', 'B7', 'S7', 'Special', 'LabA', 'ScannerX', 'ORIG7', '2024-04-11T12:00:00Z', '2024-04-02T12:00:00Z'),
(8, '/slides/S008.svs', 8, 'J8', 'B8', 'S8', 'H&E', 'LabC', 'ScannerY', 'ORIG8', '2024-04-16T12:00:00Z', '2024-04-12T12:00:00Z');

-- link_case_accession
INSERT INTO link_case_accession (case_id, accession_id, last_updated, created_on)
VALUES
(1,1,'2024-02-01T12:00:00Z','2024-01-01T12:00:00Z'),
(2,2,'2024-03-01T12:00:00Z','2024-02-15T12:00:00Z'),
(3,3,'2024-03-10T12:00:00Z','2024-03-01T12:00:00Z'),
(4,4,'2024-04-01T12:00:00Z','2024-03-20T12:00:00Z'),
(5,5,'2024-04-10T12:00:00Z','2024-04-05T12:00:00Z'),
(6,6,'2024-04-20T12:00:00Z','2024-04-18T12:00:00Z');

-- lung details for slide 1
INSERT INTO lung (slide_id, IHC_case_id, NGS_case_id, EGFR_NGS, tumor_content, last_updated, created_on)
VALUES
(1, NULL, NULL, 'EGFR_exon19', 0.45, '2024-02-01T12:00:00Z', '2024-01-02T12:00:00Z');

-- breast_oncotype for slide 2
INSERT INTO breast_oncotype (slide_id, oncotype, tumor_size, grade, ER, PR, HER2_IHC, last_updated, created_on)
VALUES
(2, 22.5, 1.3, 2, 'Positive', 'Positive', '0/1', '2024-03-01T12:00:00Z', '2024-02-16T12:00:00Z');

-- simple datasource_parameter rows
INSERT INTO datasource_parameter (data_type, data_point) VALUES
('string','example'),
('integer','42');
