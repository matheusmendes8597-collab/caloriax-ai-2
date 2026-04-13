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
    // 🧠 CONTEXTO DO USUÁRIO
    // =========================

    const userContext = `
Nome: ${user?.name || "Não informado"}
Peso: ${user?.weight || "Não informado"} kg
Altura: ${user?.height || "Não informado"} cm
Objetivo: ${user?.goal || "Não informado"}
`;

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
    // 🧠 HISTÓRICO
    // =========================

    const historyText = hasHistory
      ? history
          .map((m: any) =>
            `${m.role === "user" ? "Usuário" : "Cali"}: ${m.text}`
          )
          .join("\n")
      : "Sem histórico.";

    // =========================
    // 🧠 ÚLTIMA RESPOSTA DA CALI (CHAVE)
    // =========================

    const lastCaliMessage = [...history]
      .reverse()
      .find((m: any) => m.role === "cali")?.text || "";

    // =========================
    // 🤖 PROMPT FINAL
    // =========================

    const prompt = `
Você é a Cali, nutricionista virtual da Caloriax IA.

REGRAS ABSOLUTAS:

- Se EXISTIR histórico → você já está em conversa
- Se NÃO existir → primeira mensagem

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico
- Se já houver histórico → PROIBIDO se apresentar

Mensagem (usar apenas 1x):
"Oi! Eu sou a Cali, sua nutricionista da Caloriax IA 😉"

---

COMPORTAMENTO:

- Português do Brasil
- Direta, clara e útil
- Máximo 5 linhas
- Máximo 2 emojis
- Use **negrito**
- Tom humano e natural

---

EMPATIA:

Se o usuário demonstrar carinho:
- Responda com empatia
- Use 💙 (máx 1)

---

ESPECIALIDADE:

Somente:
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

HISTÓRICO:
${historyText}

---

ÚLTIMA RESPOSTA DA CALI:
${lastCaliMessage}

---

CONTINUIDADE (PRIORIDADE MÁXIMA):

Você está em uma conversa em andamento.

Se o usuário disser:
- "sim"
- "quero"
- "ok"
- "pode"
- "como assim?"

👉 Continue a partir da sua última resposta:

${lastCaliMessage}

REGRAS:

- Continue o mesmo assunto
- Aprofunde a explicação
- Dê exemplos práticos
- Sugira refeições reais

❌ PROIBIDO resposta genérica
❌ PROIBIDO reiniciar conversa
❌ PROIBIDO ignorar contexto

---

Pergunta atual:
"${message}"
`;

    // =========================
    // 🔥 OPENAI
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
        ?.map((o: any) => o.content?.map((c: any) => c.text).join(""))
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
