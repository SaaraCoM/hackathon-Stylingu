import type { Analysis } from './types';

export interface AvoidTone {
  name: string;
  hex: string;
  why?: string;
  alt?: string;
}

export type ColorSubRangeKey =
  | 'base'
  | 'medios'
  | 'acentos'
  | 'profundos'
  | 'iluminadores'
  | 'evitar';

export type SeasonFamilyKey = 'primavera' | 'verano' | 'otono' | 'invierno';

export interface ColorSwatchSpec {
  hex: string;
  name: string;
  range: Exclude<ColorSubRangeKey, 'evitar'>;
  usage: string;
}

export interface SeasonColorimetrySpec {
  id: string;
  name: string;
  family: SeasonFamilyKey;
  familyLabel: string;
  temperature: 'cálida' | 'fría' | 'cálida-neutra' | 'fría-neutra';
  contrast: string;
  chroma: string;
  metals: string[];
  description: string;
  ranges: {
    base: ColorSwatchSpec[];
    medios: ColorSwatchSpec[];
    acentos: ColorSwatchSpec[];
    profundos: ColorSwatchSpec[];
    iluminadores: ColorSwatchSpec[];
    evitar: AvoidTone[];
  };
}

export interface PersonalColorimetryBreakdown {
  matchedSeason: SeasonColorimetrySpec;
  rawPalette: string[];
  allHarmoniousSwatches: ColorSwatchSpec[];
  ranges: {
    base: ColorSwatchSpec[];
    medios: ColorSwatchSpec[];
    acentos: ColorSwatchSpec[];
    profundos: ColorSwatchSpec[];
    iluminadores: ColorSwatchSpec[];
    evitar: AvoidTone[];
  };
}

export const SUBRANGE_METADATA: {
  key: ColorSubRangeKey;
  label: string;
  subtitle: string;
}[] = [
  {
    key: 'base',
    label: 'Base y Neutros',
    subtitle: 'Cimientos de armario: sastrería, abrigos, pantalones y básicos estructurales.'
  },
  {
    key: 'medios',
    label: 'Tonos Medios',
    subtitle: 'Armonía principal para camisas, punto, vestidos e identidad diaria.'
  },
  {
    key: 'acentos',
    label: 'Acentos Vibrantes',
    subtitle: 'Focos de energía cromática para labios, pañuelos, bolsos y piezas protagonistas.'
  },
  {
    key: 'profundos',
    label: 'Profundos y Sombra',
    subtitle: 'Sustitutos armónicos del negro para delineado, calzado, noche y contraste.'
  },
  {
    key: 'iluminadores',
    label: 'Iluminadores Faciales',
    subtitle: 'Tonos claros de alta reflectancia para cuellos, blusas y luz próxima al rostro.'
  },
  {
    key: 'evitar',
    label: 'Tonos a Distanciar',
    subtitle: 'Colores que compiten con tu subtono natural, junto con su alternativa armónica.'
  }
];

