#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
// @ts-ignore
import gradient from 'gradient-string';
// @ts-ignore
import updateNotifier from 'update-notifier';
import { exec, spawn } from 'child_process';
import util from 'util';
import fs from 'fs-extra';
import path from 'path';

// Importações melhoradas
import { generateProject } from './generator';
import { ProjectConfig, FrontendType, BackendLang, FRONTEND_PORTS, ProfileType } from './types';
import { 
  showSuccessMessage, 
  showError, 
  showWarning, 
  showInfo,
  formatDuration,
  createProgressBar
} from './utils/ui';
import { 
  checkDependencies, 
  installDependencies, 
  setupGitRepository,
  cloneRepository 
} from './utils/helpers';
import { loadConfig, saveConfig } from './utils/config';
import { runTests } from './utils/tests';

const execAsync = util.promisify(exec);

// Em CommonJS, __dirname é global
// Verificar atualizações
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
updateNotifier({ pkg }).notify();

const program = new Command();

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Exibe o cabeçalho estilizado do CLI
 */
function showHeader(): void {
  const title = gradient('cyan', 'blue')('╔═════════════════════════════════════════════════════════════════════════════════════╗\n' +
                                       '║                                                                                     ║\n' +
                                       '║     █████╗ ██╗   ██╗██████╗ ████████╗████████╗██╗   ██╗    ██╗███╗   ██╗██╗████████╗║\n' +
                                       '║    ██╔══██╗██║   ██║██╔══██╗╚══██╔══╝╚══██╔══╝╚██╗ ██╔╝    ██║████╗  ██║██║╚══██╔══╝║\n' +
                                       '║    ███████║██║   ██║██████╔╝   ██║      ██║    ╚████╔╝     ██║██╔██╗ ██║██║   ██║   ║\n' +
                                       '║    ██╔══██║██║   ██║██╔══██╗   ██║      ██║     ╚██╔╝      ██║██║╚██╗██║██║   ██║   ║\n' +
                                       '║    ██║  ██║╚██████╔╝██║  ██║   ██║      ██║      ██║       ██║██║ ╚████║██║   ██║   ║\n' +
                                       '║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝      ╚═╝      ╚═╝       ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ║\n' +
                                       '║                                                                                     ║\n' +
                                       '╚═════════════════════════════════════════════════════════════════════════════════════╝');

  console.log(title);
  
  const subtitle = boxen(
    '🚀 Professional Fullstack Generator | Version ' + pkg.version + 
    '\n📦 Create production-ready JS/TS applications in seconds\n' +
    '✨ By AurTTY - Roberto Carlos',
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      backgroundColor: '#111'
    }
  );
  
  console.log(subtitle + '\n');
}

/**
 * Valida o nome do projeto
 */
function validateProjectName(name: string): boolean | string {
  if (!name || name.trim().length === 0) {
    return 'Project name is required';
  }
  
  if (name.length > 50) {
    return 'Project name must be less than 50 characters';
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return 'Project name can only contain letters, numbers, hyphens and underscores';
  }
  
  if (fs.existsSync(path.join(process.cwd(), name))) {
    return `Directory "${name}" already exists`;
  }
  
  return true;
}

/**
 * Configuração avançada do projeto
 */
