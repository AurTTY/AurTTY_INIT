import fs from 'fs';
import path from 'path';
import { ProjectConfig } from '../types';

const CONFIG_FILE = path.join(process.cwd(), '.spring-init.json');

export function loadConfig(): Partial<ProjectConfig> | null {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveConfig(projectPath: string, config: Partial<ProjectConfig>): void {
  const configFile = path.join(projectPath, '.spring-init.json');
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}