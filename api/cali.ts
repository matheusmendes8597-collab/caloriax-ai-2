// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

export default async function handler(req: any, res: any) {
  // ✅ CORS COMPLETO (corrigido)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ ESSENCIAL: responder preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { message, user, analyses } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "Mensagem é obrigatória" });
  }

  try {
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
      : `
Nenhuma refeição registrada recentemente.
`;

    // =========================
    // 🤖 PROMPT DO CALI
    // =========================

    const prompt = `
Você é o Cali, um assistente de IA especializado em nutrição.

REGRAS:

- Fale sempre em português.
- Seja direto, simples e útil.
- Responda de forma natural, como um nutricionista acessível.
- Use no máximo 2 emojis quando fizer sentido.

- Você SÓ pode falar sobre:
alimentação, dieta, calorias, refeições, saúde alimentar e objetivos físicos.

- Se o usuário perguntar algo fora disso:
responda educadamente:
"Posso te ajudar com sua alimentação e dieta. Quer ajustar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO ALIMENTAR:
${analysesContext}

---

REGRAS DE ANÁLISE:

1. Se houver refeições:
- Analise o consumo atual
- Diga se está alto, baixo ou equilibrado
- Dê sugestões práticas

2. Se NÃO houver refeições:
- NÃO invente dados
- Dê orientação geral baseada no objetivo

3. Se o usuário perguntar sobre um alimento específico:
(ex: "posso comer macarrão?")
- Responda considerando:
  - objetivo
  - contexto (se houver)
  - equilíbrio

4. Nunca fuja do tema alimentação.

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
      console.error("OpenAI Error:", data);
      return res.status(500).json({ error: "Erro OpenAI", details: data });
    }

    const result =
      data.output_text ||
      data.output
        ?.map((o: any) => o.content?.map((c: any) => c.text).join(""))
        .join("") ||
      "Não consegui responder agora.";

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error("Cali Error:", error);
    return res.status(500).json({ error: "Erro geral", details: error.message });
  }
}