async function advancedConfiguration(currentConfig: Partial<ProjectConfig>): Promise<Partial<ProjectConfig>> {
  const { showAdvanced } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showAdvanced',
      message: 'Show advanced configuration?',
      default: false
    }
  ]);

  if (!showAdvanced) {
    return currentConfig;
  }

  const advancedAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'architecture',
      message: 'Project architecture:',
      choices: [
        { name: 'MVC (Model-View-Controller)', value: 'mvc' },
        { name: 'Clean Architecture', value: 'clean' },
        { name: 'Layered Architecture', value: 'layered' },
        { name: 'Modular Monolith', value: 'modular' },
        { name: 'Microservices (Coming Soon)', value: 'microservices', disabled: true }
      ],
      default: 'mvc'
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Additional features:',
      choices: [
        { name: '🔐 Authentication System (JWT)', value: 'auth' },
        { name: '🗄️ Database Integration', value: 'database' },
        { name: '📝 API Documentation (Swagger/OpenAPI)', value: 'docs' },
        { name: '📊 Logging System (Winston/Morgan)', value: 'logging' },
        { name: '✅ Input Validation (Joi/Zod)', value: 'validation' },
        { name: '🛡️ Rate Limiting', value: 'rateLimit' },
        { name: '🌐 CORS Configuration', value: 'cors' },
        { name: '🧪 Testing Setup (Jest/Vitest)', value: 'testing' },
        { name: '📦 Docker Configuration', value: 'docker' },
        { name: '⚡ CI/CD Pipeline (GitHub Actions)', value: 'ci' }
      ],
      default: ['cors', 'validation', 'testing']
    },
    {
      type: 'list',
      name: 'database',
      message: 'Database (if enabled):',
      choices: [
        { name: 'PostgreSQL', value: 'postgres' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'SQLite', value: 'sqlite' },
        { name: 'None', value: 'none' }
      ],
      default: 'none',
      when: (answers: any) => answers.features?.includes('database')
    },
    {
      type: 'confirm',
      name: 'gitHubActions',
      message: 'Setup GitHub Actions workflow?',
      default: true,
      when: (answers: any) => answers.features?.includes('ci')
    },
    {
      type: 'input',
      name: 'port',
      message: 'Backend server port:',
      default: '3000',
      validate: (input: string) => {
        const port = parseInt(input);
        return (port > 0 && port < 65536) || 'Please enter a valid port number';
      }
    }
  ]);

  return { ...currentConfig, ...advancedAnswers };
}

/**
 * Configuração do frontend
 */
async function frontendConfiguration(): Promise<FrontendConfig> {
  const frontendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Frontend framework:',
      choices: [
        { name: 'Vanilla (HTML/CSS/JS)', value: 'vanilla' },
        { name: 'Vue.js 3 + Vite', value: 'vue' },
        { name: 'React + Vite', value: 'react' },
        { name: 'Next.js (SSR)', value: 'next' },
        { name: 'Angular', value: 'angular' },
        { name: 'Svelte + Vite', value: 'svelte' }
      ],
      default: 'vanilla'
    },
    {
      type: 'checkbox',
      name: 'frontendFeatures',
      message: 'Frontend features:',
      choices: [
        { name: 'State Management (Pinia/Redux)', value: 'state' },
        { name: 'Routing (Vue Router/React Router)', value: 'routing' },
        { name: 'UI Framework (Tailwind/Bootstrap)', value: 'ui' },
        { name: 'API Client (Axios)', value: 'apiClient' },
        { name: 'Testing (Vitest/Jest)', value: 'testing' },
        { name: 'TypeScript', value: 'typescript' }
      ],
      default: ['apiClient', 'ui']
    },
    {
      type: 'confirm',
      name: 'connectToBackend',
      message: 'Connect frontend to backend automatically?',
      default: true
    }
  ]);

  return frontendAnswers;
}

/**
 * Fluxo principal de criação de projeto
 */
