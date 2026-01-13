export type BackendLang = 'TypeScript' | 'JavaScript';
export type FrontendType = 'vanilla' | 'vue' | 'next' | 'angular' | 'react' | 'svelte' | 'none';
export type ArchitectureType = 'mvc' | 'clean' | 'layered' | 'modular' | 'microservices';
export type DatabaseType = 'none' | 'postgres' | 'mysql' | 'mongodb' | 'sqlite';
export type TestFramework = 'jest' | 'vitest' | 'mocha';
export type ProfileType = 'startup' | 'enterprise' | 'microservice';

export const FRONTEND_PORTS: Record<FrontendType, string> = {
  vanilla: '8080',
  vue: '5173',
  react: '5173',
  next: '3000',
  angular: '4200',
  svelte: '5173',
  none: '0'
};

export interface ProjectConfig {
  name: string;
  description: string;
  backendLang: BackendLang;
  frontend: FrontendType;
  architecture: ArchitectureType;
  database: DatabaseType;
  port: string;
  features: string[];
  gitInit: boolean;
  gitHubRepo?: string;
  installDeps: boolean;
  runAfterCreate?: string[];
  frontendFeatures?: string[];
  connectToBackend: boolean;
  docker: boolean;
  ci: boolean;
  profile?: ProfileType;
}