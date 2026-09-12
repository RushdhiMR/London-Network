-- ============================================================
-- DIGITAL JOURNAL COMPLETE RELATIONAL DATABASE SCHEMA & DATA
-- Compatible with XAMPP / phpMyAdmin / MySQL 5.7+ / MariaDB
-- Database Name: `digital_journal_db`
-- ============================================================

CREATE DATABASE IF NOT EXISTS `digital_journal_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `digital_journal_db`;

-- ------------------------------------------------------------
-- Reset foreign keys for clean table creation
-- ------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `article_sections`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `subcategories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `authors`;
DROP TABLE IF EXISTS `deleted_users`;
DROP TABLE IF EXISTS `newsletter_subscribers`;
DROP TABLE IF EXISTS `ad_slots`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 1. Users Table (Authentication, Admins, Writers & Readers)
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'local',
  `google_id` VARCHAR(255) NULL,
  `role` ENUM('reader', 'writer', 'admin') DEFAULT 'reader',
  `email_verified` TINYINT(1) DEFAULT 1,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expires` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Deleted Users / Blacklist Table
-- ------------------------------------------------------------
CREATE TABLE `deleted_users` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `deleted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Authors Table (Editorial Writers & Staff)
-- ------------------------------------------------------------
CREATE TABLE `authors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `avatar` VARCHAR(500) DEFAULT '/author_woman.jpg',
  `bio` TEXT NULL,
  `role` VARCHAR(100) DEFAULT 'Associate Editor',
  `linkedin` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Categories Table
-- ------------------------------------------------------------
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Subcategories Table
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
-- 6. Articles Table (Full Live & Historical News Feed)
-- ------------------------------------------------------------
CREATE TABLE `articles` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NULL,
  `subcategory_id` INT NULL,
  `author_id` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `summary` TEXT NULL,
  `content` LONGTEXT NULL,
  `image_url` VARCHAR(1000) NULL,
  `image_caption` VARCHAR(500) NULL,
  `status` ENUM('Published', 'Pending review', 'Draft', 'Trash', 'Rejected') DEFAULT 'Published',
  `placement` VARCHAR(100) DEFAULT 'Standard Post',
  `subcategories` TEXT NULL,
  `tags` TEXT NULL,
  `read_duration` VARCHAR(50) DEFAULT '4 MIN READ',
  `reads_count` INT DEFAULT 0,
  `author_name` VARCHAR(150) NULL,
  `author_email` VARCHAR(150) NULL,
  `author_avatar` VARCHAR(1000) NULL,
  `author_bio` TEXT NULL,
  `seo` LONGTEXT NULL,
  `is_featured` TINYINT(1) DEFAULT 0,
  `is_editors_pick` TINYINT(1) DEFAULT 0,
  `published_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Article Sections / Paragraphs Table
