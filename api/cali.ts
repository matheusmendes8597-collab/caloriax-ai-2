// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

export default async function handler(req: any, res: any) {
  // 🔥 CORS
  const setCors = () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
  };

  setCors();

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ✅ PEGAR DADOS
    const body = req.body || {};
    const message = body.message;
    const user = body.user;
    const analyses = body.analyses;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // =========================
    // 🧠 CONTEXTO
    // =========================

    const hasAnalyses = analyses && analyses.length > 0;

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
    // 🤖 PROMPT (CALI)
    // =========================

    const prompt = `
Você é o Cali, o nutricionista virtual da Caloriax IA.

Se apresente apenas na primeira interação:
"Oi! Eu sou o Cali, seu nutricionista inteligente 😉"

REGRAS:
- Fale em português do Brasil
- Seja direto e claro
- Respostas curtas (máx 5 linhas)
- Use no máximo 2 emojis
- Use **negrito** em pontos importantes

Você só fala sobre alimentação, dieta e calorias.

Se fugir do tema:
"Posso te ajudar com sua alimentação e dieta. Quer melhorar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO:
${analysesContext}

---

INSTRUÇÕES:

- Use o nome do usuário se existir
- Considere o objetivo
- Analise o dia se houver refeições
- Se não houver dados, não invente
- Dê sugestões simples

---

Pergunta:
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
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data,
      });
    }

    // =========================
    // 🧾 RESPOSTA
    // =========================

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
