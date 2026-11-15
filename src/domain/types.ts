/**
 * Datamodellen for Smaker.
 *
 * Kjerneideen: en oppskrift lagres som en liten graf.
 *  - Ingredienser er "kilder".
 *  - Hvert steg tar inn ingredienser og/eller resultatet av tidligere steg
 *    (mellomprodukter), og gir ut ett nytt mellomprodukt.
 *
 * Både klassisk visning og Recipe Grid utledes fra NØYAKTIG disse dataene.
 * Ingenting om rutenettet (kolonner, rader, spenn) lagres – det beregnes.
 */

export type Id = string

export interface Ingredient {
  id: Id
  /** "kyllingfilet" */
  name: string
  /** null betyr at mengden er ukjent eller "etter smak". Vi finner aldri på tall. */
  amount: number | null
  /** Øvre grense ved intervall, f.eks. 2–3 fedd. */
  amountMax?: number | null
  /** "g", "dl", "ss", "stk" … null når enheten mangler (f.eks. "2 egg"). */
  unit: string | null
  /** "i terninger", "romtemperert" */
  note?: string
  /** Undergruppe i ingredienslisten, f.eks. "Til sausen". */
  group?: string
  optional?: boolean
}

export type StepInput =
  | { kind: 'ingredient'; id: Id }
  | { kind: 'step'; id: Id }

export interface Step {
  id: Id
  /** Hele instruksjonen, slik den vises i klassisk visning. */
  text: string
  /** Kort handlingsord for rutenettet: "Stek", "Bland", "Kok". */
  action: string
  /**
   * Hva som går inn i steget. Et steg kan bare bruke resultatet av steg
   * som kommer FØR det i listen – slik unngår vi sirkler.
   * Et steg uten input (f.eks. "Forvarm ovnen") er et forberedelsessteg.
   */
  inputs: StepInput[]
  /** Navn på mellomproduktet steget lager, f.eks. "Saus" eller "Røre". */
  produces?: string
  /**
   * true når steget er foreslått av Claude (originalen manglet fremgangsmåte).
   * Vises som «Forslag» til noen godkjenner eller redigerer det.
   */
  suggested?: boolean
  durationMin?: number | null
  durationMaxMin?: number | null
  temperatureC?: number | null
}

export type AttachmentKind = 'photo' | 'original-scan'

export interface Attachment {
  id: Id
  kind: AttachmentKind
  /** URL i Supabase Storage, eller data-URL lokalt. */
  url: string
  caption?: string
  createdAt: string
}

export interface Recipe {
  id: Id
  familyId: Id
  title: string
  description?: string
  /** Personlig historie: "Bestemor lagde disse hver søndag på hytta." */
  story?: string
  /** Nettsiden oppskriften ble hentet fra. */
  sourceUrl?: string
  /** Hvem i familien oppskriften stammer fra: "Bestemor", "Mamma". */
  origin?: string
  servings: number | null
  /** Hva porsjonene er: "porsjoner", "vafler", "pizzaer". */
  servingsUnit?: string
  prepMinutes?: number | null
  totalMinutes?: number | null
  categories: string[]
  coverImage?: string
  attachments: Attachment[]
  ingredients: Ingredient[]
  steps: Step[]
  createdBy: Id
  createdAt: string
  updatedBy: Id
  updatedAt: string
  version: number
}

export type MemberRole = 'owner' | 'admin' | 'member'

export interface FamilyMember {
  id: Id
  name: string
  role: MemberRole
  /** Farge til avatar. */
  color: string
}

export interface Family {
  id: Id
  name: string
  members: FamilyMember[]
}

export interface RecipeVersion {
  recipeId: Id
  version: number
  savedAt: string
  savedBy: Id
  snapshot: Recipe
}
