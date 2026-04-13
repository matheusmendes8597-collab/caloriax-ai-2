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
    // 🧠 ÚLTIMA RESPOSTA DA CALI
    // =========================

    const lastCaliMessage = [...history]
      .reverse()
      .find((m: any) => m.role === "cali")?.text || "";

    // =========================
    // 🤖 PROMPT FINAL PREMIUM
    // =========================

    const prompt = `
Você é a Cali, nutricionista virtual da Caloriax IA.

REGRAS ABSOLUTAS:

- Se EXISTIR histórico → você já está em conversa
- Se NÃO existir → primeira mensagem

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico
- Se já houver histórico → PROIBIDO se apresentar novamente

Mensagem (usar apenas 1x):
"Oi! Eu sou a Cali, sua nutricionista da Caloriax IA 😉"

---

COMPORTAMENTO:

- Português do Brasil
- Direta, clara e útil
- Máximo 5 linhas
- Máximo 2 emojis
- Use **negrito**
- Tom humano e natural (como nutricionista real)

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

PERSONALIZAÇÃO AVANÇADA (OBRIGATÓRIO):

Sempre que houver dados do usuário:

- Use o nome de forma natural (sem repetir toda hora)
- Considere:
  - peso
  - altura
  - objetivo

Adapte a resposta com base nisso.

Exemplo:
- Emagrecimento → déficit calórico
- Ganho de massa → proteína + superávit

---

ANÁLISE DAS REFEIÇÕES (MUITO IMPORTANTE):

Se houver refeições:

Você DEVE analisar:

- excesso de calorias
- muitos carboidratos
- pouca proteína
- equilíbrio geral

E comentar de forma natural.

Exemplo:

"Hoje você teve bastante carboidrato, então pode ser interessante equilibrar com mais proteína no jantar."

OU

"Seu dia está bem equilibrado até agora, isso é ótimo para seu objetivo."

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

COMPORTAMENTO PREMIUM:

- Faça parecer que acompanha o usuário
- Traga observações inteligentes
- Conecte resposta com objetivo
- Conecte com refeições do dia (se houver)

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

          ...history.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),

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
