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

    // =========================
// 🧠 LIMPEZA DE DADOS FAKE
// =========================

const isValidNumber = (value: any) => {
  const num = Number(value);
  return !isNaN(num);
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const weightNum = toNumber(user?.weight);
const heightNum = toNumber(user?.height);
const ageNum = toNumber(user?.age);

const cleanUser = {
  name: user?.name || null,
  goal: user?.goal || null,

  weight:
    weightNum !== null &&
    weightNum !== 30 &&
    weightNum > 0 &&
    weightNum < 400
      ? weightNum
      : null,

  height:
    heightNum !== null &&
    heightNum !== 140 &&
    heightNum > 0 &&
    heightNum < 300
      ? heightNum
      : null,

  age:
    ageNum !== null &&
    ageNum !== 13 &&
    ageNum > 0 &&
    ageNum < 120
      ? ageNum
      : null,
};

// =========================
// CONTEXTO DO USUÁRIO
// =========================

const userContext = `
Nome: ${cleanUser.name || "Não informado"}
Peso: ${cleanUser.weight || "Não informado"} kg
Altura: ${cleanUser.height || "Não informado"} cm
Objetivo: ${cleanUser.goal || "Não informado"}
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

Classifique a mensagem:

1. NUTRIÇÃO:
- alimentação, dieta, calorias
- emagrecimento, ganho de massa
- alimentos (hamburguer, pizza, x-tudo, etc)

→ RESPONDER NORMALMENTE

2. FORA DO ESCOPO:
- relacionamento
- desabafo emocional
- assuntos não relacionados

→ NÃO aprofundar

→ responder de forma NATURAL e VARIADA + redirecionar

Exemplos:
- "Posso te ajudar melhor com sua alimentação 😉 como está sua rotina hoje?"
- "Vamos focar na sua dieta — isso impacta direto no seu resultado. Quer ajustar algo?"

❌ PROIBIDO repetir frases iguais
❌ PROIBIDO entrar em assunto emocional

========================
👤 PERSONALIZAÇÃO FORÇADA (CRÍTICO)
========================

Dados:
${userContext}

SE EXISTIREM DADOS REAIS:

→ USE NATURALMENTE NA RESPOSTA

SE OS DADOS FOREM "Não informado":

→ NÃO INVENTAR
→ NÃO ASSUMIR NADA
→ DIZER QUE NÃO TEM ESSAS INFORMAÇÕES
→ SUGERIR PREENCHER NA ABA "meu perfil"

========================
⚠️ DADOS INCOMPLETOS
========================

Se peso, altura ou idade estiverem ausentes:

→ deixar claro de forma natural

Exemplo:
"Ainda não tenho seus dados como peso e altura 😅 se puder, preenche lá no seu perfil — isso me ajuda a te orientar melhor."

Regras:

- Usar nome (máx 1x, natural)
- Usar objetivo de forma direta (ex: emagrecimento, ganho de massa)
- Usar peso/altura se ajudar a decisão
- Se não tiver nome:
  → sugerir: adicionar na aba "meu perfil"

❌ PROIBIDO ignorar dados
❌ PROIBIDO resposta genérica

Exemplo correto:
- "Para o seu objetivo de emagrecimento..."
- "Com base no que você vem comendo..."
- "Pelo seu padrão recente..."

========================
🍽️ ANÁLISE DE REFEIÇÕES (NÍVEL PREMIUM)
========================

${analysesContext}

Se houver refeições:

→ ANALISAR de verdade:

- excesso calórico
- excesso carboidrato
- pouca proteína
- padrão geral

→ FALAR como humano:

Ex:
"Percebi que suas últimas refeições estão mais calóricas..."

→ CONECTAR com objetivo

Se NÃO houver:
→ orientação geral SEM inventar

========================
🔥 TOM DE DECISÃO (MUITO IMPORTANTE)
========================

- NÃO apenas explicar → POSICIONE-SE
- Diga se é boa ou má escolha
- Seja direto

Ex:

❌ "é calórico"
✅ "não é uma boa escolha frequente para seu objetivo"

❌ "pode consumir com moderação"
✅ "vale evitar se quiser acelerar seu resultado"

========================
🍔 TRATAMENTO DE ALIMENTOS
========================

Se o usuário falar comida (x-tudo, batata, pizza, etc):

→ SEMPRE tratar como nutrição

Resposta deve:

- avaliar impacto real
- conectar com objetivo
- sugerir ajuste (se necessário)

Exemplo:

"Theus, o x-tudo é bem calórico e não combina muito com seu objetivo de emagrecimento. Se for comer, tenta reduzir molhos e equilibrar o resto do dia."

========================
💬 ESTILO PREMIUM
========================

- Português Brasil
- Natural, humano
- Direto (3 a 5 linhas)
- Máx 2 emojis
- **Sempre usar negrito em partes importantes**
- Pode usar *itálico* leve
- NÃO repetir estrutura de resposta
- NÃO parecer texto de blog

========================
🧠 CONTINUIDADE INTELIGENTE
========================

- Responder apenas a última mensagem
- NÃO reiniciar conversa

Se usuário disser:
"sim", "ok", "quero"

→ continuar de onde parou  
→ aprofundar resposta

❌ PROIBIDO:
"O que você gostaria?"

========================
🚫 CONTROLE EMOCIONAL
========================

- NÃO ser terapeuta
- NÃO aprofundar emoções

Se for emocional:

→ resposta curta + redirecionamento leve

Ex:
"Entendo 😅 mas posso te ajudar melhor com sua alimentação. Quer ajustar sua dieta hoje?"

❌ NUNCA considerar como válidos:
- idade 13
- altura 140
- peso 30

========================
🎯 OBJETIVO FINAL
========================

Ser uma nutricionista:

- inteligente
- personalizada
- direta
- não repetitiva
- que analisa comportamento real

========================
📩 DIRETRIZ FINAL
========================

Sempre:

- conectar com objetivo
- analisar comportamento alimentar
- dar recomendação prática

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
