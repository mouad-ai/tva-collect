import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function anthropic() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Shared voice/strategy for every drafted message: recruit free pilots, not
// sell — this is the exact strategy TVA Collect's founder validated as the
// one that gets responses instead of ghosting, and it must not drift back
// into a sales pitch no matter what the AI generates per-lead.
const BRAND_CONTEXT = `Tu écris des messages WhatsApp au nom de Mouad El Mrabate, fondateur de TVA Collect —
une solution marocaine de collecte de documents TVA pour cabinets comptables.

Règles non négociables :
- Français professionnel, jamais "je suis Mouad" en ouverture — utilise "Mouad El Mrabate, fondateur de TVA Collect."
- Objectif : recruter des cabinets PILOTES GRATUITS pendant 3 mois, PAS vendre. Ne jamais donner de prix
  sauf si explicitement redemandé après avoir déjà refusé une fois de le donner directement.
- Si prix demandé : ne jamais envoyer de liste de tarifs. Rediriger vers l'essai gratuit de 30 jours,
  poser une question sur leur nombre de clients pour continuer la conversation.
- Messages courts (3-5 phrases maximum), jamais de bloc de texte dense.
- Toujours finir par une question ouverte qui invite une réponse.
- Ton : direct, respectueux, jamais familier avec un inconnu au premier message.`;

export async function draftMessage(input: { purpose: string; context: string }) {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    system: BRAND_CONTEXT,
    messages: [
      {
        role: "user",
        content: `${input.purpose}\n\nContexte :\n${input.context}\n\nÉcris uniquement le message WhatsApp, sans guillemets ni préambule.`
      }
    ]
  });
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude did not return a text draft.");
  return textBlock.text.trim();
}

export type InboundClassification = {
  intent: "interested" | "price_question" | "wants_pilot" | "not_interested" | "needs_human" | "other";
  suggestedReply: string;
  needsHumanReview: boolean;
  summary: string;
};

const classifyTool: Anthropic.Tool = {
  name: "classify_and_reply",
  description: "Classify the prospect's WhatsApp reply and draft a suggested response.",
  input_schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: ["interested", "price_question", "wants_pilot", "not_interested", "needs_human", "other"],
        description:
          "wants_pilot = explicitly ready to start a free pilot now. needs_human = anything ambiguous, a complaint, a complex question, or a real business decision the founder should personally handle."
      },
      suggestedReply: {
        type: "string",
        description: "The WhatsApp reply to send, following BRAND_CONTEXT rules. Empty string if needs_human and no safe auto-reply exists."
      },
      needsHumanReview: {
        type: "boolean",
        description: "True whenever intent is wants_pilot, not_interested (to log why, not to auto-reply), needs_human, or the situation is ambiguous."
      },
      summary: { type: "string", description: "One-sentence summary of what the prospect said, for the conversation log." }
    },
    required: ["intent", "suggestedReply", "needsHumanReview", "summary"]
  }
};

export async function classifyInboundReply(input: { conversationHistory: string; latestMessage: string }): Promise<InboundClassification> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: BRAND_CONTEXT,
    tools: [classifyTool],
    tool_choice: { type: "tool", name: "classify_and_reply" },
    messages: [
      {
        role: "user",
        content: `Historique de la conversation :\n${input.conversationHistory}\n\nDernier message du prospect :\n${input.latestMessage}\n\nClassifie ce message et propose une réponse.`
      }
    ]
  });
  const toolBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") throw new Error("Claude did not return a classification.");
  return toolBlock.input as InboundClassification;
}
