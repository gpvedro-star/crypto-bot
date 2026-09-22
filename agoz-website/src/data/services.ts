import type { LucideIcon } from 'lucide-react'
import {
  PencilRuler,
  Shovel,
  Leaf,
  Scissors,
  Droplets,
  Sprout,
  Sofa,
  RefreshCw,
} from 'lucide-react'

export type Service = {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

export const services: Service[] = [
  {
    id: 'design',
    title: 'עיצוב ותכנון גינות',
    description:
      'תכנית מלאה לחלל — פריסה, מפלסים, חומרים וצמחייה. מתחילים בהבנת אורח החיים שלכם וממשיכים לשרטוט שאפשר לבנות לפיו.',
    icon: PencilRuler,
  },
  {
    id: 'build',
    title: 'הקמת גינות',
    description:
      'ביצוע מלא מהקרקע ועד הפרט האחרון — עבודות עפר, ריצוף, קירות, תאורה ושתילה, בליווי ובפיקוח לאורך כל הדרך.',
    icon: Shovel,
  },
  {
    id: 'maintenance',
    title: 'תחזוקת גינות',
    description:
      'טיפול שוטף ששומר על הגינה במיטבה לאורך כל השנה — גיזום, דישון, בקרת השקיה וטיפול בצמחייה לפי עונה.',
    icon: Leaf,
  },
  {
    id: 'pruning',
    title: 'גיזום ועיצוב צמחייה',
    description:
      'גיזום מדויק שמחזיר לעצים ולשיחים את הצורה הנכונה להם — שמירה על בריאות הצמח לצד קו נקי ומוקפד.',
    icon: Scissors,
  },
  {
    id: 'irrigation',
    title: 'מערכות השקיה',
    description:
      'תכנון והתקנה של מערכת השקיה יעילה — חלוקה לאזורים, בקרה ממוחשבת וחיסכון במים בלי להתפשר על הצמחייה.',
    icon: Droplets,
  },
  {
    id: 'planting',
    title: 'שתילה וחידוש גינות',
    description:
      'בחירת צמחייה שמתאימה לאקלים, לקרקע ולאור בחלל שלכם — ושתילה מקצועית שנותנת לגינה התחלה נכונה.',
    icon: Sprout,
  },
  {
    id: 'outdoor',
    title: 'עיצוב חללי חוץ',
    description:
      'פרגולות, מרפסות, פינות ישיבה ותאורת גן — הפיכת השטח הפתוח לחדר נוסף בבית שנעים לשהות בו גם בערב.',
    icon: Sofa,
  },
  {
    id: 'renewal',
    title: 'שיקום וחידוש גינות',
    description:
      'גינה ותיקה שאיבדה את הצורה חוזרת לחיים — אבחון מצב קיים, שימור מה שראוי לשמר וריענון כל השאר.',
    icon: RefreshCw,
  },
]