async function createProjectFlow(defaults: Partial<ProjectConfig> = {}): Promise<void> {
  const startTime = Date.now();
  const spinner = ora();
  
  try {
    showHeader();

    // ========== PASSO 1: CONFIGURAÇÃO BÁSICA ==========
    console.log(chalk.cyan.bold('\n📋 Step 1: Basic Configuration'));
    console.log(chalk.gray('─────────────────────────────\n'));

    const basicAnswers = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Project name:',
        default: defaults.name,
        validate: validateProjectName,
        transformer: (input: string) => chalk.cyan(input)
      },
      {
        name: 'description',
        type: 'input',
        message: 'Project description:',
        default: 'A professional fullstack application'
      },
      {
        name: 'backendLang',
        type: 'list',
        message: 'Backend language:',
        choices: [
          { name: 'TypeScript (Recommended)', value: 'TypeScript' },
          { name: 'JavaScript', value: 'JavaScript' }
        ],
        default: defaults.backendLang || 'TypeScript'
      },
      {
        name: 'frontend',
        type: 'list',
        message: 'Frontend framework:',
        choices: [
          { name: 'Vanilla (HTML/CSS/JS)', value: 'vanilla' },
          { name: 'Vue.js 3 + Vite', value: 'vue' },
          { name: 'Next.js', value: 'next' },
          { name: 'Angular', value: 'angular' },
          { name: 'React + Vite', value: 'react' },
          { name: 'Backend Only', value: 'none' }
        ],
        default: defaults.frontend || 'vanilla'
      }
    ]);

    // ========== PASSO 2: CONFIGURAÇÃO DO FRONTEND ==========
    let frontendConfig = {};
    if (basicAnswers.frontend !== 'none') {
      console.log(chalk.cyan.bold('\n🎨 Step 2: Frontend Configuration'));
      console.log(chalk.gray('─────────────────────────────────\n'));
      frontendConfig = await frontendConfiguration();
    }

    // ========== PASSO 3: CONFIGURAÇÃO AVANÇADA ==========
    console.log(chalk.cyan.bold('\n⚙️  Step 3: Advanced Configuration'));
    console.log(chalk.gray('─────────────────────────────────\n'));
    
    const advancedConfig = await advancedConfiguration(basicAnswers);

    // ========== PASSO 4: GIT & INSTALAÇÃO ==========
    console.log(chalk.cyan.bold('\n🔧 Step 4: Setup & Installation'));
    console.log(chalk.gray('────────────────────────────────\n'));

    const setupAnswers = await inquirer.prompt([
      {
        name: 'gitInit',
        type: 'confirm',
        message: 'Initialize git repository?',
        default: true
      },
      {
        name: 'gitHubRepo',
        type: 'input',
        message: 'GitHub repository URL (optional):',
        when: (answers: any) => answers.gitInit,
        validate: (input: string) => {
          if (!input) return true;
          const urlPattern = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
          return urlPattern.test(input) || 'Please enter a valid GitHub repository URL';
        }
      },
      {
        name: 'installDeps',
        type: 'confirm',
        message: 'Install dependencies automatically?',
        default: true
      },
      {
        name: 'runAfterCreate',
        type: 'checkbox',
        message: 'Run after creation:',
        choices: [
          { name: 'Start development server', value: 'dev' },
          { name: 'Run tests', value: 'test' },
          { name: 'Open in VSCode', value: 'vscode' }
        ],
        default: []
      }
    ]);

    // ========== RESUMO DA CONFIGURAÇÃO ==========
    const projectConfig: ProjectConfig = {
      name: basicAnswers.name,
      backendLang: basicAnswers.backendLang as BackendLang,
      frontend: basicAnswers.frontend as FrontendType,
      description: basicAnswers.description,
      ...advancedConfig,
      ...frontendConfig,
      ...setupAnswers
    };

    console.log(chalk.cyan.bold('\n📊 Configuration Summary'));
    console.log(chalk.gray('─────────────────────────\n'));

    console.log(chalk.bold('📁 Project:') + '      ' + chalk.green(projectConfig.name));
    console.log(chalk.bold('📝 Description:') + '  ' + chalk.cyan(projectConfig.description));
    console.log(chalk.bold('⚙️  Backend:') + '      ' + chalk.yellow(projectConfig.backendLang));
    console.log(chalk.bold('🎨 Frontend:') + '     ' + chalk.magenta(projectConfig.frontend.charAt(0).toUpperCase() + projectConfig.frontend.slice(1)));
    
    if (projectConfig.features && projectConfig.features.length > 0) {
      console.log(chalk.bold('✨ Features:') + '       ' + projectConfig.features.map((f: string) => chalk.blue(f)).join(', '));
    }
    
    console.log(chalk.bold('📂 Location:') + '     ' + chalk.dim(path.join(process.cwd(), projectConfig.name)));
    console.log(chalk.bold('🐙 Git:') + '           ' + (projectConfig.gitInit ? chalk.green('Enabled') : chalk.red('Disabled')));

    console.log(chalk.gray('\n─────────────────────────'));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Create project with these settings?',
        default: true
      }
    ]);

    if (!confirm) {
      showWarning('Project creation cancelled');
      return;
    }

    // ========== CRIAÇÃO DO PROJETO ==========
    console.log('\n');
    spinner.start(chalk.cyan('🚀 Creating project...'));

    // Verificar dependências
    const depsCheck = await checkDependencies();
    if (!depsCheck.success) {
      spinner.fail('Dependency check failed');
      showError(depsCheck.message);
      return;
    }

    // Gerar projeto
    const projectPath = path.join(process.cwd(), projectConfig.name);
    
    try {
      await generateProject(projectConfig, spinner);
      spinner.succeed(chalk.green('Project structure created!'));

      // Configurar Git
      if (projectConfig.gitInit) {
        spinner.start(chalk.cyan('🔧 Setting up Git repository...'));
        await setupGitRepository(projectPath);
        spinner.succeed(chalk.green('Git repository initialized!'));
      }

      // Instalar dependências
      if (projectConfig.installDeps) {
        spinner.start(chalk.cyan('📦 Installing dependencies...'));
        await installDependencies(projectPath);
        spinner.succeed(chalk.green('Dependencies installed!'));
      }

      // Salvar configuração
      await saveConfig(projectPath, projectConfig);

      const duration = formatDuration(Date.now() - startTime);

      // ========== MENSAGEM DE SUCESSO ==========
      showSuccessMessage(`🎉 Project Created Successfully! Your professional ${projectConfig.frontend} + ${projectConfig.backendLang} application is ready in ${duration}!`);

      // ========== PRÓXIMOS PASSOS ==========
      console.log(chalk.cyan.bold('\n🚀 Next Steps:'));
      console.log(chalk.gray('─────────────────────────'));

      const commands = [
        chalk.cyan(`cd ${projectConfig.name}`)
      ];

      if (projectConfig.frontend !== 'none') {
        commands.push(chalk.green('npm run dev') + chalk.dim(' - Start development server'));
      } else {
        commands.push(chalk.green('npm start') + chalk.dim(' - Start backend server'));
      }

      commands.push(
        chalk.green('npm test') + chalk.dim(' - Run tests'),
        chalk.green('npm run build') + chalk.dim(' - Build for production'),
        chalk.gray('─────────────────────────')
      );

      console.log(commands.join('\n'));

      // ========== AÇÕES PÓS-CRIAÇÃO ==========
      if (projectConfig.runAfterCreate && projectConfig.runAfterCreate.length > 0) {
        console.log(chalk.cyan.bold('\n⚡ Running post-creation actions...'));
        
        if (projectConfig.runAfterCreate.includes('dev')) {
          console.clear();
          console.log(chalk.cyan.bold('🚀 Starting development server...\n'));
          const child = spawn('npm', ['run', 'dev'], { 
            cwd: projectPath, 
            stdio: 'inherit',
            shell: true 
          });
          child.on('error', (error) => {
            showError('Failed to start development server: ' + error.message);
          });
          // Não esperar, deixar rodar
          return; // Sair do CLI após iniciar o servidor
        }
        
        if (projectConfig.runAfterCreate.includes('test')) {
          await runTests(projectPath);
        }
        
        if (projectConfig.runAfterCreate.includes('vscode')) {
          try {
            await execAsync(`code "${projectPath}"`);
            showInfo('Opened project in VSCode');
          } catch {
            showWarning('VSCode not found or not in PATH');
          }
        }
      }

      // ========== EXEMPLO TODO LIST ==========
      if (projectConfig.frontend !== 'none' && projectConfig.connectToBackend) {
        console.log(chalk.cyan.bold('\n📝 Todo List Example:'));
        console.log(chalk.gray('─────────────────────────'));
        console.log(chalk.dim('A complete todo list example has been set up with:'));
        console.log(chalk.blue('• Backend API:') + ' http://localhost:' + (projectConfig.port || '3000') + '/api/todos');
        console.log(chalk.blue('• Frontend:') + ' http://localhost:' + FRONTEND_PORTS[projectConfig.frontend]);
        console.log(chalk.blue('• CORS:') + ' Pre-configured for development');
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Project creation failed!'));
      showError(error.message);
      console.error(chalk.dim(error.stack));
      
      // Limpar em caso de erro
      if (fs.existsSync(projectPath)) {
        fs.removeSync(projectPath);
        showInfo(`Cleaned up failed project at: ${projectPath}`);
      }
    }

  } catch (error: any) {
    showError(`An unexpected error occurred: ${error.message}`);
  }
}

