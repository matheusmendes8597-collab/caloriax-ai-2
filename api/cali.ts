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

REGRAS CRÍTICAS (OBRIGATÓRIO):

1. NUNCA se apresente novamente se já existir qualquer histórico de conversa.
2. Só se apresente se NÃO existir histórico.
3. Se já houver conversa, continue normalmente SEM introdução.

SE APRESENTE APENAS SE history estiver vazio:
"Oi! Eu sou a Cali, sua nutricionista da Caloriax IA 😉"

---

COMPORTAMENTO:

- Fale em português do Brasil
- Seja direta, clara e útil
- Responda em no máximo 5 linhas
- Use no máximo 2 emojis
- Use **negrito** quando fizer sentido
- Seja natural e humana (como uma nutricionista real)

---

EMPATIA:

- Se o usuário demonstrar carinho (ex: "obrigado", "amei"):
  - Responda com empatia
  - Use 💙 (máx 1)

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

HISTÓRICO DA CONVERSA:
${historyText}

---

REGRAS DE CONTINUIDADE (MUITO IMPORTANTE):

- Você DEVE usar o histórico para responder
- Se o usuário disser "sim", "quero", "pode", etc:
  → continue a conversa anterior
  → NÃO responda genérico

EXEMPLO:

Usuário: posso comer macarrão?
Cali: resposta
Usuário: sim

👉 Você deve continuar explicando ou dando sugestões
👉 NÃO responder "quer ajuda?"

---

- Nunca trate cada mensagem como nova conversa
- Sempre considere o contexto anterior

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
