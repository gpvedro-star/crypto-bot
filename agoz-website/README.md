# אגוז · גינות יוקרה — אתר תדמית

אתר עמוד אחד, עברית מלאה (RTL), לעסק לעיצוב, תכנון, הקמה ותחזוקה של גינות.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · lucide-react

---

## הפעלה

```bash
npm install
npm run photos   # מוריד את התצלומים לתוך הפרויקט (ראו למטה)
npm run dev      # שרת פיתוח
npm run build    # בנייה לפרודקשן → dist/
npm run preview  # תצוגה מקדימה של הבנייה
```

### קובץ אחד עצמאי

```bash
npm run singlefile   # → dist-single/agoz-website.html
```

מאחד את כל האתר לקובץ HTML יחיד — CSS, JavaScript, כל הפונטים, הלוגו
והאייקון מוטמעים בפנים. נפתח בלחיצה כפולה בלי שרת, ואפשר לשלוח אותו
כקובץ מצורף. אם מריצים `npm run photos` לפניו, גם התצלומים יגיעו מקומית.

---

## מה עדיין צריך ממך

כל מה שחסר מרוכז בקובץ אחד: [`src/lib/siteConfig.ts`](src/lib/siteConfig.ts).
שום פרט עסקי לא הומצא — מה שלא נמסר מסומן `PLACEHOLDER` ופשוט לא מוצג באתר.

| פריט | מצב | איפה לעדכן |
| --- | --- | --- |
| טלפון · וואטסאפ | ✅ `054-287-0949` | `siteConfig.ts → phone` |
| כתובת אימייל | ⬜ placeholder — השורה מוסתרת עד שתימסר | `siteConfig.ts → email` |
| אזור שירות / עיר | ⬜ לא הוגדר — לא מופיע ולא נכנס לנתוני ה-SEO | `siteConfig.ts → areaServed` |
| פייסבוק · אינסטגרם | ⬜ לא הוגדר — האייקונים מוסתרים | `siteConfig.ts → social` |
| תמונות פרויקטים אמיתיות | ⬜ הגלריה מסומנת **"השראה"** | `src/data/images.ts → gallery` |
| לפני / אחרי אמיתי | ⬜ מוצגת הבהרה מתחת לרכיב | `src/data/images.ts → beforeAfter` |
| המלצות לקוחות אמיתיות | ⬜ מוצגת הבהרה מתחת לסקשן | `src/data/testimonials.ts` |
| דומיין לפרודקשן | ⬜ | `index.html` — תגית `canonical` בהערה |

אחרי שמחליפים תמונות אמיתיות בגלריה, אפשר לשנות את הכותרת מ־"השראה"
ל־"העבודות שלנו" ב־`src/sections/Portfolio.tsx`, ולהוריד את פסקת ההבהרה.
באותו אופן: `isPlaceholder: false` מסיר את ההבהרות בלפני/אחרי ובהמלצות.

---

## תמונות

כל התצלומים מוגדרים במקום אחד — [`src/data/images.ts`](src/data/images.ts).
אף רכיב לא מכיל כתובת תמונה בעצמו.

כברירת מחדל האתר טוען אותם מ-CDN חיצוני. הפקודה

```bash
npm run photos
```

מורידה את כולם ל־`public/photos/`, ממירה ל-WebP בארבעה רוחבים
(640 / 1024 / 1600 / 2000 לצורך `srcset`), בונה תמונת שיתוף
(`og-image.jpg`) מתוך תצלום ההירו, ומדליקה את `USE_LOCAL_PHOTOS` —
כך שהאתר מגיש הכול מהדומיין של עצמו.

`public/photos/` נמצא ב־`.gitignore` בכוונה: התמונות אינן נשמרות בגיט.

**להחלפה בתצלומים אמיתיים:** שימו את הקובץ ב־`public/photos/`, עדכנו את
`local`, ה־`alt` וה־`ratio` של אותה רשומה, ותקנו את `tint` לצבע הממוצע
(הוא נצבע מאחורי התמונה בזמן הטעינה כדי שלא תהיה קפיצה בפריסה).

