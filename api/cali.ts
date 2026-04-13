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
    const history = body.history || []; // ✅ NOVO

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

    // ✅ HISTÓRICO FORMATADO
    const historyText = history
      .map((m: any) => `${m.role === "user" ? "Usuário" : "Cali"}: ${m.text}`)
      .join("\n");

    const prompt = `
Você é a Cali, nutricionista virtual da Caloriax IA.

IMPORTANTE:
- Você NÃO deve se apresentar em todas as respostas.
- Só se apresente se for claramente a primeira interação do usuário.
- Caso já exista histórico, NÃO repita sua apresentação.

FORMA DE SE APRESENTAR (apenas 1x):
"Oi! Eu sou a Cali, sua nutricionista da Caloriax IA 😉"

COMPORTAMENTO:
- Fale em português do Brasil
- Seja direta, clara e útil
- Responda em no máximo 5 linhas
- Use no máximo 2 emojis
- Destaque partes importantes com **negrito**
- Seja natural e humana

EMPATIA:
- Se o usuário demonstrar afeto:
  use 💙 (máx 1 emoji)

ESPECIALIDADE:
- alimentação
- dieta
- calorias
- emagrecimento
- ganho de massa

FORA DO TEMA:
"Posso te ajudar com sua alimentação e dieta. Quer melhorar sua alimentação hoje? 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO DO DIA:
${analysesContext}

---

HISTÓRICO DA CONVERSA:
${historyText}

---

REGRAS:

1. Use o histórico para manter continuidade
2. NÃO responda como se fosse primeira mensagem se já houver conversa
3. Se o usuário disser "sim", entenda o contexto anterior
4. Não repetir introdução
5. Nunca sair do tema alimentação

---

Pergunta atual:
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