/**
 * Menu principal interativo
 */
async function showMainMenu(): Promise<void> {
  while (true) {
    showHeader();

    const { choice } = await inquirer.prompt([
      {
        name: 'choice',
        type: 'list',
        message: 'What would you like to do?',
        pageSize: 10,
        choices: [
          { name: '🚀 Create New Project', value: 'create' },
          { name: '📂 Create From Template', value: 'template' },
          { name: '⚙️  Configure Settings', value: 'settings' },
          { name: '🧩 Manage Plugins', value: 'plugins' },
          { name: '📦 Update Generator', value: 'update' },
          { name: '📚 Documentation', value: 'docs' },
          new inquirer.Separator(),
          { name: '🔄 Recent Projects', value: 'recent' },
          { name: '🧪 Run Tests', value: 'tests' },
          new inquirer.Separator(),
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (choice) {
      case 'create':
        await createProjectFlow();
        break;
        
      case 'template':
        console.log(chalk.yellow('\n📋 Template selection coming soon!'));
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
        
      case 'settings':
        console.log(chalk.yellow('\n⚙️  Settings configuration coming soon!'));
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
        
      case 'plugins':
        console.log(chalk.yellow('\n🧩 Plugin management coming soon!'));
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
        
      case 'update':
        await updateGenerator();
        break;
        
      case 'docs':
        await openDocumentation();
        break;
        
      case 'recent':
        await showRecentProjects();
        break;
        
      case 'tests':
        await runGeneratorTests();
        break;
        
      case 'exit':
        console.log(chalk.cyan('\n👋 Goodbye! Happy coding!'));
        process.exit(0);
    }

    console.log('\n');
  }
}

/**
 * Atualizar o gerador
 */
async function updateGenerator(): Promise<void> {
  const spinner = ora('Checking for updates...').start();
  
  try {
    const { stdout } = await execAsync('npm show spring-init version');
    const latestVersion = stdout.trim();
    
    if (latestVersion === pkg.version) {
      spinner.succeed(chalk.green('You have the latest version!'));
    } else {
      spinner.warn(chalk.yellow(`Update available: ${pkg.version} → ${latestVersion}`));
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Update now?',
          default: true
        }
      ]);
      
      if (confirm) {
        spinner.start('Updating...');
        await execAsync('npm install -g spring-init');
        spinner.succeed(chalk.green('Updated successfully!'));
        showInfo('Please restart the terminal for changes to take effect.');
      }
    }
  } catch (error) {
    spinner.fail('Failed to check for updates');
    showError(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Abrir documentação
 */
async function openDocumentation(): Promise<void> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Documentation:',
      choices: [
        { name: 'Open in browser', value: 'browser' },
        { name: 'Show quick start', value: 'quickstart' },
        { name: 'Back', value: 'back' }
      ]
    }
  ]);

  if (action === 'browser') {
    // Abrir docs no navegador
    showInfo('Opening documentation...');
  } else if (action === 'quickstart') {
    console.log(chalk.cyan('\n📖 Quick Start Guide:'));
    console.log(chalk.gray('─────────────────────────'));
    console.log(chalk.dim(`
1. Create a new project:
   ${chalk.cyan('spring-init create')}

2. Generate with options:
   ${chalk.cyan('spring-init init --name myapp --template vue --typescript')}

3. Generate backend only:
   ${chalk.cyan('spring-init init --name api --backend-only')}

4. Get help:
   ${chalk.cyan('spring-init --help')}
    `));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }
}