> ⚠️ התצלומים הנוכחיים נוצרו כהדמיה של שפת העיצוב ואינם תיעוד של פרויקטים
> שבוצעו. לכן הגלריה מסומנת "השראה" ולרכיב הלפני/אחרי יש הבהרה. אין להציג
> אותם כעבודות של העסק.

---

## מערכת העיצוב

כל הצבעים הם משתני CSS בראש [`src/styles/index.css`](src/styles/index.css),
נגזרים מהלוגו: זהב מלוטש, ירוק בוטני, דיו כהה ונייטרלים חמים.
שינוי ערך שם משנה את האתר כולו.

```
--c-ink / --c-ink-soft / --c-ink-raised     דיו כהה — רקע הסקשנים הכהים
--c-gold / --c-gold-light / --c-gold-deep   הזהב מהטבעת ומהאותיות
--c-gold-ink                                זהב כהה לטקסט קטן על רקע בהיר (AA)
--c-leaf / --c-leaf-deep / --c-leaf-shadow  הירוק של העלווה
--c-cream / --c-cream-warm                  לבן חם וקרם
--c-stone / --c-stone-deep / --c-charcoal   אבן טבעית ופחם
```

**טיפוגרפיה:** Frank Ruhl Libre לכותרות (סריף עברי בניגודיות גבוהה, בקו אחד
עם הלוגו), Assistant לגוף הטקסט, Cormorant Garamond ללטינית.
הפונטים מתארחים מקומית ב־`public/fonts/` — אין בקשה ל-Google בזמן ריצה.
לרענון: `npm run fonts`.

**לוגו:** `npm run logo` מחלץ מחדש את נכסי המותג מקובץ המקור.
`public/brand/agoz-logo.png` הוא הלוגו עם רקע שקוף (עובד על כהה ועל בהיר);
`agoz-logo-dark.png` הוא המקור על שחור.

---

## מבנה

```
src/
  components/   Photo, Button, Logo, SectionHeading, Reveal, BrandIcons, WhatsAppFab
  sections/     Header, Hero, About, Services, Interlude, Portfolio, BeforeAfter,
                Process, WhyUs, Testimonials, CTA, Contact, Footer
  data/         images, services, process, whyUs, testimonials — כל התוכן
  lib/          siteConfig (פרטי העסק), revealScheduler
  hooks/        useReveal
  styles/       index.css (טוקנים), fonts.css (נוצר אוטומטית)
scripts/        build-logo, fetch-fonts, vendor-photos, make-qa-stands
```

---

## החלטות שכדאי להכיר

- **טופס יצירת הקשר** אין לו כרגע שרת: השליחה פותחת וואטסאפ עם הפרטים
  מוכנים, כדי שאף פנייה לא תיעלם. להחלפה ב-API אמיתי — `handleSubmit`
  ב־`src/sections/Contact.tsx`.
- **אנימציות הכניסה** מנוהלות ב־`revealScheduler.ts` דרך מדידת מיקום,
  ולא ב-IntersectionObserver: כרום מחשיב את ה-`clip-path` של האלמנט עצמו
  בחישוב החיתוך, ולכן אלמנט ממוסך היה נשאר מוסתר לתמיד.
- **`prefers-reduced-motion`** מכובד — כל האנימציות נכבות והתוכן מוצג מיד.
- **ניגודיות** כל טקסט על רקע אחיד נבדק ועומד ב-WCAG AA.

---

## בדיקות שבוצעו

- רוחבים 1440 / 1280 / 1024 / 768 / 390 / 375 — ללא גלילה אופקית, ללא חפיפות
- אפס שגיאות קונסול, אפס בקשות רשת כושלות
- מבנה כותרות תקין (H1 יחיד, ללא דילוגים), `alt` לכל תמונה, `label` לכל שדה
- ניווט מקלדת עם חיווי פוקוס גלוי, ודילוג לתוכן הראשי
- `lang="he"` + `dir="rtl"` על כל העמוד
