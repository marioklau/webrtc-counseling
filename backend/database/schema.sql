-- Disable foreign key checks for easier cleanup
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if they exist (Reset)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS psychologist_categories;
DROP TABLE IF EXISTS psychologists;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS clients;

SET FOREIGN_KEY_CHECKS = 1;

CREATE DATABASE IF NOT EXISTS counseling_db;
USE counseling_db;

-- =============================================
-- CATEGORIES TABLE (Master data for complaints/specialties)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,       -- Display name (Indonesian)
    name_en VARCHAR(100),                     -- English name (optional)
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Categories
INSERT INTO categories (name, name_en, description) VALUES 
('Kecemasan', 'Anxiety', 'Gangguan kecemasan, panik, kekhawatiran berlebihan'),
('Depresi', 'Depression', 'Gangguan mood, perasaan sedih berkepanjangan'),
('Masalah Keluarga', 'Family Issues', 'Konflik keluarga, hubungan orang tua-anak'),
('Stress Pekerjaan', 'Work Stress', 'Burnout, tekanan kerja, masalah karir'),
('Trauma', 'Trauma/PTSD', 'Trauma masa lalu, PTSD, penyalahgunaan'),
('Pengembangan Diri', 'Self Development', 'Coaching, pengembangan potensi diri'),
('Hubungan Romantis', 'Relationship', 'Masalah pacaran, pernikahan, perceraian'),
('Lainnya', 'Other', 'Masalah lain yang tidak tercantum');

-- =============================================
-- PSYCHOLOGISTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS psychologists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PSYCHOLOGIST_CATEGORIES (Many-to-Many Junction)
-- Links psychologists to their specialties
-- =============================================
CREATE TABLE IF NOT EXISTS psychologist_categories (
    psychologist_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (psychologist_id, category_id),
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- =============================================
-- PSYCHOLOGIST_SCHEDULES
-- =============================================
CREATE TABLE IF NOT EXISTS psychologist_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    psychologist_id INT NOT NULL,
    day_of_week INT NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(id) ON DELETE CASCADE
);

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOKINGS TABLE (Now references category_id)
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_contact VARCHAR(100),
    category_id INT NOT NULL,                 -- References categories table
    complaint TEXT,                           -- Additional details from client
    psychologist_id INT NOT NULL,
    schedule_time DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    room_id VARCHAR(100),
    session_notes TEXT,
    chat_history TEXT,
    session_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Psychologists
INSERT INTO psychologists (name, email, password_hash, bio) VALUES 
('Dr. Budi Santoso', 'budi@example.com', 'password123', 'Senior Psychologist with 10 years experience in anxiety and stress management.'),
('Siti Aminah, M.Psi', 'siti@example.com', 'password123', 'Specializing in depression, youth and family counseling.');

-- Link Psychologists to Categories
-- Dr. Budi: Kecemasan (1), Stress Pekerjaan (4)
INSERT INTO psychologist_categories (psychologist_id, category_id) VALUES 
(1, 1), -- Budi - Kecemasan
(1, 4); -- Budi - Stress Pekerjaan

-- Siti: Depresi (2), Masalah Keluarga (3), Hubungan Romantis (7)
INSERT INTO psychologist_categories (psychologist_id, category_id) VALUES 
(2, 2), -- Siti - Depresi
(2, 3), -- Siti - Masalah Keluarga
(2, 7); -- Siti - Hubungan Romantis

-- Seed Client
INSERT INTO clients (email, password_hash) VALUES 
('test@email.com', 'dummy123');
