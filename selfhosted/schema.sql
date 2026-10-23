CREATE DATABASE IF NOT EXISTS shutter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shutter;

CREATE TABLE IF NOT EXISTS media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('image','video','audio','doc') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  thumb_path VARCHAR(512) NULL,
  mime VARCHAR(160) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration DOUBLE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_media_created_at (created_at, id),
  INDEX idx_media_type (type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  INDEX idx_tags_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS media_tags (
  media_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (media_id, tag_id),
  INDEX idx_media_tags_tag_media (tag_id, media_id),
  CONSTRAINT fk_media_tags_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;
