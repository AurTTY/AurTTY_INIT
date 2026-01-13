# 📦 Guia de Publicação no NPM

Este documento contém instruções para publicar o Spring Init CLI no npm.

## ✅ Checklist Antes de Publicar

- [x] `package.json` configurado corretamente
- [x] `publishConfig.access: "public"` adicionado (necessário para pacotes escopados)
- [x] `.npmignore` criado
- [x] README.md completo
- [x] Código compilado (dist/ está atualizado)
- [x] Testado localmente

## 🚀 Passos para Publicar

### 1. Login no NPM

Se você ainda não está logado no npm:

```bash
npm login
```

Você precisará:
- Username (ou email)
- Password
- Email (para verificação)

**Nota**: Para publicar pacotes com escopo `@AurTTY`, você precisa ter uma conta npm ou ser membro da organização `@AurTTY`. Se não tiver a organização, você pode:

**Opção A**: Criar a organização no npm (recomendado para pacotes públicos)
- Acesse: https://www.npmjs.com/org/create
- Crie a organização `AurTTY`
- Certifique-se de que ela está configurada como pública

**Opção B**: Mudar o nome do pacote para sem escopo (mais simples)
- Alterar `"name": "@AurTTY/spring-init"` para `"name": "spring-init"` no package.json
- Remover `publishConfig` (não é necessário para pacotes sem escopo)

### 2. Verificar se está Logado

```bash
npm whoami
```

### 3. Verificar o Pacote Antes de Publicar (Dry Run)

```bash
cd cli
npm pack --dry-run
```

Isso mostra o que será incluído no pacote sem publicar.

### 4. Testar Instalação Localmente

```bash
npm pack
npm install -g ./AurTTY-spring-init-0.1.0.tgz
spring-init --version
```

### 5. Publicar no NPM

```bash
cd cli
npm publish
```

Para pacotes escopados, use:

```bash
npm publish --access public
```

**Nota**: Como já adicionamos `"publishConfig": { "access": "public" }` no package.json, você pode usar apenas `npm publish`.

### 6. Verificar no Site do NPM

Após a publicação, verifique:
- https://www.npmjs.com/package/@AurTTY/spring-init

Ou se usar nome sem escopo:
- https://www.npmjs.com/package/spring-init

## 🔄 Atualizar Versão

Para publicar uma nova versão:

1. Atualize a versão no `package.json`:

```bash
npm version patch  # 0.1.0 -> 0.1.1 (bug fixes)
npm version minor  # 0.1.0 -> 0.2.0 (novas features)
npm version major  # 0.1.0 -> 1.0.0 (breaking changes)
```

Ou edite manualmente o campo `version` no `package.json`.

2. Compile o projeto:

```bash
npm run build
```

3. Publique:

```bash
npm publish
```

## 📝 Comandos Úteis

### Ver informações do pacote publicado

```bash
npm view @AurTTY/spring-init
```

### Deprecar uma versão

```bash
npm deprecate @AurTTY/spring-init@0.1.0 "mensagem de deprecação"
```

### Despublicar (dentro de 72 horas)

```bash
npm unpublish @AurTTY/spring-init@0.1.0
```

**Atenção**: Despublicar pacotes não é recomendado. Use `deprecate` em vez disso.

## 🔐 Troubleshooting

### Erro: "You do not have permission to publish"

- Verifique se está logado: `npm whoami`
- Para pacotes escopados, certifique-se de que tem acesso à organização
- Para pacotes sem escopo, verifique se o nome não está em uso

### Erro: "Package name already exists"

- Escolha outro nome no package.json
- Ou use um escopo diferente

### Erro: "Invalid package name"

- Nomes de pacotes npm devem ser lowercase
- Podem conter hífens, mas não espaços ou caracteres especiais
- Pacotes escopados devem seguir o formato `@scope/package-name`

## ✅ Após Publicar

1. Teste a instalação global:

```bash
npm install -g @AurTTY/spring-init
spring-init --version
```

2. Crie uma tag Git para a versão:

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. Anuncie no README principal do repositório (se houver)

## 📚 Recursos Adicionais

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Scoped Packages](https://docs.npmjs.com/about-scopes)
- [Package.json Documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-json)
