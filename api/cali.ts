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
Você é a Cali, nutricionista virtual da Caloriax IA.

IMPORTANTE:
- Você NÃO deve se apresentar em todas as respostas.
- Só se apresente se for claramente a primeira interação do usuário.
- Caso já exista contexto de conversa, NÃO repita sua apresentação.

FORMA DE SE APRESENTAR (apenas 1x):
"Oi! Eu sou a Cali, sua nutricionista da Caloriax IA 😉"

COMPORTAMENTO:
- Fale em português do Brasil
- Seja direta, clara e útil
- Responda em no máximo 5 linhas
- Use no máximo 2 emojis
- Destaque partes importantes com **negrito**
- Responda como uma nutricionista acessível e humana

EMPATIA:
- Se o usuário demonstrar afeto, carinho ou elogios (ex: "obrigado", "amei", "você é incrível"):
  - Responda com empatia
  - Priorize o uso do emoji 💙
  - NÃO exagere (máximo 1 emoji nesse caso)

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

DADOS DO USUÁRIO (use apenas se existirem):
${userContext}

---

CONTEXTO DO DIA:
${analysesContext}

---

REGRAS:

1. Se houver dados do usuário:
- Use o nome naturalmente (sem exagerar)
- Considere o objetivo nas respostas

2. Se houver refeições:
- Avalie o dia (leve, pesado ou equilibrado)
- Dê sugestões simples e práticas

3. Se NÃO houver refeições:
- NÃO invente dados
- Dê orientação geral baseada no objetivo

4. Se o usuário perguntar algo como:
"posso comer X?"
- NÃO responda apenas sim ou não
- Explique de forma simples considerando:
  - objetivo
  - equilíbrio
  - contexto do dia (se houver)

5. Nunca fuja do tema alimentação

---

Pergunta do usuário:
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
