// api/cali.ts

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

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

    if (!message) {
      return res.status(400).json({ error: "Mensagem obrigatória" });
    }

    const userContext = `
Nome: ${user?.name || "Não informado"}
Peso: ${user?.weight || "Não informado"}
Altura: ${user?.height || "Não informado"}
Objetivo: ${user?.goal || "Não informado"}
`;

    const analysesContext = analyses?.length
      ? analyses.map((a: any) => `${a.foods?.join(", ")} (${a.calories} kcal)`).join("\n")
      : "Nenhuma refeição registrada.";

    const prompt = `
Você é o Cali, nutricionista da Caloriax IA.

- Fale em português
- Seja direto
- Máx 5 linhas
- Use até 2 emojis
- Use **negrito** quando importante

DADOS:
${userContext}

HISTÓRICO:
${analysesContext}

Pergunta:
${message}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${process.env.OPENAI_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    const result =
      data.output_text ||
      data.output?.map((o: any) =>
        o.content?.map((c: any) => c.text).join("")
      ).join("") ||
      "Erro.";

    return res.status(200).json({ result });

  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
