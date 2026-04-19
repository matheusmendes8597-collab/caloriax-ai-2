// api/cali.ts

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

// =========================
// 🛡 TERMOS PROIBIDOS
// =========================

const RAW_GOAL_LEAK_PATTERN =
  /\b(maintain|maintenance|bulk|bulking|cut|cutting|deficit|surplus|lose_weight|gain_muscle|recomp)\b/i;

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
  emagrecer: "emagrecimento",
  emagrecimento: "emagrecimento",
  "perder peso": "emagrecimento",
  "ganhar massa": "ganho de massa muscular",
  "ganho de massa": "ganho de massa muscular",
  "ganho muscular": "ganho de massa muscular",
  manutencao: "manutenção de peso",
  "manter peso": "manutenção de peso",
  "manter saude": "manutenção de peso",
  manter: "manutenção de peso",
  equilibrio: "equilíbrio alimentar",
  "alimentacao saudavel": "alimentação saudável",
  cut: "emagrecimento",
  cutting: "emagrecimento",
  deficit: "emagrecimento",
  "lose weight": "emagrecimento",
  "lose fat": "emagrecimento",
  "weight loss": "emagrecimento",
  bulk: "ganho de massa muscular",
  bulking: "ganho de massa muscular",
  surplus: "ganho de massa muscular",
  "gain muscle": "ganho de massa muscular",
  "gain mass": "ganho de massa muscular",
  "muscle gain": "ganho de massa muscular",
  maintain: "manutenção de peso",
  maintenance: "manutenção de peso",
  "maintain weight": "manutenção de peso",
  "keep weight": "manutenção de peso",
  recomp: "recomposição corporal",
  recomposicao: "recomposição corporal",
  "recomposicao corporal": "recomposição corporal",
  "body recomposition": "recomposição corporal",
};

const goalFocusMap: Record<string, string> = {
  "emagrecimento":           "déficit calórico",
  "ganho de massa muscular": "proteína e superávit calórico",
  "manutenção de peso":      "equilíbrio entre calorias e nutrientes",
  "equilíbrio alimentar":    "equilíbrio nutricional",
  "alimentação saudável":    "equilíbrio nutricional",
  "recomposição corporal":   "proteína alta com calorias controladas",
};

function translateGoal(raw: any): { label: string; focus: string } {
  const safeRaw = typeof raw === "string" ? raw : "";
  const key     = normalizeGoalKey(safeRaw);
  const label   = goalMap[key] ?? "alimentação saudável";
  const focus   = goalFocusMap[label] ?? "equilíbrio nutricional";

  if (RAW_GOAL_LEAK_PATTERN.test(label) || RAW_GOAL_LEAK_PATTERN.test(focus)) {
    return { label: "alimentação saudável", focus: "equilíbrio nutricional" };
  }

  return { label, focus };
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
  const isGreeting         = GREETING_PATTERN.test(n);
  const hasNutritionIntent = NUTRITION_INTENT_PATTERN.test(n);
  if (isGreeting && !hasNutritionIntent) return "greeting";
  return "nutrition";
}

// =========================
// 💬 DETECÇÃO DE MENSAGEM LEVE
// =========================

function checkIsLightMessage(msg: string): boolean {
  const n = msg.toLowerCase().trim();
  return /^(sim+|s+|ok+[!]*|okay|valeu+[!]*|obrigad[oa]+(\s+\w+)*|certo+|entendi+|show+|boa+|top+|perfeito+|massa+)$/.test(n);
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

  if (hour >= 5 && hour < 12) return { greeting: "Bom dia",   emoji: "☀️" };
  if (hour >= 12 && hour < 18) return { greeting: "Boa tarde", emoji: "🌤️" };
  return                               { greeting: "Boa noite", emoji: "🌙" };
}

// =========================
// 📊 CÁLCULO DE MACROS
// =========================

