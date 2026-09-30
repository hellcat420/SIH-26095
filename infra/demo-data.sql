BEGIN;

INSERT INTO "institutes" (
  "id", "name", "type", "schemeType", "address", "lat", "lng",
  "contactPerson", "status", "createdAt", "updatedAt"
) VALUES
  ('d0500000-0000-4000-8000-000000000001', 'DEMO - Yamuna Child Care Centre', 'Institute', 'Mission Vatsalya', 'Mayur Vihar, East Delhi, Delhi', 28.6082, 77.2954, 'Anita Rao', 'Active', now() - interval '120 days', now()),
  ('d0500000-0000-4000-8000-000000000002', 'DEMO - Saksham Support Project', 'Project', 'PM POSHAN', 'Lajpat Nagar, South Delhi, Delhi', 28.5677, 77.2433, 'Rakesh Kumar', 'Flagged', now() - interval '90 days', now()),
  ('d0500000-0000-4000-8000-000000000003', 'DEMO - Udaan Girls Hostel', 'Institute', 'Mission Vatsalya', 'Rohini, North West Delhi, Delhi', 28.7431, 77.0679, 'Farah Khan', 'Active', now() - interval '75 days', now()),
  ('d0500000-0000-4000-8000-000000000004', 'DEMO - Nayi Disha Community Hub', 'NGO', 'Child Protection', 'Dwarka, South West Delhi, Delhi', 28.5921, 77.0460, 'Joseph Thomas', 'Suspended', now() - interval '60 days', now()),
  ('d0500000-0000-4000-8000-000000000005', 'DEMO - Pragati Learning Centre', 'Project', 'PM POSHAN', 'Shahdara, East Delhi, Delhi', 28.6734, 77.2890, 'Sunita Devi', 'Active', now() - interval '45 days', now()),
  ('d0500000-0000-4000-8000-000000000006', 'DEMO - Seva Bal Kendra', 'Institute', 'Mission Vatsalya', 'Noida Sector 15, Gautam Buddha Nagar, Uttar Pradesh', 28.5850, 77.3110, 'Imran Siddiqui', 'Flagged', now() - interval '30 days', now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "schemeType" = EXCLUDED."schemeType",
  "address" = EXCLUDED."address",
  "lat" = EXCLUDED."lat",
  "lng" = EXCLUDED."lng",
  "contactPerson" = EXCLUDED."contactPerson",
  "status" = EXCLUDED."status",
  "updatedAt" = now();

INSERT INTO "assignments" (
  "id", "inspectorId", "instituteId", "scheduledAt", "status",
  "assignmentType", "riskScoreAtAssignment", "createdAt", "updatedAt"
) VALUES
  ('d0510000-0000-4000-8000-000000000001', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000001', date_trunc('day', now()) + interval '9 hours', 'Completed', 'Random', 0.18, now() - interval '1 day', now()),
  ('d0510000-0000-4000-8000-000000000002', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000002', date_trunc('day', now()) + interval '11 hours', 'InProgress', 'Triggered', 0.82, now() - interval '3 hours', now()),
  ('d0510000-0000-4000-8000-000000000003', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000003', date_trunc('day', now()) + interval '14 hours', 'Pending', 'Random', 0.34, now() - interval '2 hours', now()),
  ('d0510000-0000-4000-8000-000000000004', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000004', now() - interval '2 days', 'Missed', 'Manual', 0.91, now() - interval '3 days', now()),
  ('d0510000-0000-4000-8000-000000000005', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000005', now() - interval '1 day', 'Completed', 'Random', 0.27, now() - interval '2 days', now()),
  ('d0510000-0000-4000-8000-000000000006', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0500000-0000-4000-8000-000000000006', now() - interval '5 days', 'Completed', 'Triggered', 0.76, now() - interval '6 days', now())
ON CONFLICT ("id") DO UPDATE SET
  "inspectorId" = EXCLUDED."inspectorId",
  "instituteId" = EXCLUDED."instituteId",
  "scheduledAt" = EXCLUDED."scheduledAt",
  "status" = EXCLUDED."status",
  "assignmentType" = EXCLUDED."assignmentType",
  "riskScoreAtAssignment" = EXCLUDED."riskScoreAtAssignment",
  "updatedAt" = now();

INSERT INTO "inspections" (
  "id", "clientSubmissionId", "instituteId", "inspectorId", "assignmentId",
  "checklistResponses", "photos", "videos", "gpsLat", "gpsLng",
  "gpsAccuracyMeters", "createdAt", "updatedAt"
) VALUES
  ('d0520000-0000-4000-8000-000000000001', 'd0530000-0000-4000-8000-000000000001', 'd0500000-0000-4000-8000-000000000001', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0510000-0000-4000-8000-000000000001', '{"buildingCondition":"Good","attendanceRegister":"Available","beneficiaryRecords":"Verified","safetyEquipment":"Available","notes":"Demo inspection completed. Records and safety equipment checked."}'::jsonb, '[]'::jsonb, '[]'::jsonb, 28.6083, 77.2955, 8.0, date_trunc('day', now()) + interval '9 hours 20 minutes', date_trunc('day', now()) + interval '9 hours 20 minutes'),
  ('d0520000-0000-4000-8000-000000000002', 'd0530000-0000-4000-8000-000000000002', 'd0500000-0000-4000-8000-000000000002', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0510000-0000-4000-8000-000000000002', '{"buildingCondition":"Needs attention","attendanceRegister":"Available","beneficiaryRecords":"Needs review","safetyEquipment":"Missing","notes":"Demo exception: safety equipment missing; follow-up required."}'::jsonb, '[]'::jsonb, '[]'::jsonb, 28.5678, 77.2434, 12.0, date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '10 hours'),
  ('d0520000-0000-4000-8000-000000000003', 'd0530000-0000-4000-8000-000000000003', 'd0500000-0000-4000-8000-000000000006', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0510000-0000-4000-8000-000000000006', '{"buildingCondition":"Good","attendanceRegister":"Needs review","beneficiaryRecords":"Verified","safetyEquipment":"Available","notes":"Demo inspection from earlier this week; attendance register follow-up noted."}'::jsonb, '[]'::jsonb, '[]'::jsonb, 28.5851, 77.3111, 10.0, now() - interval '2 days', now() - interval '2 days'),
  ('d0520000-0000-4000-8000-000000000004', 'd0530000-0000-4000-8000-000000000004', 'd0500000-0000-4000-8000-000000000005', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0510000-0000-4000-8000-000000000005', '{"buildingCondition":"Good","attendanceRegister":"Available","beneficiaryRecords":"Verified","safetyEquipment":"Available","notes":"Demo inspection records are complete."}'::jsonb, '[]'::jsonb, '[]'::jsonb, 28.6735, 77.2891, 7.0, now() - interval '1 day', now() - interval '1 day'),
  ('d0520000-0000-4000-8000-000000000005', 'd0530000-0000-4000-8000-000000000005', 'd0500000-0000-4000-8000-000000000004', '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9', 'd0510000-0000-4000-8000-000000000004', '{"buildingCondition":"Needs attention","attendanceRegister":"Needs review","beneficiaryRecords":"Needs review","safetyEquipment":"Missing","notes":"Demo report requires an official follow-up review."}'::jsonb, '[]'::jsonb, '[]'::jsonb, 28.5922, 77.0461, 9.0, now() - interval '3 days', now() - interval '3 days')
ON CONFLICT ("id") DO UPDATE SET
  "clientSubmissionId" = EXCLUDED."clientSubmissionId",
  "instituteId" = EXCLUDED."instituteId",
  "inspectorId" = EXCLUDED."inspectorId",
  "assignmentId" = EXCLUDED."assignmentId",
  "checklistResponses" = EXCLUDED."checklistResponses",
  "photos" = EXCLUDED."photos",
  "videos" = EXCLUDED."videos",
  "gpsLat" = EXCLUDED."gpsLat",
  "gpsLng" = EXCLUDED."gpsLng",
  "gpsAccuracyMeters" = EXCLUDED."gpsAccuracyMeters",
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = now();

COMMIT;
