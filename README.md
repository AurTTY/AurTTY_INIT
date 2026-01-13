# 🚀 AurTTY Init

> Professional API & Fullstack Generator CLI - Create production-ready applications in seconds

AurTTY Init is a powerful command-line tool that generates complete, production-ready applications with modern architectures, best practices, and enterprise-grade features. Built for developers who want to focus on business logic instead of boilerplate code.

## ✨ Features

- 🎯 **Multi-Profile APIs**: Startup, Enterprise, and Microservice profiles
- 🏗️ **Fullstack Generators**: Vue.js, React, Next.js, Angular, Svelte
- ⚙️ **Backend Support**: TypeScript/JavaScript with Express.js
- 🐳 **Infrastructure as Code**: Docker, Docker Compose, Kubernetes
- 🔄 **CI/CD Ready**: GitHub Actions, GitLab CI, Azure DevOps
- 🎨 **Modern Stack**: Pre-configured with industry best practices
- 📦 **One-Command Setup**: Automatic dependency installation
- 🔧 **Highly Customizable**: Interactive and programmatic modes
- 🐙 **Git Integration**: Automatic repository initialization
- 🧪 **Testing Ready**: Jest, Vitest, and more
- 📊 **Monitoring**: Health checks, logging, metrics
- 🔒 **Security**: Authentication, validation, CORS

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @aurtty/spring-init
```

### Local Installation

```bash
npm install @aurtty/spring-init
```

### Requirements

- Node.js >= 16.0.0
- npm or yarn

## 🚀 Quick Start

### Create Your First API

```bash
# Interactive mode
aurtty init

# Or create a microservice API directly
aurtty new api --name my-microservice --profile microservice
```

## 📖 Usage Guide

### Core Commands

#### `aurtty init` - Interactive Project Creation
Launch the interactive wizard to configure your project step-by-step:

```bash
aurtty init
```

This will guide you through:
- Project name and description
- Backend language (TypeScript/JavaScript)
- Frontend framework
- Architecture and features
- Git and deployment options

#### `aurtty new <type> --profile <profile>` - Direct Project Creation
Create projects with specific profiles:

```bash
# Startup API (simple, fast)
aurtty new api --name my-startup-api --profile startup

# Enterprise API (full-featured)
aurtty new api --name my-enterprise-api --profile enterprise

# Microservice API (production-ready)
aurtty new api --name my-microservice --profile microservice
```

### Infrastructure Commands

#### `aurtty infra <type>` - Generate Infrastructure Files

```bash
# Generate Dockerfile
aurtty infra docker

# Generate Docker Compose with database
aurtty infra compose

# Generate Kubernetes manifests
aurtty infra k8s
```

#### `aurtty cicd <platform>` - Generate CI/CD Pipelines

```bash
# GitHub Actions
aurtty cicd github

# GitLab CI/CD
aurtty cicd gitlab

# Azure DevOps
aurtty cicd azure
```

### Utility Commands

```bash
# List available templates
aurtty templates

# Show help
aurtty --help

# Show version
aurtty --version
```

## 🎯 Project Profiles

### Startup Profile
Perfect for MVPs and small projects:
- ✅ Authentication (JWT)
- ✅ Database integration
- ✅ Basic logging
- ✅ Input validation
- ⚡ Fast setup, minimal overhead

### Enterprise Profile
Full-featured for business applications:
- ✅ Authentication & Authorization
- ✅ Database with migrations
- ✅ Advanced logging (Winston)
- ✅ Input validation (Joi/Zod)
- ✅ API documentation (Swagger)
- ✅ Testing setup
- ✅ Docker configuration
- ✅ CI/CD pipeline

### Microservice Profile
Production-ready microservices:
- ✅ Health checks (/health endpoint)
- ✅ Graceful shutdown
- ✅ OpenTelemetry integration
- ✅ Advanced monitoring
- ✅ Container optimization
- ✅ Kubernetes-ready

## 📋 Detailed Examples

### Creating APIs with Different Profiles

```bash
# Startup API - Quick and simple
aurtty new api --name user-service --profile startup
cd user-service
npm start