function calcMacros(meals: any[]) {
  return {
    calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein:  meals.reduce((s, m) => s + (m.protein  || 0), 0),
    carbs:    meals.reduce((s, m) => s + (m.carbs    || 0), 0),
    fats:     meals.reduce((s, m) => s + (m.fats     || 0), 0),
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
            `- ${m.food} | ${m.calories} calorias | Proteínas: ${m.protein || 0}g | Carboidratos: ${m.carbs || 0}g | Gorduras: ${m.fats || 0}g | ${m.date}`
        )
        .join("\n")}`
    : "";

  const analysesCtx = hasAnalyses
    ? `ANÁLISES RECENTES:\n${analyses
        .map(
          (a: any) =>
            `- ${a.foods?.join(", ") || "Alimentos não especificados"} | ${a.calories || 0} calorias`
        )
        .join("\n")}`
    : "";

  return [userCtx, summaryCtx, mealsCtx, analysesCtx].filter(Boolean).join("\n\n");
}

// =========================
// 🧩 CONTEXTO — COM OBJETIVO
// =========================

function buildContextWithGoal(params: {
  user: any;
  goalLabel: string;
  goalFocus: string;
  meals: any[];
  hasMeals: boolean;
  macros: ReturnType<typeof calcMacros>;
  analyses: any[];
  hasAnalyses: boolean;
}): string {
  const { user, goalLabel, goalFocus, meals, hasMeals, macros, analyses, hasAnalyses } = params;

  const userCtx = `DADOS DO USUÁRIO:
Nome: ${user?.name ?? "Não informado"}
Idade: ${user?.age ?? "Não informado"} anos
Peso: ${user?.weight ?? "Não informado"} kg
Altura: ${user?.height ?? "Não informado"} cm
Peso ideal: ${user?.ideal_weight ?? "Não informado"} kg
Objetivo: ${goalLabel}
Foco nutricional: ${goalFocus}`;

  return buildSharedContext({ userCtx, meals, hasMeals, macros, analyses, hasAnalyses });
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

  return buildSharedContext({ userCtx, meals, hasMeals, macros, analyses, hasAnalyses });
}

// =========================
// 🧠 PROMPT — COM OBJETIVO
// =========================

function buildPromptWithGoal(params: {
  message: string;
  goalLabel: string;
  goalFocus: string;
  nutritionContext: string;
  isFirstMessage: boolean;
  recentContext: boolean;
}): string {
  const { message, goalLabel, goalFocus, nutritionContext, isFirstMessage, recentContext } = params;

  const presentationRule = isFirstMessage
    ? "Apresente-se brevemente como Cali, nutricionista do Caloriax."
    : "Não se apresente — já houve conversa.";

  const goalRule = isFirstMessage
    ? `5. NÃO mencione o objetivo do usuário nesta resposta, a menos que ele tenha perguntado algo nutricional explícito.`
    : `5. OBJETIVO DO USUÁRIO: **${goalLabel}** | Foco: ${goalFocus}
   → Mencione apenas quando a mensagem tiver intenção nutricional clara`;

  const continuityRule = recentContext
    ? `9. CONTINUIDADE: Usuário em contexto ativo. Se disser "sim", "ok", "quero" — continue e aprofunde.`
    : `9. CONTINUIDADE: Sem contexto recente. Se usuário disser "sim", "ok", "quero" sem contexto claro, peça para detalhar.`;

  return `Você é a Cali, nutricionista clínica digital da Caloriax IA.

IDENTIDADE E VOZ:
- Direta, objetiva, sem coaching e sem motivação genérica
- Tom humano e confiante — nunca robótica ou teórica
- Português Brasil
- Máximo 5 linhas por resposta
- Máximo 2 emojis

REGRAS:

1. Responda DIRETAMENTE a: "${message}"
2. Use **negrito** para valores e dados importantes
3. ${presentationRule}
4. Use o nome do usuário no início da resposta (máx 1x), se disponível

${goalRule}

6. SUGESTÃO DE REFEIÇÃO — só se pedido explícito:
   Gatilhos válidos: "o que comer?", "me dá um plano", "monta minha dieta", "o que como agora?", "me sugere algo"
   → Sem pedido explícito: use dados do dia. NUNCA invente comida.

7. DADOS — use APENAS o que está no contexto abaixo. NUNCA invente, estime ou infira.
   → Dado ausente: ignore completamente, não mencione

8. LINGUAGEM OBRIGATÓRIA:
   ✔ "calorias" (nunca "kcal")
   ✔ "proteínas" (nunca "protein")
   ✔ "carboidratos" (nunca "carbs")
   ✔ "gorduras" (nunca "fats")
   ✔ "emagrecimento", "ganho de massa muscular", "manutenção de peso"
   ❌ NUNCA: "kcal", "maintain", "bulk", "cut", "cutting", "bulking", "deficit", "surplus"

${continuityRule}

10. ESPECIALIDADE:
    Somente alimentação, dieta, calorias, emagrecimento e ganho de massa.
    Fora do tema: "Posso te ajudar com sua alimentação e dieta 😉"

---

