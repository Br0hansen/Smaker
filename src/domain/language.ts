/**
 * Grov språkgjenkjenning for oppskrifter: er teksten norsk (eller nær nok –
 * bokmål/nynorsk), eller bør den oversettes? Teller vanlige småord og
 * kjøkkenord på norsk og på engelsk. Samme logikk brukes i Edge Function-en.
 */
const NO = /\b(og|med|til|ikke|eller|på|av|som|den|det|en|ei|et|skal|ha|stek|steik|rør|bland|pisk|kok|hakk|ovnen|deigen|minutter|grader|ss|ts|dl|krm|stk|smør|mel|melk|sukker|egg|løk|salt|pepper|fløte|gjær|kanel)\b/gi
const EN = /\b(and|with|the|of|to|until|into|cup|cups|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|minutes|degrees|preheat|bake|stir|whisk|mix|add|flour|sugar|butter|milk|eggs|onion|garlic|cream|oven|heat|serve)\b/gi

export function looksNorwegian(text: string): boolean {
  const sample = text.slice(0, 4000)
  const no = (sample.match(NO) ?? []).length
  const en = (sample.match(EN) ?? []).length
  // Ord som «egg», «salt» og «pepper» er like på begge språk – krev en tydelig overvekt
  return no >= en * 0.8 || en < 4
}
