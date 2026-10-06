# App Autorizações de Caçambas - São Gabriel

Gratuito para esse uso. Você precisa de uma conta Google.
O app fica em um link seu (ex.: https://seu-projeto.web.app). Quem abre pelo celular instala na tela inicial.

## 1. Criar o projeto
1. Entre em https://console.firebase.google.com e clique em **Criar um projeto** (nome: `cacambas-sgc`). Pode desligar o Google Analytics.

## 2. Ligar o banco e o login
1. Menu **Criação > Firestore Database > Criar banco de dados**. Escolha a região **southamerica-east1 (São Paulo)** e o modo **produção**.
2. Menu **Criação > Authentication > Vamos começar > E-mail/senha > Ativar**.
3. Na aba **Usuários**, clique em **Adicionar usuário** e crie o seu e-mail e senha de administrador.

## 3. Pegar as chaves
1. Na página inicial do projeto, clique no ícone **</>** (Web) e registre o app.
2. Copie os valores do `firebaseConfig` e cole no arquivo `firebase-config.js`, no lugar de COLE_AQUI.

## 4. Travar as edições só para você
1. Abra o arquivo `firestore.rules` e troque `TROQUE_PELO_SEU_EMAIL` pelo e-mail do passo 2.
2. No console, vá em **Firestore Database > Regras**, cole o conteúdo do arquivo e clique em **Publicar**.
Todo mundo pode ver. Só o seu e-mail consegue adicionar e remover.

## 5. Publicar (Firebase Hosting)
No computador, com o Node.js instalado, abra o terminal dentro desta pasta:
```
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```
No `init`: escolha o projeto criado, pasta pública `.`, **não** reescrever para index.html e **não** sobrescrever o index.html.
No final aparece o link do app.

## 6. Instalar no celular
- **Android (Chrome):** abra o link, toque nos três pontinhos e em **Instalar app**.
- **iPhone (Safari):** abra o link, toque em Compartilhar e em **Adicionar à Tela de Início**.

## Como usar
- Sem login: só consulta.
- Toque em **Entrar**, use o e-mail e a senha do passo 2 e libera adicionar e remover.
- Mande o link para quem só vai consultar.
