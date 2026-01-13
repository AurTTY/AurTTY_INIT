import fs from 'fs/promises';
import path from 'path';
import { exec as _exec } from 'child_process';
import util from 'util';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { fileURLToPath } from 'url';

const exec = util.promisify(_exec);

// Obter __dirname em CommonJS
const __dirname = path.dirname(__filename);

// ========== TIPOS ==========

export type BackendLang = 'TypeScript' | 'JavaScript';
export type FrontendType = 'vanilla' | 'vue' | 'next' | 'angular' | 'react' | 'svelte' | 'none';
export type ArchitectureType = 'mvc' | 'clean' | 'layered' | 'modular' | 'microservices';
export type DatabaseType = 'none' | 'postgres' | 'mysql' | 'mongodb' | 'sqlite';
export type TestFramework = 'jest' | 'vitest' | 'mocha';
export type ProfileType = 'startup' | 'enterprise' | 'microservice';

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

export interface GeneratorOptions {
  config: ProjectConfig;
  spinner: Ora;
  projectPath: string;
}

// ========== CONSTANTES ==========

const DEFAULT_PORT = '3000';
const DEFAULT_FRONTEND_PORT = '8080';

const FRONTEND_PORTS: Record<FrontendType, string> = {
  vanilla: '8080',
  vue: '5173',
  react: '5173',
  next: '3000',
  angular: '4200',
  svelte: '5173',
  none: '0'
};

// ========== UTILITÁRIOS ==========

