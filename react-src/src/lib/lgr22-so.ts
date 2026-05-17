/**
 * Lgr22 centralt innehåll för SO-ämnena (Historia, Geografi, Samhällskunskap, Religion)
 * Avgränsat till åk 7–9. Koder används för att tagga frågor i frågebanken.
 */

export type Lgr22Entry = {
  code: string;
  label: string;
  category: string;
};

export const LGR22_SO: Record<string, Lgr22Entry[]> = {
  "Historia": [
    { code: "hi-1",  category: "Forntiden och antiken",          label: "Jägar- och samlarsamhällen samt jordbrukets framväxt" },
    { code: "hi-2",  category: "Forntiden och antiken",          label: "Antikens Grekland och Rom — samhälle, kultur och arv" },
    { code: "hi-3",  category: "Medeltiden",                     label: "Kristendomens spridning och medeltidens kyrkliga kultur" },
    { code: "hi-4",  category: "Medeltiden",                     label: "Feodalsamhällets struktur och adelns roll" },
    { code: "hi-5",  category: "Nya tidens Europa",              label: "Reformationen och religionskrigen" },
    { code: "hi-6",  category: "Nya tidens Europa",              label: "Kolonialisering och den transatlantiska slavhandeln" },
    { code: "hi-7",  category: "Industrialiseringen",            label: "Industrialiseringen och urbanisering i Europa och Sverige" },
    { code: "hi-8",  category: "Demokratins framväxt",           label: "Demokratins framväxt och de politiska folkrörelserna" },
    { code: "hi-9",  category: "Första världskriget",            label: "Första världskrigets orsaker, förlopp och konsekvenser" },
    { code: "hi-10", category: "Andra världskriget",             label: "Nazismen, Förintelsen och andra världskrigets förlopp" },
    { code: "hi-11", category: "Kalla kriget",                   label: "Kalla kriget och avkolonisering" },
    { code: "hi-12", category: "Sverige under 1900-talet",       label: "Sverige under 1900-talet — välfärdsstat, migration och identitet" },
    { code: "hi-13", category: "Historisk källkritik och metod", label: "Historiska källor och källkritisk metod" },
    { code: "hi-14", category: "Historisk källkritik och metod", label: "Historiebruk — hur historia används och tolkas" },
  ],
  "Geografi": [
    { code: "ge-1", category: "Endogena och exogena krafter",    label: "Jordens inre och yttre krafter: tektonik, vulkaner, erosion" },
    { code: "ge-2", category: "Klimat och klimatzoner",          label: "Klimatzoner, klimatfaktorer och klimattyper" },
    { code: "ge-3", category: "Klimat och klimatzoner",          label: "Klimatförändringar — orsaker, konsekvenser och lösningar" },
    { code: "ge-4", category: "Befolkning och migration",        label: "Befolkningsfördelning, migration och urbanisering" },
    { code: "ge-5", category: "Hållbar utveckling",              label: "Hållbar utveckling — ekonomisk, social och ekologisk dimension" },
    { code: "ge-6", category: "Naturresurser och energi",        label: "Naturresurser, energiutvinning och markanvändning" },
    { code: "ge-7", category: "Kartor och rumslig orientering",  label: "Kartkunskap, koordinatsystem och topografi" },
    { code: "ge-8", category: "Stadsgeografi",                   label: "Städers struktur, funktion och tillväxt" },
    { code: "ge-9", category: "Geopolitik och världsdelar",      label: "Geopolitik, resurskonflikter och länders beroende" },
  ],
  "Samhällskunskap": [
    { code: "sh-1",  category: "Demokrati och mänskliga rättigheter", label: "Demokratins principer och mänskliga rättigheter" },
    { code: "sh-2",  category: "Demokrati och mänskliga rättigheter", label: "Diskriminering, normer och allas lika värde" },
    { code: "sh-3",  category: "Sveriges politiska system",            label: "Sveriges statsskick — riksdag, regering och kommuner" },
    { code: "sh-4",  category: "Sveriges politiska system",            label: "Politiska partier, val och representation" },
    { code: "sh-5",  category: "EU och internationella organisationer",label: "EU:s struktur, beslutsprocess och Sveriges medlemskap" },
    { code: "sh-6",  category: "EU och internationella organisationer",label: "FN, folkrätt och internationella samarbeten" },
    { code: "sh-7",  category: "Rättsväsendet och lagar",             label: "Lagar, rättsväsendet och brottsförebyggande arbete" },
    { code: "sh-8",  category: "Ekonomi och arbetsmarknad",           label: "Privatekonomi, sparande och konsumtion" },
    { code: "sh-9",  category: "Ekonomi och arbetsmarknad",           label: "Arbetsmarknad, fackföreningar och ekonomiska system" },
    { code: "sh-10", category: "Media och källkritik",                label: "Mediers roll i demokratin och digital källkritik" },
  ],
  "Religion": [
    { code: "re-1", category: "Kristendomen",                           label: "Kristendomens trosinnehåll, heliga skrifter och inriktningar" },
    { code: "re-2", category: "Islam",                                  label: "Islams trosinnehåll, heliga skrifter och inriktningar" },
    { code: "re-3", category: "Judendomen",                             label: "Judendomens trosinnehåll, heliga skrifter och historia" },
    { code: "re-4", category: "Hinduismen",                             label: "Hinduismens trosinnehåll, gudar och mångfald" },
    { code: "re-5", category: "Buddhismen",                             label: "Buddhismens trosinnehåll, livsväg och inriktningar" },
    { code: "re-6", category: "Livsåskådningar och sekulära rörelser",  label: "Ateism, humanism och sekulära livsåskådningar" },
    { code: "re-7", category: "Etik och moral",                         label: "Etiska modeller: pliktetik, konsekvensetik, dygdetik" },
    { code: "re-8", category: "Etik och moral",                         label: "Etiska frågor: miljö, dödshjälp, rättvisa och mänskliga rättigheter" },
    { code: "re-9", category: "Riter och högtider",                     label: "Religiösa riter, högtider och livscykler" },
  ],
};

/** Hämta alla Lgr22-koder för ett ämne */
export function getLgr22ForSubject(subject: string): Lgr22Entry[] {
  return LGR22_SO[subject] ?? [];
}

/** Slå upp en Lgr22-kod och returnera dess label */
export function getLgr22Label(code: string): string {
  for (const entries of Object.values(LGR22_SO)) {
    const found = entries.find(e => e.code === code);
    if (found) return found.label;
  }
  return code;
}

/** Alla ämnen som har Lgr22-data */
export const LGR22_SUBJECTS = Object.keys(LGR22_SO);
