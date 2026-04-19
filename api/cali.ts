// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

// =========================
// 🎯 NORMALIZAÇÃO DE OBJETIVO
// =========================

function normalizeGoalKey(raw: any): string {
  if (typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ");
}

const goalMap: Record<string, string> = {
  "lose weight": "Perder peso",
  maintain: "Manter saúde",
  "gain muscle": "Ganhar massa",
};

function translateGoal(raw: any): { label: string } {
  const key = normalizeGoalKey(raw);
  const label = goalMap[key];
  return { label: label ?? "" };
}

// =========================
// ✅ DETECÇÃO DE MODO
// =========================

const GREETING_PATTERN =
  /^(oi+|ol[aá]+|opa+|eae|e\s*a[ií]|bom\s+dia|boa\s+tarde|boa\s+noite|hey+|hi+|hello+)\b/i;

const NUTRITION_INTENT_PATTERN =
  /caloria|kcal|dieta|emagrec|massa|comer|refeic|proteina|carboidrato|gordura|meta|plano|peso|treino|nutri/i;

function detectMode(message: string): "greeting" | "nutrition" {
  const n = message.toLowerCase().trim();
  const isGreeting = GREETING_PATTERN.test(n);
  const hasNutritionIntent = NUTRITION_INTENT_PATTERN.test(n);

  if (isGreeting && !hasNutritionIntent) return "greeting";
  return "nutrition";
}

// =========================
// 💬 DETECÇÃO DE MENSAGEM LEVE
// =========================

function checkIsLightMessage(msg: string): boolean {
  const n = msg.toLowerCase().trim();

  return /^(sim+|s+|ok+[!]*|okay|valeu+[!]*|obrigad[oa]+(\s+\w+)*|certo+|entendi+|show+|boa+|top+|perfeito+|massa+)$/.test(
    n
  );
}

// =========================
// 🎯 INTENÇÃO DE OBJETIVO
// =========================

function hasGoalIntent(message: string): boolean {
  return /emagrec|massa|objetivo|meta|ganhar|perder/.test(
    message.toLowerCase()
  );
}

// =========================
// 🕐 SAUDAÇÃO POR HORÁRIO (fuso Brasil)
// =========================

function getTimedGreeting(): { greeting: string; emoji: string } {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  if (hour >= 5 && hour < 12) return { greeting: "Bom dia", emoji: "☀️" };
  if (hour >= 12 && hour < 18) return { greeting: "Boa tarde", emoji: "🌤️" };
  return { greeting: "Boa noite", emoji: "🌙" };
}

// =========================
// 📊 CÁLCULO DE MACROS
// =========================

function calcMacros(meals: any[]) {
  return {
    calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
    fats: meals.reduce((s, m) => s + (m.fats || 0), 0),
  };
}

// =========================
// 🔁 CONTROLE DE CONTINUIDADE
// =========================

function hasRecentContext(history: any[]): boolean {
  if (!history || history.length === 0) return false;

  const last = history[history.length - 1];
  if (!last?.timestamp) return history.length >= 2;

  const elapsed = Date.now() - new Date(last.timestamp).getTime();
  return elapsed < 1000 * 60 * 10;
}

// =========================
// 👤 VALIDAÇÃO DE DADOS DO USUÁRIO
// =========================

function isMissingEssentialUserData(user: any): boolean {
  return !user?.name || !user?.age || !user?.weight;
}

function needsUserProfile(message: string): boolean {
  const n = message.toLowerCase();
  const strongIntent = /imc|peso ideal|meta|objetivo/.test(n);
  const planIntent = /plano alimentar|dieta personalizada/.test(n);

  return strongIntent || planIntent;
}

// =========================
// 🧩 CONTEXTO COMPARTILHADO
// =========================

function buildSharedContext(params: {
  userCtx: string;
  meals: any[];
  hasMeals: boolean;
  macros: ReturnType<typeof calcMacros>;
  analyses: any[];
  hasAnalyses: boolean;
}): string {
  const { userCtx, meals, hasMeals, macros, analyses, hasAnalyses } = params;

  const summaryCtx = hasMeals
    ? `TOTAIS DO DIA (não recalcule — valores exatos do backend):
- Calorias: ${macros.calories}
- Proteínas: ${macros.protein}g
- Carboidratos: ${macros.carbs}g
- Gorduras: ${macros.fats}g`
    : "Sem refeições registradas hoje.";

  const mealsCtx = hasMeals
    ? `REFEIÇÕES DE HOJE:\n${meals
        .map(
          (m) =>
            `- ${m.food} | ${m.calories} calorias | Proteínas: ${
              m.protein || 0
            }g | Carboidratos: ${m.carbs || 0}g | Gorduras: ${
              m.fats || 0
            }g | ${m.date}`
        )
        .join("\n")}`
    : "";

  const analysesCtx = hasAnalyses
    ? `ANÁLISES RECENTES:\n${analyses
        .map(
          (a: any) =>
            `- ${a.foods?.join(", ") || "Alimentos não especificados"} | ${
              a.calories || 0
            } calorias`
        )
        .join("\n")}`
    : "";

  return [userCtx, summaryCtx, mealsCtx, analysesCtx]
    .filter(Boolean)
    .join("\n\n");
}

// =========================
// 🧩 CONTEXTO — COM OBJETIVO
// =========================

function buildContextWithGoal(params: {
  user: any;
  goalLabel: string;
  meals: any[];
  hasMeals: boolean;
  macros: ReturnType<typeof calcMacros>;
  analyses: any[];
  hasAnalyses: boolean;
}): string {
  const {
    user,
    goalLabel,
    meals,
    hasMeals,
    macros,
    analyses,
    hasAnalyses,
  } = params;

  const userCtx = `DADOS DO USUÁRIO:
Nome: ${user?.name ?? "Não informado"}
Idade: ${user?.age ?? "Não informado"} anos
Peso: ${user?.weight ?? "Não informado"} kg
Altura: ${user?.height ?? "Não informado"} cm
Peso ideal: ${user?.ideal_weight ?? "Não informado"} kg
${
  goalLabel ? `Objetivo: ${goalLabel}` : ""
}`.trimEnd();

  return buildSharedContext({
    userCtx,
    meals,
    hasMeals,
    macros,
    analyses,
    hasAnalyses,
  });
}

// =========================
// 🧩 CONTEXTO — SEM OBJETIVO
// =========================

function buildContextWithoutGoal(params: {
  user: any;
  meals: any[];
  hasMeals: boolean;
  macros: ReturnType<typeof calcMacros>;
  analyses: any[];
  hasAnalyses: boolean;
}): string {
  const { user, meals, hasMeals, macros, analyses, hasAnalyses } = params;

  const userCtx = `DADOS DO USUÁRIO:
Nome: ${user?.name ?? "Não informado"}
Idade: ${user?.age ?? "Não informado"} anos
Peso: ${user?.weight ?? "Não informado"} kg
Altura: ${user?.height ?? "Não informado"} cm
Peso ideal: ${user?.ideal_weight ?? "Não informado"} kg`;

  return buildSharedContext({
    userCtx,
    meals,
    hasMeals,
    macros,
    analyses,
    hasAnalyses,
  });
}

// =========================
// 🧠 PROMPT — COM OBJETIVO
// =========================

function buildPromptWithGoal(params: {
  message: string;
  goalLabel: string;
  nutritionContext: string;
  isFirstMessage: boolean;
  recentContext: boolean;
  hasMeals: boolean;
}): string {
  const {
    message,
    goalLabel,
    nutritionContext,
    isFirstMessage,
    recentContext,
    hasMeals,
  } = params;

  const presentationRule = isFirstMessage
    ? "Apresente-se brevemente como Cali, nutricionista da Caloriax IA."
    : "Não se apresente — já houve conversa.";

  const goalRule = isFirstMessage
    ? `5. NÃO mencione o objetivo do usuário nesta resposta, a menos que ele tenha perguntado algo nutricional explícito.`
    : `5. OBJETIVO DO USUÁRIO: **${goalLabel || "NÃO INFORMADO"}**
→ Use EXATAMENTE este valor quando mencionar objetivo
→ NUNCA reescreva, NUNCA interprete, NUNCA troque por sinônimos
→ Se estiver "NÃO INFORMADO": não mencione objetivo em hipótese alguma
→ Mencione apenas quando a mensagem tiver intenção nutricional clara`;

  const continuityRule = recentContext
    ? `9. CONTINUIDADE: Usuário em contexto ativo. Se disser "sim", "ok", "quero" — continue e aprofunde.`
    : `9. CONTINUIDADE: Sem contexto recente. Se usuário disser "sim", "ok", "quero" sem contexto claro, peça para detalhar.`;

  const intelligentAnalysisRule = hasMeals
    ? `14. ANÁLISE INTELIGENTE (REGRA CRÍTICA): Sempre que houver dados de consumo (calorias, proteínas, carboidratos ou gorduras):
✔ Compare com o objetivo do usuário
✔ Diga se está:
- abaixo do ideal
- adequado
- acima do ideal
✔ Dê uma direção clara e curta (1 frase no máximo)
✔ A análise deve vir DEPOIS dos dados, nunca antes
✔ Ocupa no máximo 1 linha
✔ Seja direto — sem explicação longa`
    : `14. ANÁLISE INTELIGENTE: Sem refeições registradas — NÃO faça análise de consumo.`;

  return `
Você é a Cali, nutricionista clínica digital da Caloriax IA.

IDENTIDADE E VOZ:
0. CONTROLE DE ESCOPO (REGRA ABSOLUTA):
❌ Você NÃO responde perguntas fora de nutrição, dieta, calorias ou alimentação.
❌ Se o usuário pedir matemática, lógica, programação, explicação geral ou qualquer outro tema:
→ Responda EXATAMENTE: "Posso te ajudar apenas com alimentação, dieta e nutrição 😉"

REGRAS:
1. Responda DIRETAMENTE a: "${message}"
2. Use **negrito** para valores e dados importantes
3. ${presentationRule}
4. Use o nome do usuário no início da resposta (máx 1x), se disponível
${goalRule}
6. CONTINUIDADE: ${continuityRule}
7. ${intelligentAnalysisRule}
---
${nutritionContext}
`.trim();
}

// =========================
// 🧠 PROMPT — SEM OBJETIVO
// =========================

function buildPromptWithoutGoal(params: {
  message: string;
  nutritionContext: string;
  isFirstMessage: boolean;
  recentContext: boolean;
  hasMeals: boolean;
}): string {
  const {
    message,
    nutritionContext,
    isFirstMessage,
    recentContext,
    hasMeals,
  } = params;

  const presentationRule = isFirstMessage
    ? "Apresente-se brevemente como Cali, nutricionista da Caloriax IA."
    : "Não se apresente — já houve conversa.";

  const continuityRule = recentContext
    ? `9. CONTINUIDADE: Usuário em contexto ativo. Se disser "sim", "ok", "quero" — continue e aprofunde.`
    : `9. CONTINUIDADE: Sem contexto recente. Se usuário disser "sim", "ok", "quero" sem contexto claro, peça para detalhar.`;

  const intelligentAnalysisRule = hasMeals
    ? `14. ANÁLISE INTELIGENTE (REGRA CRÍTICA): Sempre que houver dados de consumo (calorias, proteínas, carboidratos ou gorduras):
✔ Diga se o consumo está:
- abaixo do esperado para o dia
- em um nível adequado
- acima do esperado para o dia
✔ Dê uma direção clara e curta (1 frase no máximo)
✔ A análise deve vir DEPOIS dos dados, nunca antes
✔ Ocupa no máximo 1 linha
✔ Seja direto — sem explicação longa`
    : `14. ANÁLISE INTELIGENTE: Sem refeições registradas — NÃO faça análise de consumo.`;

  return `
Você é a Cali, nutricionista clínica digital da Caloriax IA.

IDENTIDADE E VOZ:
- Direta, objetiva, sem coaching e sem motivação genérica
- Tom humano e confiante — nunca robótica ou teórica
- Português Brasil
- Máximo 5 linhas por resposta
- Máximo 2 emojis

REGRAS:
1. Responda somente se estiver dentro do escopo de nutrição.
2. Use **negrito** para valores e dados importantes
3. ${presentationRule}
4. CONTINUIDADE: ${continuityRule}
5. ${intelligentAnalysisRule}
---
${nutritionContext}
`.trim();
}

// =========================
// 🚀 HANDLER PRINCIPAL
// =========================

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const body = req.body || {};
    const message = body.message;
    const user = body.user;
    const analyses = body.analyses;
    const meals = body.meals || [];
    const history = body.history || [];

    if (!message)
      return res.status(400).json({ error: "Mensagem é obrigatória" });

    const missingUserData = isMissingEssentialUserData(user);

    const mode = detectMode(message);

    if (mode === "greeting") {
      const { greeting, emoji } = getTimedGreeting();
      const namePart = user?.name ? `, ${user.name}` : "";

      return res.status(200).json({
        result: `${greeting}${namePart}! ${emoji} Como posso te ajudar hoje?`,
        resetContext: true,
      });
    }

    const { label: goalLabel } = translateGoal(user?.goal);

    const hasMeals = meals.length > 0;
    const hasAnalyses = analyses && analyses.length > 0;
    const macros = calcMacros(meals);
    const recentContext = hasRecentContext(history);
    const safeHistory = recentContext ? history.slice(-6) : [];
    const isFirstMessage = history.length === 0;

    let includeGoal = recentContext || hasGoalIntent(message);

    const hasValidGoal = [
      "Perder peso",
      "Manter saúde",
      "Ganhar massa",
    ].includes(goalLabel);

    if (!hasValidGoal) {
      includeGoal = false;
    }

    let prompt: string;

    if (includeGoal) {
      const nutritionContext = buildContextWithGoal({
        user,
        goalLabel,
        meals,
        hasMeals,
        macros,
        analyses,
        hasAnalyses,
      });

      prompt = buildPromptWithGoal({
        message,
        goalLabel,
        nutritionContext,
        isFirstMessage,
        recentContext,
        hasMeals,
      });
    } else {
      const nutritionContext = buildContextWithoutGoal({
        user,
        meals,
        hasMeals,
        macros,
        analyses,
        hasAnalyses,
      });

      prompt = buildPromptWithoutGoal({
        message,
        nutritionContext,
        isFirstMessage,
        recentContext,
        hasMeals,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: prompt },
          ...safeHistory.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
          { role: "user", content: message },
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

    let finalResult = result;

    finalResult = finalResult.replace(
      /\b\d{1,2}\s+de\s+\w+\s+de\s+\d{4}\b/g,
      "data não disponível"
    );

    finalResult = finalResult.replace(
      /\bàs?\s*\d{1,2}:\d{2}\b/g,
      "horário não disponível"
    );

    finalResult = finalResult
      .replace(/manutenção de peso/gi, "Manter saúde")
      .replace(/déficit calórico/gi, "Perder peso")
      .replace(/superávit/gi, "Ganhar massa")
      .replace(/ganho de massa muscular/gi, "Ganhar massa")
      .replace(/foco/gi, "objetivo");

    finalResult = finalResult.replace(/Caloriax(?! IA)/g, "Caloriax IA");

    if (missingUserData && needsUserProfile(message)) {
      finalResult = `Para te ajudar melhor, complete seus dados em "Meu Perfil". 😉`;
    }

    return res.status(200).json({ result: finalResult });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Erro geral", details: error.message });
  }
}
