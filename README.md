# 🌟 Painel de Administração de Assinaturas (SaaS 30 Dias)

Este é o seu site de controle e administração de licenças comerciais. Ele permite que você gerencie seus clientes, gere códigos de ativação de 30 dias (ou outro período), acompanhe em tempo real a contagem regressiva de cada cliente, renove assinaturas com 1 clique (+30 dias), bloqueie acessos ou libere a troca de computadores.

---

## 🚀 Como Usar Localmente Agora Mesmo

Você nem precisa colocar na internet para começar a testar:
1. Dê um **duplo clique no arquivo `index.html`** desta pasta.
2. A tela de login abrirá no seu navegador.
3. Digite a senha mestra inicial:
   ```
   admin2026
   ```
4. Clique no botão superior direito **`⚙️ Conexão Supabase`**:
   - Cole a **URL do seu projeto Supabase** (ex: `https://xyz.supabase.co`).
   - Cole a **Anon Public Key** do Supabase (`eyJhbG...`).
   - (Opcional) Digite uma nova senha mestra pessoal se quiser substituir a padrão.
   - Clique em **Salvar Configurações**.
5. Pronto! Suas licenças aparecerão em tempo real na tela.

---

## 🌐 Como Publicar Online no GitHub Pages (Passo a Passo)

Para ter um site online que você possa acessar do celular ou de qualquer lugar com link próprio (ex: `https://seu-usuario.github.io/financeiro-admin`):

### Passo 1: Criar o Repositório no GitHub
1. Acesse sua conta no [GitHub](https://github.com).
2. Clique no botão verde **"New"** (Novo repositório).
3. Dê o nome de `financeiro-admin` (ou outro nome de sua preferência).
4. Deixe como **Public** (Público) para usar o GitHub Pages gratuito.
5. Clique em **"Create repository"**.

### Passo 2: Subir os Arquivos desta Pasta
1. Abra o terminal nesta pasta (`financeiro-admin`) e execute:
   ```bash
   git init
   git add .
   git commit -m "Painel de administração SaaS"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/financeiro-admin.git
   git push -u origin main
   ```
   *(Ou se preferir, use o GitHub Desktop ou arraste os arquivos diretamente no site do GitHub).*

### Passo 3: Ativar o GitHub Pages
1. No GitHub, entre na página do seu repositório recém-criado.
2. Clique na aba superior **"Settings"** (Configurações).
3. No menu lateral esquerdo, clique em **"Pages"**.
4. Em **"Build and deployment" > "Branch"**, escolha a branch **`main`** e a pasta **`/(root)`**.
5. Clique em **"Save"**.
6. Em cerca de 1 minuto, o GitHub gerará seu link público oficial:
   👉 `https://seu-usuario.github.io/financeiro-admin`

---

## 🛡️ Solução para o Supabase Não Pausar (Keep-Alive Automático)

O plano gratuito do Supabase entra em modo de pausa se passar 7 dias seguidos sem nenhuma chamada de API. Para resolver isso **100% de graça e sem você precisar fazer nada**:

Este repositório já inclui o arquivo `.github/workflows/keep_alive.yml`. Quando você subir este projeto para o GitHub:
1. No seu repositório no GitHub, vá em **Settings &rarr; Secrets and variables &rarr; Actions**.
2. Clique em **New repository secret** e adicione:
   - Nome: `SUPABASE_URL` | Valor: sua URL do Supabase (ex: `https://xyz.supabase.co`)
   - Nome: `SUPABASE_ANON_KEY` | Valor: sua anon key do Supabase
3. Todos os dias às 08:00 UTC (05:00 de Brasília), o GitHub Actions fará uma chamada leve ao Supabase, renovando o temporizador de atividade e **garantindo que ele nunca pause por inatividade!**

---

## 🔑 Funcionalidades do Painel

- **Criar Novo Código (+30 dias)**:
  Gera uma chave aleatória estilizada (ex: `FIN-8942-KJ91-2026`) vinculada ao nome do seu cliente e com o título do app configurável (white-label).
- **Contagem Regressiva em Tempo Real**:
  Exibe quantos dias faltam para a mensalidade de cada cliente vencer.
- **Renovação com 1 Clique (+30 dias)**:
  Quando o cliente efetuar o pagamento via PIX/mensalidade, basta clicar no botão verde **`⚡ Renovar (+30d)`**. O vencimento é estendido na nuvem e o aplicativo desktop do cliente é liberado imediatamente.
- **Bloquear / Desbloquear**:
  Suspenda temporariamente um cliente inadimplente com o botão **`⏸️ Bloquear`**.
- **Trocar Computador (Liberar PC)**:
  Se o cliente formatar o computador ou comprar uma máquina nova, clique em **`🔄 Trocar PC`** para desvincular o identificador antigo e permitir nova ativação sem precisar gerar outra chave.
