export type ProcessStep = {
  number: string
  title: string
  description: string
}

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'פגישה והיכרות',
    description:
      'מגיעים לשטח, מקשיבים ומבינים איך אתם רוצים לחיות בחלל — מי משתמש בגינה, מתי, ומה חסר לכם היום.',
  },
  {
    number: '02',
    title: 'תכנון והתאמה',
    description:
      'בונים תכנית מותאמת — פריסה, חומרים, צמחייה ותאורה — ועוברים עליה יחד עד שהיא מרגישה נכונה.',
  },
  {
    number: '03',
    title: 'ביצוע והקמה',
    description:
      'מבצעים לפי התכנית, בסדר עבודה ברור ובפיקוח צמוד, עם עדכון שוטף בכל שלב משמעותי.',
  },
  {
    number: '04',
    title: 'תחזוקה וליווי',
    description:
      'אחרי המסירה ממשיכים ללוות — טיפול שוטף והתאמות לאורך העונות, כדי שהגינה תיראה טוב גם בעוד שנים.',
  },
]
