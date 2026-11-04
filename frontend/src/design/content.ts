/**
 * Contenido editorial de la app. Todo lo visual vive en assets locales:
 * ninguna tarjeta depende de un servicio externo para renderizar.
 * Looks: fotografías de Pexels (licencia libre, sin atribución obligatoria),
 * recortadas a 4:5 para que la retícula no baile entre móvil y escritorio.
 */
export interface Look {
  id: string;
  name: string;
  occasion: string;
  image: string;
  note: string;
}

export interface MakeupTile {
  id: string;
  title: string;
  caption: string;
  image: string;
  colors: string[];
}

export interface RoutineStep {
  id: string;
  title: string;
  caption: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  note: string;
  image: string;
  swatch: string;
}

export const DEFAULT_PALETTE = ['#D5B5AB', '#C98A7B', '#C49A45', '#865044', '#58624B'];

export const looks: Look[] = [
  {
    id: 'terracota',
    name: 'Terracota de oficina',
    occasion: 'Lunes · oficina',
    image: './assets/looks/look-terracota.jpg',
    note: 'Blazer cálido, camisola marfil y sastre ancho.'
  },
  {
    id: 'salvia',
    name: 'Finde en salvia',
    occasion: 'Sábado · paseo',
    image: './assets/looks/look-salvia.jpg',
    note: 'Punto suave, denim recto y mocasín de piel.'
  },
  {
    id: 'borgona',
    name: 'Noche borgoña',
    occasion: 'Viernes · cena',
    image: './assets/looks/look-borgona.jpg',
    note: 'Satén profundo, trench arena y dorado mate.'
  },
  {
    id: 'sastreria',
    name: 'Sastrería cruda',
    occasion: 'Jueves · reunión',
    image: './assets/looks/look-sastreria.jpg',
    note: 'Lino, punto marfil y bolso cuero tostado.'
  }
];

export const makeupTiles: MakeupTile[] = [
  {
    id: 'mirada',
    title: 'Mirada editorial',
    caption: 'Salvia y champaña',
    image: './assets/editorial/eye-sage.jpg',
    colors: ['#58624B', '#C49A45']
  },
  {
    id: 'ojos',
    title: 'Ojo de gato suave',
    caption: 'Lavanda y ciruela',
    image: './assets/editorial/eye-lavender.jpg',
    colors: ['#8C7B8F', '#5B4A60']
  },
  {
    id: 'labios',
    title: 'Labio satinado',
    caption: 'Rosa tierra',
    image: './assets/editorial/lip-rose.jpg',
    colors: ['#A4503E', '#D5B5AB']
  },
  {
    id: 'piel',
    title: 'Piel luminosa',
    caption: 'Melocotón suave',
    image: './assets/editorial/skin-peach.jpg',
    colors: ['#E29B88', '#D5B5AB']
  }
];

export const routineSteps: RoutineStep[] = [
  {
    id: 'prepara',
    title: 'Prepara la piel',
    caption: 'Una capa fina de base y difumina con los dedos.',
    image: './assets/pasos/paso-1.jpg'
  },
  {
    id: 'cuenca',
    title: 'Marca la cuenca',
    caption: 'Taupe cálido en el arco, sin subir hacia la ceja.',
    image: './assets/pasos/paso-2.jpg'
  },
  {
    id: 'delinea',
    title: 'Delinea la mirada',
    caption: 'Trazo fino pegado a las pestañas y pequeña cola.',
    image: './assets/pasos/paso-3.jpg'
  },
  {
    id: 'colorea',
    title: 'Sube el color',
    caption: 'Colorete en crema sobre el pómulo, hacia la sien.',
    image: './assets/pasos/paso-4.jpg'
  },
  {
    id: 'labios',
    title: 'Termina en los labios',
    caption: 'Tu tono satinado, aplicado desde el centro.',
    image: './assets/pasos/paso-5.jpg'
  }
];

export const products: Product[] = [
  {
    id: 'labial',
    name: 'Labial satinado',
    note: 'Terracota · acabado sedoso',
    image: './assets/productos/labial.jpg',
    swatch: '#B4583F'
  },
  {
    id: 'perfilador',
    name: 'Perfiladores en crema',
    note: 'Rosa y cacao · trazo suave',
    image: './assets/productos/perfilador.jpg',
    swatch: '#C77E86'
  },
  {
    id: 'neceser',
    name: 'Neceser esencial',
    note: 'Lino y piel · tus dos básicos',
    image: './assets/productos/neceser.jpg',
    swatch: '#B7A99A'
  },
  {
    id: 'bruma',
    name: 'Bruma ligera',
    note: 'Yuzu · acabado luminoso',
    image: './assets/productos/bruma.jpg',
    swatch: '#E8D7A6'
  }
];
