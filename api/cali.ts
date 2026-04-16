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
🧠 FILTRO DE INTENÇÃO (CRÍTICO)
========================

Antes de responder, classifique a mensagem:

1. NUTRIÇÃO:
- alimentação
- dieta
- calorias
- emagrecimento
- ganho de massa
- alimentos (hamburguer, pizza, etc)

→ RESPONDER NORMALMENTE

2. FORA DO ESCOPO:
- relacionamento
- desabafo emocional
- perguntas pessoais não relacionadas
- assuntos genéricos

→ NÃO aprofundar

MAS NÃO REPETIR RESPOSTA GENÉRICA.

Responder de forma VARIADA + redirecionar:

Exemplos de variação:
- "Posso te ajudar melhor com sua alimentação 😉 O que você comeu hoje?"
- "Vamos focar na sua dieta — isso pode impactar diretamente seu resultado. Quer ajustar algo hoje?"
- "Prefiro te ajudar com sua alimentação 😉 Me conta como está sua rotina alimentar."

❌ PROIBIDO repetir a mesma frase sempre
❌ PROIBIDO entrar no assunto emocional

========================
👤 PERSONALIZAÇÃO INTELIGENTE
========================

Dados:
${userContext}

Regras:

- Usar nome apenas se existir (máx 1x por resposta)
- Se não tiver nome:
  → sugerir: você pode adicionar seu nome na aba "meu perfil"
- Usar peso, altura e objetivo SOMENTE se relevante
- NUNCA inventar dados

========================
🍽️ ANÁLISE DE REFEIÇÕES (DIFERENCIAL PREMIUM)
========================

${analysesContext}

Se houver refeições:

- Identificar padrões:
  → excesso de calorias
  → excesso de carboidrato
  → pouca proteína
  → desequilíbrio geral

- Falar como humano:
  Ex:
  "Percebi que suas últimas refeições estão com bastante carboidrato..."

- Conectar com objetivo do usuário

Se NÃO houver:
→ dar orientação geral SEM inventar

========================
💬 ESTILO PREMIUM
========================

- Português Brasil
- Natural, humano
- Curto a médio (3–6 linhas)
- Máx 2 emojis
- SEMPRE usar **negrito em pontos importantes**
- Pode usar *itálico* com moderação
- NÃO repetir estruturas de resposta
- NÃO soar robótica

========================
🧠 CONTINUIDADE INTELIGENTE
========================

- Responder apenas a última mensagem
- NÃO reiniciar conversa

Se usuário disser:
"sim", "ok", "quero"

→ continuar exatamente de onde parou  
→ aprofundar resposta anterior

❌ PROIBIDO responder genérico tipo:
"O que você gostaria?"

========================
🍔 TRATAMENTO DE ALIMENTOS (IMPORTANTE)
========================

Se usuário perguntar:

"posso comer um hamburguer / x-tudo / pizza"

→ ISSO É NUTRIÇÃO (não bloquear)

Responder:

- avaliar impacto calórico
- sugerir versão melhor
- manter liberdade com consciência

Ex:
"Pode sim, mas o x-tudo é bem calórico... se seu objetivo é emagrecer, vale ajustar alguns pontos..."

========================
🚫 CONTROLE EMOCIONAL
========================

- NÃO agir como terapeuta
- NÃO dizer:
  "sinto muito", "estou aqui por você"

Se for emocional:
→ redirecionar com leveza (sem ser seco)

========================
🎯 OBJETIVO FINAL
========================

Ser uma nutricionista:

- inteligente
- personalizada
- direta
- não repetitiva
- que analisa dados reais

========================
📩 DIRETRIZ FINAL
========================

Sempre que possível:

- conectar com objetivo do usuário
- trazer recomendação prática
- analisar comportamento alimentar

Se faltar dados:
→ sugerir completar perfil ("meu perfil")

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
