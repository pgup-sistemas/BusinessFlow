import type { Template } from "@shared/schema";

export interface MatchParams {
  rating: number;
  reviewText?: string;
  language: string;
}

export interface MatchedTemplate {
  template: Template;
  score: number;
  reason: string;
}

export function findBestTemplate(
  templates: Template[],
  params: MatchParams
): MatchedTemplate | null {
  const { rating, reviewText, language } = params;

  const eligibleTemplates = templates.filter((template) => {
    if (!template.isActive) return false;
    
    if (rating < template.minRating || rating > template.maxRating) {
      return false;
    }

    if (template.language && template.language !== language) {
      return false;
    }

    if (
      template.keywordsRequired &&
      Array.isArray(template.keywordsRequired) &&
      template.keywordsRequired.length > 0 &&
      reviewText
    ) {
      const lowerText = reviewText.toLowerCase();
      const hasAllRequired = template.keywordsRequired.every((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      );
      if (!hasAllRequired) return false;
    }

    if (
      template.keywordsExcluded &&
      Array.isArray(template.keywordsExcluded) &&
      template.keywordsExcluded.length > 0 &&
      reviewText
    ) {
      const lowerText = reviewText.toLowerCase();
      const hasExcluded = template.keywordsExcluded.some((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      );
      if (hasExcluded) return false;
    }

    return true;
  });

  if (eligibleTemplates.length === 0) {
    return null;
  }

  eligibleTemplates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return (a.usageCount || 0) - (b.usageCount || 0);
  });

  const bestTemplate = eligibleTemplates[0];

  return {
    template: bestTemplate,
    score: bestTemplate.priority,
    reason: `Priority: ${bestTemplate.priority}, Usage: ${bestTemplate.usageCount || 0}`,
  };
}

export function replacePlaceholders(
  template: string,
  params: {
    authorName?: string;
    companyName: string;
    rating: number;
    issue?: string;
    positivePoint?: string;
  }
): string {
  let result = template;

  result = result.replace(/\{\{author_name\}\}/g, params.authorName || "Cliente");
  result = result.replace(/\{\{company_name\}\}/g, params.companyName);
  result = result.replace(/\{\{rating\}\}/g, params.rating.toString());
  
  if (params.issue) {
    result = result.replace(/\{\{issue\}\}/g, params.issue);
  } else {
    result = result.replace(/\{\{issue\}\}/g, "problema mencionado");
  }

  if (params.positivePoint) {
    result = result.replace(/\{\{positive_point\}\}/g, params.positivePoint);
  } else {
    result = result.replace(/\{\{positive_point\}\}/g, "feedback positivo");
  }

  return result;
}
