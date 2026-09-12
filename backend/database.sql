-- ============================================================
-- DIGITAL JOURNAL COMPLETE RELATIONAL DATABASE SCHEMA & SEED DATA
-- Database Name: `digital_journal_db` (compatible with MySQL / MariaDB / XAMPP)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `digital_journal_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `digital_journal_db`;

-- ------------------------------------------------------------
-- 1. Authors Table
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `article_sections`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `subcategories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `authors`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `newsletter_subscribers`;

CREATE TABLE `authors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT '/author_woman.jpg',
  `bio` TEXT NULL,
  `role` VARCHAR(100) DEFAULT 'Associate Editor',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Users Table
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'local',
  `google_id` VARCHAR(255) NULL,
  `role` ENUM('user', 'editor', 'admin') DEFAULT 'user',
  `email_verified` BOOLEAN DEFAULT FALSE,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expires` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Categories Table
-- ------------------------------------------------------------
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Subcategories Table
-- ------------------------------------------------------------
CREATE TABLE `subcategories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Articles Table
-- ------------------------------------------------------------
CREATE TABLE `articles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NULL,
  `subcategory_id` INT NULL,
  `author_id` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `image_caption` VARCHAR(500) NULL,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `is_editors_pick` BOOLEAN DEFAULT FALSE,
  `published_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Article Sections / Paragraphs Table
-- ------------------------------------------------------------
CREATE TABLE `article_sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `article_id` INT NOT NULL,
  `section_order` INT DEFAULT 1,
  `heading` VARCHAR(255) NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Newsletter Subscribers Table
-- ------------------------------------------------------------
CREATE TABLE `newsletter_subscribers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NULL,
  `company_name` VARCHAR(150) NULL,
  `subscribed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- INITIAL SEED DATA FOR DIGITAL JOURNAL
-- ============================================================

-- Seed Authors
INSERT INTO `authors` (`id`, `name`, `avatar`, `bio`, `role`) VALUES
(1, 'Jennifer Friesen', '/author_woman.jpg', 'Jennifer Friesen is Digital Journal\'s associate editor and Calgary Bureau lead.', 'Associate Editor'),
(2, 'Pramod Jain', '/author_bluesuit.jpg', 'Pramod Jain reports on global supply chains, logistics telemetry, and enterprise cloud migrations.', 'Senior Reporter'),
(3, 'Chris Hogg', '/author_beard.jpg', 'Chris Hogg is an executive editor specializing in digital transformation and financial technology.', 'Executive Editor'),
(4, 'April Hicke', '/author_glasses.jpg', 'April Hicke reports on biotechnology, scientific research, and open science initiatives.', 'Tech Analyst'),
(5, 'David Potter', '/author_bluesuit.jpg', 'David Potter focuses on software architecture, DevOps tooling, and developer metrics.', 'Senior Columnist');

-- Seed Users
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `provider`, `role`, `email_verified`) VALUES
(1, 'Admin User', 'admin@digitaljournal.com', '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu', 'local', 'admin', 1),
(2, 'Rushdhi Riyaj', 'rushdhiriyaj2005@gmail.com', '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu', 'local', 'admin', 1);

-- Seed Categories
INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
(1, 'News', 'news'),
(2, 'Business', 'business'),
(3, 'Industry Insights', 'industry-insights'),
(4, 'Technology', 'technology'),
(5, 'Innovation', 'innovation'),
(6, 'Events', 'events');

-- Seed Subcategories
INSERT INTO `subcategories` (`id`, `category_id`, `name`, `slug`) VALUES
(1, 1, 'World', 'world'),
(2, 1, 'Markets', 'markets'),
(3, 1, 'Politics', 'politics'),
(4, 2, 'Corporate Strategy', 'corporate-strategy'),
(5, 2, 'Youth & Employment', 'youth-employment'),
(6, 3, 'Venture Capital', 'venture-capital'),
(7, 3, 'Remote Leadership', 'remote-leadership'),
(8, 3, 'Logistics & Supply Chain', 'logistics'),
(9, 4, 'Semiconductors', 'semiconductors'),
(10, 4, 'Quantum Computing', 'quantum'),
(11, 4, 'Cybersecurity', 'cybersecurity');

-- Seed Articles
INSERT INTO `articles` (`id`, `category_id`, `subcategory_id`, `author_id`, `title`, `slug`, `description`, `image_url`, `image_caption`, `is_featured`, `is_editors_pick`, `published_at`) VALUES
(1, 1, 1, 1, 'Airbus puts a price on Canadian jet fuel security', 'airbus-puts-a-price-on-canadian-jet-fuel-security', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel procurement.', 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&h=750&fit=crop', 'AF truck at Airbus Canada. — Photo courtesy of Airbus', 1, 1, '2026-07-22 18:08:00'),

(2, 3, 6, 1, 'Venture capital firms shift focus to sustainable tech sector pipelines', 'venture-capital-firms-shift-focus-to-sustainable-tech-sector-pipelines', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing.', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=750&fit=crop', 'Venture capital partners evaluate sustainable infrastructure portfolios. (AFP/File)', 1, 1, '2026-07-22 16:30:00'),

(3, 3, 7, 1, 'How remote leadership models are evolving to meet product goals', 'how-remote-leadership-models-are-evolving-to-meet-product-goals', 'Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows.', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop', 'Distributed engineering teams synchronize async product roadmaps. (Photo courtesy of Digital Journal)', 0, 1, '2026-07-21 14:15:00'),

(4, 3, 8, 2, 'Global logistics platforms integrate machine learning for routing', 'global-logistics-platforms-integrate-machine-learning-for-routing', 'Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms.', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=750&fit=crop', 'Automated distribution nodes optimize real-time transit routing schedules. (AFP/File)', 0, 0, '2026-07-20 11:45:00'),

(5, 4, 9, 5, 'Silicon Valley chip manufacturers announce breakthrough architectural updates', 'silicon-valley-chip-manufacturers-announce-breakthrough-architectural-updates', 'Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop', 'Semiconductor wafer design features 2nm gate-all-around transistor architecture. (AFP/File)', 1, 1, '2026-07-22 11:20:00');

-- Seed Article Sections
INSERT INTO `article_sections` (`article_id`, `section_order`, `heading`, `content`) VALUES
(1, 1, '', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel (SAF) procurement and local infrastructure reliability.'),
(1, 2, 'Infrastructure & Energy Compliance', 'Industry stakeholders are coordinating with federal energy regulators to ensure supply security across major hubs in Montreal and Toronto.'),
(2, 1, '', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing and clean technology hardware pipelines.'),
(2, 2, 'Capital Allocation Shifts', 'Investors are prioritizing startups demonstrating verifiable carbon offset metrics and low-power silicon design.'),
(3, 1, '', 'Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows.'),
(3, 2, 'Asynchronous Coordination & Governance', 'Modern product teams rely on standardized architecture decision records (ADRs) and automated pull-request validation pipelines.'),
(4, 1, '', 'Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms to dynamically reroute cargo shipments.'),
(5, 1, '', 'Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures, promising a 30% reduction in chip power consumption.');

-- Seed Newsletter Subscribers
INSERT INTO `newsletter_subscribers` (`email`, `first_name`, `last_name`, `company_name`) VALUES
('reader@digitaljournal.com', 'John', 'Doe', 'TechCorp'),
('rushdhiriyaj2005@gmail.com', 'Rushdhi', 'Riyaj', 'Digital Journal');
