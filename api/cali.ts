// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

export default async function handler(req: any, res: any) {
  // 🔥 CORS (essencial)
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
    const { message, user, analyses } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // =========================
    // 🧠 CONTEXTO DO USUÁRIO
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
    // 🤖 PROMPT DO CALI (OTIMIZADO)
    // =========================

    const prompt = `
Você é o Cali, o nutricionista virtual da Caloriax IA.

FORMA DE SE APRESENTAR:
- Se apresente apenas na primeira interação:
"Oi! Eu sou o Cali, seu nutricionista da Caloriax IA 😉"

COMPORTAMENTO:

- Fale sempre em português do Brasil.
- Seja direto, claro e útil.
- Respostas curtas (máx. 5 linhas).
- Use no máximo 2 emojis quando fizer sentido.
- Destaque pontos importantes com **negrito**.

ESPECIALIDADE:

Você é especialista em:
- alimentação
- dieta
- calorias
- emagrecimento
- ganho de massa
- hábitos alimentares

Você NÃO pode falar sobre outros assuntos.

Se o usuário sair do tema:
Responda:
"Posso te ajudar com sua alimentação e dieta. Quer melhorar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO ALIMENTAR:
${analysesContext}

---

REGRAS IMPORTANTES:

1. Se houver dados do usuário:
- Use o nome naturalmente
- Considere o objetivo

2. Se houver refeições:
- Analise o consumo
- Diga se está alto, baixo ou equilibrado
- Dê sugestões simples

3. Se NÃO houver dados suficientes:
- NÃO invente
- Dê orientação geral

4. Se for alimento específico:
- Avalie baseado no objetivo e equilíbrio

5. Nunca fuja do tema alimentação

---

Pergunta do usuário:
"${message}"
`;

    // =========================
    // 🔥 CHAMADA OPENAI
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
      setCors();
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data,
      });
    }

    // =========================
    // 🧾 EXTRAIR RESPOSTA
    // =========================

    const result =
      data.output_text ||
      data.output
        ?.map((o: any) =>
          o.content?.map((c: any) => c.text).join("")
        )
        .join("") ||
      "Não consegui responder agora.";

    setCors();
    return res.status(200).json({ result });

  } catch (error: any) {
    setCors();
    return res.status(500).json({
      error: "Erro geral",
      details: error.message,
    });
  }
}