-- ------------------------------------------------------------
CREATE TABLE `article_sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `article_id` BIGINT NOT NULL,
  `section_order` INT DEFAULT 1,
  `heading` VARCHAR(255) NULL,
  `content` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Newsletter Subscribers Table
-- ------------------------------------------------------------
CREATE TABLE `newsletter_subscribers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NULL,
  `company_name` VARCHAR(150) NULL,
  `topics` VARCHAR(255) DEFAULT 'ALL NEWS',
  `status` VARCHAR(50) DEFAULT 'Active',
  `subscribed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Advertisement Slots Table
-- ------------------------------------------------------------
CREATE TABLE `ad_slots` (
  `id` VARCHAR(50) PRIMARY KEY,
  `dimensions` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `category_group` VARCHAR(50) NOT NULL,
  `image_url` VARCHAR(1000) NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `target_url` VARCHAR(1000) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

-- 1. Users (Admins, Writers, Readers)
-- Passwords for seed users: admin123 (Admin) / writer123 (Writer) / reader123 (Reader)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `provider`, `role`, `email_verified`) VALUES
(1, 'Admin User', 'admin@digitaljournal.com', '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu', 'local', 'admin', 1),
(2, 'Rushdhi MR', 'rushdhiriyaj2005@gmail.com', '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu', 'local', 'admin', 1),
(3, 'Staff Writer', 'writer@digitaljournal.com', '$2b$10$dkrirLKY5h3BnVy917SgwuTjOvmbzoN5m0.v3uqCJJTnLjz0X7ks2', 'local', 'writer', 1),
(4, 'Alex Reader', 'reader@digitaljournal.com', '$2b$10$1Flzxia.PWNbYTF9265/h.jlnZMSXRJyMOQb1TgK0ERKl6e3gMOPO', 'local', 'reader', 1);

-- 2. Authors
INSERT INTO `authors` (`id`, `name`, `avatar`, `bio`, `role`) VALUES
(1, 'Jennifer Friesen', '/author_woman.jpg', 'Jennifer Friesen is Digital Journal\'s associate editor and Calgary Bureau lead.', 'Associate Editor'),
(2, 'Pramod Jain', '/author_bluesuit.jpg', 'Pramod Jain reports on global supply chains, logistics telemetry, and enterprise cloud migrations.', 'Senior Reporter'),
(3, 'Chris Hogg', '/author_beard.jpg', 'Chris Hogg is an executive editor specializing in digital transformation and financial technology.', 'Executive Editor'),
(4, 'April Hicke', '/author_glasses.jpg', 'April Hicke reports on biotechnology, scientific research, and open science initiatives.', 'Tech Analyst'),
(5, 'David Potter', '/author_bluesuit.jpg', 'David Potter focuses on software architecture, DevOps tooling, and developer metrics.', 'Senior Columnist');

-- 3. Categories
INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
(1, 'News', 'news'),
(2, 'Business', 'business'),
(3, 'Industry Insights', 'industry-insights'),
(4, 'Technology', 'technology'),
(5, 'Innovation', 'innovation'),
(6, 'Events', 'events');

-- 4. Subcategories
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

-- 5. Articles
INSERT INTO `articles` (`id`, `category_id`, `subcategory_id`, `author_id`, `title`, `slug`, `description`, `summary`, `content`, `image_url`, `image_caption`, `status`, `placement`, `read_duration`, `author_name`, `author_email`, `author_avatar`, `author_bio`, `is_featured`, `is_editors_pick`, `published_at`) VALUES
(1, 1, 1, 1, 'Airbus puts a price on Canadian jet fuel security', 'airbus-puts-a-price-on-canadian-jet-fuel-security', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel procurement and infrastructure reliability.', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel procurement.', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel (SAF) procurement and local infrastructure reliability across Montreal and Toronto aerospace corridors.', 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&h=750&fit=crop', 'AF truck at Airbus Canada. — Photo courtesy of Airbus', 'Published', 'Home Page A+ Section', '5 MIN READ', 'Jennifer Friesen', 'writer@digitaljournal.com', '/author_woman.jpg', 'Jennifer Friesen is Digital Journal\'s associate editor.', 1, 1, '2026-07-22 18:08:00'),
(2, 3, 6, 1, 'Venture capital firms shift focus to sustainable tech sector pipelines', 'venture-capital-firms-shift-focus-to-sustainable-tech-sector-pipelines', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing and clean energy.', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing.', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing, enterprise battery telemetry, and clean technology hardware pipelines.', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=750&fit=crop', 'Venture capital partners evaluate sustainable infrastructure portfolios.', 'Published', 'Home Page A+ Section 2', '4 MIN READ', 'Jennifer Friesen', 'writer@digitaljournal.com', '/author_woman.jpg', 'Jennifer Friesen is Digital Journal\'s associate editor.', 1, 1, '2026-07-22 16:30:00'),
(3, 3, 7, 1, 'How remote leadership models are evolving to meet product goals', 'how-remote-leadership-models-are-evolving-to-meet-product-goals', 'Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows.', 'Engineering leads and executive directors are overhauling synchronous management paradigms.', 'Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows, standardizing decision architectures.', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop', 'Distributed engineering teams synchronize async product roadmaps.', 'Published', 'Editor\'s Pick', '6 MIN READ', 'Jennifer Friesen', 'writer@digitaljournal.com', '/author_woman.jpg', 'Jennifer Friesen is Digital Journal\'s associate editor.', 0, 1, '2026-07-21 14:15:00'),
(4, 3, 8, 2, 'Global logistics platforms integrate machine learning for routing', 'global-logistics-platforms-integrate-machine-learning-for-routing', 'Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms to reduce fuel overhead.', 'Freight operators and global supply chain hubs deploy predictive algorithms.', 'Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms to dynamically reroute cargo shipments around congested maritime bottlenecks.', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=750&fit=crop', 'Automated distribution nodes optimize real-time transit routing schedules.', 'Published', 'Latest News Section', '3 MIN READ', 'Pramod Jain', 'writer@digitaljournal.com', '/author_bluesuit.jpg', 'Pramod Jain reports on global supply chains and cloud systems.', 0, 0, '2026-07-20 11:45:00'),
(5, 4, 9, 5, 'Silicon Valley chip manufacturers announce breakthrough architectural updates', 'silicon-valley-chip-manufacturers-announce-breakthrough-architectural-updates', 'Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures.', 'Leading semiconductor foundries unveil 2-nanometer ribbon architectures.', 'Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures, promising a 30% reduction in power consumption and higher processing density.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop', 'Semiconductor wafer design features 2nm gate-all-around transistor architecture.', 'Published', 'Home Page A+ Section', '5 MIN READ', 'David Potter', 'writer@digitaljournal.com', '/author_bluesuit.jpg', 'David Potter focuses on software architecture and developer tooling.', 1, 1, '2026-07-22 11:20:00');

-- 6. Article Sections
INSERT INTO `article_sections` (`article_id`, `section_order`, `heading`, `content`) VALUES
(1, 1, '', 'Airbus has signaled a strategic focus on Canadian jet fuel supply pipelines, evaluating sustainable aviation fuel (SAF) procurement and local infrastructure reliability.'),
(1, 2, 'Infrastructure & Energy Compliance', 'Industry stakeholders are coordinating with federal energy regulators to ensure supply security across major hubs in Montreal and Toronto.'),
(2, 1, '', 'Venture capital firms across North America are pivoting investment thesis parameters toward green computing and clean technology hardware pipelines.'),
(2, 2, 'Capital Allocation Shifts', 'Investors are prioritizing startups demonstrating verifiable carbon offset metrics and low-power silicon design.'),
(3, 1, '', 'Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows.'),
(3, 2, 'Asynchronous Coordination & Governance', 'Modern product teams rely on standardized architecture decision records (ADRs) and automated pull-request validation pipelines.'),
(4, 1, '', 'Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms to dynamically reroute cargo shipments.'),
(5, 1, '', 'Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures, promising a 30% reduction in chip power consumption.');

-- 7. Newsletter Subscribers
INSERT INTO `newsletter_subscribers` (`email`, `first_name`, `last_name`, `company_name`, `topics`, `status`) VALUES
('reader@digitaljournal.com', 'John', 'Doe', 'TechCorp', 'TECHNOLOGY, BUSINESS, MARKETS', 'Active'),
('rushdhiriyaj2005@gmail.com', 'Rushdhi', 'Riyaj', 'Digital Journal', 'ALL NEWS', 'Active'),
('sarah.j@example.com', 'Sarah', 'Jenkins', 'Apex Media', 'US, POLITICS, SPORTS', 'Active'),
('mchang@globalfirm.org', 'Michael', 'Chang', 'Global Financial', 'ECONOMY & MARKETS, BUSINESS, CRYPTO', 'Active');

-- 8. Ad Slots
INSERT INTO `ad_slots` (`id`, `dimensions`, `title`, `description`, `category_group`, `image_url`, `action_type`, `target_url`, `is_active`) VALUES
('slot-1', '728X250', 'Homepage — Mid Leaderboard Banner (Slot 2)', 'Full-width banner between Technology & Markets sections', 'HOMEPAGE', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=300&fit=crop', 'External Link (URL)', 'https://www.top-scholarships.com/', 1),
('slot-2', '728X250', 'Homepage — Bottom Leaderboard Banner (Slot 3)', 'Full-width banner between Lifestyle & Bottom Category Grid', 'HOMEPAGE', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop', 'External Link (URL)', 'https://www.amazon.com/', 1),
('slot-3', '300X250', 'Homepage — Business Section Top-Right Ad Box', 'Square 300x250 ad box inside the Business section top-right', 'HOMEPAGE', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=300&fit=crop', 'External Link (URL)', 'https://www.pepsi.com/', 1),
('slot-4', '300X250', 'Category Pages — Sidebar Top Ad Box', 'Right sidebar top box on Category news feeds', 'CATEGORY', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=300&fit=crop', 'External Link (URL)', 'https://www.nvidia.com/en-in/', 1),
('slot-5', '300X600', 'Category Pages — Sidebar Bottom Tall Ad Box', 'Vertical 300x600 tall skyscraper ad box on category sidebars', 'CATEGORY', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=300&fit=crop', 'External Link (URL)', 'https://www.tesla.com/', 1),
('slot-6', '300X250', 'Author Profile Pages — Sidebar Ad Box', 'Medium 300x250 sponsor box displayed on author profile pages', 'AUTHOR', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=300&fit=crop', 'External Link (URL)', 'https://in.louisvuitton.com/eng-in/homepage', 1);
