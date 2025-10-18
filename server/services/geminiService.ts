// Gemini AI service - blueprint:javascript_gemini
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
  console.warn("⚠️  GEMINI_API_KEY not set - AI response generation will not work");
}

export interface GenerateResponseParams {
  template: string;
  reviewText: string;
  rating: number;
  authorName?: string;
  companyName: string;
  tone: string;
}

export interface GenerateResponseResult {
  responseText: string;
  confidenceScore: number;
}

export async function generateResponse(
  params: GenerateResponseParams
): Promise<GenerateResponseResult> {
  if (!ai) {
    throw new Error("Gemini API not configured. Please set GEMINI_API_KEY environment variable.");
  }

  const { template, reviewText, rating, authorName, companyName, tone } = params;

  const prompt = `Você é um assistente de IA especializado em gerar respostas profissionais e empáticas para avaliações de clientes do Google Business Profile.

**Tarefa:** Gere uma resposta personalizada para a avaliação abaixo, usando o template fornecido como base.

**Contexto:**
- Empresa: ${companyName}
- Avaliador: ${authorName || "Cliente"}
- Rating: ${rating}/5 estrelas
- Tom desejado: ${tone}

**Avaliação do cliente:**
"${reviewText}"

**Template base:**
"${template}"

**Instruções:**
1. Use o template como estrutura base, mas personalize completamente a resposta
2. Substitua placeholders como {{author_name}}, {{company_name}}, {{rating}} pelos valores reais
3. Identifique pontos positivos mencionados e agradeça especificamente por eles
4. Se houver críticas (rating < 4), identifique o problema e mostre empatia
5. Mantenha um tom ${tone === "positivo" ? "entusiasmado e agradecido" : tone === "empatico" ? "compreensivo e acolhedor" : tone === "recuperacao" ? "responsável e proativo" : "profissional e cortês"}
6. A resposta deve ter entre 50-200 palavras
7. Seja genuíno e específico, evite respostas genéricas
8. Termine com um call-to-action ou convite para retornar

**Importante:** 
- NÃO invente fatos sobre a empresa ou serviços
- NÃO inclua informações sensíveis (telefone, endereço, e-mail)
- Mantenha o tom apropriado ao rating

Gere APENAS a resposta final, sem explicações ou marcações adicionais.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 300,
      },
    });

    const text = response.text;

    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    let confidenceScore = 0.85;
    if (response.candidates && response.candidates[0]?.avgLogprobs !== undefined) {
      const avgLogprobs = response.candidates[0].avgLogprobs;
      confidenceScore = Math.exp(avgLogprobs);
      confidenceScore = Math.max(0, Math.min(1, confidenceScore));
    }

    return {
      responseText: text.trim(),
      confidenceScore,
    };
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

export function detectSentiment(text: string): number {
  const positiveWords = [
    "excelente",
    "ótimo",
    "maravilhoso",
    "perfeito",
    "incrível",
    "adorei",
    "amei",
    "recomendo",
    "qualidade",
    "atencioso",
    "educado",
    "rápido",
    "eficiente",
  ];
  const negativeWords = [
    "ruim",
    "péssimo",
    "horrível",
    "terrível",
    "lento",
    "demorado",
    "rude",
    "mal educado",
    "problema",
    "defeito",
    "não recomendo",
    "decepcionado",
    "frustrado",
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score += 0.2;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score -= 0.3;
  });

  return Math.max(-1, Math.min(1, score));
}

export function detectLanguage(text: string): string {
  const portugueseIndicators = /\b(de|da|do|para|com|por|em|à|é|está|foi|ser)\b/gi;
  const englishIndicators = /\b(the|is|was|are|were|have|has|had|with|from|to)\b/gi;
  const spanishIndicators = /\b(el|la|de|para|con|por|en|está|fue|ser)\b/gi;

  const ptMatches = (text.match(portugueseIndicators) || []).length;
  const enMatches = (text.match(englishIndicators) || []).length;
  const esMatches = (text.match(spanishIndicators) || []).length;

  if (ptMatches > enMatches && ptMatches > esMatches) return "pt-BR";
  if (enMatches > ptMatches && enMatches > esMatches) return "en";
  if (esMatches > ptMatches && esMatches > enMatches) return "es";

  return "pt-BR";
}
