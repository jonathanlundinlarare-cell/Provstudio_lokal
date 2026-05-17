/**
 * Shared SO-taxonomy (Samhällsorientering + övriga skolämnen).
 * Used in both BankPage and QuestionEditModal2 so that subjects/categories
 * are consistent across the whole app.
 */

export const SO_TAXONOMY: Record<string, string[]> = {
  "Historia": [
    "Forntiden och antiken", "Medeltiden", "Nya tidens Europa",
    "Industrialiseringen", "Demokratins framväxt", "Första världskriget",
    "Andra världskriget", "Kalla kriget", "Sverige under 1900-talet",
    "Historisk källkritik och metod",
  ],
  "Geografi": [
    "Endogena och exogena krafter", "Klimat och klimatzoner",
    "Befolkning och migration", "Hållbar utveckling",
    "Naturresurser och energi", "Kartor och rumslig orientering",
    "Stadsgeografi", "Geopolitik och världsdelar",
  ],
  "Samhällskunskap": [
    "Demokrati och mänskliga rättigheter", "Sveriges politiska system",
    "EU och internationella organisationer", "Rättsväsendet och lagar",
    "Ekonomi och arbetsmarknad", "Media och källkritik",
    "Konsumentkunskap", "Identitet och normer",
  ],
  "Religion": [
    "Kristendomen", "Islam", "Judendomen", "Hinduismen", "Buddhismen",
    "Livsåskådningar och sekulära rörelser", "Etik och moral", "Riter och högtider",
  ],
};

export const SO_SUBJECTS = Object.keys(SO_TAXONOMY);
