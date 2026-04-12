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
    // ✅ SEM destructuring (corrige o bug)
    const body = req.body || {};
    const message = body.message;
    const user = body.user;
    const analyses = body.analyses;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

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

const prompt = `
Você é o Cali, nutricionista virtual da Caloriax IA.

Se apresente apenas na primeira vez:
"Oi! Eu sou o Cali, seu nutricionista da Caloriax IA 😉"

COMPORTAMENTO:
- Fale em português do Brasil
- Seja direto, claro e útil
- Responda em no máximo 5 linhas
- Use no máximo 2 emojis
- Destaque partes importantes com **negrito**

ESPECIALIDADE:
Você é especialista em alimentação, dieta, calorias, emagrecimento e ganho de massa.

Você NÃO pode falar sobre outros assuntos.

Se sair do tema:
"Posso te ajudar com sua alimentação e dieta. Quer melhorar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO DO DIA:
${analysesContext}

---

REGRAS:

1. Se houver dados:
- Use o nome naturalmente
- Considere o objetivo

2. Se houver refeições:
- Avalie o dia (leve, pesado, equilibrado)
- Dê sugestões simples

3. Se NÃO houver refeições:
- Não invente
- Dê orientação geral

4. Se perguntar "posso comer X":
- Não responda só sim/não
- Explique baseado no contexto

---

Pergunta:
"${message}"
`;
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
