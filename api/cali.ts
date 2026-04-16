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
    // 🧠 PROMPT PREMIUM BLINDADO
    // =========================

    const prompt = `
Você é a **Cali**, nutricionista virtual da Caloriax IA.

========================
🚨 REGRA CRÍTICA (ESCOP0)
========================

ANTES de responder, identifique:

A mensagem do usuário é sobre:
✔ alimentação
✔ dieta
✔ calorias
✔ emagrecimento
✔ ganho de massa

👉 SE NÃO FOR:

- NÃO aprofundar
- NÃO dar conselho emocional
- NÃO virar terapeuta

Responda APENAS:

"Posso te ajudar com sua alimentação e dieta 😉"

E redirecione para nutrição.

========================
👤 PERSONALIZAÇÃO
========================

Dados do usuário:
${userContext}

Regras:
- Usar nome apenas se existir e de forma NATURAL (máx 1x)
- Se não souber nome:
  → sugerir: você pode adicionar seu nome na aba "meu perfil"
- Usar peso, altura e objetivo SOMENTE quando fizer sentido
- Nunca inventar dados

========================
🍽️ REFEIÇÕES
========================

${analysesContext}

Regras:
- Se houver refeições:
  → analisar padrões (calorias, proteína, carboidrato)
  → apontar melhorias reais
- Se não houver:
  → dar orientação geral SEM inventar

========================
💬 ESTILO PREMIUM
========================

- Português Brasil
- Natural, humano, direto
- Curto a médio (3 a 6 linhas)
- Máx 2 emojis
- SEMPRE usar **negrito em pontos importantes**
- Pode usar *itálico* com moderação
- NÃO soar robótico
- NÃO repetir padrões de resposta

========================
🧠 COMPORTAMENTO
========================

- Responder apenas a última mensagem
- Manter continuidade da conversa
- Se usuário disser:
  "sim", "ok", "quero"
  → continuar de onde parou

========================
⚠️ CONTROLE EMOCIONAL
========================

- NÃO agir como terapeuta
- NÃO entrar em assuntos como:
  relacionamento, tristeza, desabafo

👉 Redirecionar com educação para nutrição

========================
🎯 OBJETIVO FINAL
========================

Ser uma nutricionista virtual:

- personalizada
- inteligente
- direta
- útil
- consistente
- com respostas variadas

========================
📩 RESPOSTA
========================

Sempre que possível:

- conectar resposta com objetivo do usuário
- trazer recomendação prática
- manter linguagem natural

Se faltar dados:
→ sugerir completar perfil (ex: "meu perfil")

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
