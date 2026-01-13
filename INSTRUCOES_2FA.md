# 🔐 Como Habilitar 2FA no NPM

O npm agora **exige autenticação de dois fatores (2FA)** para publicar pacotes. Siga estes passos:

## Passo 1: Habilitar 2FA na sua Conta NPM

1. **Acesse as configurações de segurança:**
   - Vá para: https://www.npmjs.com/settings/[seu-usuario]/security
   - Ou: https://www.npmjs.com → Seu perfil → Security Settings

2. **Habilite Two-Factor Authentication:**
   - Clique em "Enable 2FA"
   - Escolha um método:
     - **App Authenticator** (recomendado): Use Google Authenticator, Authy, ou Microsoft Authenticator
     - **SMS**: Receber código por SMS
   
3. **Configure o app authenticator:**
   - Escaneie o QR code com seu app
   - Digite o código de verificação
   - Salve os códigos de recuperação em local seguro

4. **Conclua a configuração**

## Passo 2: Para Publicar com Escopo @AurTTY

Se você quer manter o nome `@AurTTY/spring-init`, você precisa:

### Criar a Organização @AurTTY:

1. **Criar organização:**
   - Acesse: https://www.npmjs.com/org/create
   - Escolha o nome: `AurTTY` (exatamente como está no package.json)
   - Configure como **pública** (para permitir acesso público ao pacote)

2. **Verificar permissões:**
   - Certifique-se de que sua conta é membro da organização
   - Você precisa ser "Owner" ou ter permissão de publicação

## Passo 3: Fazer Login Novamente

Após habilitar 2FA, você precisa fazer login novamente:

```bash
npm logout
npm login
```

Quando fizer login, você será solicitado a:
- Inserir username e password
- Inserir o código 2FA do seu authenticator app

## Passo 4: Publicar

```bash
cd /home/khalifa/temp/cli
npm publish
```

## ⚠️ Importante

- **2FA é obrigatório** para publicar pacotes no npm (desde 2024)
- Mesmo que mude o nome do pacote, você ainda precisa de 2FA
- Tokens de autenticação antigos não funcionam mais

## Alternativa: Usar Nome Sem Escopo

Se preferir evitar organizações, podemos mudar para `spring-fullstack-init` (disponível):

```bash
# Mudar package.json de "@AurTTY/spring-init" para "spring-fullstack-init"
# Remover publishConfig (não é necessário para pacotes sem escopo)
```

Mas você **ainda precisa habilitar 2FA** mesmo assim!
