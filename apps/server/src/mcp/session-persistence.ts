/**
 * Session persistence for MCP server
 * Stores session data to survive server restarts
 */
import * as fs from 'fs';
import * as path from 'path';
import { mkdirSync } from 'fs';
import { homedir } from 'os';

// Store sessions in user's home directory
const SESSION_DIR = path.join(homedir(), '.felix', 'sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR, { recursive: true });
}

export interface PersistedSession {
  sessionId: string;
  lastProject?: string;
  createdAt: string;
  lastActivity: string;
}

/**
 * Save session data to file
 */
export function saveSession(sessionId: string, lastProject?: string): void {
  try {
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    const data: PersistedSession = {
      sessionId,
      lastProject,
      createdAt: fs.existsSync(sessionFile)
        ? JSON.parse(fs.readFileSync(sessionFile, 'utf-8')).createdAt
        : new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to save session ${sessionId}:`, error);
  }
}

/**
 * Load session data from file
 */
export function loadSession(sessionId: string): PersistedSession | null {
  try {
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      const content = fs.readFileSync(sessionFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error);
  }
  return null;
}

/**
 * Clean up old sessions (older than 7 days)
 */
export function cleanupOldSessions(): void {
  try {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    const files = fs.readdirSync(SESSION_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SESSION_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old session: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
  }
}