async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function copyTemplate(sourceDir: string, targetDir: string): Promise<void> {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', sourceDir);
    const targetPath = path.join(targetDir, path.basename(sourceDir));
    
    await fs.cp(templatePath, targetPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to copy template ${sourceDir}: ${error}`);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function pascalCase(str: string): string {
  const camel = kebabToCamel(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// ========== GERADOR DE BACKEND ==========

class BackendGenerator {
  constructor(private options: GeneratorOptions) {}

  async generate(): Promise<void> {
    const { config, spinner, projectPath } = this.options;
    const backendPath = path.join(projectPath, 'backend');
    
    spinner.text = chalk.cyan('Creating backend structure...');
    
    // Criar estrutura de diretórios
    await this.createDirectoryStructure(backendPath, config);
    
    // Criar package.json
    await this.createPackageJson(backendPath, config);
    
    // Criar arquivos de configuração
    await this.createConfigFiles(backendPath, config);
    
    // Criar arquivos de código
    await this.createSourceFiles(backendPath, config);
    
    // Criar testes
    if (config.features.includes('testing')) {
      await this.createTests(backendPath, config);
    }
    
    // Criar Docker config
    if (config.docker) {
      await this.createDockerFiles(backendPath, config);
    }
    
    spinner.succeed(chalk.green('Backend structure created!'));
  }

  private async createDirectoryStructure(backendPath: string, config: ProjectConfig): Promise<void> {
    const dirs = [
      'src',
      'src/controllers',
      'src/services',
      'src/models',
      'src/routes',
      'src/middlewares',
      'src/config',
      'src/utils',
      'src/dtos',
      'src/interfaces',
      'src/repositories',
      'src/validators',
      'tests',
      'tests/unit',
      'tests/integration',
      'logs',
      'docs'
    ];

    if (config.architecture === 'clean') {
      dirs.push(
        'src/application',
        'src/domain',
        'src/infrastructure'
      );
    }

    for (const dir of dirs) {
      await fs.mkdir(path.join(backendPath, dir), { recursive: true });
    }
  }

  private async createPackageJson(backendPath: string, config: ProjectConfig): Promise<void> {
    const packageJson = {
      name: `${config.name}-backend`,
      version: '1.0.0',
      description: config.description,
      main: config.backendLang === 'TypeScript' ? 'dist/server.js' : 'src/server.js',
      scripts: this.getPackageScripts(config),
      dependencies: this.getDependencies(config),
      devDependencies: this.getDevDependencies(config),
      keywords: ['api', 'backend', 'rest', 'nodejs', config.backendLang],
      author: '',
      license: 'MIT',
      engines: {
        node: '>=16.0.0'
      }
    };

    await writeFileSafe(
      path.join(backendPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private getPackageScripts(config: ProjectConfig): Record<string, string> {
    const scripts: Record<string, string> = {
      start: config.backendLang === 'TypeScript' ? 'node dist/server.js' : 'node src/server.js',
      dev: config.backendLang === 'TypeScript' ? 'ts-node src/server.ts' : 'nodemon src/server.js'
    };

    if (config.backendLang === 'TypeScript') {
      scripts.build = 'tsc';
      scripts['type-check'] = 'tsc --noEmit';
      scripts['dev:watch'] = 'nodemon --exec ts-node src/server.ts';
    }

    if (config.features.includes('testing')) {
      const testFramework = config.features.includes('vitest') ? 'vitest' : 'jest';
      scripts.test = testFramework;
      scripts['test:watch'] = `${testFramework} --watch`;
      scripts['test:coverage'] = `${testFramework} --coverage`;
    }

    if (config.features.includes('docker')) {
      scripts['docker:build'] = 'docker build -t ${npm_package_name} .';
      scripts['docker:run'] = 'docker run -p 3000:3000 ${npm_package_name}';
    }

    return scripts;
  }

  private getDependencies(config: ProjectConfig): Record<string, string> {
    const deps: Record<string, string> = {
      express: '^4.18.0',
      cors: '^2.8.5',
      dotenv: '^16.0.0',
      helmet: '^7.0.0',
      compression: '^1.7.0',
      'express-rate-limit': '^6.0.0'
    };

    // Logging
    if (config.features.includes('logging')) {
      deps.winston = '^3.11.0';
      deps['winston-daily-rotate-file'] = '^4.7.1';
    } else {
      deps.morgan = '^1.10.0';
    }

    // Validation
    if (config.features.includes('validation')) {
      if (config.backendLang === 'TypeScript') {
        deps.zod = '^3.22.0';
      } else {
        deps.joi = '^17.9.0';
      }
    }

    // Database
    switch (config.database) {
      case 'postgres':
        deps.pg = '^8.10.0';
        deps['pg-pool'] = '^3.6.0';
        break;
      case 'mysql':
        deps.mysql2 = '^3.5.0';
        break;
      case 'mongodb':
        deps.mongoose = '^7.3.0';
        break;
      case 'sqlite':
        deps.sqlite3 = '^5.1.6';
        break;
    }

    // Authentication
    if (config.features.includes('auth')) {
      deps.jsonwebtoken = '^9.0.0';
      deps.bcrypt = '^5.1.0';
      deps['express-jwt'] = '^8.4.0';
    }

    // API Documentation
    if (config.features.includes('docs')) {
      deps.swagger = '^0.7.5';
      deps['swagger-jsdoc'] = '^6.2.8';
      deps['swagger-ui-express'] = '^5.0.0';
    }

    return deps;
  }

  private getDevDependencies(config: ProjectConfig): Record<string, string> {
    const devDeps: Record<string, string> = {};

    if (config.backendLang === 'TypeScript') {
      devDeps.typescript = '^5.1.0';
      devDeps['ts-node'] = '^10.9.0';
      devDeps['@types/node'] = '^20.0.0';
      devDeps['@types/express'] = '^4.17.0';
      devDeps['@types/cors'] = '^2.8.0';
    }

    devDeps.nodemon = '^3.0.0';

    // Testing
    if (config.features.includes('testing')) {
      if (config.features.includes('vitest')) {
        devDeps.vitest = '^0.34.0';
        devDeps['@vitest/ui'] = '^0.34.0';
        devDeps['happy-dom'] = '^9.20.0';
      } else {
        devDeps.jest = '^29.0.0';
        devDeps['@types/jest'] = '^29.0.0';
        
        if (config.backendLang === 'TypeScript') {
          devDeps['ts-jest'] = '^29.1.0';
        }
      }
      
      devDeps.supertest = '^6.3.0';
    }

    // Database types
    if (config.backendLang === 'TypeScript') {
      switch (config.database) {
        case 'postgres':
          devDeps['@types/pg'] = '^8.10.0';
          break;
        case 'mysql':
          devDeps['@types/mysql'] = '^2.15.0';
          break;
        case 'mongodb':
          devDeps['@types/mongoose'] = '^5.11.0';
          break;
      }
    }

    // ESLint and Prettier
    devDeps.eslint = '^8.45.0';
    devDeps['eslint-config-prettier'] = '^8.8.0';
    devDeps.prettier = '^3.0.0';
    
    if (config.backendLang === 'TypeScript') {
      devDeps['@typescript-eslint/eslint-plugin'] = '^6.0.0';
      devDeps['@typescript-eslint/parser'] = '^6.0.0';
    }

    return devDeps;
  }

  private async createConfigFiles(backendPath: string, config: ProjectConfig): Promise<void> {
    // TypeScript Config
    if (config.backendLang === 'TypeScript') {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'es2020',
          lib: ['ES2022'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
          resolveJsonModule: true,
          baseUrl: './',
          paths: {
            '@/*': ['src/*'],
            '@controllers/*': ['src/controllers/*'],
            '@services/*': ['src/services/*'],
            '@models/*': ['src/models/*'],
            '@config/*': ['src/config/*'],
            '@utils/*': ['src/utils/*'],
            '@tests/*': ['tests/*']
          }
        },
        include: ['src/**/*', 'tests/**/*'],
        exclude: ['node_modules', 'dist']
      };

      await writeFileSafe(
        path.join(backendPath, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      // Nodemon config
      const nodemonConfig = {
        watch: ['src'],
        ext: 'ts',
        ignore: ['src/**/*.test.ts', 'node_modules'],
        exec: 'ts-node src/server.ts',
        env: {
          NODE_ENV: 'development'
        }
      };

      await writeFileSafe(
        path.join(backendPath, 'nodemon.json'),
        JSON.stringify(nodemonConfig, null, 2)
      );
    }

    // ESLint Config
    const eslintConfig: any = {
      env: {
        node: true,
        es2022: true
      },
      extends: [
        'eslint:recommended',
        'prettier'
      ],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        'no-console': 'warn',
        'no-unused-vars': 'warn',
        'prefer-const': 'error'
      }
    };

    if (config.backendLang === 'TypeScript') {
      eslintConfig.extends.push('plugin:@typescript-eslint/recommended');
      eslintConfig.parser = '@typescript-eslint/parser';
      eslintConfig.parserOptions = {
        ...eslintConfig.parserOptions,
        project: './tsconfig.json'
      };
    }

    await writeFileSafe(
      path.join(backendPath, '.eslintrc.json'),
      JSON.stringify(eslintConfig, null, 2)
    );

    // Prettier Config
    const prettierConfig = {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 100,
      bracketSpacing: true
    };

    await writeFileSafe(
      path.join(backendPath, '.prettierrc'),
      JSON.stringify(prettierConfig, null, 2)
    );

    // Environment files
    await this.createEnvFiles(backendPath, config);
  }

  private async createEnvFiles(backendPath: string, config: ProjectConfig): Promise<void> {
    const envLines: string[] = [
      `# Application`,
      `PORT=${config.port}`,
      `NODE_ENV=development`,
      `APP_NAME=${config.name}`,
      '',
      `# Logging`,
      `LOG_LEVEL=info`,
      `LOG_FORMAT=text`,
      `LOG_STORAGE=file`,
      `LOG_FILE_ENABLED=true`,
      `LOG_CONSOLE_ENABLED=true`,
      ''
    ];

    // Database configuration
    if (config.database !== 'none') {
      envLines.push(`# Database (${config.database})`);
      
      switch (config.database) {
        case 'postgres':
          envLines.push(`DB_HOST=localhost`);
          envLines.push(`DB_PORT=5432`);
          envLines.push(`DB_USERNAME=postgres`);
          envLines.push(`DB_PASSWORD=postgres`);
          envLines.push(`DB_DATABASE=${config.name}_db`);
          envLines.push(`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${config.name}_db`);
          break;
        case 'mysql':
          envLines.push(`DB_HOST=localhost`);
          envLines.push(`DB_PORT=3306`);
          envLines.push(`DB_USERNAME=root`);
          envLines.push(`DB_PASSWORD=root`);
          envLines.push(`DB_DATABASE=${config.name}_db`);
          envLines.push(`DATABASE_URL=mysql://root:root@localhost:3306/${config.name}_db`);
          break;
        case 'mongodb':
          envLines.push(`DB_HOST=localhost`);
          envLines.push(`DB_PORT=27017`);
          envLines.push(`DB_USERNAME=`);
          envLines.push(`DB_PASSWORD=`);
          envLines.push(`DB_DATABASE=${config.name}_db`);
          envLines.push(`DATABASE_URL=mongodb://localhost:27017/${config.name}_db`);
          break;
        case 'sqlite':
          envLines.push(`DATABASE_URL=sqlite:./database/${config.name}.sqlite`);
          break;
      }
      envLines.push('');
    }

    // JWT configuration
    if (config.features.includes('auth')) {
      envLines.push(`# Authentication`);
      envLines.push(`JWT_SECRET=your_super_secret_jwt_key_change_in_production`);
      envLines.push(`JWT_EXPIRES_IN=7d`);
      envLines.push(`JWT_REFRESH_EXPIRES_IN=30d`);
      envLines.push(``);
    }

    // CORS configuration
    envLines.push(`# CORS`);
    const frontendPort = FRONTEND_PORTS[config.frontend];
    envLines.push(`CORS_ORIGIN=http://localhost:${frontendPort}`);
    envLines.push(`CORS_CREDENTIALS=true`);
    envLines.push(``);

    // Rate limiting
    if (config.features.includes('rateLimit')) {
      envLines.push(`# Rate Limiting`);
      envLines.push(`RATE_LIMIT_WINDOW_MS=900000`);
      envLines.push(`RATE_LIMIT_MAX_REQUESTS=100`);
      envLines.push(``);
    }

    await writeFileSafe(
      path.join(backendPath, '.env.example'),
      envLines.join('\n')
    );

    // Criar .env vazio
    await writeFileSafe(path.join(backendPath, '.env'), '');
  }

  private async createSourceFiles(backendPath: string, config: ProjectConfig): Promise<void> {
    // Server file
    await this.createServerFile(backendPath, config);
    
    // Logger configuration
    if (config.features.includes('logging')) {
      await this.createLoggerConfig(backendPath, config);
    }
    
    // Database configuration
    if (config.database !== 'none') {
      await this.createDatabaseConfig(backendPath, config);
    }
    
    // Example Todo List API
    await this.createTodoExample(backendPath, config);
  }

  private async createServerFile(backendPath: string, config: ProjectConfig): Promise<void> {
    const isTS = config.backendLang === 'TypeScript';
    const extension = isTS ? 'ts' : 'js';
    const serverPath = path.join(backendPath, 'src', `server.${extension}`);

    let serverContent = '';

    if (isTS) {
      serverContent = `import express from 'express';\n`;
      serverContent += `import cors from 'cors';\n`;
      serverContent += `import dotenv from 'dotenv';\n`;
      
      if (config.features.includes('logging')) {
        serverContent += `import { logger } from './config/logger';\n`;
        serverContent += `import { requestLogger } from './middlewares/requestLogger';\n`;
      } else {
        serverContent += `import morgan from 'morgan';\n`;
      }
      
      serverContent += `import helmet from 'helmet';\n`;
      serverContent += `import compression from 'compression';\n`;
      
      if (config.features.includes('rateLimit')) {
        serverContent += `import rateLimit from 'express-rate-limit';\n`;
      }
      
      serverContent += `\n`;
      serverContent += `import todoRoutes from './routes/todo.routes';\n`;
      serverContent += `import { connectDatabase } from './config/database';\n`;
      serverContent += `\n`;
      serverContent += `dotenv.config();\n`;
      serverContent += `\n`;
      serverContent += `const app = express();\n`;
      serverContent += `const PORT = process.env.PORT || ${DEFAULT_PORT};\n`;
      serverContent += `\n`;
      serverContent += `// Middleware\n`;
      serverContent += `app.use(helmet());\n`;
      serverContent += `app.use(compression());\n`;
      serverContent += `app.use(express.json());\n`;
      serverContent += `app.use(express.urlencoded({ extended: true }));\n`;
      serverContent += `app.use(cors({\n`;
      serverContent += `  origin: process.env.CORS_ORIGIN || 'http://localhost:${FRONTEND_PORTS[config.frontend]}',\n`;
      serverContent += `  credentials: true\n`;
      serverContent += `}));\n`;
      serverContent += `\n`;
      
      if (config.features.includes('logging')) {
        serverContent += `app.use(requestLogger);\n`;
      } else {
        serverContent += `app.use(morgan('dev'));\n`;
      }
      
      if (config.features.includes('rateLimit')) {
        serverContent += `\n`;
        serverContent += `// Rate limiting\n`;
        serverContent += `const limiter = rateLimit({\n`;
        serverContent += `  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),\n`;
        serverContent += `  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')\n`;
        serverContent += `});\n`;
        serverContent += `app.use('/api', limiter);\n`;
      }
      
      serverContent += `\n`;
      serverContent += `// Routes\n`;
      serverContent += `app.get('/', (req, res) => {\n`;
      serverContent += `  res.json({\n`;
      serverContent += `    message: '🚀 ${config.name} API is running!',\n`;
      serverContent += `    timestamp: new Date().toISOString(),\n`;
      serverContent += `    version: '1.0.0',\n`;
      serverContent += `    environment: process.env.NODE_ENV || 'development'\n`;
      serverContent += `  });\n`;
      serverContent += `});\n`;
      serverContent += `\n`;
      serverContent += `app.get('/health', (req, res) => {\n`;
      serverContent += `  res.json({\n`;
      serverContent += `    status: 'healthy',\n`;
      serverContent += `    timestamp: new Date().toISOString(),\n`;
      serverContent += `    uptime: process.uptime()\n`;
      serverContent += `  });\n`;
      serverContent += `});\n`;
      serverContent += `\n`;
      serverContent += `app.use('/api/todos', todoRoutes);\n`;
      serverContent += `\n`;
      serverContent += `// Error handling\n`;
      serverContent += `app.use((req, res) => {\n`;
      serverContent += `  res.status(404).json({\n`;
      serverContent += `    error: 'Route not found',\n`;
      serverContent += `    path: req.url,\n`;
      serverContent += `    method: req.method\n`;
      serverContent += `  });\n`;
      serverContent += `});\n`;
      serverContent += `\n`;
      serverContent += `app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {\n`;
      serverContent += `  console.error('Unhandled error:', err);\n`;
      serverContent += `  res.status(500).json({\n`;
      serverContent += `    error: 'Internal server error'\n`;
      serverContent += `  });\n`;
      serverContent += `});\n`;
      serverContent += `\n`;
      serverContent += `// Start server\n`;
      serverContent += `const startServer = async () => {\n`;
      
      if (config.database !== 'none') {
        serverContent += `  try {\n`;
        serverContent += `    await connectDatabase();\n`;
        serverContent += `    ${config.features.includes('logging') ? 'logger.info' : 'console.log'}('✅ Database connected');\n`;
        serverContent += `  } catch (error) {\n`;
        serverContent += `    ${config.features.includes('logging') ? 'logger.error' : 'console.error'}('Failed to connect to database:', error);\n`;
        serverContent += `    process.exit(1);\n`;
        serverContent += `  }\n`;
      }
      
      serverContent += `\n`;
      serverContent += `  app.listen(PORT, () => {\n`;
      serverContent += `    ${config.features.includes('logging') ? 'logger.info' : 'console.log'}(\`🚀 Server started on port \${PORT}\`);\n`;
      serverContent += `    console.log(\`\\n✅ Server running: http://localhost:\${PORT}\`);\n`;
      serverContent += `    console.log(\`📝 Health check: http://localhost:\${PORT}/health\`);\n`;
      
      if (config.frontend !== 'none') {
        serverContent += `    console.log(\`🎨 Frontend: http://localhost:${FRONTEND_PORTS[config.frontend]}\`);\n`;
      }
      
      if (config.features.includes('logging') && config.features.includes('logging')) {
        serverContent += `    console.log(\`📝 Logs: tail -f logs/application-\$(date +%Y-%m-%d).log\`);\n`;
      }
      
      serverContent += `  });\n`;
      
      if (config.features.includes('graceful-shutdown')) {
        serverContent += `\n`;
        serverContent += `  // Graceful shutdown\n`;
        serverContent += `  const gracefulShutdown = (signal: string) => {\n`;
        serverContent += `    ${config.features.includes('logging') ? 'logger.info' : 'console.log'}(\`Received \${signal}, shutting down gracefully...\`);\n`;
        serverContent += `    server.close(() => {\n`;
        serverContent += `      ${config.features.includes('logging') ? 'logger.info' : 'console.log'}('Server closed');\n`;
        serverContent += `      process.exit(0);\n`;
        serverContent += `    });\n`;
        serverContent += `  };\n`;
        serverContent += `\n`;
        serverContent += `  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));\n`;
        serverContent += `  process.on('SIGINT', () => gracefulShutdown('SIGINT'));\n`;
      }
      
      serverContent += `};\n`;
      serverContent += `\n`;
      serverContent += `startServer();\n`;
    } else {
      // JavaScript version
      serverContent = `const express = require('express');\n`;
      serverContent += `const cors = require('cors');\n`;
      serverContent += `require('dotenv').config();\n`;
      
      if (config.features.includes('logging')) {
        serverContent += `const { logger } = require('./config/logger');\n`;
        serverContent += `const { requestLogger } = require('./middlewares/requestLogger');\n`;
      } else {
        serverContent += `const morgan = require('morgan');\n`;
      }
      
      serverContent += `const helmet = require('helmet');\n`;
      serverContent += `const compression = require('compression');\n`;
      
      if (config.features.includes('rateLimit')) {
        serverContent += `const rateLimit = require('express-rate-limit');\n`;
      }
      
      serverContent += `\n`;
      serverContent += `const todoRoutes = require('./routes/todo.routes');\n`;
      
      if (config.database !== 'none') {
        serverContent += `const { connectDatabase } = require('./config/database');\n`;
      }
      
      serverContent += `\n`;
      serverContent += `const app = express();\n`;
      serverContent += `const PORT = process.env.PORT || ${DEFAULT_PORT};\n`;
      serverContent += `\n`;
      serverContent += `// Middleware\n`;
      serverContent += `app.use(helmet());\n`;
      serverContent += `app.use(compression());\n`;
      serverContent += `app.use(express.json());\n`;
      serverContent += `app.use(express.urlencoded({ extended: true }));\n`;
      serverContent += `app.use(cors({\n`;
      serverContent += `  origin: process.env.CORS_ORIGIN || 'http://localhost:${FRONTEND_PORTS[config.frontend]}',\n`;
      serverContent += `  credentials: true\n`;
      serverContent += `}));\n`;
      serverContent += `\n`;
      
      if (config.features.includes('logging')) {
        serverContent += `app.use(requestLogger);\n`;
      } else {
        serverContent += `app.use(morgan('dev'));\n`;
      }
      
      // Rest of JavaScript implementation...
      // (Similar to TypeScript but with require/module.exports)
    }

    await writeFileSafe(serverPath, serverContent);
  }

  private async createTodoExample(backendPath: string, config: ProjectConfig): Promise<void> {
    const isTS = config.backendLang === 'TypeScript';
    const extension = isTS ? 'ts' : 'js';

    // Todo Model
    const todoModelContent = isTS ? 
      `export interface Todo {\n  id: number;\n  title: string;\n  description?: string;\n  completed: boolean;\n  createdAt: Date;\n  updatedAt: Date;\n}\n\n` +
      `export interface CreateTodoDTO {\n  title: string;\n  description?: string;\n}\n\n` +
      `export interface UpdateTodoDTO {\n  title?: string;\n  description?: string;\n  completed?: boolean;\n}\n` :
      `module.exports = {};\n`;

    await writeFileSafe(
      path.join(backendPath, 'src', 'models', `todo.model.${extension}`),
      todoModelContent
    );

    // Todo Service
    const todoServiceContent = isTS ? 
      `import { Todo, CreateTodoDTO, UpdateTodoDTO } from '../models/todo.model';\n\n` +
      `let todos: Todo[] = [\n` +
      `  { id: 1, title: 'Learn Node.js', description: 'Master backend development', completed: false, createdAt: new Date(), updatedAt: new Date() },\n` +
      `  { id: 2, title: 'Build REST API', description: 'Create a professional API', completed: true, createdAt: new Date(), updatedAt: new Date() },\n` +
      `  { id: 3, title: 'Deploy to production', description: 'Use Docker and CI/CD', completed: false, createdAt: new Date(), updatedAt: new Date() }\n` +
      `];\n\n` +
      `export class TodoService {\n` +
      `  static async findAll(): Promise<Todo[]> {\n` +
      `    return todos;\n` +
      `  }\n\n` +
      `  static async findById(id: number): Promise<Todo | null> {\n` +
      `    return todos.find(todo => todo.id === id) || null;\n` +
      `  }\n\n` +
      `  static async create(data: CreateTodoDTO): Promise<Todo> {\n` +
      `    const newTodo: Todo = {\n` +
      `      id: Date.now(),\n` +
      `      title: data.title,\n` +
      `      description: data.description,\n` +
      `      completed: false,\n` +
      `      createdAt: new Date(),\n` +
      `      updatedAt: new Date()\n` +
      `    };\n` +
      `    todos.push(newTodo);\n` +
      `    return newTodo;\n` +
      `  }\n\n` +
      `  static async update(id: number, data: UpdateTodoDTO): Promise<Todo | null> {\n` +
      `    const index = todos.findIndex(todo => todo.id === id);\n` +
      `    if (index === -1) return null;\n` +
      `    \n` +
      `    todos[index] = {\n` +
      `      ...todos[index],\n` +
      `      ...data,\n` +
      `      updatedAt: new Date()\n` +
      `    };\n` +
      `    \n` +
      `    return todos[index];\n` +
      `  }\n\n` +
      `  static async delete(id: number): Promise<boolean> {\n` +
      `    const initialLength = todos.length;\n` +
      `    todos = todos.filter(todo => todo.id !== id);\n` +
      `    return todos.length < initialLength;\n` +
      `  }\n` +
      `}\n` :
      `// JavaScript version of TodoService`;

    await writeFileSafe(
      path.join(backendPath, 'src', 'services', `todo.service.${extension}`),
      todoServiceContent
    );

    // Todo Controller
    const todoControllerContent = isTS ?
      `import { Request, Response } from 'express';\n` +
      `import { TodoService } from '../services/todo.service';\n` +
      `import { CreateTodoDTO, UpdateTodoDTO } from '../models/todo.model';\n\n` +
      `export class TodoController {\n` +
      `  static async getAll(req: Request, res: Response): Promise<void> {\n` +
      `    try {\n` +
      `      const todos = await TodoService.findAll();\n` +
      `      res.json(todos);\n` +
      `    } catch (error) {\n` +
      `      res.status(500).json({ error: 'Failed to fetch todos' });\n` +
      `    }\n` +
      `  }\n\n` +
      `  static async getById(req: Request, res: Response): Promise<void> {\n` +
      `    try {\n` +
      `      const id = parseInt(req.params.id);\n` +
      `      const todo = await TodoService.findById(id);\n` +
      `      \n` +
      `      if (!todo) {\n` +
      `        res.status(404).json({ error: 'Todo not found' });\n` +
      `        return;\n` +
      `      }\n` +
      `      \n` +
      `      res.json(todo);\n` +
      `    } catch (error) {\n` +
      `      res.status(500).json({ error: 'Failed to fetch todo' });\n` +
      `    }\n` +
      `  }\n\n` +
      `  static async create(req: Request, res: Response): Promise<void> {\n` +
      `    try {\n` +
      `      const data: CreateTodoDTO = req.body;\n` +
      `      \n` +
      `      if (!data.title) {\n` +
      `        res.status(400).json({ error: 'Title is required' });\n` +
      `        return;\n` +
      `      }\n` +
      `      \n` +
      `      const todo = await TodoService.create(data);\n` +
      `      res.status(201).json(todo);\n` +
      `    } catch (error) {\n` +
      `      res.status(500).json({ error: 'Failed to create todo' });\n` +
      `    }\n` +
      `  }\n\n` +
      `  static async update(req: Request, res: Response): Promise<void> {\n` +
      `    try {\n` +
      `      const id = parseInt(req.params.id);\n` +
      `      const data: UpdateTodoDTO = req.body;\n` +
      `      \n` +
      `      const todo = await TodoService.update(id, data);\n` +
      `      \n` +
      `      if (!todo) {\n` +
      `        res.status(404).json({ error: 'Todo not found' });\n` +
      `        return;\n` +
      `      }\n` +
      `      \n` +
      `      res.json(todo);\n` +
      `    } catch (error) {\n` +
      `      res.status(500).json({ error: 'Failed to update todo' });\n` +
      `    }\n` +
      `  }\n\n` +
      `  static async delete(req: Request, res: Response): Promise<void> {\n` +
      `    try {\n` +
      `      const id = parseInt(req.params.id);\n` +
      `      const deleted = await TodoService.delete(id);\n` +
      `      \n` +
      `      if (!deleted) {\n` +
      `        res.status(404).json({ error: 'Todo not found' });\n` +
      `        return;\n` +
      `      }\n` +
      `      \n` +
      `      res.status(204).send();\n` +
      `    } catch (error) {\n` +
      `      res.status(500).json({ error: 'Failed to delete todo' });\n` +
      `    }\n` +
      `  }\n` +
      `}\n` :
      `// JavaScript version of TodoController`;

    await writeFileSafe(
      path.join(backendPath, 'src', 'controllers', `todo.controller.${extension}`),
      todoControllerContent
    );

    // Todo Routes
    const todoRoutesContent = isTS ?
      `import { Router } from 'express';\n` +
      `import { TodoController } from '../controllers/todo.controller';\n` +
      `\n` +
      `const router = Router();\n` +
      `\n` +
      `router.get('/', TodoController.getAll);\n` +
      `router.get('/:id', TodoController.getById);\n` +
      `router.post('/', TodoController.create);\n` +
      `router.put('/:id', TodoController.update);\n` +
      `router.delete('/:id', TodoController.delete);\n` +
      `\n` +
      `export default router;\n` :
      `const express = require('express');\n` +
      `const router = express.Router();\n` +
      `const TodoController = require('../controllers/todo.controller');\n` +
      `\n` +
      `router.get('/', TodoController.getAll);\n` +
      `router.get('/:id', TodoController.getById);\n` +
      `router.post('/', TodoController.create);\n` +
      `router.put('/:id', TodoController.update);\n` +
      `router.delete('/:id', TodoController.delete);\n` +
      `\n` +
      `module.exports = router;\n`;

    await writeFileSafe(
      path.join(backendPath, 'src', 'routes', `todo.routes.${extension}`),
      todoRoutesContent
    );
  }

  private async createLoggerConfig(backendPath: string, config: ProjectConfig): Promise<void> {
    const isTS = config.backendLang === 'TypeScript';
    const extension = isTS ? 'ts' : 'js';

    const loggerContent = isTS ?
      `import winston from 'winston';\n` +
      `import DailyRotateFile from 'winston-daily-rotate-file';\n` +
      `import path from 'path';\n` +
      `\n` +
      `// Create logs directory\n` +
      `import fs from 'fs';\n` +
      `const logsDir = path.join(process.cwd(), 'logs');\n` +
      `if (!fs.existsSync(logsDir)) {\n` +
      `  fs.mkdirSync(logsDir, { recursive: true });\n` +
      `}\n` +
      `\n` +
      `// Define log format based on environment\n` +
      `const logFormat = process.env.LOG_FORMAT === 'json' ? winston.format.json() : winston.format.combine(\n` +
      `  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),\n` +
      `  winston.format.printf(({ timestamp, level, message, ...meta }) => {\n` +
      `    const metaString = Object.keys(meta).length > 0 ? \` \${JSON.stringify(meta)}\` : '';\n` +
      `    return \`\${timestamp} [\${level}]: \${message}\${metaString}\`;\n` +
      `  })\n` +
      `);\n` +
      `\n` +
      `// Create logger instance\n` +
      `export const logger = winston.createLogger({\n` +
      `  level: process.env.LOG_LEVEL || 'info',\n` +
      `  format: logFormat,\n` +
      `  transports: [\n` +
      `    // Console transport\n` +
      `    new winston.transports.Console({\n` +
      `      format: winston.format.combine(\n` +
      `        winston.format.colorize(),\n` +
      `        winston.format.simple()\n` +
      `      ),\n` +
      `      silent: process.env.LOG_CONSOLE_ENABLED === 'false'\n` +
      `    }),\n` +
      `    // File transport\n` +
      `    new DailyRotateFile({\n` +
      `      filename: path.join(logsDir, 'application-%DATE%.log'),\n` +
      `      datePattern: 'YYYY-MM-DD',\n` +
      `      zippedArchive: true,\n` +
      `      maxSize: '20m',\n` +
      `      maxFiles: '30d',\n` +
      `      silent: process.env.LOG_FILE_ENABLED === 'false'\n` +
      `    }),\n` +
      `    // Error file transport\n` +
      `    new DailyRotateFile({\n` +
      `      filename: path.join(logsDir, 'error-%DATE%.log'),\n` +
      `      datePattern: 'YYYY-MM-DD',\n` +
      `      zippedArchive: true,\n` +
      `      maxSize: '20m',\n` +
      `      maxFiles: '30d',\n` +
      `      level: 'error'\n` +
      `    })\n` +
      `  ]\n` +
      `});\n` +
      `\n` +
      `// Logging middleware\n` +
      `export const requestLogger = (req: any, res: any, next: Function) => {\n` +
      `  const start = Date.now();\n` +
      `  \n` +
      `  res.on('finish', () => {\n` +
      `    const duration = Date.now() - start;\n` +
      `    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';\n` +
      `    \n` +
      `    logger.log(logLevel, \`\${req.method} \${req.originalUrl} \${res.statusCode} - \${duration}ms\`, {\n` +
      `      ip: req.ip,\n` +
      `      userAgent: req.get('user-agent'),\n` +
      `      contentLength: res.get('content-length'),\n` +
      `      duration\n` +
      `    });\n` +
      `  });\n` +
      `  \n` +
      `  next();\n` +
      `};\n` +
      `\n` +
      `// Export convenience methods\n` +
      `export const log = {\n` +
      `  error: (message: string, meta?: any) => logger.error(message, meta),\n` +
      `  warn: (message: string, meta?: any) => logger.warn(message, meta),\n` +
      `  info: (message: string, meta?: any) => logger.info(message, meta),\n` +
      `  debug: (message: string, meta?: any) => logger.debug(message, meta),\n` +
      `  http: (message: string, meta?: any) => logger.http(message, meta)\n` +
      `};\n` :
      `// JavaScript version of logger`;

    await writeFileSafe(
      path.join(backendPath, 'src', 'config', `logger.${extension}`),
      loggerContent
    );
  }

  private async createDatabaseConfig(backendPath: string, config: ProjectConfig): Promise<void> {
    const isTS = config.backendLang === 'TypeScript';
    const extension = isTS ? 'ts' : 'js';

    let dbContent = '';

    switch (config.database) {
      case 'postgres':
        dbContent = isTS ?
          `import { Pool } from 'pg';\n` +
          `import { logger } from './logger';\n` +
          `\n` +
          `const pool = new Pool({\n` +
          `  connectionString: process.env.DATABASE_URL,\n` +
          `  max: 20,\n` +
          `  idleTimeoutMillis: 30000,\n` +
          `  connectionTimeoutMillis: 2000,\n` +
          `});\n` +
          `\n` +
          `// Test connection\n` +
          `export const connectDatabase = async (): Promise<void> => {\n` +
          `  try {\n` +
          `    const client = await pool.connect();\n` +
          `    logger.info('PostgreSQL connected successfully');\n` +
          `    client.release();\n` +
          `  } catch (error) {\n` +
          `    logger.error('Failed to connect to PostgreSQL:', error);\n` +
          `    throw error;\n` +
          `  }\n` +
          `};\n` +
          `\n` +
          `export const query = (text: string, params?: any[]) => pool.query(text, params);\n` +
          `\n` +
          `export default pool;\n` :
          `// PostgreSQL JavaScript version`;
        break;

      case 'mysql':
        dbContent = isTS ?
          `import mysql from 'mysql2/promise';\n` +
          `import { logger } from './logger';\n` +
          `\n` +
          `let pool: mysql.Pool;\n` +
          `\n` +
          `export const connectDatabase = async (): Promise<void> => {\n` +
          `  try {\n` +
          `    pool = mysql.createPool({\n` +
          `      uri: process.env.DATABASE_URL,\n` +
          `      connectionLimit: 10,\n` +
          `      waitForConnections: true,\n` +
          `      queueLimit: 0\n` +
          `    });\n` +
          `    \n` +
          `    const connection = await pool.getConnection();\n` +
          `    logger.info('MySQL connected successfully');\n` +
          `    connection.release();\n` +
          `  } catch (error) {\n` +
          `    logger.error('Failed to connect to MySQL:', error);\n` +
          `    throw error;\n` +
          `  }\n` +
          `};\n` +
          `\n` +
          `export const query = async (sql: string, values?: any[]) => {\n` +
          `  const connection = await pool.getConnection();\n` +
          `  try {\n` +
          `    const [rows] = await connection.query(sql, values);\n` +
          `    return rows;\n` +
          `  } finally {\n` +
          `    connection.release();\n` +
          `  }\n` +
          `};\n` +
          `\n` +
          `export { pool };\n` :
          `// MySQL JavaScript version`;
        break;

      case 'mongodb':
        dbContent = isTS ?
          `import mongoose from 'mongoose';\n` +
          `import { logger } from './logger';\n` +
          `\n` +
          `export const connectDatabase = async (): Promise<void> => {\n` +
          `  try {\n` +
          `    await mongoose.connect(process.env.DATABASE_URL || '', {\n` +
          `      maxPoolSize: 10,\n` +
          `      serverSelectionTimeoutMS: 5000,\n` +
          `      socketTimeoutMS: 45000,\n` +
          `    });\n` +
          `    \n` +
          `    logger.info('MongoDB connected successfully');\n` +
          `    \n` +
          `    mongoose.connection.on('error', (err) => {\n` +
          `      logger.error('MongoDB connection error:', err);\n` +
          `    });\n` +
          `    \n` +
          `    mongoose.connection.on('disconnected', () => {\n` +
          `      logger.warn('MongoDB disconnected');\n` +
          `    });\n` +
          `    \n` +
          `    process.on('SIGINT', async () => {\n` +
          `      await mongoose.connection.close();\n` +
          `      process.exit(0);\n` +
          `    });\n` +
          `  } catch (error) {\n` +
          `    logger.error('Failed to connect to MongoDB:', error);\n` +
          `    throw error;\n` +
          `  }\n` +
          `};\n` :
          `// MongoDB JavaScript version`;
        break;

      case 'sqlite':
        dbContent = isTS ?
          `import sqlite3 from 'sqlite3';\n` +
          `import { open } from 'sqlite';\n` +
          `import { logger } from './logger';\n` +
          `import path from 'path';\n` +
          `\n` +
          `let db: any;\n` +
          `\n` +
          `export const connectDatabase = async (): Promise<void> => {\n` +
          `  try {\n` +
          `    const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || './database/app.db';\n` +
          `    const dir = path.dirname(dbPath);\n` +
          `    \n` +
          `    // Ensure database directory exists\n` +
          `    import fs from 'fs';\n` +
          `    if (!fs.existsSync(dir)) {\n` +
          `      fs.mkdirSync(dir, { recursive: true });\n` +
          `    }\n` +
          `    \n` +
          `    db = await open({\n` +
          `      filename: dbPath,\n` +
          `      driver: sqlite3.Database\n` +
          `    });\n` +
          `    \n` +
          `    logger.info('SQLite connected successfully');\n` +
          `  } catch (error) {\n` +
          `    logger.error('Failed to connect to SQLite:', error);\n` +
          `    throw error;\n` +
          `  }\n` +
          `};\n` +
          `\n` +
          `export const getDb = () => db;\n` +
          `\n` +
          `export const query = async (sql: string, params?: any[]) => {\n` +
          `  return db.all(sql, params);\n` +
          `};\n` :
          `// SQLite JavaScript version`;
        break;
    }

    await writeFileSafe(
      path.join(backendPath, 'src', 'config', `database.${extension}`),
      dbContent
    );
  }

  private async createTests(backendPath: string, config: ProjectConfig): Promise<void> {
    const isTS = config.backendLang === 'TypeScript';
    const extension = isTS ? 'ts' : 'js';

    // Test configuration
    if (config.features.includes('vitest')) {
      const vitestConfig = `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    globals: true,\n    environment: 'node',\n    include: ['**/*.test.ts'],\n    exclude: ['node_modules', 'dist'],\n    coverage: {\n      provider: 'v8',\n      reporter: ['text', 'json', 'html'],\n      exclude: ['node_modules/', 'dist/', 'tests/']\n    }\n  }\n})\n`;

      await writeFileSafe(
        path.join(backendPath, 'vitest.config.ts'),
        vitestConfig
      );
    } else {
      const jestConfig = `module.exports = {\n  preset: 'ts-jest',\n  testEnvironment: 'node',\n  roots: ['<rootDir>/src'],\n  testMatch: ['**/*.test.ts'],\n  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],\n  coverageDirectory: 'coverage',\n  coverageReporters: ['text', 'lcov', 'html'],\n  moduleNameMapper: {\n    '^@/(.*)$': '<rootDir>/src/$1'\n  }\n};\n`;

      await writeFileSafe(
        path.join(backendPath, 'jest.config.js'),
        jestConfig
      );
    }

    // Example test
    const testContent = isTS ?
      `import { describe, it, expect, beforeEach } from '${config.features.includes('vitest') ? 'vitest' : '@jest/globals'}';\n` +
      `import { TodoService } from '../services/todo.service';\n` +
      `\n` +
      `describe('TodoService', () => {\n` +
      `  beforeEach(() => {\n` +
      `    // Reset todos before each test\n` +
      `    // In a real app, you would reset the database\n` +
      `  });\n` +
      `\n` +
      `  describe('findAll', () => {\n` +
      `    it('should return all todos', async () => {\n` +
      `      const todos = await TodoService.findAll();\n` +
      `      expect(Array.isArray(todos)).toBe(true);\n` +
      `      expect(todos.length).toBeGreaterThan(0);\n` +
      `    });\n` +
      `  });\n` +
      `\n` +
      `  describe('create', () => {\n` +
      `    it('should create a new todo', async () => {\n` +
      `      const newTodo = await TodoService.create({\n` +
      `        title: 'Test Todo',\n` +
      `        description: 'Test Description'\n` +
      `      });\n` +
      `\n` +
      `      expect(newTodo).toHaveProperty('id');\n` +
      `      expect(newTodo.title).toBe('Test Todo');\n` +
      `      expect(newTodo.completed).toBe(false);\n` +
      `    });\n` +
      `  });\n` +
      `});\n` :
      `// JavaScript test file`;

    await writeFileSafe(
      path.join(backendPath, 'tests', 'unit', `todo.service.test.${extension}`),
      testContent
    );

    // Integration test
    const integrationTestContent = isTS ?
      `import request from 'supertest';\n` +
      `import { app } from '../src/server';\n` +
      `\n` +
      `describe('Todo API', () => {\n` +
      `  describe('GET /api/todos', () => {\n` +
      `    it('should return all todos', async () => {\n` +
      `      const response = await request(app).get('/api/todos');\n` +
      `      expect(response.status).toBe(200);\n` +
      `      expect(Array.isArray(response.body)).toBe(true);\n` +
      `    });\n` +
      `  });\n` +
      `\n` +
      `  describe('POST /api/todos', () => {\n` +
      `    it('should create a new todo', async () => {\n` +
      `      const todoData = { title: 'Integration Test Todo' };\n` +
      `      const response = await request(app)\n` +
      `        .post('/api/todos')\n` +
      `        .send(todoData);\n` +
      `      \n` +
      `      expect(response.status).toBe(201);\n` +
      `      expect(response.body).toHaveProperty('id');\n` +
      `      expect(response.body.title).toBe(todoData.title);\n` +
      `    });\n` +
      `  });\n` +
      `});\n` :
      `// JavaScript integration test`;

    await writeFileSafe(
      path.join(backendPath, 'tests', 'integration', `todo.api.test.${extension}`),
      integrationTestContent
    );
  }

  private async createDockerFiles(backendPath: string, config: ProjectConfig): Promise<void> {
    // Dockerfile
    const dockerfileContent = `# Development stage\n` +
      `FROM node:18-alpine AS development\n` +
      `WORKDIR /usr/src/app\n` +
      `COPY package*.json ./\n` +
      `RUN npm ci\n` +
      `COPY . .\n` +
      `EXPOSE ${config.port}\n` +
      `CMD ["npm", "run", "dev"]\n` +
      `\n` +
      `# Production stage\n` +
      `FROM node:18-alpine AS production\n` +
      `WORKDIR /usr/src/app\n` +
      `COPY package*.json ./\n` +
      `RUN npm ci --only=production\n` +
      `COPY --from=development /usr/src/app/dist ./dist\n` +
      `EXPOSE ${config.port}\n` +
      `USER node\n` +
      `CMD ["npm", "start"]\n`;

    await writeFileSafe(
      path.join(backendPath, 'Dockerfile'),
      dockerfileContent
    );

    // Docker Compose
    if (config.database !== 'none') {
      let dockerComposeContent = `version: '3.8'\n\nservices:\n  app:\n    build:\n      context: .\n      target: development\n    ports:\n      - "${config.port}:${config.port}"\n    volumes:\n      - .:/usr/src/app\n      - /usr/src/app/node_modules\n    environment:\n      - NODE_ENV=development\n      - DATABASE_URL=\${DATABASE_URL}\n    depends_on:\n      - database\n    restart: unless-stopped\n\n`;

      switch (config.database) {
        case 'postgres':
          dockerComposeContent += `  database:\n    image: postgres:15-alpine\n    ports:\n      - "5432:5432"\n    environment:\n      - POSTGRES_USER=postgres\n      - POSTGRES_PASSWORD=postgres\n      - POSTGRES_DB=${config.name}_db\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n    restart: unless-stopped\n\nvolumes:\n  postgres_data:\n`;
          break;

        case 'mysql':
          dockerComposeContent += `  database:\n    image: mysql:8\n    ports:\n      - "3306:3306"\n    environment:\n      - MYSQL_ROOT_PASSWORD=root\n      - MYSQL_DATABASE=${config.name}_db\n      - MYSQL_USER=${config.name}_user\n      - MYSQL_PASSWORD=${config.name}_pass\n    volumes:\n      - mysql_data:/var/lib/mysql\n    restart: unless-stopped\n\nvolumes:\n  mysql_data:\n`;
          break;

        case 'mongodb':
          dockerComposeContent += `  database:\n    image: mongo:6\n    ports:\n      - "27017:27017"\n    environment:\n      - MONGO_INITDB_DATABASE=${config.name}_db\n    volumes:\n      - mongodb_data:/data/db\n    restart: unless-stopped\n\nvolumes:\n  mongodb_data:\n`;
          break;
      }

      await writeFileSafe(
        path.join(backendPath, 'docker-compose.yml'),
        dockerComposeContent
      );
    }

    // .dockerignore
    const dockerignoreContent = `node_modules\nnpm-debug.log\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n\n# Build outputs\ndist\nbuild\ncoverage\n\n# Logs\nlogs\n*.log\n\n# IDE\n.vscode\n.idea\n*.swp\n*.swo\n\n# OS\n.DS_Store\nThumbs.db\n`;

    await writeFileSafe(
      path.join(backendPath, '.dockerignore'),
      dockerignoreContent
    );
  }
}

