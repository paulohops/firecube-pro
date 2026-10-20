# 🔥 FireCube Pro

Um ecossistema completo de Speedcubing gamificado para o navegador, com cronômetro profissional oficial WCA, arena de duelos com robô 3D, página dedicada de evolução com gráficos interativos, sistema de gamificação Codédex Club com passaporte e missões diárias, visualizador 3D com Three.js, banco de dados persistente, guia visual ilustrado e compatibilidade total com Docker e Portainer!

---

## 🌟 Funcionalidades Completas

### 1. ⏱️ Cronômetro Profissional WCA (Treino Livre)
- **Controle de Precisão**: Segure a barra de `ESPAÇO` ou toque na tela até ficar verde (300ms) e solte para disparar.
- **Inspeção Oficial de 15 segundos**: Alertas sonoros aos 8s e 12s, penalidade automática `+2` e `DNF`.
- **Visão 3D e Plano 2D**: Cubo 3D interativo via Three.js (com rotação livre e zoom) e planificação 2D em cruz desdobrada.
- **Faixa de Embaralhamento em Destaque**: Movimentos WCA gerados com elementos CSS individuais para cada quadradinho e setas vetoriais SVG oficiais.
- **💡 Dicas de Montagem**: Planejamento da cruz em menos de 8 movimentos, diagrama de rotações e regras de inspeção.
- **📖 Guia Visual Passo a Passo**: Tutorial completo camada por camada com ilustrações passo a passo e algoritmos detalhados.
- **Histórico & Estatísticas WCA**: Cálculo de Melhor, Pior, Média Geral, Mediana, Desvio Padrão, **Ao5**, **Ao12**, Melhor Ao5 e Melhor Ao12.

### 2. ⚔️ Página Dedicada de Duelo contra Bot IA
- **Aba Exclusiva na Navegação** (`#view-bot-duel`).
- **Dificuldades Realistas Calibradas**:
  - 🤖 **Cubinho Bot** (Iniciante · LBL · ~1m 40s · 1.1 TPS)
  - ⚡ **AlgoBot Pro** (Intermediário · CFOP Reduzido · ~42s · 2.4 TPS)
  - 🌪️ **SpeedBot 3000** (Avançado · Full CFOP · ~20.5s · 4.5 TPS)
  - 👑 **YihengBot AI 🔥** (Campeão Mundial WCA · ~8.8s · 8.5 TPS)
- **Largada Sincronizada**: O robô aguarda o exato instante em que você soltar o seu cronômetro.
- **🧊 Cubo 3D Animado do Bot**: Visualize o robô girando as camadas em tempo real em 3D enquanto resolve.
- **Sistema de Recompensas**: Vitória rende `+25 Elo`, `+130 XP` e `+40 Moedas 🔥`.

### 3. 📈 Página de Evolução & Análise de Velocidade
- **Gráfico Interativo de Tempos (Chart.js)**:
  - 🔵 **Tempos Brutos**: Curva de cada solve individual.
  - 🟢 **Média Móvel de 5 (Ao5)**: Tendência real do seu ritmo.
  - 🟡 **Linha PB (Personal Best)**: Histórico de quebra de recordes pessoais.
- **Métricas Avançadas**: Índice de Consistência, TPS, Distribuição Sub-X e Divisão por Fases CFOP.

### 4. 👾 Gamificação & Codédex Club
- **Passaporte Oficial do Cuber**: Avatar, nível, título, streak diário de fogo e pins colecionáveis.
- **Missões Diárias**: Desafios que resetam a cada 24 horas rendendo XP e FireCoins.
- **Loja de Skins 3D**: Desbloqueie cores e estilos visuais personalizados para o Cubo 3D.
- **Temas**: Alternância instantânea entre Tema Escuro (Discord) e Tema Claro.

### 5. 💾 Banco de Dados Persistente & Autenticação
- **Backend Node.js REST API**:
  - `POST /api/auth/register`: Cadastro com avatar e hash seguro de senha.
  - `POST /api/auth/login`: Login e sincronização instantânea de dados.
  - `GET /api/auth/me`: Verificação de sessão e recuperação de perfil.
  - `POST /api/solves`: Persistência de cada solve e notas no banco de dados.
  - `POST /api/user/sync`: Sincronização de Elo, nível, moedas e skins.
  - `GET /api/leaderboard`: Ranking global com jogadores registrados.
- **Armazenamento**: Arquivo `data/db.json` com suporte a volume persistente Docker.

---

## 🐳 Como Subir no Portainer (Deploy via Docker)

O FireCube Pro já vem 100% preparado para ser implantado no **Portainer** através de **Stacks (Docker Compose)**.

### Método 1: Portainer Stack via Repositório Git (Recomendado)

1. No painel do seu Portainer, vá em **Stacks** ➔ **Add stack**.
2. Escolha o método **Repository**.
3. Preencha as informações:
   - **Name**: `firecube-pro`
   - **Repository URL**: `https://github.com/paulohops/firecube-pro.git`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`
4. *(Opcional)* Ative o **Automatic updates (Webhook)** se desejar que o Portainer atualize o container a cada push no GitHub.
5. Clique em **Deploy the stack**.
6. Acesse: `http://IP_DO_SERVIDOR:8080/`.

---

### Método 2: Portainer Stack via Web Editor (Copiar e Colar)

1. No Portainer, vá em **Stacks** ➔ **Add stack**.
2. Escolha **Web editor**.
3. Dê o nome de `firecube-pro` e cole o conteúdo do `docker-compose.yml`.
4. Clique em **Deploy the stack**.

---

### Método 3: Via Docker Compose (Linha de Comando)

```bash
# Clonar o repositório
git clone https://github.com/paulohops/firecube-pro.git
cd firecube-pro

# Subir em background
docker compose up -d --build
```

O volume `firecube_data` garante que todas as contas, recordes e estatísticas fiquem gravados no disco mesmo que o container seja reiniciado ou atualizado!

---

## 💻 Execução Local sem Docker

```bash
# Iniciar o servidor
node server.js

# Acesse no navegador
http://localhost:8080/
```

---

## ⌨️ Atalhos de Teclado

| Tecla | Ação |
|---|---|
| `Espaço` (segurar 300ms e soltar) | Iniciar Cronômetro (ou largar no duelo) |
| `Qualquer Tecla` (durante a contagem) | Parar Cronômetro |
| `Alt + N` | Gerar Novo Embaralhamento |
| `Alt + S` | Abrir Solução CFOP |
| `Alt + Z` | Excluir Último Solve |
| `Alt + 2` | Alternar penalidade +2 |
| `Alt + D` | Alternar DNF |
| `Esc` | Fechar Modais |