/**
 * Mostrar projetos recentes
 */
async function showRecentProjects(): Promise<void> {
  // Implementar lógica de projetos recentes
  console.log(chalk.yellow('\n📂 Recent projects feature coming soon!'));
}

/**
 * Rodar testes do gerador
 */
async function runGeneratorTests(): Promise<void> {
  const spinner = ora('Running generator tests...').start();
  
  try {
    await execAsync('npm test', { cwd: __dirname });
    spinner.succeed(chalk.green('All tests passed!'));
  } catch (error) {
    spinner.fail(chalk.red('Tests failed!'));
  }
}

/**
 * Retorna features baseadas no perfil
 */
function getProfileFeatures(profile: string): string[] {
  switch (profile) {
    case 'startup':
      return ['auth', 'database'];
    case 'enterprise':
      return ['auth', 'database', 'logging', 'validation', 'metrics'];
    case 'microservice':
      return ['healthcheck', 'graceful-shutdown', 'opentelemetry'];
    default:
      return [];
  }
}

// ========== CONFIGURAÇÃO DO COMMANDER ==========

program
  .name('aurtty')
  .description('🚀 AurTTY - Professional API & Fullstack Generator')
  .version(pkg.version, '-v, --version', 'Show version')
  .helpOption('-h, --help', 'Show help');

