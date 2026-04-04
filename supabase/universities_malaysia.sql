-- ============================================================
-- Master Data: Universities in Malaysia
-- Source: Wikipedia - List of universities in Malaysia
-- ============================================================

create table if not exists universities (
  id          serial primary key,
  name        text not null,
  short_name  text,
  type        text not null check (type in ('public', 'private', 'branch_campus', 'university_college')),
  state       text,
  is_active   boolean not null default true
);

create index if not exists idx_universities_name on universities(name);
create index if not exists idx_universities_type on universities(type);

-- RLS
alter table universities enable row level security;
create policy "public read universities" on universities for select using (true);
create policy "admin manage universities" on universities for all using (is_admin());

-- ============================================================
-- SEED DATA
-- ============================================================

insert into universities (name, short_name, type, state) values

-- ============================================================
-- PUBLIC UNIVERSITIES
-- ============================================================

-- Research Universities
('Universiti Malaya', 'UM', 'public', 'Kuala Lumpur'),
('Universiti Sains Malaysia', 'USM', 'public', 'Pulau Pinang'),
('Universiti Kebangsaan Malaysia', 'UKM', 'public', 'Selangor'),
('Universiti Putra Malaysia', 'UPM', 'public', 'Selangor'),
('Universiti Teknologi Malaysia', 'UTM', 'public', 'Johor'),

-- Comprehensive Universities
('Universiti Teknologi MARA', 'UiTM', 'public', 'Selangor'),
('Universiti Malaysia Sabah', 'UMS', 'public', 'Sabah'),
('Universiti Malaysia Sarawak', 'UNIMAS', 'public', 'Sarawak'),

-- Focused Universities
('Universiti Pendidikan Sultan Idris', 'UPSI', 'public', 'Perak'),
('Universiti Malaysia Terengganu', 'UMT', 'public', 'Terengganu'),
('Universiti Pertahanan Nasional Malaysia', 'UPNM', 'public', 'Kuala Lumpur'),
('Universiti Utara Malaysia', 'UUM', 'public', 'Kedah'),
('Universiti Malaysia Kelantan', 'UMK', 'public', 'Kelantan'),

-- Technical Universities
('Universiti Malaysia Pahang Al-Sultan Abdullah', 'UMP', 'public', 'Pahang'),
('Universiti Malaysia Perlis', 'UniMAP', 'public', 'Perlis'),
('Universiti Tun Hussein Onn Malaysia', 'UTHM', 'public', 'Johor'),
('Universiti Teknikal Malaysia Melaka', 'UTeM', 'public', 'Melaka'),

-- Islamic Universities
('Universiti Islam Antarabangsa Malaysia', 'UIAM', 'public', 'Selangor'),
('Universiti Sains Islam Malaysia', 'USIM', 'public', 'Negeri Sembilan'),
('Universiti Sultan Zainal Abidin', 'UniSZA', 'public', 'Terengganu'),

-- ============================================================
-- PRIVATE UNIVERSITIES
-- ============================================================