// ========== GERADOR DE FRONTEND ==========

class FrontendGenerator {
  constructor(private options: GeneratorOptions) {}

  async generate(): Promise<void> {
    const { config, spinner, projectPath } = this.options;
    
    if (config.frontend === 'none') {
      return;
    }

    spinner.text = chalk.cyan(`Creating ${config.frontend} frontend...`);
    
    const frontendPath = path.join(projectPath, 'frontend');
    
    switch (config.frontend) {
      case 'vanilla':
        await this.generateVanillaFrontend(frontendPath, config);
        break;
      case 'vue':
        await this.generateVueFrontend(frontendPath, config);
        break;
      case 'react':
        await this.generateReactFrontend(frontendPath, config);
        break;
      case 'next':
        await this.generateNextFrontend(frontendPath, config);
        break;
      case 'angular':
        await this.generateAngularFrontend(frontendPath, config);
        break;
      case 'svelte':
        await this.generateSvelteFrontend(frontendPath, config);
        break;
    }

    spinner.succeed(chalk.green(`${capitalize(config.frontend)} frontend created!`));
  }

  private async generateVanillaFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    await fs.mkdir(frontendPath, { recursive: true });

    // Package.json for vanilla frontend (optional build tools)
    const packageJson = {
      name: `${config.name}-frontend`,
      version: '1.0.0',
      description: 'Vanilla JavaScript frontend',
      scripts: {
        start: 'live-server --port=8080',
        build: 'echo "No build step for vanilla frontend"',
        preview: 'live-server --port=8080 dist'
      },
      devDependencies: {
        'live-server': '^1.2.2'
      }
    };

