export interface ModerationResult {
  action: "PASS" | "WARN" | "BLOCK";
  flags: string[];
  reasons: string[];
}

export function moderateResponse(
  responseText: string,
  reviewRating: number,
  confidenceScore: number
): ModerationResult {
  const flags: string[] = [];
  const reasons: string[] = [];

  const inappropriateWords = [
    "idiota",
    "burro",
    "estúpido",
    "imbecil",
    "merda",
    "porra",
    "caralho",
    "desgraçado",
  ];
  
  const lowerText = responseText.toLowerCase();
  
  if (inappropriateWords.some((word) => lowerText.includes(word))) {
    flags.push("inappropriate_language");
    reasons.push("Linguagem inadequada detectada");
  }

  if (responseText.length < 30) {
    flags.push("too_short");
    reasons.push("Resposta muito curta (< 30 caracteres)");
  }

  if (responseText.length > 500) {
    flags.push("too_long");
    reasons.push("Resposta muito longa (> 500 caracteres)");
  }

  const toneMismatch =
    (reviewRating <= 2 && lowerText.includes("agradecemos")) ||
    (reviewRating >= 4 && lowerText.includes("lamentamos"));
  
  if (toneMismatch) {
    flags.push("tone_mismatch");
    reasons.push("Tom incompatível com o rating da avaliação");
  }

  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/;
  
  if (emailPattern.test(responseText) || phonePattern.test(responseText)) {
    flags.push("sensitive_data");
    reasons.push("Possível exposição de dados sensíveis (telefone/e-mail)");
  }

  if (confidenceScore < 0.7) {
    flags.push("low_confidence");
    reasons.push(`Baixa confiança da IA (${(confidenceScore * 100).toFixed(0)}%)`);
  }

  if (flags.includes("inappropriate_language") || flags.includes("sensitive_data")) {
    return { action: "BLOCK", flags, reasons };
  }

  if (
    flags.includes("tone_mismatch") ||
    flags.includes("low_confidence") ||
    flags.includes("too_short")
  ) {
    return { action: "BLOCK", flags, reasons };
  }

  if (flags.includes("too_long")) {
    return { action: "WARN", flags, reasons };
  }

  return { action: "PASS", flags: [], reasons: [] };
}

export function calculatePriority(
  rating: number,
  hasText: boolean,
  sentimentScore: number
): string {
  if (rating <= 2) return "URGENT";
  if (rating === 3 && hasText && sentimentScore < 0) return "HIGH";
  if (rating === 3) return "NORMAL";
  if (rating === 4 && hasText) return "NORMAL";
  return "LOW";
}