('AIMST University', 'AIMST', 'private', 'Kedah'),
('Al-Madinah International University', 'MEDIU', 'private', 'Selangor'),
('Asia e University', 'AeU', 'private', 'Kuala Lumpur'),
('Asia Metropolitan University', 'AMU', 'private', 'Kuala Lumpur'),
('Asia Pacific University of Technology & Innovation', 'APU', 'private', 'Selangor'),
('Albukhary International University', 'AIU', 'private', 'Kedah'),
('Binary University', NULL, 'private', 'Selangor'),
('City University Malaysia', 'CityU', 'private', 'Selangor'),
('DRB-HICOM University of Automotive Malaysia', 'DHUAM', 'private', 'Pahang'),
('GlobalNxt University', 'GNU', 'private', 'Kuala Lumpur'),
('HELP University', 'HELP', 'private', 'Kuala Lumpur'),
('Infrastructure University Kuala Lumpur', 'IUKL', 'private', 'Selangor'),
('International Medical University', 'IMU', 'private', 'Selangor'),
('INTI International University', 'INTI', 'private', 'Negeri Sembilan'),
('Islamic University of Malaysia', 'UIM', 'private', 'Selangor'),
('Limkokwing University of Creative Technology', 'LUCT', 'private', 'Selangor'),
('MAHSA University', 'MAHSA', 'private', 'Selangor'),
('Malaysia University of Science and Technology', 'MUST', 'private', 'Selangor'),
('Management & Science University', 'MSU', 'private', 'Selangor'),
('Manipal International University', 'MIU', 'private', 'Negeri Sembilan'),
('Multimedia University', 'MMU', 'private', 'Selangor'),
('Nilai University', NULL, 'private', 'Negeri Sembilan'),
('Open University Malaysia', 'OUM', 'private', 'Kuala Lumpur'),
('Perdana University', 'PU', 'private', 'Kuala Lumpur'),
('Quest International University', 'QIU', 'private', 'Perak'),
('Raffles University', NULL, 'private', 'Johor'),
('SEGi University', 'SEGi', 'private', 'Selangor'),
('Sultan Abdul Halim Mu''adzam Shah International Islamic University', 'UniSHAMS', 'private', 'Kedah'),
('Sultan Azlan Shah University', 'USAS', 'private', 'Perak'),
('Sunway University', 'Sun-U', 'private', 'Selangor'),
('Taylor''s University', NULL, 'private', 'Selangor'),
('Tunku Abdul Rahman University of Management and Technology', 'TARUMT', 'private', 'Kuala Lumpur'),
('Tun Abdul Razak University', 'UNIRAZAK', 'private', 'Kuala Lumpur'),
('UCSI University', 'UCSI', 'private', 'Kuala Lumpur'),
('UNITAR International University', 'UNITAR', 'private', 'Selangor'),
('Universiti Kuala Lumpur', 'UniKL', 'private', 'Kuala Lumpur'),
('Universiti Poly-Tech Malaysia', 'UPTM', 'private', 'Kuala Lumpur'),
('Universiti Teknologi PETRONAS', 'UTP', 'private', 'Perak'),
('Universiti Tenaga Nasional', 'UNITEN', 'private', 'Selangor'),
('Universiti Tunku Abdul Rahman', 'UTAR', 'private', 'Selangor'),
('University Malaysia of Computer Science & Engineering', 'UniMy', 'private', 'Selangor'),
('University of Cyberjaya', 'UoC', 'private', 'Selangor'),
('University of Selangor', 'UNISEL', 'private', 'Selangor'),
('University of Technology Sarawak', 'UTS', 'private', 'Sarawak'),
('Wawasan Open University', 'WOU', 'private', 'Pulau Pinang'),

-- ============================================================
-- FOREIGN BRANCH CAMPUSES
-- ============================================================

('Curtin University Malaysia', 'Curtin Malaysia', 'branch_campus', 'Sarawak'),
('Heriot-Watt University Malaysia', 'HWUM', 'branch_campus', 'Putrajaya'),
('Monash University Malaysia', NULL, 'branch_campus', 'Selangor'),
('Newcastle University Medicine Malaysia', 'NUMed', 'branch_campus', 'Johor'),
('RCSI & UCD Malaysia Campus', 'RUMC', 'branch_campus', 'Pulau Pinang'),
('Swinburne University of Technology Sarawak Campus', NULL, 'branch_campus', 'Sarawak'),
('University of Nottingham Malaysia', 'UNMC', 'branch_campus', 'Selangor'),
('University of Reading Malaysia', 'UoRM', 'branch_campus', 'Johor'),
('University of Southampton Malaysia', 'USMC', 'branch_campus', 'Johor'),
('University of Wollongong Malaysia', 'UOW Malaysia', 'branch_campus', 'Selangor'),
('Xiamen University Malaysia', 'XMUMC', 'branch_campus', 'Selangor'),

-- ============================================================
-- UNIVERSITY COLLEGES
-- ============================================================

('Berjaya University College', NULL, 'university_college', 'Kuala Lumpur'),
('First City University College', NULL, 'university_college', 'Selangor'),
('Han Chiang University College of Communication', NULL, 'university_college', 'Pulau Pinang'),
('International Islamic University College Selangor', 'KUIS', 'university_college', 'Selangor'),
('IJN University College', 'IJNUC', 'university_college', 'Kuala Lumpur'),
('Jesselton University College', 'JUC', 'university_college', 'Sabah'),
('Kuala Lumpur Metropolitan University College', 'KLMUC', 'university_college', 'Kuala Lumpur'),
('Lincoln University College', 'LUC', 'university_college', 'Selangor'),
('Linton University College', NULL, 'university_college', 'Negeri Sembilan'),
('New Era University College', 'NEUC', 'university_college', 'Selangor'),
('Saito University College', NULL, 'university_college', 'Selangor'),
('Southern University College', NULL, 'university_college', 'Johor'),
('TATI University College', 'UC TATI', 'university_college', 'Terengganu'),
('Twintech International University College of Technology', NULL, 'university_college', 'Kuala Lumpur'),
('University College of Islam Melaka', 'KUIM', 'university_college', 'Melaka'),
('University College Sabah Foundation', 'UCSF', 'university_college', 'Sabah'),
('Widad University College', NULL, 'university_college', 'Pahang');
