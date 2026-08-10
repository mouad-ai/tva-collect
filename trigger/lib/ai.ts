import { GoogleGenAI, Type } from "@google/genai";

let client: GoogleGenAI | null = null;
function gemini() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: `${input.purpose}\n\nContexte :\n${input.context}\n\nÉcris uniquement le message WhatsApp, sans guillemets ni préambule.`,
    config: { systemInstruction: BRAND_CONTEXT }
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini did not return a text draft.");
  return text;
}

export type InboundClassification = {
  intent: "interested" | "price_question" | "wants_pilot" | "not_interested" | "needs_human" | "other";
  suggestedReply: string;
  needsHumanReview: boolean;
  summary: string;
};

const classificationSchema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: ["interested", "price_question", "wants_pilot", "not_interested", "needs_human", "other"],
      description:
        "wants_pilot = explicitly ready to start a free pilot now. needs_human = anything ambiguous, a complaint, a complex question, or a real business decision the founder should personally handle."
    },
    suggestedReply: {
      type: Type.STRING,
      description: "The WhatsApp reply to send, following the brand rules. Empty string if needs_human and no safe auto-reply exists."
    },
    needsHumanReview: {
      type: Type.BOOLEAN,
      description: "True whenever intent is wants_pilot, not_interested (to log why, not to auto-reply), needs_human, or the situation is ambiguous."
    },
    summary: { type: Type.STRING, description: "One-sentence summary of what the prospect said, for the conversation log." }
  },
  required: ["intent", "suggestedReply", "needsHumanReview", "summary"]
};

export async function classifyInboundReply(input: { conversationHistory: string; latestMessage: string }): Promise<InboundClassification> {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: `Historique de la conversation :\n${input.conversationHistory}\n\nDernier message du prospect :\n${input.latestMessage}\n\nClassifie ce message et propose une réponse.`,
    config: {
      systemInstruction: BRAND_CONTEXT,
      responseMimeType: "application/json",
      responseSchema: classificationSchema
    }
  });
  const raw = response.text;
  if (!raw) throw new Error("Gemini did not return a classification.");
  return JSON.parse(raw) as InboundClassification;
}