const TWELVE_SEASONS_DATA: SeasonColorimetrySpec[] = [
  /* ============================== PRIMAVERA ============================== */
  {
    id: 'primavera-clara',
    name: 'Primavera Clara',
    family: 'primavera',
    familyLabel: 'Primavera',
    temperature: 'cálida-neutra',
    contrast: 'bajo-medio',
    chroma: 'claro luminoso',
    metals: ['Oro champán', 'Oro rosa suave', 'Dorado satinado'],
    description: 'Luz fresca, delicada y translúcida con subtono dorado suave y pasteles cálidos.',
    ranges: {
      base: [
        { hex: '#F6EFE2', name: 'Marfil vainilla', range: 'base', usage: 'Blusas y camisas base' },
        { hex: '#E3D2BE', name: 'Arena dorada', range: 'base', usage: 'Pantalón fluido y gabardina' },
        { hex: '#C7B097', name: 'Camel almendra', range: 'base', usage: 'Blazer y punto fino' },
        { hex: '#8F7D6B', name: 'Topo cálido claro', range: 'base', usage: 'Calzado y marroquinería' }
      ],
      medios: [
        { hex: '#F3B391', name: 'Melocotón néctar', range: 'medios', usage: 'Tops cercanos al rostro' },
        { hex: '#E7CE75', name: 'Amarillo mimosa', range: 'medios', usage: 'Punto luminoso de día' },
        { hex: '#9DC99E', name: 'Verde brote', range: 'medios', usage: 'Vestidos y camisería' },
        { hex: '#89C4D1', name: 'Aguamarina clara', range: 'medios', usage: 'Contraste fresco armónico' }
      ],
      acentos: [
        { hex: '#F27D72', name: 'Coral papaya', range: 'acentos', usage: 'Labial y vestidos evento' },
        { hex: '#F4978E', name: 'Rosa flamenco suave', range: 'acentos', usage: 'Rubor y pañuelos' },
        { hex: '#5BC0BE', name: 'Turquesa cristal', range: 'acentos', usage: 'Joyería y accesorios' },
        { hex: '#F6AA1C', name: 'Miel ámbar claro', range: 'acentos', usage: 'Detalles focales' }
      ],
      profundos: [
        { hex: '#6E5A4F', name: 'Cacao con leche', range: 'profundos', usage: 'Sastrería oscura sin dureza' },
        { hex: '#4A6B6F', name: 'Azul petróleo suave', range: 'profundos', usage: 'Abrigo y traje de tarde' },
        { hex: '#5C6E58', name: 'Salvia musgo', range: 'profundos', usage: 'Delineado y prendas exteriores' }
      ],
      iluminadores: [
        { hex: '#FFF9ED', name: 'Crema nata', range: 'iluminadores', usage: 'Sustituto del blanco óptico' },
        { hex: '#FDE2D4', name: 'Nude albaricoque', range: 'iluminadores', usage: 'Lencería y escotes' },
        { hex: '#FAF0CA', name: 'Champán irisado', range: 'iluminadores', usage: 'Iluminador ocular y satén' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro azabache', why: 'Endurece las facciones delicadas y apaga la luminosidad.', alt: 'Cacao con leche (#6E5A4F)' },
        { hex: '#4A0E2E', name: 'Borgoña oscuro frío', why: 'Exceso de peso visual y subtono azulado.', alt: 'Coral papaya (#F27D72)' },
        { hex: '#D9E4EC', name: 'Gris hielo', why: 'Enfría y agrisa la piel clara dorada.', alt: 'Arena dorada (#E3D2BE)' }
      ]
    }
  },
  {
    id: 'primavera-calida',
    name: 'Primavera Cálida',
    family: 'primavera',
    familyLabel: 'Primavera',
    temperature: 'cálida',
    contrast: 'medio',
    chroma: 'cálido radiante',
    metals: ['Oro amarillo', 'Bronce pulido', 'Cobre claro'],
    description: 'Calidez soleada pura: dorados, corales, verdes hoja y tierras luminosas sin subtono frío.',
    ranges: {
      base: [
        { hex: '#F5E9D3', name: 'Crema mantequilla', range: 'base', usage: 'Camisería esencial' },
        { hex: '#D8B384', name: 'Camel miel', range: 'base', usage: 'Trench y sastrería' },
        { hex: '#B6895B', name: 'Cuero tostado', range: 'base', usage: 'Bolsos, cinturones y faldas' },
        { hex: '#7A583B', name: 'Bronce tierra', range: 'base', usage: 'Pantalón estructurado' }
      ],
      medios: [
        { hex: '#E7CE75', name: 'Dorado narciso', range: 'medios', usage: 'Prenda iluminadora superior' },
        { hex: '#DB744D', name: 'Terracota mandarina', range: 'medios', usage: 'Blazers y punto' },
        { hex: '#93AD68', name: 'Verde lima hoja', range: 'medios', usage: 'Conjuntos casuales' },
        { hex: '#7094A3', name: 'Azul pato cálido', range: 'medios', usage: 'Denim y chaquetas' }
      ],
      acentos: [
        { hex: '#EE6C4D', name: 'Coral amapola', range: 'acentos', usage: 'Labial firma y vestidos' },
        { hex: '#F4A261', name: 'Albaricoque especiado', range: 'acentos', usage: 'Rubor y tops de noche' },
        { hex: '#2A9D8F', name: 'Turquesa tropical', range: 'acentos', usage: 'Contraste complementario' },
        { hex: '#E9C46A', name: 'Oro azafrán', range: 'acentos', usage: 'Pañuelos y satén' }
      ],
      profundos: [
        { hex: '#5C3A21', name: 'Chocolate canela', range: 'profundos', usage: 'Alternativa cálida al negro' },
        { hex: '#28597E', name: 'Marino cobalto cálido', range: 'profundos', usage: 'Sastrería ejecutiva' },
        { hex: '#697654', name: 'Oliva dorado', range: 'profundos', usage: 'Parkas y pantalones' }
      ],
      iluminadores: [
        { hex: '#FAF3E0', name: 'Marfil dorado', range: 'iluminadores', usage: 'Blanco cálido de referencia' },
        { hex: '#EAD6CF', name: 'Pétalo melocotón', range: 'iluminadores', usage: 'Blusas satinadas' },
        { hex: '#CDB29D', name: 'Nude almendra', range: 'iluminadores', usage: 'Maquillaje base y punto' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro puro', why: 'Absorbe la luz dorada y marca líneas de expresión.', alt: 'Chocolate canela (#5C3A21)' },
        { hex: '#FF007F', name: 'Magenta neón frío', why: 'Choca contra el subtono dorado de la piel.', alt: 'Coral amapola (#EE6C4D)' },
        { hex: '#708090', name: 'Gris pizarra frío', why: 'Apaga la vitalidad cálida del rostro.', alt: 'Camel miel (#D8B384)' }
      ]
    }
  },
  {
    id: 'primavera-brillante',
    name: 'Primavera Brillante',
    family: 'primavera',
    familyLabel: 'Primavera',
    temperature: 'cálida-neutra',
    contrast: 'alto',
    chroma: 'brillante saturado',
    metals: ['Oro brillante', 'Oro rosa pulido', 'Dorado espejo'],
    description: 'Claridad vítrea y saturación viva: admite contrastes nítidos con base cálida luminosa.',
    ranges: {
      base: [
        { hex: '#FBF7F0', name: 'Blanco crema limpio', range: 'base', usage: 'Camisas de alto contraste' },
        { hex: '#D6C2A8', name: 'Arena clara limpia', range: 'base', usage: 'Sastrería de día' },
        { hex: '#594A42', name: 'Espresso brillante', range: 'base', usage: 'Pantalón y blazer neutro' },
        { hex: '#2C3E50', name: 'Marino zafiro', range: 'base', usage: 'Trajes de contraste' }
      ],
      medios: [
        { hex: '#FF6B6B', name: 'Coral hibisco', range: 'medios', usage: 'Vestidos y tops vibrantes' },
        { hex: '#FFD166', name: 'Amarillo sol', range: 'medios', usage: 'Punto y chaquetas' },
        { hex: '#06D6A0', name: 'Esmeralda menta vivo', range: 'medios', usage: 'Estilismos de impacto' },
        { hex: '#118AB2', name: 'Azul cian cálido', range: 'medios', usage: 'Camisería y sastrería' }
      ],
      acentos: [
        { hex: '#FF4D6D', name: 'Sandía luminoso', range: 'acentos', usage: 'Labial protagonista' },
        { hex: '#FF9F1C', name: 'Mandarina eléctrica', range: 'acentos', usage: 'Bolsos y acentos' },
        { hex: '#70E000', name: 'Lima peridoto', range: 'acentos', usage: 'Accesorios y estampados' },
        { hex: '#8338EC', name: 'Violeta jacinto cálido', range: 'acentos', usage: 'Noche y eventos' }
      ],
      profundos: [
        { hex: '#1D2D44', name: 'Azul medianoche limpio', range: 'profundos', usage: 'Sustituto luminoso del negro' },
        { hex: '#3D2622', name: 'Caoba tostado', range: 'profundos', usage: 'Calzado y cuero' },
        { hex: '#073B4C', name: 'Petróleo profundo', range: 'profundos', usage: 'Abrigos estructurados' }
      ],
      iluminadores: [
        { hex: '#FFFDF7', name: 'Marfil cristal', range: 'iluminadores', usage: 'Cuellos y luz facial' },
        { hex: '#FFE5D9', name: 'Rosa caracola brillante', range: 'iluminadores', usage: 'Satén y blusas' },
        { hex: '#FFF3B0', name: 'Limón escarchado', range: 'iluminadores', usage: 'Puntos de luz ocular' }
      ],
      evitar: [
        { hex: '#8B7D6B', name: 'Beige polvoriento apagado', why: 'Resta nitidez al contraste natural de mirada y piel.', alt: 'Blanco crema limpio (#FBF7F0)' },
        { hex: '#6B705C', name: 'Caqui ceniza', why: 'Empaña la pureza cromática de la estación.', alt: 'Esmeralda menta vivo (#06D6A0)' },
        { hex: '#4A4E69', name: 'Malva grisáceo', why: 'Reduce la viveza del rostro.', alt: 'Violeta jacinto cálido (#8338EC)' }
      ]
    }
  },

  /* =============================== VERANO ================================ */
  {
    id: 'verano-claro',
    name: 'Verano Claro',
    family: 'verano',
    familyLabel: 'Verano',
    temperature: 'fría-neutra',
    contrast: 'bajo-medio',
    chroma: 'claro empolvado',
    metals: ['Plata satinada', 'Oro blanco', 'Oro rosa frío'],
    description: 'Luz nórdica acuarelada: tonos pastel fríos, azules cielo, rosas empolvados y grises perla.',
    ranges: {
      base: [
        { hex: '#F4F5F7', name: 'Blanco perla frío', range: 'base', usage: 'Camisas base' },
        { hex: '#D8DEE9', name: 'Gris niebla', range: 'base', usage: 'Sastrería ligera' },
        { hex: '#C5B9B4', name: 'Topo rosado', range: 'base', usage: 'Pantalones y faldas' },
        { hex: '#6C7A89', name: 'Azul pizarra claro', range: 'base', usage: 'Blazers y abrigos' }
      ],
      medios: [
        { hex: '#A7CDD5', name: 'Azul glaciar suave', range: 'medios', usage: 'Camisería diaria' },
        { hex: '#E8B4BC', name: 'Rosa peonía frío', range: 'medios', usage: 'Blusas y punto' },
        { hex: '#B8C0FF', name: 'Lavanda serenidad', range: 'medios', usage: 'Vestidos fluidos' },
        { hex: '#98C1D9', name: 'Celeste nórdico', range: 'medios', usage: 'Conjuntos de día' }
      ],
      acentos: [
        { hex: '#D66BA0', name: 'Frambuesa suave', range: 'acentos', usage: 'Labial y acentos' },
        { hex: '#729EA1', name: 'Verde mar frío', range: 'acentos', usage: 'Pañuelos y joyas' },
        { hex: '#9B7EDE', name: 'Amatista clara', range: 'acentos', usage: 'Eventos y noche' },
        { hex: '#E5989B', name: 'Malva rosado', range: 'acentos', usage: 'Rubor armónico' }
      ],
      profundos: [
        { hex: '#4A5568', name: 'Gris grafito suave', range: 'profundos', usage: 'Alternativa al negro' },
        { hex: '#3B4D6B', name: 'Marino tormenta', range: 'profundos', usage: 'Sastrería formal' },
        { hex: '#5E4B56', name: 'Ciruela ahumada', range: 'profundos', usage: 'Calzado y noche' }
      ],
      iluminadores: [
        { hex: '#F9FBFD', name: 'Alabastro frío', range: 'iluminadores', usage: 'Luz cerca del rostro' },
        { hex: '#FCEEF2', name: 'Cuarzo rosa pálido', range: 'iluminadores', usage: 'Tops satinados' },
        { hex: '#EBF4F6', name: 'Hielo cristal', range: 'iluminadores', usage: 'Sombra iluminadora' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro puro', why: 'Resulta excesivamente duro frente al contraste suave.', alt: 'Gris grafito suave (#4A5568)' },
        { hex: '#D97706', name: 'Naranja mostaza', why: 'Amarillea la piel de subtono rosado frío.', alt: 'Frambuesa suave (#D66BA0)' },
        { hex: '#78350F', name: 'Marrón óxido', why: 'Apaga la frescura acuarelada del rostro.', alt: 'Topo rosado (#C5B9B4)' }
      ]
    }
  },
  {
    id: 'verano-frio',
    name: 'Verano Frío',
    family: 'verano',
    familyLabel: 'Verano',
    temperature: 'fría',
    contrast: 'medio',
    chroma: 'frío sereno',
    metals: ['Plata de ley', 'Platino', 'Acero pulido'],
    description: 'Elegancia fría sin estridencias: azules oceánicos, rosas bayas, malvas y grises azulados.',
    ranges: {
      base: [
        { hex: '#F1F5F9', name: 'Blanco nieve suave', range: 'base', usage: 'Camisería formal' },
        { hex: '#CBD5E1', name: 'Gris plata', range: 'base', usage: 'Punto y pantalones' },
        { hex: '#94A3B8', name: 'Acero azulado', range: 'base', usage: 'Chaquetas y trajes' },
        { hex: '#475569', name: 'Carbón azulado', range: 'base', usage: 'Sastrería principal' }
      ],
      medios: [
        { hex: '#367096', name: 'Azul océano frío', range: 'medios', usage: 'Vestidos y camisas' },
        { hex: '#B84C7B', name: 'Baya frambuesa', range: 'medios', usage: 'Prendas superiores' },
        { hex: '#7E6B8F', name: 'Lila orquídea', range: 'medios', usage: 'Punto y blusas' },
        { hex: '#4F8A8B', name: 'Cerceta fría', range: 'medios', usage: 'Looks de contraste' }
      ],
      acentos: [
        { hex: '#9D174D', name: 'Cereza escarchada', range: 'acentos', usage: 'Labial y vestidos noche' },
        { hex: '#2563EB', name: 'Azul cobalto suave', range: 'acentos', usage: 'Piezas foco' },
        { hex: '#C084FC', name: 'Violeta glicinia', range: 'acentos', usage: 'Accesorios' },
        { hex: '#DB2777', name: 'Rosa fucsia empolvado', range: 'acentos', usage: 'Rubor y labio' }
      ],
      profundos: [
        { hex: '#1E293B', name: 'Azul noche pizarra', range: 'profundos', usage: 'Sustituto ideal del negro' },
        { hex: '#4A1D3D', name: 'Ciruela imperial', range: 'profundos', usage: 'Abrigos y bolsos' },
        { hex: '#1E3A5F', name: 'Marino nórdico', range: 'profundos', usage: 'Trajes completos' }
      ],
      iluminadores: [
        { hex: '#F8FAFC', name: 'Blanco escarcha', range: 'iluminadores', usage: 'Cuellos y camisas' },
        { hex: '#FCE7F3', name: 'Rosa escarchado', range: 'iluminadores', usage: 'Blusas luminosas' },
        { hex: '#E0F2FE', name: 'Azul cielo hielo', range: 'iluminadores', usage: 'Iluminación facial' }
      ],
      evitar: [
        { hex: '#EA580C', name: 'Naranja calabaza', why: 'Colisiona frontalmente con la piel fría.', alt: 'Baya frambuesa (#B84C7B)' },
        { hex: '#CA8A04', name: 'Dorado mostaza', why: 'Crea un efecto cetrino en el rostro.', alt: 'Azul océano frío (#367096)' },
        { hex: '#7C2D12', name: 'Terracota rojizo', why: 'Calidez excesiva que enrojece la tez.', alt: 'Ciruela imperial (#4A1D3D)' }
      ]
    }
  },
  {
    id: 'verano-suave',
    name: 'Verano Suave',
    family: 'verano',
    familyLabel: 'Verano',
    temperature: 'fría-neutra',
    contrast: 'bajo',
    chroma: 'suave ahumado',
    metals: ['Plata envejecida', 'Oro rosa mate', 'Peltre'],
    description: 'Armonía brumosa y aterciopelada: verdes salvia fríos, malvas antiguos, topos y rosas secos.',
    ranges: {
      base: [
        { hex: '#EDEAE6', name: 'Hueso bruma', range: 'base', usage: 'Básicos superiores' },
        { hex: '#C2B8B2', name: 'Topo piedra', range: 'base', usage: 'Pantalones y gabardinas' },
        { hex: '#9E948E', name: 'Visón ceniza', range: 'base', usage: 'Sastrería neutra' },
        { hex: '#5D576B', name: 'Gris ciruela humo', range: 'base', usage: 'Chaquetas estructuradas' }
      ],
      medios: [
        { hex: '#8FA89B', name: 'Salvia eucalipto', range: 'medios', usage: 'Camisas y vestidos' },
        { hex: '#B5838D', name: 'Rosa antiguo', range: 'medios', usage: 'Prendas cercanas al rostro' },
        { hex: '#7A93AC', name: 'Azul neblina', range: 'medios', usage: 'Punto y denim suave' },
        { hex: '#9A8C98', name: 'Malva ceniza', range: 'medios', usage: 'Conjuntos monocromáticos' }
      ],
      acentos: [
        { hex: '#9D4E73', name: 'Frambuesa ahumada', range: 'acentos', usage: 'Labial firma' },
        { hex: '#52796F', name: 'Verde abeto bruma', range: 'acentos', usage: 'Bolsos y chaquetas' },
        { hex: '#6D597A', name: 'Uva empolvada', range: 'acentos', usage: 'Vestidos de tarde' },
        { hex: '#C97A7E', name: 'Rosa madera', range: 'acentos', usage: 'Rubor en crema' }
      ],
      profundos: [
        { hex: '#354F52', name: 'Pino carbón frío', range: 'profundos', usage: 'Abrigos y sastrería' },
        { hex: '#3D314A', name: 'Berenjena humo', range: 'profundos', usage: 'Noche y calzado' },
        { hex: '#2F3E46', name: 'Pizarra profunda', range: 'profundos', usage: 'Sustituto suave del negro' }
      ],
      iluminadores: [
        { hex: '#F5F2EF', name: 'Seda perla', range: 'iluminadores', usage: 'Blusas de luz' },
        { hex: '#EAD7D7', name: 'Rosa talco', range: 'iluminadores', usage: 'Cuellos y pañuelos' },
        { hex: '#DCE5E7', name: 'Bruma glaciar', range: 'iluminadores', usage: 'Sombra base luminosa' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro absoluto', why: 'Rompe la delicadeza ahumada y domina al rostro.', alt: 'Pizarra profunda (#2F3E46)' },
        { hex: '#FFEA00', name: 'Amarillo neón', why: 'Saturación extrema incompatible con el croma suave.', alt: 'Seda perla (#F5F2EF)' },
        { hex: '#FF4500', name: 'Rojo naranja vivo', why: 'Estridencia térmica y cromática.', alt: 'Frambuesa ahumada (#9D4E73)' }
      ]
    }
  },

  /* =============================== OTOÑO ================================= */
  {
    id: 'otono-suave',
    name: 'Otoño Cálido Suave',
    family: 'otono',
    familyLabel: 'Otoño',
    temperature: 'cálida-neutra',
    contrast: 'medio-bajo',
    chroma: 'suave terroso',
    metals: ['Oro cepillado', 'Bronce antiguo', 'Champán cálido'],
    description: 'Terrosidad aterciopelada: salvia, terracota empolvado, ocre miel, rosa palo cálido y chocolate.',
    ranges: {
      base: [
        { hex: '#EEDFDA', name: 'Crema avena', range: 'base', usage: 'El iluminador textil idóneo' },
        { hex: '#D5B5AB', name: 'Rosa palo arcilla', range: 'base', usage: 'Blusas cercanas al cuello' },
        { hex: '#B7A99A', name: 'Lino tostado', range: 'base', usage: 'Pantalones y gabardinas' },
        { hex: '#865044', name: 'Chocolate suave', range: 'base', usage: 'Profundidad sin dureza óptica' }
      ],
      medios: [
        { hex: '#C98A7B', name: 'Terracota empolvado', range: 'medios', usage: 'Eleva la calidez natural' },
        { hex: '#58624B', name: 'Salvia botánica', range: 'medios', usage: 'Neutraliza rojeces y realza el iris' },
        { hex: '#C49A45', name: 'Ocre miel', range: 'medios', usage: 'Luminosidad en pañuelos y punto' },
        { hex: '#A98C7F', name: 'Taupe cálido', range: 'medios', usage: 'Transición de armario y ojos' }
      ],
      acentos: [
        { hex: '#A4503E', name: 'Teja satinado', range: 'acentos', usage: 'Labial firma y vestidos' },
        { hex: '#BA6C56', name: 'Coral tostado', range: 'acentos', usage: 'Rubor y piezas protagonistas' },
        { hex: '#4F777A', name: 'Turquesa musgo', range: 'acentos', usage: 'Contraste armónico en accesorios' },
        { hex: '#8C3E36', name: 'Baya canela', range: 'acentos', usage: 'Labio de noche y bolsos' }
      ],
      profundos: [
        { hex: '#4A332D', name: 'Café espresso', range: 'profundos', usage: 'Sustituto perfecto del negro' },
        { hex: '#3B4938', name: 'Bosque oliva oscuro', range: 'profundos', usage: 'Abrigos y sastrería' },
        { hex: '#523A34', name: 'Caoba ahumado', range: 'profundos', usage: 'Calzado y cinturones' }
      ],
      iluminadores: [
        { hex: '#F3E5D8', name: 'Vainilla nácar', range: 'iluminadores', usage: 'Iluminador de arco y blusas' },
        { hex: '#E29B88', name: 'Melocotón empolvado', range: 'iluminadores', usage: 'Rubor luminoso y satén' },
        { hex: '#EFE5DC', name: 'Alabastro cálido', range: 'iluminadores', usage: 'Camisería blanca suave' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro puro', why: 'Absorbe la luz facial y marca surcos.', alt: 'Café espresso (#4A332D)' },
        { hex: '#0033FF', name: 'Azul glacial', why: 'Su frialdad apaga el subtono cálido.', alt: 'Turquesa musgo (#4F777A)' },
        { hex: '#FF007F', name: 'Fucsia neón', why: 'Contraste estridente que compite con la mirada.', alt: 'Baya canela (#8C3E36)' }
      ]
    }
  },
  {
    id: 'otono-calido',
    name: 'Otoño Cálido',
    family: 'otono',
    familyLabel: 'Otoño',
    temperature: 'cálida',
    contrast: 'medio',
    chroma: 'rico especiado',
    metals: ['Oro envejecido', 'Cobre martillado', 'Latón'],
    description: 'Riqueza otoñal pura: especias, calabaza, mostaza, verde oliva, camel intenso y cobre.',
    ranges: {
      base: [
        { hex: '#F2E3CE', name: 'Pergamino dorado', range: 'base', usage: 'Camisas base' },
        { hex: '#C69C6D', name: 'Camel clásico', range: 'base', usage: 'Abrigos icónicos' },
        { hex: '#8D5B4C', name: 'Siena tostada', range: 'base', usage: 'Pantalones y faldas' },
        { hex: '#5A3825', name: 'Marrón tabaco', range: 'base', usage: 'Sastrería y piel' }
      ],
      medios: [
        { hex: '#C86D51', name: 'Arcilla cocida', range: 'medios', usage: 'Punto y chaquetas' },
        { hex: '#D49B27', name: 'Mostaza cúrcuma', range: 'medios', usage: 'Jerséis e iluminación' },
        { hex: '#6B7F46', name: 'Verde oliva hoja', range: 'medios', usage: 'Camisería y gabardinas' },
        { hex: '#9C5D3F', name: 'Bronce cobrizo', range: 'medios', usage: 'Vestidos y sombras' }
      ],
      acentos: [
        { hex: '#B83B2A', name: 'Rojo pimentón', range: 'acentos', usage: 'Labial cálido intenso' },
        { hex: '#E07A5F', name: 'Calabaza especiada', range: 'acentos', usage: 'Prendas foco' },
        { hex: '#287271', name: 'Verde pavorreal', range: 'acentos', usage: 'Joyería y vestidos evento' },
        { hex: '#D97724', name: 'Ámbar quemado', range: 'acentos', usage: 'Pañuelos y bolsos' }
      ],
      profundos: [
        { hex: '#3E2723', name: 'Grano de café tostado', range: 'profundos', usage: 'Trajes oscuros' },
        { hex: '#2B4238', name: 'Verde pino cálido', range: 'profundos', usage: 'Prendas de abrigo' },
        { hex: '#4E2A1E', name: 'Caoba rojizo', range: 'profundos', usage: 'Botas y marroquinería' }
      ],
      iluminadores: [
        { hex: '#FBF0DF', name: 'Crema maíz', range: 'iluminadores', usage: 'Cuellos y blusas' },
        { hex: '#EBC29F', name: 'Melocotón dorado', range: 'iluminadores', usage: 'Luz en mejillas' },
        { hex: '#E6D2B5', name: 'Champán antiguo', range: 'iluminadores', usage: 'Seda y satén' }
      ],
      evitar: [
        { hex: '#000000', name: 'Negro carbón frío', why: 'Resta calidez y endurece el rostro.', alt: 'Grano de café tostado (#3E2723)' },
        { hex: '#E0E7FF', name: 'Azul hielo pastel', why: 'Deslava la riqueza dorada de la piel.', alt: 'Crema maíz (#FBF0DF)' },
        { hex: '#EC4899', name: 'Rosa chicle frío', why: 'Desentona con la armonía terrosa.', alt: 'Calabaza especiada (#E07A5F)' }
      ]
    }
  },
  {
    id: 'otono-profundo',
    name: 'Otoño Profundo',
    family: 'otono',
    familyLabel: 'Otoño',
    temperature: 'cálida-neutra',
    contrast: 'alto',
    chroma: 'profundo intenso',
    metals: ['Oro viejo', 'Bronce oscuro', 'Cobre oxidado'],
    description: 'Fuerza y profundidad cálida: chocolates negros, burdeos cálidos, verde bosque, teja y oro viejo.',
    ranges: {
      base: [
        { hex: '#EFE4D2', name: 'Marfil antiguo', range: 'base', usage: 'Contraste claro en camisas' },
        { hex: '#A68A71', name: 'Topo cacao', range: 'base', usage: 'Pantalones de diario' },
        { hex: '#4A2C2A', name: 'Chocolate amargo', range: 'base', usage: 'Base oscura principal' },
        { hex: '#263228', name: 'Negro bosque', range: 'base', usage: 'Sastrería de alto contraste' }
      ],
      medios: [
        { hex: '#8C2D19', name: 'Teja sangre de toro', range: 'medios', usage: 'Chaquetas y vestidos' },
        { hex: '#3B5249', name: 'Verde ciprés', range: 'medios', usage: 'Camisas y punto' },
        { hex: '#B37D14', name: 'Oro bizantino', range: 'medios', usage: 'Prendas iluminadoras' },
        { hex: '#7A493A', name: 'Castaña asada', range: 'medios', usage: 'Conjuntos de piel y lana' }
      ],
      acentos: [
        { hex: '#9E1B1B', name: 'Rojo chile', range: 'acentos', usage: 'Labial potente' },
        { hex: '#D95D39', name: 'Naranja terracota vivo', range: 'acentos', usage: 'Puntos focales' },
        { hex: '#0F6B6E', name: 'Azul cerceta profundo', range: 'acentos', usage: 'Vestidos de noche' },
        { hex: '#6B2D5C', name: 'Ciruela especiada', range: 'acentos', usage: 'Maquillaje de tarde' }
      ],
      profundos: [
        { hex: '#231715', name: 'Ébano cálido', range: 'profundos', usage: 'Sustituto rico del negro' },
        { hex: '#1B2E2B', name: 'Petróleo abisal', range: 'profundos', usage: 'Abrigos largos' },
        { hex: '#3B1C24', name: 'Granate oscuro', range: 'profundos', usage: 'Calzado y bolsos' }
      ],
      iluminadores: [
        { hex: '#F7EDE2', name: 'Seda cruda', range: 'iluminadores', usage: 'Blusas de contraste' },
        { hex: '#DFB39A', name: 'Nude caramelo claro', range: 'iluminadores', usage: 'Luz facial' },
        { hex: '#E8C589', name: 'Ámbar champán', range: 'iluminadores', usage: 'Sombra iluminadora' }
      ],
      evitar: [
        { hex: '#E2E8F0', name: 'Gris perla frío', why: 'Apaga la fuerza de ojos y cabello oscuros.', alt: 'Marfil antiguo (#EFE4D2)' },
        { hex: '#F9A8D4', name: 'Rosa bebé frío', why: 'Carece de peso visual y enfría el subtono.', alt: 'Teja sangre de toro (#8C2D19)' },
        { hex: '#BAE6FD', name: 'Celeste pastel', why: 'Desestructura el contraste natural alto.', alt: 'Azul cerceta profundo (#0F6B6E)' }
      ]
    }
  },

  /* ============================== INVIERNO =============================== */
  {
    id: 'invierno-profundo',
    name: 'Invierno Profundo',
    family: 'invierno',
    familyLabel: 'Invierno',
    temperature: 'fría-neutra',
    contrast: 'alto',
    chroma: 'profundo saturado',
    metals: ['Plata bruñida', 'Oro blanco', 'Rodio negro'],
    description: 'Dramatismo arquitectónico: negro puro, azul medianoche, borgoña sangre, pino glacial y blanco óptico.',
    ranges: {
      base: [
        { hex: '#FFFFFF', name: 'Blanco puro', range: 'base', usage: 'Camisas de alto contraste' },
        { hex: '#D1D5DB', name: 'Gris platino', range: 'base', usage: 'Punto estructurado' },
        { hex: '#374151', name: 'Carbón mineral', range: 'base', usage: 'Sastrería ejecutiva' },
        { hex: '#0F172A', name: 'Negro obsidiana', range: 'base', usage: 'Base icónica de armario' }
      ],
      medios: [
        { hex: '#1E3A8A', name: 'Azul real profundo', range: 'medios', usage: 'Vestidos y trajes' },
        { hex: '#7F1D1D', name: 'Granate rubí oscuro', range: 'medios', usage: 'Prendas superiores' },
        { hex: '#064E3B', name: 'Esmeralda bosque frío', range: 'medios', usage: 'Abrigos y blusas' },
        { hex: '#4C1D95', name: 'Morado imperial', range: 'medios', usage: 'Looks de noche' }
      ],
      acentos: [
        { hex: '#BE123C', name: 'Carmesí terciopelo', range: 'acentos', usage: 'Labial icónico' },
        { hex: '#0284C7', name: 'Cian zafiro', range: 'acentos', usage: 'Pañuelos y bolsos' },
        { hex: '#A21CAF', name: 'Magenta orquídea oscura', range: 'acentos', usage: 'Acentos de fiesta' },
        { hex: '#0D9488', name: 'Turquesa abisal', range: 'acentos', usage: 'Joyería y detalles' }
      ],
      profundos: [
        { hex: '#090D16', name: 'Negro azabache', range: 'profundos', usage: 'Total look y delineado' },
        { hex: '#172554', name: 'Medianoche cerrado', range: 'profundos', usage: 'Sastrería formal' },
        { hex: '#3B0764', name: 'Ciruela noche', range: 'profundos', usage: 'Vestidos largos' }
      ],
      iluminadores: [
        { hex: '#F8FAFC', name: 'Blanco diamante', range: 'iluminadores', usage: 'Cuellos y camisas' },
        { hex: '#FCE7F3', name: 'Rosa escarcha', range: 'iluminadores', usage: 'Contraste luminoso' },
        { hex: '#E0E7FF', name: 'Hielo zafiro', range: 'iluminadores', usage: 'Iluminador de lagrimal' }
      ],
      evitar: [
        { hex: '#D4A373', name: 'Camel beige cálido', why: 'Apaga el contraste dramático y amarillea la piel.', alt: 'Gris platino (#D1D5DB)' },
        { hex: '#E9C46A', name: 'Amarillo mostaza suave', why: 'Resta fuerza a la mirada oscura.', alt: 'Carmesí terciopelo (#BE123C)' },
        { hex: '#CCD5AE', name: 'Verde salvia pastel', why: 'Demasiado lavado y cálido.', alt: 'Esmeralda bosque frío (#064E3B)' }
      ]
    }
  },
  {
    id: 'invierno-frio',
    name: 'Invierno Frío',
    family: 'invierno',
    familyLabel: 'Invierno',
    temperature: 'fría',
    contrast: 'alto',
    chroma: 'puro glacial',
    metals: ['Platino puro', 'Plata espejo', 'Oro blanco brillante'],
    description: 'Frialdad cristalina pura: zafiros, fucsias, esmeraldas fríos, grises hielo y contraste blanco/negro.',
    ranges: {
      base: [
        { hex: '#FFFFFF', name: 'Blanco óptico', range: 'base', usage: 'Camisería nítida' },
        { hex: '#E2E8F0', name: 'Gris hielo', range: 'base', usage: 'Jerséis y blusas' },
        { hex: '#475569', name: 'Acero oscuro', range: 'base', usage: 'Pantalones de corte' },
        { hex: '#111827', name: 'Negro puro frío', range: 'base', usage: 'Sastrería y abrigos' }
      ],
      medios: [
        { hex: '#1D4ED8', name: 'Azul cobalto puro', range: 'medios', usage: 'Prenda firma' },
        { hex: '#BE185D', name: 'Fucsia frambuesa', range: 'medios', usage: 'Vestidos y tops' },
        { hex: '#047857', name: 'Verde pino frío', range: 'medios', usage: 'Chaquetas y punto' },
        { hex: '#6D28D9', name: 'Violeta amatista', range: 'medios', usage: 'Estilismos de tarde' }
      ],
      acentos: [
        { hex: '#E11D48', name: 'Rojo rubí azulado', range: 'acentos', usage: 'Labial clásico frío' },
        { hex: '#EC4899', name: 'Magenta glacial', range: 'acentos', usage: 'Rubor frío y accesorios' },
        { hex: '#0055FF', name: 'Azul eléctrico frío', range: 'acentos', usage: 'Piezas de impacto' },
        { hex: '#9333EA', name: 'Púrpura real', range: 'acentos', usage: 'Eventos nocturnos' }
      ],
      profundos: [
        { hex: '#030712', name: 'Negro tinta', range: 'profundos', usage: 'Base de contraste' },
        { hex: '#1E1B4B', name: 'Índigo abisal', range: 'profundos', usage: 'Trajes de noche' },
        { hex: '#500724', name: 'Vino helado', range: 'profundos', usage: 'Marroquinería y abrigo' }
      ],
      iluminadores: [
        { hex: '#F1F5F9', name: 'Plata escarchada', range: 'iluminadores', usage: 'Luz cerca del rostro' },
        { hex: '#FDF2F8', name: 'Rosa hielo', range: 'iluminadores', usage: 'Blusas satinadas' },
        { hex: '#EFF6FF', name: 'Celeste diamante', range: 'iluminadores', usage: 'Sombra iluminadora' }
      ],
      evitar: [
        { hex: '#D97706', name: 'Ocre dorado', why: 'Introduce calidez amarillenta incompatible.', alt: 'Azul cobalto puro (#1D4ED8)' },
        { hex: '#C2410C', name: 'Naranja teja', why: 'Choca con el subtono rosado/azulado.', alt: 'Rojo rubí azulado (#E11D48)' },
        { hex: '#A3A380', name: 'Oliva amarillento', why: 'Fatiga visualmente la piel fría.', alt: 'Verde pino frío (#047857)' }
      ]
    }
  },
  {
    id: 'invierno-brillante',
    name: 'Invierno Claro',
    family: 'invierno',
    familyLabel: 'Invierno',
    temperature: 'fría-neutra',
    contrast: 'extremo',
    chroma: 'brillante cristalino',
    metals: ['Plata espejo', 'Oro blanco pulido', 'Cromo brillante'],
    description: 'Contraste extremo y destello joya: blanco puro, negro charol, fucsia neón frío, esmeralda vivo y azul cian.',
    ranges: {
      base: [
        { hex: '#FFFFFF', name: 'Blanco nieve brillante', range: 'base', usage: 'Contraste polar limpio' },
        { hex: '#E5E7EB', name: 'Plata espejo', range: 'base', usage: 'Blusas y punto técnico' },
        { hex: '#334155', name: 'Antracita nítido', range: 'base', usage: 'Sastrería moderna' },
        { hex: '#0A0A0A', name: 'Negro charol', range: 'base', usage: 'Eje de alto contraste' }
      ],
      medios: [
        { hex: '#2563EB', name: 'Azul zafiro brillante', range: 'medios', usage: 'Chaquetas y vestidos' },
        { hex: '#DB2777', name: 'Rosa schiaparelli', range: 'medios', usage: 'Prendas foco' },
        { hex: '#10B981', name: 'Esmeralda cristal', range: 'medios', usage: 'Camisería viva' },
        { hex: '#7C3AED', name: 'Violeta ultravioleta', range: 'medios', usage: 'Looks creativos' }
      ],
      acentos: [
        { hex: '#FF0055', name: 'Rojo cereza eléctrico', range: 'acentos', usage: 'Labial de alto impacto' },
        { hex: '#00B4D8', name: 'Cian láser', range: 'acentos', usage: 'Accesorios y delineado' },
        { hex: '#F72585', name: 'Fucsia joya', range: 'acentos', usage: 'Vestidos de gala' },
        { hex: '#FFE600', name: 'Amarillo limón helado', range: 'acentos', usage: 'Contraste gráfico puntual' }
      ],
      profundos: [
        { hex: '#000000', name: 'Negro absoluto', range: 'profundos', usage: 'Sastrería y noche' },
        { hex: '#0F172A', name: 'Azul tinta brillante', range: 'profundos', usage: 'Abrigos estructurados' },
        { hex: '#3B0764', name: 'Morado noche', range: 'profundos', usage: 'Complementos' }
      ],
      iluminadores: [
        { hex: '#F8FAFC', name: 'Hielo puro', range: 'iluminadores', usage: 'Cuellos y camisas' },
        { hex: '#FCE7F3', name: 'Escarcha magenta', range: 'iluminadores', usage: 'Luz en mejillas' },
        { hex: '#ECFEFF', name: 'Cristal ártico', range: 'iluminadores', usage: 'Sombra nacarada' }
      ],
      evitar: [
        { hex: '#A8A29E', name: 'Beige empolvado', why: 'Apaga la chispa cristalina del rostro.', alt: 'Plata espejo (#E5E7EB)' },
        { hex: '#9A6B4E', name: 'Marrón tierra mate', why: 'Enloda la nitidez del contraste extremo.', alt: 'Negro charol (#0A0A0A)' },
        { hex: '#84A98C', name: 'Salvia apagado', why: 'Falta de saturación.', alt: 'Esmeralda cristal (#10B981)' }
      ]
    }
  }
];

/**
 * Clase POO que gestiona el Atlas Completo de Colorimetría (12 estaciones y 6 subgamas)
 * y clasifica sin recortes todos los tonos personales de cada cuenta.
 */
export class ColorimetryAtlasCatalog {
  private readonly seasons: SeasonColorimetrySpec[];

  public constructor(seasons: SeasonColorimetrySpec[] = TWELVE_SEASONS_DATA) {
    this.seasons = seasons;
  }

  /**
   * Devuelve las 12 estaciones cromáticas completas sin ningún recorte.
   */
  public getAllSeasons(): SeasonColorimetrySpec[] {
    return this.seasons;
  }

  /**
   * Filtra las estaciones por familia ('primavera' | 'verano' | 'otono' | 'invierno' | 'all').
   */
  public getSeasonsByFamily(family: SeasonFamilyKey | 'all'): SeasonColorimetrySpec[] {
    if (family === 'all') {
      return this.seasons;
    }
    return this.seasons.filter(season => season.family === family);
  }

  /**
   * Localiza la estación de colorimetría por su ID o nombre aproximado.
   */
  public findSeason(nameOrId?: string | null): SeasonColorimetrySpec {
    if (!nameOrId) {
      return this.seasons[6]; // Otoño Cálido Suave por defecto
    }
    const clean = nameOrId
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const exact = this.seasons.find(s => {
      const sName = s.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return s.id === clean || sName === clean;
    });
    if (exact) return exact;

    const partial = this.seasons.find(s => {
      const sName = s.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return clean.includes(sName) || sName.includes(clean);
    });
    if (partial) return partial;

    if (clean.includes('primavera')) return this.seasons[1];
    if (clean.includes('verano')) return this.seasons[5];
    if (clean.includes('invierno')) return this.seasons[11];
    return this.seasons[6];
  }

  /**
   * Devuelve TODOS los tonos armónicos de una estación (Base + Medios + Acentos + Profundos + Iluminadores).
   */
  public getAllHarmoniousSwatchesForSeason(season: SeasonColorimetrySpec): ColorSwatchSpec[] {
    return [
      ...season.ranges.base,
      ...season.ranges.medios,
      ...season.ranges.acentos,
      ...season.ranges.profundos,
      ...season.ranges.iluminadores
    ];
  }

  /**
   * Construye el desglose completo de colorimetría de una cuenta combinando TODOS los tonos
   * devueltos por el análisis (`analysis.colorimetry.palette` y `avoid`) con las subgamas
   * completas de su estación, garantizando que ningún color sea omitido ni truncado.
   */
  public buildPersonalBreakdown(analysis: Analysis | null): PersonalColorimetryBreakdown {
    const matchedSeason = this.findSeason(analysis?.colorimetry?.season);
    const rawPalette = (analysis?.colorimetry?.palette || []).filter(hex =>
      /^#[0-9a-f]{6}$/i.test(hex || '')
    );

    const catalogSwatches = this.getAllHarmoniousSwatchesForSeason(matchedSeason);
    const catalogByHex = new Map<string, ColorSwatchSpec>();
    for (const item of catalogSwatches) {
      catalogByHex.set(item.hex.toUpperCase(), item);
    }

    const base = [...matchedSeason.ranges.base];
    const medios = [...matchedSeason.ranges.medios];
    const acentos = [...matchedSeason.ranges.acentos];
    const profundos = [...matchedSeason.ranges.profundos];
    const iluminadores = [...matchedSeason.ranges.iluminadores];

    // Incorporar absolutamente todos los colores de la paleta personal que no estén ya en las subgamas
    rawPalette.forEach((rawHex, index) => {
      const upper = rawHex.toUpperCase();
      if (catalogByHex.has(upper)) {
        return;
      }
      const rgb = this.hexToRgb(upper);
      const luma = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const chroma = max - min;

      let targetRange: Exclude<ColorSubRangeKey, 'evitar'> = 'medios';
      if (luma > 215) {
        targetRange = 'iluminadores';
      } else if (luma < 75) {
        targetRange = 'profundos';
      } else if (chroma > 95) {
        targetRange = 'acentos';
      } else if (chroma < 42) {
        targetRange = 'base';
      }

      const customSpec: ColorSwatchSpec = {
        hex: upper,
        name: `Tono personal #${index + 1} (${upper})`,
        range: targetRange,
        usage: 'Detectado directamente en tu análisis facial'
      };
      catalogByHex.set(upper, customSpec);

      if (targetRange === 'base') base.unshift(customSpec);
      else if (targetRange === 'iluminadores') iluminadores.unshift(customSpec);
      else if (targetRange === 'profundos') profundos.unshift(customSpec);
      else if (targetRange === 'acentos') acentos.unshift(customSpec);
      else medios.unshift(customSpec);
    });

    // Unir todos los tonos a evitar del análisis con los de la estación sin duplicar HEX
    const avoidMap = new Map<string, AvoidTone>();
    for (const item of analysis?.colorimetry?.avoid || []) {
      if (item?.hex) {
        avoidMap.set(item.hex.toUpperCase(), item);
      }
    }
    for (const item of matchedSeason.ranges.evitar) {
      const upper = item.hex.toUpperCase();
      if (!avoidMap.has(upper)) {
        avoidMap.set(upper, item);
      }
    }

    const allHarmoniousSwatches = [
      ...base,
      ...medios,
      ...acentos,
      ...profundos,
      ...iluminadores
    ];

    return {
      matchedSeason,
      rawPalette: rawPalette.length
        ? rawPalette.map(h => h.toUpperCase())
        : allHarmoniousSwatches.map(s => s.hex.toUpperCase()),
      allHarmoniousSwatches,
      ranges: {
        base,
        medios,
        acentos,
        profundos,
        iluminadores,
        evitar: Array.from(avoidMap.values())
      }
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.slice(0, 2), 16) || 0,
      g: parseInt(clean.slice(2, 4), 16) || 0,
      b: parseInt(clean.slice(4, 6), 16) || 0
    };
  }
}

export const defaultColorimetryAtlas = new ColorimetryAtlasCatalog();