// Comando init (interativo)
program
  .command('init')
  .description('Create a new project interactively')
  .option('-q, --quick', 'Quick setup with defaults')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    if (options.yes) {
      // Setup automático com defaults
      const defaults = {
        name: 'my-app',
        backendLang: 'TypeScript' as BackendLang,
        frontend: 'vanilla' as FrontendType,
        gitInit: true,
        installDeps: true
      };
      await createProjectFlow(defaults);
    } else {
      await createProjectFlow();
    }
  });

// Comando init não-interativo
program
  .command('init')
  .description('Create project non-interactively')
  .option('-n, --name <name>', 'Project name (required)')
  .option('-t, --template <template>', 'Frontend template (vanilla|vue|next|angular|react|svelte)', 'vanilla')
  .option('-ts, --typescript', 'Use TypeScript for backend', true)
  .option('-js, --javascript', 'Use JavaScript for backend')
  .option('-b, --backend-only', 'Create backend only', false)
  .option('--no-install', 'Skip npm install', false)
  .option('--no-git', 'Skip git init', false)
  .option('-f, --features <features...>', 'Additional features (auth,database,docs,etc)')
  .option('-o, --output <path>', 'Output directory', '.')
  .action(async (options) => {
    if (!options.name) {
      showError('Project name is required. Use --name <name>');
      process.exit(1);
    }

    const config: ProjectConfig = {
      name: options.name,
      backendLang: options.javascript ? 'JavaScript' : 'TypeScript',
      frontend: options.backendOnly ? 'none' : (options.template as FrontendType),
      architecture: 'mvc',
      database: 'none',
      port: '3000',
      features: options.features || [],
      gitInit: !options.noGit,
      installDeps: !options.noInstall,
      description: `Generated with spring-init`,
      connectToBackend: false,
      docker: false,
      ci: false
    };

    try {
      await createProjectFlow(config);
    } catch (error) {
      showError('Failed to create project');
      process.exit(1);
    }
  });

