/**
 * Tekstgjenkjenning fra bilde.
 *
 * Grensesnittet er klart, men ingen motor er koblet til ennå. Aktuelle valg:
 *  - En Supabase Edge Function som sender bildet til en bilde-/språkmodell
 *    (gir best resultat på håndskrift og kan returnere strukturert JSON).
 *  - Tesseract.js lokalt i nettleseren (fungerer offline, svakere på håndskrift).
 *
 * Til da: brukeren skriver av teksten ved siden av bildet, og samme tolker som
 * for innliming lager oppskriften.
 */
export interface OcrResult {
  text: string
}

export class OcrUnavailableError extends Error {
  constructor() {
    super('Tekstgjenkjenning er ikke tilgjengelig ennå.')
  }
}

export async function recognizeText(_image: string): Promise<OcrResult> {
  throw new OcrUnavailableError()
}

export const ocrAvailable = false
