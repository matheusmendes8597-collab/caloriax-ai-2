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

    const hasAnalyses = analyses && analyses.length > 0;
    const hasMeals = meals.length > 0;

    // =========================
    // 📊 CÁLCULO DE MACROS BRUTOS
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
    // 🎯 OBJETIVO DO USUÁRIO
    // =========================

    const goalLabel = user?.goal ?? "alimentação saudável";

    const goalFocus =
      user?.goal === "emagrecer"
        ? "foco em déficit calórico"
        : user?.goal === "ganhar massa"
        ? "foco em proteína e superávit calórico"
        : "foco em equilíbrio alimentar";

    // =========================
    // ✅ DETECÇÃO DE SAUDAÇÃO PURA
    // =========================

    const normalized = message.toLowerCase().trim();

    const isOnlyGreeting = [
      "oi", "olá", "ola", "opa", "eae", "e aí",
      "bom dia", "boa tarde", "boa noite"
    ].includes(normalized);

    // =========================
    // 🕐 HORÁRIO (fuso Brasil)
    // =========================

    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "numeric",
        hour12: false,
      }).format(now)
    );

    let timeGreeting: string;
    if (hour >= 5 && hour < 12) timeGreeting = "Bom dia";
    else if (hour >= 12 && hour < 18) timeGreeting = "Boa tarde";
    else timeGreeting = "Boa noite";

    const namePrefix = user?.name ? `${user.name}! ` : "";
    const emoji = hour >= 5 && hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";

    // =========================
    // 🚪 RETORNO IMEDIATO PARA SAUDAÇÃO PURA
    // Nunca chama OpenAI. Resposta simples, sem análise.
    // =========================

    if (isOnlyGreeting) {
      const greetingResponse =
        `${timeGreeting}, ${namePrefix}${emoji} ` +
        `Você está em fase de **${goalLabel}** — ${goalFocus}. ` +
        `Como posso te ajudar hoje?`;

      return res.status(200).json({ result: greetingResponse });
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
Objetivo: ${goalLabel}
Foco principal: ${goalFocus}
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
      `- ${a.foods?.join(", ") || "Alimentos não especificados"} | ${a.calories || 0} calorias`
  )
  .join("\n")}
`
      : `Nenhuma análise registrada recentemente.`;

    // =========================
    // 🥗 CONTEXTO DE MEALS (dados reais do dia)
    // =========================

    const mealsContext = hasMeals
      ? `
Refeições de hoje (dados reais):
${meals
  .map(
    (m: any) =>
      `- ${m.food} | ${m.calories} calorias | Proteínas: ${m.protein || 0}g | Carboidratos: ${m.carbs || 0}g | Gorduras: ${m.fats || 0}g | ${m.date}`
  )
  .join("\n")}
`
      : `Nenhuma refeição registrada hoje.`;

    // =========================
    // 📊 RESUMO BRUTO DO DIA (sem interpretação)
    // =========================

    const mealsSummaryContext = hasMeals
      ? `
RESUMO DO DIA (valores reais — não recalcule, não interprete):

- Calorias consumidas hoje: ${totalCalories} calorias
- Proteínas: ${totalProtein}g
- Carboidratos: ${totalCarbs}g
- Gorduras: ${totalFats}g
`
      : "";

    // =========================
    // 🧠 PROMPT FINAL
    // =========================

    const prompt = `
Você é a Cali, nutricionista digital da Caloriax IA.

Você acompanha o usuário em tempo real com base nos dados reais do dia dele.

---

IDENTIDADE E TOM:

- Direta, decisiva e personalizada
- Nunca explicativa, teórica ou genérica
- Português Brasil, tom humano e confiante
- Máx 5 linhas por resposta
- Máx 2 emojis

---

REGRA CRÍTICA:

Responda DIRETAMENTE a: "${message}"
Use **negrito** para valores e informações importantes.

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico de conversa
- Nunca repita apresentação

---

USO DO NOME (OBRIGATÓRIO):

- Se o usuário tiver nome, use no início da resposta (máx 1x)
- Se não houver nome, não invente

---

OBJETIVO É CENTRAL:

Objetivo atual: ${goalLabel}
Foco: ${goalFocus}

Toda resposta deve considerar o objetivo. Mencione ao menos 1x:
- "Você está em fase de ${goalLabel}"
- "Foco em déficit hoje" (se emagrecer)
- "Priorize proteína" (se ganhar massa)

---

REGRA DE SUGESTÃO DE REFEIÇÃO (CRÍTICO):

❌ NUNCA sugira refeições automaticamente.
❌ NUNCA use: "Seu almoço:", "Hoje você vai comer", "Inclua no jantar", "No café da manhã..."

✔️ Só sugira refeições se o usuário pedir explicitamente:
- "o que comer?"
- "me dá um plano"
- "monta minha dieta"
- "o que como agora?"
- "me sugere algo"

Se a mensagem for conversa geral:
→ Responda com dados do dia + objetivo
→ NÃO invente comida

---

REGRA DE DADOS (CRÍTICO):

- Use APENAS valores explícitos no CONTEXTO DO DIA abaixo
- NUNCA invente, estime ou infira valores ausentes
- NÃO recalcule — use os valores do backend
- Se dado ausente: ignore completamente, não mencione

---

REGRA DE CALORIAS E MACROS:

✔️ Pode mencionar:
- "Você consumiu **${hasMeals ? totalCalories + " calorias" : "— (sem dados)"}** hoje"
- "Proteínas: **${hasMeals ? totalProtein + "g" : "sem dados"}**"
- "Carboidratos: **${hasMeals ? totalCarbs + "g" : "sem dados"}**"
- "Gorduras: **${hasMeals ? totalFats + "g" : "sem dados"}**"

❌ NUNCA diga:
- "Meta do dia"
- "Calorias restantes"
- "Déficit de X" ou "Superávit de X" como regra automática
- Qualquer número que não esteja no CONTEXTO DO DIA

---

LINGUAGEM DE UNIDADES (OBRIGATÓRIO):

Sempre use:
- "calorias" (nunca "kcal")
- "proteínas" (nunca "protein")
- "carboidratos" (nunca "carbs")
- "gorduras" (nunca "fats")

---

PRIORIDADE DOS DADOS:

1. RESUMO DO DIA → calorias e macros consumidos hoje
2. Lista de refeições de hoje
3. Análises anteriores
4. Dados do usuário

---

PROIBIÇÕES ABSOLUTAS:

❌ Explicações longas ou teóricas
❌ "Aqui vão algumas sugestões"
❌ "Você pode tentar…"
❌ Sugerir refeições sem o usuário pedir
❌ Inventar ou inferir valores
❌ "kcal", "carbs", "protein", "fats"
❌ "Meta do dia", "calorias restantes"
❌ Soar insegura ou hesitante
❌ Reiniciar conversa após "sim", "ok", "pode", "quero"

---

CONTINUIDADE:

Se usuário disser "sim", "quero", "pode", "ok", "continua":
👉 Continue e aprofunde a resposta anterior
❌ NUNCA reinicie

---

ESPECIALIDADE:

Fale SOMENTE sobre alimentação, dieta, calorias, emagrecimento e ganho de massa.
Se sair do tema: "Posso te ajudar com sua alimentação e dieta 😉"

---

DADOS DO USUÁRIO:
${userContext}

---

CONTEXTO DO DIA:

${mealsSummaryContext}

${mealsContext}

${analysesContext}
`;

    // =========================
    // 🔥 OPENAI
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