// Comando new para projetos com perfis
program
  .command('new <type>')
  .description('Create a new project with specific type and profile')
  .option('-n, --name <name>', 'Project name (required)')
  .option('-p, --profile <profile>', 'Project profile (startup|enterprise|microservice)', 'startup')
  .option('-ts, --typescript', 'Use TypeScript for backend', true)
  .option('-js, --javascript', 'Use JavaScript for backend')
  .option('--no-install', 'Skip npm install', false)
  .option('--no-git', 'Skip git init', false)
  .action(async (type, options) => {
    if (!options.name) {
      showError('Project name is required. Use --name <name>');
      process.exit(1);
    }

    if (!['api', 'web', 'fullstack'].includes(type)) {
      showError('Invalid type. Use api, web, or fullstack');
      process.exit(1);
    }

    if (!['startup', 'enterprise', 'microservice'].includes(options.profile)) {
      showError('Invalid profile. Use startup, enterprise, or microservice');
      process.exit(1);
    }

    const config: ProjectConfig = {
      name: options.name,
      backendLang: options.javascript ? 'JavaScript' : 'TypeScript',
      frontend: type === 'api' ? 'none' : 'vanilla',
      architecture: options.profile === 'microservice' ? 'microservices' : 'mvc',
      database: 'none',
      port: '3000',
      features: getProfileFeatures(options.profile),
      gitInit: !options.noGit,
      installDeps: !options.noInstall,
      description: `Generated with AurTTY - ${type} ${options.profile}`,
      connectToBackend: false,
      docker: true,
      ci: true,
      profile: options.profile as ProfileType
    };

    try {
      await createProjectFlow(config);
    } catch (error) {
      showError('Failed to create project');
      process.exit(1);
    }
  });

// Comando para listar templates
program
  .command('templates')
  .description('List available templates')
  .action(() => {
    console.log(chalk.cyan.bold('\n📋 Available Templates:'));
    console.log(chalk.gray('─────────────────────────'));
    
    const templates = [
      { name: 'Fullstack Vue + Express', cmd: 'aurtty init --name app --template vue --typescript' },
      { name: 'React + Node API', cmd: 'aurtty init --name app --template react --typescript' },
      { name: 'Next.js Fullstack', cmd: 'aurtty init --name app --template next --typescript' },
      { name: 'Backend API Only', cmd: 'aurtty init --name api --backend-only --typescript' },
      { name: 'Angular + NestJS', cmd: 'aurtty init --name app --template angular --typescript' },
      { name: 'API Startup Profile', cmd: 'aurtty new api --name api --profile startup' },
      { name: 'API Enterprise Profile', cmd: 'aurtty new api --name api --profile enterprise' },
      { name: 'API Microservice Profile', cmd: 'aurtty new api --name api --profile microservice' }
    ];

    templates.forEach(template => {
      console.log(chalk.bold(template.name));
      console.log(chalk.dim(`  ${template.cmd}\n`));
    });
  });

// Comando para atualizar
program
  .command('update')
  .description('Update spring-init to latest version')
  .action(updateGenerator);

// Comando para config
program
  .command('config')
  .description('Configure generator settings')
  .action(async () => {
    console.log(chalk.yellow('\n⚙️  Configuration manager coming soon!'));
  });

// Comando infra
program
  .command('infra <type>')
  .description('Generate infrastructure files')
  .option('-n, --name <name>', 'Project name', 'app')
  .action(async (type, options) => {
    if (!['docker', 'compose', 'k8s'].includes(type)) {
      showError('Invalid infra type. Use docker, compose, or k8s');
      process.exit(1);
    }

    const spinner = ora(`Generating ${type} infrastructure...`).start();
    try {
      await generateInfra(type, options.name);
      spinner.succeed(chalk.green(`${type} infrastructure generated!`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to generate ${type} infrastructure`));
    }
  });

// Comando cicd
program
  .command('cicd <platform>')
  .description('Generate CI/CD pipelines')
  .option('-n, --name <name>', 'Project name', 'app')
  .action(async (platform, options) => {
    if (!['github', 'gitlab', 'azure'].includes(platform)) {
      showError('Invalid platform. Use github, gitlab, or azure');
      process.exit(1);
    }

    const spinner = ora(`Generating ${platform} CI/CD pipeline...`).start();
    try {
      await generateCI(platform, options.name);
      spinner.succeed(chalk.green(`${platform} CI/CD pipeline generated!`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to generate ${platform} CI/CD pipeline`));
    }
  });

