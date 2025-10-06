CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  weight REAL DEFAULT 1.0
);

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL REFERENCES graph_nodes(id),
  target TEXT NOT NULL REFERENCES graph_nodes(id),
  weight REAL
);

CREATE TABLE ingestion_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW active_jobs AS
SELECT id, status
FROM ingestion_jobs
WHERE status = 'running';

CREATE TRIGGER ensure_status CHECK
  WHEN NEW.status IS NULL
BEGIN
  SELECT RAISE(FAIL, 'status required');
END;
