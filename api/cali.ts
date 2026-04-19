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
    const meals = body.meals || [];
    const history = body.history || [];

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    const hasHistory = history.length > 0;
    const hasAnalyses = analyses && analyses.length > 0;
    const hasMeals = meals.length > 0;

    // =========================
    // 📊 CÁLCULO DE MACROS (só se houver meals)
    // =========================

    const totalCalories = hasMeals
      ? meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0)
      : 0;
    const totalProtein = hasMeals
      ? meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0)
      : 0;
    const totalCarbs = hasMeals
      ? meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0)
      : 0;
    const totalFats = hasMeals
      ? meals.reduce((sum: number, m: any) => sum + (m.fats || 0), 0)
      : 0;

    // =========================
    // 🧮 INTERPRETAÇÃO AUTOMÁTICA
    // =========================

    const calorieStatus =
      totalCalories < 1800
        ? "déficit calórico"
        : totalCalories <= 2500
        ? "manutenção calórica"
        : "superávit calórico";

    const proteinStatus =
      totalProtein < 80
        ? "baixa (abaixo do recomendado)"
        : totalProtein <= 140
        ? "adequada"
        : "alta";

    // =========================
    // ✅ DETECÇÃO DE SAUDAÇÃO + HORÁRIO
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
    // 👤 CONTEXTO DO USUÁRIO
    // =========================

    const userContext = `
Nome: ${user?.name ?? "Não informado"}
Idade: ${user?.age ?? "Não informado"} anos
Peso: ${user?.weight ?? "Não informado"} kg
Altura: ${user?.height ?? "Não informado"} cm
Peso ideal: ${user?.ideal_weight ?? "Não informado"} kg
Objetivo: ${user?.goal ?? "Não informado"}
`;

    // =========================
    // 🍽 CONTEXTO DAS ANÁLISES
    // =========================

    const analysesContext = hasAnalyses
      ? `
Refeições recentes (análises resumidas):
${analyses
  .map(
    (a: any) =>
      `- ${a.foods?.join(", ") || "Alimentos não especificados"} | ${
        a.calories || 0
      } kcal`
  )
  .join("\n")}
`
      : `Nenhuma análise registrada recentemente.`;

    // =========================
    // 🥗 CONTEXTO DE MEALS (lista detalhada)
    // =========================

    const mealsContext = hasMeals
      ? `
Histórico de refeições completas (dados reais):
${meals
  .map(
    (m: any) =>
      `- ${m.food} | ${m.calories} kcal | P:${m.protein || 0}g C:${m.carbs || 0}g G:${m.fats || 0}g | ${m.date}`
  )
  .join("\n")}
`
      : `Nenhuma refeição completa registrada recentemente.`;

    // =========================
    // 📊 RESUMO TOTAL DO DIA
    // =========================

    const mealsSummaryContext = hasMeals
      ? `
RESUMO TOTAL DO DIA:

- Calorias: ${totalCalories} kcal
- Proteína: ${totalProtein} g
- Carboidratos: ${totalCarbs} g
- Gorduras: ${totalFats} g

INTERPRETAÇÃO DO DIA:
- Calorias: ${calorieStatus}
- Proteína: ${proteinStatus}
`
      : "";

    // =========================
    // 🧠 PROMPT FINAL
    // =========================

    const prompt = `
Você é a Cali, nutricionista virtual da Caloriax IA.

REGRAS ABSOLUTAS:

- Se EXISTIR histórico → NÃO é a primeira mensagem
- Se NÃO existir histórico → é a primeira interação

---

REGRA CRÍTICA:

- Você DEVE responder DIRETAMENTE a última mensagem do usuário
- A última mensagem é: "${message}"
- IGNORAR respostas anteriores
- NÃO repetir respostas antigas
- NÃO usar respostas genéricas prontas

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico
- Nunca repita apresentação

---

COMPORTAMENTO:

- Português Brasil
- Natural, humana e profissional
- Máx 5 linhas
- Máx 2 emojis
- Use **negrito** quando fizer sentido
- NÃO soar robótica

---

SAUDAÇÕES (OBRIGATÓRIO):

Se o usuário disser:
- oi, olá, bom dia, boa tarde, boa noite

Responda com:

☀️ Bom dia → "Bom dia! ☀️ Que bom te ver!"
🌤 Boa tarde → "Boa tarde! 🌤 Como você está?"
🌙 Boa noite → "Boa noite! 🌙 Tudo bem?"

- NÃO se apresente novamente
- SEMPRE continuar a conversa

---

PERSONALIZAÇÃO AVANÇADA:

Se houver dados do usuário:

- Use o nome de forma NATURAL (1x ocasionalmente)
- Considere objetivo SEMPRE que possível
- Use peso/altura apenas quando relevante

NUNCA forçar dados.

---

FONTES DE DADOS — PRIORIDADE:

IMPORTANTE:
- analyses = histórico resumido (fonte secundária)
- meals = dados reais completos com macros (fonte primária)
- O RESUMO TOTAL DO DIA (calorias/macros) É MAIS IMPORTANTE QUE A LISTA DE REFEIÇÕES
- meals tem PRIORIDADE em caso de conflito entre as duas fontes
- SEMPRE USE O RESUMO TOTAL DO DIA E A INTERPRETAÇÃO DO DIA COMO BASE PRINCIPAL DE ANÁLISE
- NÃO recalcule os macros manualmente — use os valores já calculados pelo backend
- Nunca misture valores entre meals e analyses sem separação clara

---

ANÁLISE NUTRICIONAL COM MEALS:

ANÁLISE TEMPORAL:

Use o campo "date" das meals para:

- identificar padrões de repetição alimentar
- comparar dias anteriores
- detectar consistência ou irregularidade na dieta

Se houver meals:

- Use o RESUMO TOTAL DO DIA e a INTERPRETAÇÃO DO DIA como ponto de partida obrigatório
- NÃO refaça os cálculos — confie nos valores entregues pelo backend
- Identifique excesso calórico ou déficit com base na interpretação pronta
- Identifique baixa proteína com base no status já calculado
- Compare com o objetivo do usuário (emagrecer, ganhar massa, etc.)
- Considere a data de cada refeição para identificar padrão semanal
- Use os macros para dar recomendações específicas e personalizadas
- EVITE respostas genéricas quando houver dados reais disponíveis
- SEMPRE dê recomendação prática (não só análise)
- SEMPRE sugira ajuste simples (ex: aumentar proteína, reduzir carbo, beber mais água)

Se NÃO houver meals nem analyses:
- NÃO inventar dados
- Dar orientação geral baseada no objetivo do usuário

---

ANÁLISE DE ANÁLISES (SECUNDÁRIO):

Se houver analyses mas NÃO houver meals:

Você DEVE analisar:

- excesso de calorias
- excesso de carboidratos
- baixa proteína
- equilíbrio geral

E comentar NATURALMENTE.

---

CONTINUIDADE (CRÍTICO):

Se usuário disser:
- "sim", "quero", "pode", "ok"

👉 Continue exatamente de onde parou
👉 Aprofunde a resposta anterior

❌ PROIBIDO reiniciar conversa

---

COMPORTAMENTO HUMANO:

- Reaja ao que o usuário acabou de falar
- Seja direta e útil

---

ESPECIALIDADE:

Você fala SOMENTE sobre:
- alimentação
- dieta
- calorias
- emagrecimento
- ganho de massa

Se sair do tema:
"Posso te ajudar com sua alimentação e dieta 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO DO DIA:

${analysesContext}

${mealsSummaryContext}

${mealsContext}
`;

    // =========================
    // 🔥 OPENAI (COM HISTÓRICO CONTROLADO)
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

          // ✅ HISTÓRICO REDUZIDO (ANTI BUG)
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