    await writeFileSafe(
      path.join(frontendPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // HTML file
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.name} - Todo App</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 500px;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        .content {
            padding: 30px;
        }

        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }

        .input-group input {
            flex: 1;
            padding: 15px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        .input-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        .input-group button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 0 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }

        .input-group button:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }

        .input-group button:active {
            transform: translateY(0);
        }

        .todo-list {
            list-style: none;
        }

        .todo-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideIn 0.3s ease;
            border-left: 4px solid #667eea;
        }

        .todo-item.completed {
            opacity: 0.7;
            border-left-color: #4CAF50;
        }

        .todo-item.completed .todo-text {
            text-decoration: line-through;
        }

        .todo-text {
            flex: 1;
            font-size: 1.1rem;
            color: #333;
        }

        .todo-actions {
            display: flex;
            gap: 10px;
        }

        .todo-actions button {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 8px;
            border-radius: 6px;
            transition: background 0.2s;
        }

        .complete-btn {
            color: #4CAF50;
        }

        .complete-btn:hover {
            background: rgba(76, 175, 80, 0.1);
        }

        .delete-btn {
            color: #f44336;
        }

        .delete-btn:hover {
            background: rgba(244, 67, 54, 0.1);
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }

        .empty-state i {
            font-size: 3rem;
            margin-bottom: 20px;
            color: #ddd;
        }

        .empty-state h3 {
            margin-bottom: 10px;
            font-size: 1.5rem;
        }

        .status-bar {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 0.9rem;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #667eea;
        }

        .loading i {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .error {
            background: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-tasks"></i> Todo App</h1>
            <p>Manage your tasks efficiently</p>
        </div>
        
        <div class="content">
            <div class="error" id="error"></div>
            
            <div class="input-group">
                <input type="text" 
                       id="todoInput" 
                       placeholder="What needs to be done?"
                       autocomplete="off">
                <button id="addButton">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>

            <div class="loading" id="loading">
                <i class="fas fa-spinner"></i> Loading...
            </div>

            <ul class="todo-list" id="todoList">
                <!-- Todos will be inserted here -->
            </ul>

            <div class="empty-state" id="emptyState">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>Add a task to get started!</p>
            </div>

            <div class="status-bar">
                <span id="totalCount">0 tasks</span>
                <span id="completedCount">0 completed</span>
            </div>
        </div>
    </div>

    <script>
        // Configuration
        const API_BASE_URL = 'http://localhost:${config.port}/api';
        
        // DOM Elements
        const todoInput = document.getElementById('todoInput');
        const addButton = document.getElementById('addButton');
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        const loading = document.getElementById('loading');
        const errorDiv = document.getElementById('error');
        const totalCount = document.getElementById('totalCount');
        const completedCount = document.getElementById('completedCount');

        // State
        let todos = [];
        let isLoading = false;

        // API Functions
        async function fetchTodos() {
            try {
                showLoading();
                hideError();
                
                const response = await fetch(\`\${API_BASE_URL}/todos\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                todos = await response.json();
                renderTodos();
            } catch (error) {
                showError(\`Failed to load todos: \${error.message}\`);
                console.error('Error fetching todos:', error);
            } finally {
                hideLoading();
            }
        }

        async function addTodo(title) {
            try {
                hideError();
                
                const response = await fetch(\`\${API_BASE_URL}/todos\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title })
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const newTodo = await response.json();
                todos.push(newTodo);
                renderTodos();
                todoInput.value = '';
                todoInput.focus();
            } catch (error) {
                showError(\`Failed to add todo: \${error.message}\`);
                console.error('Error adding todo:', error);
            }
        }

        async function updateTodo(id, updates) {
            try {
                hideError();
                
                const response = await fetch(\`\${API_BASE_URL}/todos/\${id}\`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const updatedTodo = await response.json();
                const index = todos.findIndex(todo => todo.id === id);
                if (index !== -1) {
                    todos[index] = updatedTodo;
                }
                renderTodos();
            } catch (error) {
                showError(\`Failed to update todo: \${error.message}\`);
                console.error('Error updating todo:', error);
            }
        }

        async function deleteTodo(id) {
            try {
                hideError();
                
                const response = await fetch(\`\${API_BASE_URL}/todos/\${id}\`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                todos = todos.filter(todo => todo.id !== id);
                renderTodos();
            } catch (error) {
                showError(\`Failed to delete todo: \${error.message}\`);
                console.error('Error deleting todo:', error);
            }
        }

        // UI Functions
        function renderTodos() {
            // Clear the list
            todoList.innerHTML = '';
            
            if (todos.length === 0) {
                emptyState.style.display = 'block';
                todoList.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                todoList.style.display = 'block';
                
                // Render each todo
                todos.forEach(todo => {
                    const todoElement = document.createElement('li');
                    todoElement.className = \`todo-item \${todo.completed ? 'completed' : ''}\`;
                    todoElement.innerHTML = \`
                        <span class="todo-text">\${todo.title}</span>
                        <div class="todo-actions">
                            <button class="complete-btn" onclick="toggleTodo(\${todo.id})">
                                <i class="fas \${todo.completed ? 'fa-redo' : 'fa-check'}"></i>
                            </button>
                            <button class="delete-btn" onclick="deleteTodoById(\${todo.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    \`;
                    todoList.appendChild(todoElement);
                });
            }
            
            updateStats();
        }

        function updateStats() {
            const total = todos.length;
            const completed = todos.filter(todo => todo.completed).length;
            
            totalCount.textContent = \`\${total} task\${total !== 1 ? 's' : ''}\`;
            completedCount.textContent = \`\${completed} completed\`;
        }

        function showLoading() {
            isLoading = true;
            loading.style.display = 'block';
        }

        function hideLoading() {
            isLoading = false;
            loading.style.display = 'none';
        }

        function showError(message) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            errorDiv.style.display = 'none';
        }

        // Event Handlers
        function handleAddTodo() {
            const title = todoInput.value.trim();
            
            if (title === '') {
                showError('Please enter a task');
                return;
            }
            
            if (isLoading) return;
            
            addTodo(title);
        }

        // Global functions for inline handlers
        window.toggleTodo = async function(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                await updateTodo(id, { completed: !todo.completed });
            }
        };

        window.deleteTodoById = async function(id) {
            if (confirm('Are you sure you want to delete this task?')) {
                await deleteTodo(id);
            }
        };

        // Event Listeners
        addButton.addEventListener('click', handleAddTodo);
        
        todoInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleAddTodo();
            }
        });

        // Initialize
        fetchTodos();
        
        // Auto-refresh every 30 seconds
        setInterval(fetchTodos, 30000);
    </script>
</body>
</html>`;

    await writeFileSafe(path.join(frontendPath, 'index.html'), htmlContent);

    // README
    const readmeContent = `# ${config.name} - Vanilla Frontend

This is a vanilla HTML/CSS/JS frontend for the ${config.name} application.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

3. Open your browser at: http://localhost:8080

## Features

- Modern, responsive design
- Live todo management
- Real-time updates
- Error handling
- Loading states

## API Integration

The frontend communicates with the backend API at: http://localhost:${config.port}

## Project Structure

\`\`\`
frontend/
├── index.html      # Main HTML file with all CSS and JS
└── package.json    # Project configuration
\`\`\`
`;

    await writeFileSafe(path.join(frontendPath, 'README.md'), readmeContent);
  }

  private async generateVueFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    // This would use Vue CLI or Vite template
    // For now, create a simple structure
    await fs.mkdir(frontendPath, { recursive: true });

    const packageJson = {
      name: `${config.name}-frontend`,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest'
      },
      dependencies: {
        'vue': '^3.3.4',
        'axios': '^1.4.0',
        'pinia': '^2.1.4'
      },
      devDependencies: {
        '@vitejs/plugin-vue': '^4.2.3',
        'vite': '^4.4.5',
        '@vue/test-utils': '^2.4.0',
        'vitest': '^0.34.0'
      }
    };

    await writeFileSafe(
      path.join(frontendPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Note: In a real implementation, you would copy full Vue templates
    // or use Vue CLI programmatically
    console.log(chalk.yellow('Vue.js frontend template will be implemented in future versions'));
  }

  // Similar methods for React, Next, Angular, Svelte...
  private async generateReactFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    console.log(chalk.yellow('React frontend template will be implemented in future versions'));
  }

  private async generateNextFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    console.log(chalk.yellow('Next.js frontend template will be implemented in future versions'));
  }

  private async generateAngularFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    console.log(chalk.yellow('Angular frontend template will be implemented in future versions'));
  }

  private async generateSvelteFrontend(frontendPath: string, config: ProjectConfig): Promise<void> {
    console.log(chalk.yellow('Svelte frontend template will be implemented in future versions'));
  }
}

