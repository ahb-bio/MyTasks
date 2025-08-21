# Agenda Diária — Timeline Planner

Interface moderna de **agenda diária** com timeline vertical. Adicione, edite e visualize eventos com ícones por categoria, detecção de conflitos de horário e persistência automática no navegador.

> **Stack:** HTML + CSS + JavaScript (puro)  
> **Persistência:** `localStorage` (sem back-end)  
> **Status:** MVP funcional

---

## ✨ Recursos
- Linha do tempo vertical com **cartões** de eventos.
- **Adicionar/editar/excluir** eventos.
- **Conflito de horário** com 3 opções: *Adicionar assim mesmo*, *Substituir conflito(s)*, *Sugerir novo horário*.
- **Categorias** com ícones (sono, acordar, tarefa, trabalho, compromisso, social, caminhada, academia, sauna, banho gelado, refeição).
- **Navegação de data** (◀/▶ e seletor de data).
- **Filtro por categoria**.
- **Exportar/Importar** JSON (backup/restore).
- **Carregar amostra** (preenche o dia com exemplos).
- **Persistência automática**: dados salvos mesmo ao fechar o navegador/computador.
- UI responsiva e tema escuro.

---

## 🖥️ Como rodar localmente
> Não há build. É um site estático.

1. Baixe/clonar o projeto.
2. Abra `index.html` no navegador **ou** sirva com um servidor estático:
   - **Python**
     ```bash
     python -m http.server 5500
     # http://localhost:5500
     ```
   - **Node (http-server)**
     ```bash
     npx http-server -p 5500
     ```

### Deploy no GitHub Pages
1. Faça push para a branch `main` (ou `docs`).
2. Em **Settings → Pages**, selecione a branch e a pasta raiz.
3. Acesse a URL publicada.

---

## 🧠 Como usar
- Clique em **“+ Adicionar evento”** e preencha título, data, início, fim, categoria e (opcional) descrição.
- Se houver choque de horário, escolha: **Adicionar mesmo assim**, **Substituir** ou **Sugerir novo horário**.
- Use **⋯** para **Exportar**, **Importar**, **Carregar amostra** e **Limpar dia**.
- **Esc** fecha o menu contextual.

---

## 🔒 Persistência dos dados
- Dados salvos no `localStorage` com a chave `agendaDataV1`.
- Persistem no mesmo navegador/dispositivo, mesmo após desligar o computador.
- Para migrar: **Exportar** no dispositivo de origem → **Importar** no destino.

> Observação: abas anônimas/privadas podem limpar os dados ao fechar.

---

## 🗂️ Estrutura
```
.
├─ index.html        # Estrutura da app e modais
├─ style.css         # Tema, layout da timeline e componentes
├─ script.js         # Lógica: CRUD, conflitos, storage, export/import
└─ assets/
   └─ icons/         # Ícones SVG por categoria
```

### Modelo de dados (evento)
```json
{
  "id": "string",
  "title": "string",
  "date": "YYYY-MM-DD",
  "start": "HH:MM",
  "end": "HH:MM",
  "category": "sleep|wake|task|work|appointment|social|walk|workout|sauna|cold|meal",
  "description": "string (opcional)"
}
```

---

## ♿ Acessibilidade
- Modais nativos `<dialog>`
- `aria-live` na lista de eventos
- Esc fecha menus/modais
- Alto contraste no tema escuro

---

## 🚧 Roadmap (sugestões)
- Eventos recorrentes
- Notificações/alertas
- Múltiplos calendários/categorias customizadas
- PWA (instalável + offline)
- Sincronização com Google Calendar
- Tema claro e temas customizáveis

---

## 🤝 Contribuições
Abra **Issues** e **PRs** com descrição do comportamento atual/esperado e screenshots quando possível.

---

## 📄 Licença
Licenciado sob **MIT** (sugestão). Adicione um arquivo `LICENSE` se desejar.
