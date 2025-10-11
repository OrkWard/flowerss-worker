DROP TABLE IF EXISTS source;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS user_preference;
DROP TABLE IF EXISTS subscribe;

CREATE TABLE source (
  id INTEGER PRIMARY KEY,
  title TEXT,
  link TEXT NOT NULL,
  error_count INTEGER NOT NULL,
  create_at DATE NOT NULL,
  update_at DATE NOT NULL
);

CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  identifier_id TEXT NOT NULL,
  first_name TEXT NOT NULL
);

CREATE TABLE user_preference (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  activate BOOLEAN,
  frequency INTEGER,
  FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE subscribe (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user (id),
  FOREIGN KEY (source_id) REFERENCES source (id)
);
INSERT INTO user (identifier_id, first_name) VALUES (
  '1463278815', 'first_name'
);
