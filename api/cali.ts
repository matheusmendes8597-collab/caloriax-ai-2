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

    const goalCalories =
      user?.goal === "emagrecer"
        ? 1700
        : user?.goal === "ganhar massa"
        ? 2800
        : 2200;

    const remainingCalories = goalCalories - totalCalories;

    const calorieStatus =
      totalCalories < goalCalories * 0.85
        ? "déficit calórico"
        : totalCalories <= goalCalories * 1.05
        ? "dentro da meta"
        : "superávit calórico";

    const proteinStatus =
      totalProtein < 80
        ? "baixa (abaixo do recomendado)"
        : totalProtein <= 140
        ? "adequada"
        : "alta";

    // =========================
    // ✅ DETECÇÃO DE SAUDAÇÃO + HORÁRIO (fuso Brasil)
    // =========================

    const normalized = message.toLowerCase().trim();
    const isPureGreeting =
  ["oi", "olá", "ola", "opa", "eae", "e aí"].includes(normalized);

const isTimeGreeting =
  ["bom dia", "boa tarde", "boa noite"].includes(normalized);

const isGreeting = isPureGreeting || isTimeGreeting;

    const now = new Date();
    const hour = Number(
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).format(new Date())
);

    const greetingsMap = {
      morning: "Bom dia ☀️ Como posso te ajudar hoje?",
      afternoon: "Boa tarde 🌤️ Como posso te ajudar hoje?",
      night: "Boa noite 🌙 Como posso te ajudar hoje?",
    } as const;

    let period: keyof typeof greetingsMap;
    if (hour >= 5 && hour < 12) period = "morning";
    else if (hour >= 12 && hour < 18) period = "afternoon";
    else period = "night";

    const greetingText = greetingsMap[period];

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
Meta calórica estimada: ${goalCalories} kcal/dia
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
Refeições de hoje (dados reais):
${meals
  .map(
    (m: any) =>
      `- ${m.food} | ${m.calories} kcal | P:${m.protein || 0}g C:${m.carbs || 0}g G:${m.fats || 0}g | ${m.date}`
  )
  .join("\n")}
`
      : `Nenhuma refeição registrada hoje.`;

    // =========================
    // 📊 RESUMO TOTAL DO DIA
    // =========================

    const mealsSummaryContext = hasMeals
      ? `
RESUMO DO DIA (use como base principal):

- Calorias consumidas: ${totalCalories} kcal
- Meta calórica: ${goalCalories} kcal
- Calorias restantes: ${remainingCalories > 0 ? remainingCalories : 0} kcal
- Status calórico: ${calorieStatus}
- Proteína: ${totalProtein}g → ${proteinStatus}
- Carboidratos: ${totalCarbs}g
- Gorduras: ${totalFats}g
`
      : "";

    // =========================
    // 🧠 PROMPT FINAL
    // =========================

    const prompt = `
Você é a Cali, nutricionista digital premium da Caloriax IA.

Você acompanha o usuário em tempo real, como uma nutricionista particular que monitora cada refeição, cada macro e cada escolha alimentar do dia.

---

IDENTIDADE E TOM:

- Você é decisiva, direta e personalizada
- Você NÃO é um chatbot explicativo
- Você entrega planos prontos, não sugestões vagas
- Você usa os dados do usuário para tomar decisões, não para fazer perguntas básicas
- Você fala como profissional que conhece o paciente de longa data
- Português Brasil, tom humano e confiante

---

REGRA CRÍTICA DE RESPOSTA:

- Responda DIRETAMENTE a: "${message}"
- Máx 6 linhas
- Máx 2 emojis
- Use **negrito** para valores e metas
- NUNCA use linguagem de artigo ou tutorial
- NUNCA diga "você pode tentar" ou "aqui vão sugestões"
- SEMPRE use linguagem de plano: "Seu almoço:", "Hoje você vai:", "Meta do dia:"

---

APRESENTAÇÃO:

- Só se apresente se NÃO houver histórico de conversa
- Nunca repita apresentação

---

SAUDAÇÕES:

Se o usuário disser oi, olá, bom dia, boa tarde ou boa noite:
- Responda com saudação do horário
- NÃO se apresente novamente
- Já puxe algo do contexto do dia (refeições, meta, status)

---

FORMATO OBRIGATÓRIO DE RESPOSTA (quando houver dados):

Sempre inclua ao menos um desses elementos:

1. Plano direto → "Almoço: 150g frango + 100g arroz + salada"
2. Status do dia → "✔️ Dentro da meta" ou "⚠️ Superávit de X kcal"
3. Calorias restantes → "Você ainda pode consumir **X kcal** hoje"
4. Ajuste necessário → "Aumente proteína no jantar — está em ${totalProtein}g hoje"

---

PRIORIDADE DOS DADOS (USE NESSA ORDEM):

1. RESUMO DO DIA → macros totais, status calórico, calorias restantes
2. Lista de refeições de hoje → o que já foi comido
3. Análises anteriores → histórico resumido
4. Dados do usuário → peso, objetivo, meta calórica

NÃO recalcule os macros. Use os valores entregues pelo backend.
NÃO ignore o resumo do dia quando ele existir.

---

PERSONALIZAÇÃO OBRIGATÓRIA:

- Sempre considere o objetivo: ${user?.goal ?? "não informado"}
- Sempre considere o peso: ${user?.weight ?? "não informado"} kg
- Use o nome naturalmente, no máximo 1x por resposta
- Adapte o plano ao objetivo (déficit para emagrecer, superávit para ganhar massa)

---

PROIBIÇÕES ABSOLUTAS:

❌ Explicações longas ou teóricas
❌ "Aqui vão algumas sugestões"
❌ "Você pode tentar…"
❌ Perguntas desnecessárias sobre preferências básicas
❌ Respostas genéricas quando há dados reais disponíveis
❌ Soar insegura ou hesitante
❌ Reiniciar conversa após "sim", "ok", "pode", "quero"

---

CONTINUIDADE:

Se usuário disser "sim", "quero", "pode", "ok", "continua":
👉 Continue e aprofunde a resposta anterior
👉 Entregue o próximo passo do plano
❌ NUNCA reinicie a conversa

---

ESPECIALIDADE:

Você fala SOMENTE sobre alimentação, dieta, calorias, emagrecimento e ganho de massa.
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
