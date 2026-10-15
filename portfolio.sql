CREATE DATABASE IF NOT EXISTS portfolio_db;
USE portfolio_db;

-- =====================
-- Admin Table
-- =====================

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- No default admin row is seeded here on purpose.
-- After importing this file, open /admin/create_admin.php once in your
-- browser to create your admin account with a properly hashed password,
-- then delete that file.

-- =====================
-- Projects
-- =====================

CREATE TABLE projects(
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    github VARCHAR(255),
    live_demo VARCHAR(255),
    technologies VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- Contact
-- =====================

CREATE TABLE contacts(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- Skills
-- =====================

CREATE TABLE skills(
    id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100),
    percentage INT,
    category VARCHAR(100)
);

-- =====================
-- Education
-- =====================

CREATE TABLE education(
    id INT AUTO_INCREMENT PRIMARY KEY,
    degree VARCHAR(255),
    institution VARCHAR(255),
    duration VARCHAR(100),
    description TEXT
);

-- =====================
-- Experience
-- =====================

CREATE TABLE experience(
    id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(255),
    position VARCHAR(255),
    duration VARCHAR(100),
    description TEXT
);

-- =====================
-- Social Links
-- =====================

CREATE TABLE social_links(
    id INT AUTO_INCREMENT PRIMARY KEY,
    github VARCHAR(255),
    linkedin VARCHAR(255),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    twitter VARCHAR(255)
);