${nutritionContext}`.trim();
}

// =========================
// 🧠 PROMPT — SEM OBJETIVO
// =========================

function buildPromptWithoutGoal(params: {
  message: string;
  nutritionContext: string;
  isFirstMessage: boolean;
  recentContext: boolean;
}): string {
  const { message, nutritionContext, isFirstMessage, recentContext } = params;

  const presentationRule = isFirstMessage
    ? "Apresente-se brevemente como Cali, nutricionista do Caloriax."
    : "Não se apresente — já houve conversa.";

  const continuityRule = recentContext
    ? `9. CONTINUIDADE: Usuário em contexto ativo. Se disser "sim", "ok", "quero" — continue e aprofunde.`
    : `9. CONTINUIDADE: Sem contexto recente. Se usuário disser "sim", "ok", "quero" sem contexto claro, peça para detalhar.`;

  return `Você é a Cali, nutricionista clínica digital da Caloriax IA.

IDENTIDADE E VOZ:
- Direta, objetiva, sem coaching e sem motivação genérica
- Tom humano e confiante — nunca robótica ou teórica
- Português Brasil
- Máximo 5 linhas por resposta
- Máximo 2 emojis

REGRAS:

1. Responda DIRETAMENTE a: "${message}"
2. Use **negrito** para valores e dados importantes
3. ${presentationRule}
4. Use o nome do usuário no início da resposta (máx 1x), se disponível
5. NÃO mencione objetivo nutricional nesta resposta

6. SUGESTÃO DE REFEIÇÃO — só se pedido explícito:
   Gatilhos válidos: "o que comer?", "me dá um plano", "monta minha dieta", "o que como agora?", "me sugere algo"
   → Sem pedido explícito: use dados do dia. NUNCA invente comida.

7. DADOS — use APENAS o que está no contexto abaixo. NUNCA invente, estime ou infira.
   → Dado ausente: ignore completamente, não mencione

8. LINGUAGEM OBRIGATÓRIA:
   ✔ "calorias" (nunca "kcal")
   ✔ "proteínas" (nunca "protein")
   ✔ "carboidratos" (nunca "carbs")
   ✔ "gorduras" (nunca "fats")
   ❌ NUNCA: "kcal", "maintain", "bulk", "cut", "cutting", "bulking", "deficit", "surplus"

${continuityRule}

10. ESPECIALIDADE:
    Somente alimentação, dieta, calorias, emagrecimento e ganho de massa.
    Fora do tema: "Posso te ajudar com sua alimentação e dieta 😉"

---

${nutritionContext}`.trim();
}

// =========================
// 🚀 HANDLER PRINCIPAL
// =========================

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const body     = req.body || {};
    const message  = body.message;
    const user     = body.user;
    const analyses = body.analyses;
    const meals    = body.meals || [];
    const history  = body.history || [];

    if (!message) return res.status(400).json({ error: "Mensagem é obrigatória" });

    // --- Detecção de modo ANTES de qualquer processamento
    const mode = detectMode(message);

    if (mode === "greeting") {
      const { greeting, emoji } = getTimedGreeting();
      const namePart = user?.name ? `, ${user.name}` : "";
      return res.status(200).json({
        result: `${greeting}${namePart}! ${emoji} Como posso te ajudar hoje?`,
        resetContext: true,
      });
    }

    // --- Tradução de objetivo (só executa se NÃO for greeting)
    const { label: goalLabel, focus: goalFocus } = translateGoal(user?.goal);

    // =========================
    // 🥗 MODO NUTRIÇÃO
    // =========================

    const hasMeals      = meals.length > 0;
    const hasAnalyses   = analyses && analyses.length > 0;
    const macros        = calcMacros(meals);

    const recentContext  = hasRecentContext(history);
    const safeHistory    = recentContext ? history.slice(-6) : [];
    const isFirstMessage = !recentContext;

    const includeGoal = recentContext || !checkIsLightMessage(message);

    let prompt: string;

    if (includeGoal) {
      const nutritionContext = buildContextWithGoal({
        user, goalLabel, goalFocus,
        meals, hasMeals, macros,
        analyses, hasAnalyses,
      });
      prompt = buildPromptWithGoal({
        message, goalLabel, goalFocus,
        nutritionContext, isFirstMessage, recentContext,
      });
    } else {
      const nutritionContext = buildContextWithoutGoal({
        user, meals, hasMeals, macros,
        analyses, hasAnalyses,
      });
      prompt = buildPromptWithoutGoal({
        message, nutritionContext, isFirstMessage, recentContext,
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
        ?.map((o: any) => o.content?.map((c: any) => c.text).join(""))
        .join("") ||
      "Erro ao responder.";

    return res.status(200).json({ result });

  } catch (error: any) {
    return res.status(500).json({ error: "Erro geral", details: error.message });
  }
}
