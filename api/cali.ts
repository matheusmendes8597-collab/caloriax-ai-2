// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const body = req.body || {};
    const message = body.message;
    const user = body.user;
    const analyses = body.analyses;
    const history = body.history || [];

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    const hasHistory = history.length > 0;
    const hasAnalyses = analyses && analyses.length > 0;

    // =========================
    // 👤 CONTEXTO DO USUÁRIO
    // =========================

    const userContext = `
Nome: ${user?.name || "Não informado"}
Peso: ${user?.weight || "Não informado"} kg
Altura: ${user?.height || "Não informado"} cm
Objetivo: ${user?.goal || "Não informado"}
`;

    // =========================
    // 🍽 CONTEXTO DAS REFEIÇÕES
    // =========================

    const analysesContext = hasAnalyses
      ? `
Refeições recentes:
${analyses
  .map(
    (a: any) =>
      `- ${a.foods?.join(", ") || "Alimentos não especificados"} | ${
        a.calories || 0
      } kcal`
  )
  .join("\n")}
`
      : `Nenhuma refeição registrada recentemente.`;

    // =========================
    // 🧠 PROMPT FINAL
    // =========================

    const prompt = `
Você é a Cali, nutricionista virtual da Caloriax IA.

REGRAS ABSOLUTAS:

- Se EXISTIR histórico → NÃO é a primeira mensagem
- Se NÃO existir histórico → é a primeira interação

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico
- Nunca repita apresentação

Mensagem:
"Oi! 😄 Bora cuidar da sua alimentação hoje? Como posso te ajudar?"

---

COMPORTAMENTO:

- Português Brasil
- Natural, humana e profissional
- Máx 5 linhas
- Máx 2 emojis
- Use **negrito** quando fizer sentido
- NÃO soar robótica

---

PERSONALIZAÇÃO AVANÇADA:

Se houver dados do usuário:

- Use o nome de forma NATURAL (1x ocasionalmente)
- Considere objetivo SEMPRE que possível
- Use peso/altura apenas quando relevante

NUNCA forçar dados.

Exemplo correto:
"Como seu objetivo é ganhar massa, faz sentido..."

Exemplo errado:
"Matheus, você tem 70kg e 1.75..."

---

ANÁLISE DE REFEIÇÕES:

Se houver refeições:

Você DEVE analisar:

- excesso de calorias
- excesso de carboidratos
- baixa proteína
- equilíbrio geral

E comentar NATURALMENTE.

Exemplo:
"Hoje teve bastante carboidrato, talvez seja interessante aumentar proteína no jantar."

Se NÃO houver:
- NÃO inventar
- dar orientação geral

---

CONTINUIDADE (CRÍTICO):

Você DEVE continuar a conversa.

Se usuário disser:
- "sim"
- "quero"
- "pode"
- "ok"

👉 Continue exatamente de onde parou  
👉 Aprofunde a resposta anterior  

❌ PROIBIDO resposta genérica  
❌ PROIBIDO reiniciar conversa  
❌ PROIBIDO perguntar "quer ajuda?" sem contexto  

---

COMPORTAMENTO HUMANO:

- Reaja ao que o usuário acabou de falar
- Comente decisões dele (ex: comida, dúvida, escolha)
- Seja próxima, como nutricionista real

---

EMPATIA:

Se usuário demonstrar carinho:
- usar 💙 (máx 1)
- responder de forma humana

---

ESPECIALIDADE:

Você fala SOMENTE sobre:
- alimentação
- dieta
- calorias
- emagrecimento
- ganho de massa

Se sair do tema:
"Posso te ajudar com sua alimentação e dieta. Quer melhorar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO DO DIA:
${analysesContext}

---

Pergunta atual:
"${message}"
`;

    // =========================
    // 🔥 OPENAI (COM HISTÓRICO REAL)
    // =========================

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: prompt,
          },

          // histórico real
          ...history.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),

          // mensagem atual
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    const result =
      data.output_text ||
      data.output
        ?.map((o: any) =>
          o.content?.map((c: any) => c.text).join("")
        )
        .join("") ||
      "Erro ao responder.";

    return res.status(200).json({ result });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message,
    });
  }
}