# Enterprise API - Full-featured
aurtty new api --name order-service --profile enterprise
cd order-service
npm run dev

# Microservice API - Production-ready
aurtty new api --name payment-service --profile microservice
cd payment-service
npm run build
```

### Fullstack Applications

```bash
# Vue.js + Express
aurtty init --name my-vue-app --template vue --typescript

# React + Node.js
aurtty init --name my-react-app --template react --typescript

# Next.js Fullstack
aurtty init --name my-next-app --template next --typescript
```

### Infrastructure Setup

```bash
# Create a project first
aurtty new api --name my-api --profile enterprise

# Add Docker support
cd my-api
aurtty infra docker

# Add Docker Compose with database
aurtty infra compose

# Add Kubernetes manifests
aurtty infra k8s

# Add CI/CD pipeline
aurtty cicd github
```

## 🛠️ Command Reference

### `aurtty init` Options

```bash
aurtty init [options]

Options:
  -q, --quick          Quick setup with defaults
  -y, --yes           Skip prompts and use defaults
  -h, --help          Show help
```

### `aurtty new` Options

```bash
aurtty new <type> [options]

Arguments:
  type                 Project type (api|web|fullstack)

Options:
  -n, --name <name>    Project name (required)
  -p, --profile <profile> Project profile (startup|enterprise|microservice)
  -ts, --typescript    Use TypeScript (default)
  -js, --javascript    Use JavaScript
  --no-install         Skip dependency installation
  --no-git            Skip Git initialization
  -h, --help          Show help
```

### `aurtty infra` Options

```bash
aurtty infra <type> [options]

Arguments:
  type                 Infrastructure type (docker|compose|k8s)

Options:
  -n, --name <name>    Project name (default: current directory)
  -h, --help          Show help
```

### `aurtty cicd` Options

```bash
aurtty cicd <platform> [options]

Arguments:
  platform             CI/CD platform (github|gitlab|azure)

Options:
  -n, --name <name>    Project name (default: current directory)
  -h, --help          Show help
```

## 📁 Generated Project Structure

### API Project Structure

```
my-api/
├── src/
│   ├── controllers/     # Route controllers
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   └── server.ts       # Main server file
├── tests/              # Test files
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Multi-container setup
├── .env.example        # Environment variables
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── README.md          # Project documentation
```

### Enterprise Profile Additions

```
my-api/
├── logs/               # Application logs
├── docs/               # API documentation
├── k8s/               # Kubernetes manifests
├── .github/workflows/ # CI/CD pipelines
├── src/
│   ├── config/        # Configuration files
│   ├── services/      # Business logic
│   ├── validators/    # Input validation
│   └── types/         # TypeScript types
└── docker-compose.prod.yml
```

### Microservice Profile Additions

```
my-api/
├── src/
│   ├── health/        # Health check endpoints
│   ├── telemetry/     # OpenTelemetry setup
│   └── graceful-shutdown.ts
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── .env.production    # Production environment
```

## 🔧 Development & Testing

### Local Development

```bash
# Clone and setup
git clone https://github.com/AurTTY/AurTTY_INIT.git
cd AurTTY_INIT/cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link

# Test commands
aurtty --version
aurtty templates
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="should create project"
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Use conventional commits
- Ensure all tests pass

## 📄 License

MIT © AurTTY - Roberto Carlos

## 📞 Support & Community

- 📧 **Email**: support@aurtty.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/AurTTY/AurTTY_INIT/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/AurTTY/AurTTY_INIT/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/AurTTY/AurTTY_INIT/wiki)

## 🙏 Acknowledgments

- Built with ❤️ by AurTTY - Roberto Carlos
- Inspired by modern development practices
- Thanks to the open-source community

---

**AurTTY Init** - Because every great application starts with great foundations! 🚀
