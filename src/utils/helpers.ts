import { ProjectConfig } from '../types';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export function validateProjectName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export function getDefaultConfig(): Partial<ProjectConfig> {
  return {
    backendLang: 'TypeScript',
    frontend: 'none',
    architecture: 'mvc',
    database: 'none',
    port: '3000',
    features: [],
    gitInit: false,
    installDeps: true,
    connectToBackend: false,
    docker: false,
    ci: false
  };
}

export function mergeConfigs(base: Partial<ProjectConfig>, override: Partial<ProjectConfig>): ProjectConfig {
  return { ...base, ...override } as ProjectConfig;
}

export async function checkDependencies(): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync('node --version');
    await execAsync('npm --version');
    return { success: true, message: 'Dependencies check passed' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function installDependencies(projectPath: string): Promise<void> {
  await execAsync('npm install', { cwd: projectPath });
}

export async function setupGitRepository(projectPath: string): Promise<void> {
  try {
    await execAsync('git init', { cwd: projectPath });
    await execAsync('git add .', { cwd: projectPath });
    await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
  } catch (error) {
    console.warn('Git repository initialized but commit failed. Please configure git user and commit manually.');
  }
}

export async function cloneRepository(url: string, targetPath: string): Promise<void> {
  await execAsync(`git clone ${url} ${targetPath}`);
}