// ========== EXECUÇÃO PRINCIPAL ==========

// Funções auxiliares para infra e CI/CD

async function createDockerfile(projectPath: string): Promise<void> {
  const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
`;

  await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);
}

async function createDockerCompose(projectPath: string): Promise<void> {
  const compose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
    volumes:
      - ./.env.production:/app/.env.production

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

  await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), compose);

  const envProd = `NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@db:5432/app
JWT_SECRET=your-secret-key
`;

  await fs.writeFile(path.join(projectPath, '.env.production'), envProd);
}

async function createK8sFiles(projectPath: string): Promise<void> {
  const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: your-registry/app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
`;

  await fs.writeFile(path.join(projectPath, 'k8s-deployment.yaml'), deployment);
}

async function createGitHubActions(projectPath: string): Promise<void> {
  const workflow = `name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run lint
    - run: npm test -- --coverage
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run security scan
      uses: github/super-linter/slim@v5
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
`;

  const githubDir = path.join(projectPath, '.github', 'workflows');
  await fs.ensureDir(githubDir);
  await fs.writeFile(path.join(githubDir, 'ci.yml'), workflow);
}

async function createGitLabCI(projectPath: string): Promise<void> {
  const gitlabci = `stages:
  - test
  - security
  - build

test:
  stage: test
  image: node:18
  before_script:
    - npm ci
  script:
    - npm run lint
    - npm test -- --coverage
  coverage: '/All files[^|]*\\|([^|]*)\\|/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

security:
  stage: security
  image: zricethezav/gitleaks:latest
  script:
    - gitleaks detect --verbose --redact --config .gitleaks.toml

build:
  stage: build
  image: node:18
  before_script:
    - npm ci
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
`;

  await fs.writeFile(path.join(projectPath, '.gitlab-ci.yml'), gitlabci);
}

async function createAzurePipelines(projectPath: string): Promise<void> {
  const azure = `trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'Install dependencies'

- script: npm run lint
  displayName: 'Run linter'

- script: npm test -- --coverage
  displayName: 'Run tests'

- task: PublishTestResults@2
  inputs:
    testResultsFiles: '**/test-results.xml'
    testRunTitle: 'Node.js tests'
  condition: succeededOrFailed()

- task: PublishCodeCoverageResults@1
  inputs:
    codeCoverageTool: 'Cobertura'
    summaryFileLocation: 'coverage/cobertura-coverage.xml'

- script: npm run build
  displayName: 'Build application'

- task: PublishBuildArtifacts@1
  inputs:
    pathtoPublish: 'dist'
    artifactName: 'dist'
`;

  await fs.writeFile(path.join(projectPath, 'azure-pipelines.yml'), azure);
}

// Funções para gerar infra e CI/CD
async function generateInfra(type: string, name: string): Promise<void> {
  const projectPath = process.cwd();

  switch (type) {
    case 'docker':
      await createDockerfile(projectPath);
      break;
    case 'compose':
      await createDockerCompose(projectPath);
      break;
    case 'k8s':
      await createK8sFiles(projectPath);
      break;
  }
}

async function generateCI(platform: string, name: string): Promise<void> {
  const projectPath = process.cwd();

  switch (platform) {
    case 'github':
      await createGitHubActions(projectPath);
      break;
    case 'gitlab':
      await createGitLabCI(projectPath);
      break;
    case 'azure':
      await createAzurePipelines(projectPath);
      break;
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  showError(`Uncaught Exception: ${error.message}`);
  console.error(chalk.dim(error.stack));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  showError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Executar o programa
async function main() {
  try {
    // Se não houver argumentos, mostrar menu interativo
    if (process.argv.length <= 2) {
      await showMainMenu();
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error: any) {
    showError(`Fatal error: ${error.message}`);
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  main();
}

// Tipos auxiliares
interface FrontendConfig {
  framework: string;
  frontendFeatures: string[];
  connectToBackend: boolean;
}

// Exportar para uso em outros arquivos
export { createProjectFlow, showMainMenu };