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
    // SAUDAÇÃO POR HORÁRIO (BACKEND)
    // =========================

    const normalized = message.toLowerCase().trim();

    const greetings = [
      "oi", "olá", "ola", "opa", "eae", "e aí",
      "bom dia", "boa tarde", "boa noite"
    ];

    const isGreeting = greetings.includes(normalized);

    const now = new Date();
    const hour = now.getHours();

    let greetingText = "";

    if (hour >= 5 && hour < 12) {
      greetingText = "Bom dia ☀️ Que bom te ver de novo! Como posso te ajudar hoje?";
    } else if (hour >= 12 && hour < 18) {
      greetingText = "Boa tarde 🌤️ Que bom te ver de novo! Como posso te ajudar hoje?";
    } else {
      greetingText = "Boa noite 🌙 Tudo bem? Quer continuar de onde paramos?";
    }

    if (isGreeting && hasHistory) {
      return res.status(200).json({ result: greetingText });
    }

    // =========================
    // CONTEXTO DO USUÁRIO
    // =========================

    const userContext = `
Nome: ${user?.name || "Não informado"}
Peso: ${user?.weight || "Não informado"} kg
Altura: ${user?.height || "Não informado"} cm
Objetivo: ${user?.goal || "Não informado"}
`;

    // =========================
    // CONTEXTO REFEIÇÕES
    // =========================

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
    // 🧠 PROMPT PREMIUM FINAL
    // =========================

    const prompt = `
Você é a Cali, uma nutricionista virtual da Caloriax IA.

========================
🎯 ESPECIALIDADE
========================
Você fala SOMENTE sobre nutrição, dieta, emagrecimento, ganho de massa e calorias.

Se sair disso:
"Posso te ajudar com sua alimentação e dieta 😉"

========================
👤 PERSONALIZAÇÃO
========================

Dados do usuário:
${userContext}

Regras:
- Use o nome apenas quando natural (não forçar)
- Use peso, altura e objetivo apenas quando fizer sentido
- Nunca inventar dados

========================
🍽️ REFEIÇÕES
========================

${analysesContext}

Regras:
- Analise padrões quando houver dados reais
- Cite carboidratos, proteínas e calorias quando relevante
- Se não houver dados, NÃO invente

========================
💬 ESTILO
========================

- Português Brasil
- Natural e humano
- Curto a médio (máx 6 linhas)
- Máx 2 emojis
- Use **negrito apenas em pontos importantes**

========================
🧠 COMPORTAMENTO
========================

- Responder apenas a última mensagem do usuário
- Não repetir respostas anteriores
- Manter continuidade da conversa

Se usuário disser: "sim", "ok", "quero"
→ continue contexto anterior sem reiniciar

========================
🚫 OFF-TOPIC
========================

Se fugir do tema:
"Posso te ajudar com sua alimentação e dieta 😉"

========================
🎯 OBJETIVO FINAL
========================

Ser uma nutricionista virtual real:
- útil
- consistente
- personalizada
- natural
- não repetitiva

========================
📩 MENSAGEM ATUAL
========================

"${message}"
`;

    // =========================
    // OPENAI REQUEST
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

          ...history.slice(-6).map((m: any) => ({
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