// ========== GERADOR PRINCIPAL ==========

export async function generateProject(config: ProjectConfig, spinner: Ora): Promise<void> {
  const projectPath = path.join(process.cwd(), config.name);
  
  // Ensure config has required properties
  if (!config.features) config.features = [];
  if (!config.frontendFeatures) config.frontendFeatures = [];
  if (!config.runAfterCreate) config.runAfterCreate = [];
  if (!config.database) config.database = 'none';
  if (!config.architecture) config.architecture = 'mvc';
  if (!config.port) config.port = '3000';
  
  try {
    // Create project root
    await fs.mkdir(projectPath, { recursive: true });

    // Generate backend
    const backendGenerator = new BackendGenerator({ config, spinner, projectPath });
    await backendGenerator.generate();

    // Generate frontend
    const frontendGenerator = new FrontendGenerator({ config, spinner, projectPath });
    await frontendGenerator.generate();

    // Create root README
    await createRootReadme(projectPath, config);

    // Create CI/CD config if enabled
    if (config.ci) {
      await createCIConfig(projectPath, config);
    }

  } catch (error: any) {
    throw new Error(`Failed to generate project: ${error.message}`);
  }
}

// ========== FUNÇÕES AUXILIARES DO GENERATOR ==========

async function createRootReadme(projectPath: string, config: ProjectConfig): Promise<void> {
  const readmeContent = `# ${config.name}

${config.description}

## Project Structure

\`\`\`
${config.name}/
├── backend/          # Backend API server
├── frontend/         # Frontend application
├── docker-compose.yml # Docker configuration (if enabled)
└── README.md         # This file
\`\`\`

## Prerequisites

- Node.js ${config.backendLang === 'TypeScript' ? '18+' : '16+'}
- ${config.database !== 'none' ? `${capitalize(config.database)} database` : 'No database required'}
- npm or yarn package manager

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Copy environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Update \`.env\` with your configuration.

5. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

The backend will be available at: http://localhost:${config.port}

### Frontend Setup

1. Navigate to the frontend directory:
   \`\`\`bash
   cd frontend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

The frontend will be available at: http://localhost:${FRONTEND_PORTS[config.frontend]}

## Features

### Backend
- **Framework**: ${config.backendLang === 'TypeScript' ? 'TypeScript' : 'JavaScript'} with Express
- **Architecture**: ${config.architecture.toUpperCase()}
- **Database**: ${config.database !== 'none' ? config.database : 'None'}
- **Authentication**: ${config.features.includes('auth') ? 'JWT-based authentication' : 'Not included'}
- **Logging**: ${config.features.includes('logging') ? 'Winston with file rotation' : 'Basic console logging'}
- **Validation**: ${config.features.includes('validation') ? 'Input validation enabled' : 'Basic validation'}
- **Testing**: ${config.features.includes('testing') ? `${config.features.includes('vitest') ? 'Vitest' : 'Jest'} test framework` : 'No testing setup'}

### Frontend
- **Framework**: ${capitalize(config.frontend)}
- **Features**: ${config.frontendFeatures?.join(', ') || 'Basic functionality'}

## API Documentation

The backend API includes the following endpoints:

### Todo API
- \`GET /api/todos\` - Get all todos
- \`GET /api/todos/:id\` - Get a specific todo
- \`POST /api/todos\` - Create a new todo
- \`PUT /api/todos/:id\` - Update a todo
- \`DELETE /api/todos/:id\` - Delete a todo

### Health Check
- \`GET /health\` - API health status

## Development

### Running Tests
\`\`\`bash
cd backend
npm test
\`\`\`

### Building for Production
\`\`\`bash
cd backend
npm run build
\`\`\`

### Docker Support
${config.docker ? `
This project includes Docker configuration:

\`\`\`bash
# Build and run with Docker Compose
docker-compose up --build
\`\`\`
` : 'Docker configuration is not included.'}

## Environment Variables

See \`backend/.env.example\` for all available environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

---

Generated with ❤️ by [Spring Init](https://github.com/yourusername/spring-init)
`;

  await writeFileSafe(path.join(projectPath, 'README.md'), readmeContent);
}

async function createCIConfig(projectPath: string, config: ProjectConfig): Promise<void> {
  const workflowsDir = path.join(projectPath, '.github', 'workflows');
  await fs.mkdir(workflowsDir, { recursive: true });

  const ciContent = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Backend Dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run Backend Tests
      run: |
        cd backend
        npm test
    
    - name: Build Backend
      run: |
        cd backend
        npm run build
  
  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build Frontend
      run: |
        cd frontend
        npm run build
  
  docker-build:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: \${{ secrets.DOCKER_USERNAME }}
        password: \${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: |
          yourusername/\${config.name}-backend:latest
          yourusername/\${config.name}-backend:\${{ github.sha }}
    
    - name: Build and push Frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: |
          yourusername/\${config.name}-frontend:latest
          yourusername/\${config.name}-frontend:\${{ github.sha }}
`;

  await writeFileSafe(path.join(workflowsDir, 'ci.yml'), ciContent);
}

// Export for testing
export { BackendGenerator, FrontendGenerator };