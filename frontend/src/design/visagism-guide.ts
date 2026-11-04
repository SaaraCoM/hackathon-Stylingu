import type { Analysis } from './types';
import { defaultColorimetryAtlas } from './colorimetry-atlas';

export type FaceShapeKey =
  | 'oval'
  | 'redonda'
  | 'cuadrada'
  | 'corazon'
  | 'alargada'
  | 'diamante';

export type EyewearFrameStyle =
  | 'wayfarer'
  | 'cat-eye'
  | 'aviator'
  | 'pantos-round'
  | 'clubmaster'
  | 'oversize-geometric';

export interface EyewearRecommendation {
  id: EyewearFrameStyle;
  name: string;
  fitScore: number;
  why: string;
  bridgeAndRimTip: string;
}

export interface ContourZonePolygon {
  id: string;
  type: 'contour' | 'highlight' | 'blush';
  label: string;
  d: string;
}

export interface FaceShapeVisagismSpec {
  key: FaceShapeKey;
  label: string;
  proportionsSummary: string;
  opticalGoal: string;
  faceOutlinePath: string;
  eyewearRecommended: EyewearRecommendation[];
  eyewearAvoid: string[];
  contouringGuide: {
    summary: string;
    contourWhere: string;
    highlightWhere: string;
    blushWhere: string;
    stepByStep: string[];
    zones: ContourZonePolygon[];
  };
}

export interface ThermalMetalAndContrastDiagnosis {
  temperatureCategory: 'Cálida' | 'Fría' | 'Neutra-Cálida' | 'Neutra-Fría';
  temperatureScoreWarm: number; // 0 (100% fría) a 100 (100% cálida)
  temperatureExplanation: string;
  contrastLevel: 'Contraste Alto' | 'Contraste Medio' | 'Contraste Bajo';
  contrastScore: number; // 0 a 100
  contrastExplanation: string;
  contrastStylingRule: string;
  metalWinner: 'Dorado (Oro Amarillo y Bronce)' | 'Plata (Platino y Oro Blanco)' | 'Dual (Oro Champán y Plata Satinada)';
  goldAffinity: number; // 0 a 100
  silverAffinity: number; // 0 a 100
  roseGoldAffinity: number; // 0 a 100
  metalExplanation: string;
  eyewearMetalTip: string;
}

const FACE_SHAPES_CATALOG: Record<FaceShapeKey, FaceShapeVisagismSpec> = {
  oval: {
    key: 'oval',
    label: 'Rostro Ovalado',
    proportionsSummary: 'Curvas armónicas, pómulos ligeramente más anchos que la frente y mentón suavemente redondeado.',
    opticalGoal: 'Acompañar la simetría natural del óvalo sin sobrecargar ni alargar en exceso el tercio medio.',
    faceOutlinePath: 'M 120 26 C 166 26, 188 64, 186 116 C 184 168, 156 212, 120 222 C 84 212, 56 168, 54 116 C 52 64, 74 26, 120 26 Z',
    eyewearRecommended: [
      {
        id: 'wayfarer',
        name: 'Wayfarer Estructurada',
        fitScore: 98,
        why: 'Aporta estructura horizontal limpia manteniendo la armonía entre ceja y pómulo.',
        bridgeAndRimTip: 'Ancho total idéntico a la parte más ancha de las sienes; aro medio de acetato o metal.'
      },
      {
        id: 'cat-eye',
        name: 'Cat-Eye Suave',
        fitScore: 95,
        why: 'Eleva sutilmente la mirada y acompaña la diagonal natural del hueso cigomático.',
        bridgeAndRimTip: 'Puente medio y vértice superior ligeramente elevado sin puntas extremas.'
      },
      {
        id: 'aviator',
        name: 'Aviador Clásica',
        fitScore: 93,
        why: 'La lágrima suave complementa la curva inferior del óvalo sin endurecer las facciones.',
        bridgeAndRimTip: 'Doble puente fino en tu metal armónico (dorado o plata).'
      }
    ],
    eyewearAvoid: [
      'Monturas desproporcionadas que sobresalgan más de 5 mm de las sienes.',
      'Lentes excesivamente caídas que oculten por completo los pómulos.'
    ],
    contouringGuide: {
      summary: 'Esculpido de realce ligero: respeta las proporciones naturales acentuando la luz central y el pómulo.',
      contourWhere: 'Bajo el hueso del pómulo desde el trago de la oreja hasta mitad de la mejilla, y velo ligero en sienes.',
      highlightWhere: 'Arco alto del pómulo (en C hacia la sien), puente nasal, centro de la frente, arco de cupido y centro del mentón.',
      blushWhere: 'Sobre la manzana del pómulo difuminando en diagonal ascendente hacia la sien.',
      stepByStep: [
        'Aplica el contorno en crema 1,5 tonos más oscuro justo bajo el hueso cigomático sin bajar de la línea de la nariz.',
        'Difumina siempre hacia arriba con brocha biselada para elevar visualmente el pómulo.',
        'Deposita el rubor justo encima del contorno fusionando ambos bordes sin cortes.',
        'Ilumina el punto más alto del pómulo, el tabique nasal y el arco de cupido.'
      ],
      zones: [
        // Sienes (contorno suave)
        { id: 'temple-l', type: 'contour', label: 'Sien izquierda', d: 'M 62 56 Q 56 80 60 98 L 70 92 Q 67 74 72 60 Z' },
        { id: 'temple-r', type: 'contour', label: 'Sien derecha', d: 'M 178 56 Q 184 80 180 98 L 170 92 Q 173 74 168 60 Z' },
        // Bajo pómulo (contorno)
        { id: 'cheek-c-l', type: 'contour', label: 'Bajo pómulo izq.', d: 'M 58 132 Q 78 144 96 154 L 92 163 Q 72 154 57 144 Z' },
        { id: 'cheek-c-r', type: 'contour', label: 'Bajo pómulo der.', d: 'M 182 132 Q 162 144 144 154 L 148 163 Q 168 154 183 144 Z' },
        // laterales nariz
        { id: 'nose-c-l', type: 'contour', label: 'Lateral nasal izq.', d: 'M 111 98 L 109 138 L 114 138 L 115 98 Z' },
        { id: 'nose-c-r', type: 'contour', label: 'Lateral nasal der.', d: 'M 129 98 L 131 138 L 126 138 L 125 98 Z' },
        // Blush
        { id: 'blush-l', type: 'blush', label: 'Rubor ascendente izq.', d: 'M 64 118 Q 84 124 98 138 Q 82 146 62 130 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor ascendente der.', d: 'M 176 118 Q 156 124 142 138 Q 158 146 178 130 Z' },
        // Highlight
        { id: 'hl-forehead', type: 'highlight', label: 'Centro frente', d: 'M 120 48 C 138 48, 144 64, 120 68 C 96 64, 102 48, 120 48 Z' },
        { id: 'hl-nose', type: 'highlight', label: 'Puente nasal', d: 'M 120 94 L 123 138 L 117 138 Z' },
        { id: 'hl-cheek-l', type: 'highlight', label: 'Luz pómulo izq.', d: 'M 68 108 Q 86 112 98 122 Q 82 124 66 115 Z' },
        { id: 'hl-cheek-r', type: 'highlight', label: 'Luz pómulo der.', d: 'M 172 108 Q 154 112 142 122 Q 158 124 174 115 Z' },
        { id: 'hl-chin', type: 'highlight', label: 'Luz mentón', d: 'M 120 194 C 132 194, 132 208, 120 208 C 108 208, 108 194, 120 194 Z' }
      ]
    }
  },

  redonda: {
    key: 'redonda',
    label: 'Rostro Redondo',
    proportionsSummary: 'Ancho y alto facial similares, mejillas llenas y línea mandibular curva sin ángulos marcados.',
    opticalGoal: 'Aportar ángulos, verticalidad y definición bajo el pómulo para estilizar el contorno.',
    faceOutlinePath: 'M 120 34 C 176 34, 196 76, 194 124 C 192 174, 166 210, 120 212 C 74 210, 48 174, 46 124 C 44 76, 64 34, 120 34 Z',
    eyewearRecommended: [
      {
        id: 'wayfarer',
        name: 'Rectangular / Wayfarer Angular',
        fitScore: 99,
        why: 'Las líneas rectas y ángulos marcados rompen la circularidad y estructuran el tercio medio.',
        bridgeAndRimTip: 'Elige puente alto o transparente para alargar ópticamente la nariz.'
      },
      {
        id: 'cat-eye',
        name: 'Cat-Eye Ascendente',
        fitScore: 97,
        why: 'Dirige la atención hacia las sienes, creando un efecto lifting que afina las mejillas.',
        bridgeAndRimTip: 'Borde superior grueso y esquinas exteriores bien definidas.'
      },
      {
        id: 'oversize-geometric',
        name: 'Geométrica Hexagonal / Cuadrada',
        fitScore: 94,
        why: 'Añade facetas arquitectónicas que contrastan con las curvas suaves del rostro.',
        bridgeAndRimTip: 'Montura ligeramente más ancha que el pómulo.'
      }
    ],
    eyewearAvoid: [
      'Gafas redondas pequeñas tipo John Lennon (acentúan la redondez).',
      'Monturas estrechas o de puente muy bajo que acorten el rostro.'
    ],
    contouringGuide: {
      summary: 'Esculpido de alargamiento vertical y angulación: sombrea laterales y concentra la luz en el eje central.',
      contourWhere: 'Laterales de la frente, sienes, diagonal pronunciada bajo el pómulo y línea mandibular inferior.',
      highlightWhere: 'Eje vertical central (centro de la frente, tabique nasal, arco de cupido y mentón) más alto del pómulo.',
      blushWhere: 'En diagonal ascendente desde el centro de la mejilla hacia la sien (nunca en círculo sobre la manzana).',
      stepByStep: [
        'Traza el contorno desde la parte media de la oreja en ángulo de 45° hacia la comisura del labio (frenando a dos dedos de ella).',
        'Sombrea los laterales exteriores de la frente y el borde de la mandíbula para estrechar el perímetro.',
        'Aplica el iluminador exclusivamente en el eje central vertical para alargar el rostro.',
        'Coloca el rubor en diagonal alta, paralelo al contorno, hacia la sien.'
      ],
      zones: [
        { id: 'temple-l', type: 'contour', label: 'Lateral frente y sien izq.', d: 'M 56 54 Q 48 86 50 118 L 62 114 Q 60 84 68 60 Z' },
        { id: 'temple-r', type: 'contour', label: 'Lateral frente y sien der.', d: 'M 184 54 Q 192 86 190 118 L 178 114 Q 180 84 172 60 Z' },
        { id: 'cheek-c-l', type: 'contour', label: 'Diagonal pómulo izq.', d: 'M 50 128 Q 74 146 98 162 L 92 172 Q 68 156 48 142 Z' },
        { id: 'cheek-c-r', type: 'contour', label: 'Diagonal pómulo der.', d: 'M 190 128 Q 166 146 142 162 L 148 172 Q 172 156 192 142 Z' },
        { id: 'jaw-l', type: 'contour', label: 'Mandíbula izq.', d: 'M 56 168 Q 74 192 98 204 L 94 210 Q 68 198 52 174 Z' },
        { id: 'jaw-r', type: 'contour', label: 'Mandíbula der.', d: 'M 184 168 Q 166 192 142 204 L 146 210 Q 172 198 188 174 Z' },
        { id: 'blush-l', type: 'blush', label: 'Rubor oblicuo izq.', d: 'M 60 116 Q 82 128 98 146 Q 82 152 58 128 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor oblicuo der.', d: 'M 180 116 Q 158 128 142 146 Q 158 152 182 128 Z' },
        { id: 'hl-forehead', type: 'highlight', label: 'Luz vertical frente', d: 'M 120 42 C 134 42, 136 68, 120 72 C 104 68, 106 42, 120 42 Z' },
        { id: 'hl-nose', type: 'highlight', label: 'Tabique nasal', d: 'M 120 92 L 123 140 L 117 140 Z' },
        { id: 'hl-chin', type: 'highlight', label: 'Eje vertical mentón', d: 'M 120 186 C 130 186, 130 206, 120 206 C 110 206, 110 186, 120 186 Z' }
      ]
    }
  },

  cuadrada: {
    key: 'cuadrada',
    label: 'Rostro Cuadrado',
    proportionsSummary: 'Frente amplia, pómulos en línea recta con las sienes y mandíbula angulosa muy definida.',
    opticalGoal: 'Suavizar los cuatro vértices angulares (frente y mandíbula) y aportar fluidez orgánica.',
    faceOutlinePath: 'M 72 30 L 168 30 C 184 30, 188 54, 188 120 C 188 174, 184 196, 166 208 L 120 218 L 74 208 C 56 196, 52 174, 52 120 C 52 54, 56 30, 72 30 Z',
    eyewearRecommended: [
      {
        id: 'pantos-round',
        name: 'Redonda / Pantos Orgánica',
        fitScore: 99,
        why: 'Las lentes curvas suavizan al instante la firmeza angular de la mandíbula y la frente.',
        bridgeAndRimTip: 'Aros finos metálicos o carey redondeado con puente alto.'
      },
      {
        id: 'aviator',
        name: 'Aviador de Curva Suave',
        fitScore: 96,
        why: 'Su silueta en gota redondeada equilibra los maxilares marcados.',
        bridgeAndRimTip: 'Montura metálica fina en dorado o plata según tu subtono.'
      },
      {
        id: 'cat-eye',
        name: 'Cat-Eye Redondeado (Oval-Cat)',
        fitScore: 93,
        why: 'Eleva las facciones manteniendo una base inferior curva y amable.',
        bridgeAndRimTip: 'Evita esquinas rectas; prioriza bordes inferiores ovalados.'
      }
    ],
    eyewearAvoid: [
      'Monturas cuadradas o rectangulares de aristas afiladas (endurecen los rasgos).',
      'Monturas bajas y planas en la parte inferior.'
    ],
    contouringGuide: {
      summary: 'Esculpido suavizante de ángulos: redondea los vértices de frente y maxilar e ilumina el centro.',
      contourWhere: 'Esquinas superiores de la frente, ángulos exteriores de la mandíbula (masetero) y curva suave bajo el pómulo.',
      highlightWhere: 'Centro de la frente en óvalo, pómulo alto, puente nasal y punta redondeada del mentón.',
      blushWhere: 'En forma redondeada y difusa sobre la manzana del pómulo hacia la sien para aportar suavidad.',
      stepByStep: [
        'Sombrea las dos esquinas superiores de la frente hacia la raíz del cabello para ovalar el tercio superior.',
        'Aplica contorno directamente sobre el ángulo externo de la mandíbula y difumina hacia el cuello.',
        'Traza una curva suave bajo el pómulo sin líneas rectas rígidas.',
        'Aplica el rubor con movimientos circulares suaves sobre el pómulo.'
      ],
      zones: [
        { id: 'corner-tl', type: 'contour', label: 'Ángulo frontal izq.', d: 'M 56 34 L 88 32 Q 72 52 56 76 Z' },
        { id: 'corner-tr', type: 'contour', label: 'Ángulo frontal der.', d: 'M 184 34 L 152 32 Q 168 52 184 76 Z' },
        { id: 'jaw-corner-l', type: 'contour', label: 'Ángulo mandibular izq.', d: 'M 54 162 L 66 158 Q 74 188 94 206 L 72 206 C 58 196, 54 180, 54 162 Z' },
        { id: 'jaw-corner-r', type: 'contour', label: 'Ángulo mandibular der.', d: 'M 186 162 L 174 158 Q 166 188 146 206 L 168 206 C 182 196, 186 180, 186 162 Z' },
        { id: 'cheek-c-l', type: 'contour', label: 'Bajo pómulo izq.', d: 'M 56 130 Q 78 142 96 148 L 92 158 Q 72 150 56 140 Z' },
        { id: 'cheek-c-r', type: 'contour', label: 'Bajo pómulo der.', d: 'M 184 130 Q 162 142 144 148 L 148 158 Q 168 150 184 140 Z' },
        { id: 'blush-l', type: 'blush', label: 'Rubor redondeado izq.', d: 'M 68 118 C 86 116, 98 128, 92 140 C 82 144, 66 134, 68 118 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor redondeado der.', d: 'M 172 118 C 154 116, 142 128, 148 140 C 158 144, 174 134, 172 118 Z' },
        { id: 'hl-forehead', type: 'highlight', label: 'Luz central frente', d: 'M 120 46 C 138 46, 142 66, 120 70 C 98 66, 102 46, 120 46 Z' },
        { id: 'hl-nose', type: 'highlight', label: 'Puente nasal', d: 'M 120 94 L 123 138 L 117 138 Z' },
        { id: 'hl-chin', type: 'highlight', label: 'Centro mentón', d: 'M 120 192 C 134 192, 134 208, 120 208 C 106 208, 106 192, 120 192 Z' }
      ]
    }
  },

  corazon: {
    key: 'corazon',
    label: 'Rostro Corazón / Triángulo Invertido',
    proportionsSummary: 'Frente y sienes amplias, pómulos elevados protagonistas y barbilla fina o delicada.',
    opticalGoal: 'Equilibrar la amplitud superior de la frente aportando ligereza arriba y presencia suave en el tercio inferior.',
    faceOutlinePath: 'M 120 34 C 152 24, 192 44, 190 96 C 188 146, 152 194, 120 222 C 88 194, 52 146, 50 96 C 48 44, 88 24, 120 34 Z',
    eyewearRecommended: [
      {
        id: 'aviator',
        name: 'Aviador / Gota Invertida',
        fitScore: 99,
        why: 'Su volumen inferior compensa visualmente la barbilla fina y suaviza la anchura de las sienes.',
        bridgeAndRimTip: 'Monturas metálicas finas o al aire para no recargar el arco de la ceja.'
      },
      {
        id: 'pantos-round',
        name: 'Redonda Ligera / Sin Aro (Rimless)',
        fitScore: 96,
        why: 'Despeja el tercio superior del rostro sin añadir peso en la frente.',
        bridgeAndRimTip: 'Colores translúcidos, champán o plata fina.'
      },
      {
        id: 'wayfarer',
        name: 'Wayfarer de Base Redondeada',
        fitScore: 92,
        why: 'Equilibra el ancho entre sienes y mejillas con líneas limpias.',
        bridgeAndRimTip: 'Evita apliques gruesos en las esquinas superiores.'
      }
    ],
    eyewearAvoid: [
      'Monturas Clubmaster de ceja muy gruesa u oscura (ensanchan aún más la frente).',
      'Cat-eye extremos con adornos voluminosos en las sienes.'
    ],
    contouringGuide: {
      summary: 'Esculpido de reequilibrio triangular: estrecha suavemente las sienes y suaviza la punta del mentón.',
      contourWhere: 'Laterales superiores de la frente, sienes, toque suave bajo la parte externa del pómulo y punta inferior del mentón.',
      highlightWhere: 'Bajo los ojos en triángulo invertido, centro bajo de la frente, puente nasal y laterales de la mandíbula.',
      blushWhere: 'En abanico horizontal-medio sobre el pómulo sin subir demasiado a la sien.',
      stepByStep: [
        'Sombrea los laterales de la frente y las sienes para reducir visualmente el ancho superior.',
        'Aplica un toque de contorno en la punta misma de la barbilla para suavizar su proyección.',
        'Ilumina los laterales de la mandíbula y el centro bajo de la frente para equilibrar volúmenes.',
        'Coloca el rubor en el centro del pómulo difuminando ligeramente hacia el exterior.'
      ],
      zones: [
        { id: 'temple-l', type: 'contour', label: 'Lateral frente y sien izq.', d: 'M 52 50 Q 48 80 56 106 L 70 98 Q 64 72 78 40 Z' },
        { id: 'temple-r', type: 'contour', label: 'Lateral frente y sien der.', d: 'M 188 50 Q 192 80 184 106 L 170 98 Q 176 72 162 40 Z' },
        { id: 'cheek-c-l', type: 'contour', label: 'Pómulo externo izq.', d: 'M 60 132 Q 78 142 94 148 L 90 156 Q 74 148 58 140 Z' },
        { id: 'cheek-c-r', type: 'contour', label: 'Pómulo externo der.', d: 'M 180 132 Q 162 142 146 148 L 150 156 Q 166 148 182 140 Z' },
        { id: 'chin-tip', type: 'contour', label: 'Punta del mentón', d: 'M 106 212 Q 120 218 134 212 L 120 222 Z' },
        { id: 'blush-l', type: 'blush', label: 'Rubor equilibrante izq.', d: 'M 66 118 Q 86 122 98 134 Q 82 140 64 128 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor equilibrante der.', d: 'M 174 118 Q 154 122 142 134 Q 158 140 176 128 Z' },
        { id: 'hl-forehead', type: 'highlight', label: 'Entrecejo luminoso', d: 'M 120 58 C 132 58, 134 74, 120 76 C 106 74, 108 58, 120 58 Z' },
        { id: 'hl-jaw-l', type: 'highlight', label: 'Luz mandibular izq.', d: 'M 78 176 Q 90 190 102 198 L 96 204 Q 82 194 74 182 Z' },
        { id: 'hl-jaw-r', type: 'highlight', label: 'Luz mandibular der.', d: 'M 162 176 Q 150 190 138 198 L 144 204 Q 158 194 166 182 Z' }
      ]
    }
  },

  alargada: {
    key: 'alargada',
    label: 'Rostro Alargado / Rectangular',
    proportionsSummary: 'Eje vertical notoriamente más largo que el horizontal, frente y mentón despejados y mejillas estilizadas.',
    opticalGoal: 'Acortar visualmente el eje vertical y potenciar la amplitud horizontal en la zona de los pómulos.',
    faceOutlinePath: 'M 120 18 C 160 18, 176 52, 176 118 C 176 184, 158 228, 120 230 C 82 228, 64 184, 64 118 C 64 52, 80 18, 120 18 Z',
    eyewearRecommended: [
      {
        id: 'oversize-geometric',
        name: 'Oversize de Lente Alta',
        fitScore: 99,
        why: 'Ocupa mayor espacio vertical en el tercio medio, reduciendo ópticamente la longitud del rostro.',
        bridgeAndRimTip: 'Lentes de gran altura vertical y puente bajo.'
      },
      {
        id: 'clubmaster',
        name: 'Clubmaster / Browline Marcada',
        fitScore: 96,
        why: 'La barra superior horizontal ensancha la mirada y divide armónicamente la verticalidad.',
        bridgeAndRimTip: 'Varillas anchas o con contraste cromático.'
      },
      {
        id: 'aviator',
        name: 'Aviador Profunda',
        fitScore: 94,
        why: 'La caída amplia de la lente equilibra la distancia entre ceja y labio.',
        bridgeAndRimTip: 'Doble puente horizontal marcado.'
      }
    ],
    eyewearAvoid: [
      'Gafas rectangulares estrechas o de poca altura (alargan aún más el rostro).',
      'Monturas sin aro muy pequeñas.'
    ],
    contouringGuide: {
      summary: 'Esculpido horizontal: sombrea el nacimiento superior del cabello y el borde del mentón; aplica rubor en horizontal.',
      contourWhere: 'Borde superior de la frente (raíz del cabello), borde inferior de la barbilla y trazo horizontal bajo el pómulo.',
      highlightWhere: 'Hueso alto del pómulo hacia los lados y puente nasal corto (evitar iluminar frente alta y punta del mentón).',
      blushWhere: 'Aplicado de forma horizontal sobre las manzanas de las mejillas hacia las orejas para ensanchar el tercio medio.',
      stepByStep: [
        'Difumina contorno a lo largo del nacimiento superior del cabello para bajar ópticamente la frente.',
        'Sombrea el borde inferior del mentón para acortar el tercio inferior.',
        'Traza el contorno del pómulo de manera más horizontal (desde la oreja hacia el centro de la mejilla).',
        'Aplica el rubor horizontalmente en el centro de las mejillas y evita iluminador en la punta de la barbilla.'
      ],
      zones: [
        { id: 'hairline-top', type: 'contour', label: 'Línea superior frente', d: 'M 80 24 Q 120 14 160 24 Q 146 38 120 38 Q 94 38 80 24 Z' },
        { id: 'chin-bottom', type: 'contour', label: 'Borde inferior mentón', d: 'M 94 218 Q 120 224 146 218 Q 136 230 120 230 Q 104 230 94 218 Z' },
        { id: 'cheek-c-l', type: 'contour', label: 'Contorno horizontal izq.', d: 'M 64 134 Q 84 138 100 140 L 98 148 Q 80 146 64 142 Z' },
        { id: 'cheek-c-r', type: 'contour', label: 'Contorno horizontal der.', d: 'M 176 134 Q 156 138 140 140 L 142 148 Q 160 146 176 142 Z' },
        { id: 'blush-l', type: 'blush', label: 'Rubor horizontal izq.', d: 'M 66 120 Q 86 120 102 126 Q 88 134 66 130 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor horizontal der.', d: 'M 174 120 Q 154 120 138 126 Q 152 134 174 130 Z' },
        { id: 'hl-cheek-l', type: 'highlight', label: 'Luz lateral pómulo izq.', d: 'M 68 108 Q 88 108 100 116 Q 84 118 68 114 Z' },
        { id: 'hl-cheek-r', type: 'highlight', label: 'Luz lateral pómulo der.', d: 'M 172 108 Q 152 108 140 116 Q 156 118 172 114 Z' },
        { id: 'hl-nose', type: 'highlight', label: 'Centro puente nasal', d: 'M 120 98 L 123 132 L 117 132 Z' }
      ]
    }
  },

  diamante: {
    key: 'diamante',
    label: 'Rostro Diamante',
    proportionsSummary: 'Pómulos altos y prominentes como punto más ancho del rostro, con frente y mandíbula más estrechas.',
    opticalGoal: 'Aportar amplitud visual en la frente y la línea mandibular mientras se suaviza la proyección lateral del pómulo.',
    faceOutlinePath: 'M 120 26 L 160 58 L 194 118 L 158 186 L 120 222 L 82 186 L 46 118 L 80 58 Z',
    eyewearRecommended: [
      {
        id: 'cat-eye',
        name: 'Cat-Eye / Mariposa Suave',
        fitScore: 99,
        why: 'Ensancha visualmente el tercio superior (frente y sienes) equilibrando el pómulo prominente.',
        bridgeAndRimTip: 'Aro superior marcado y base curva suave.'
      },
      {
        id: 'clubmaster',
        name: 'Clubmaster (Ceja Destacada)',
        fitScore: 97,
        why: 'Atrae la mirada hacia la línea superciliar dando amplitud a la frente.',
        bridgeAndRimTip: 'Parte superior en acetato o metal contrastado y parte inferior fina.'
      },
      {
        id: 'pantos-round',
        name: 'Ovalada / Pantos',
        fitScore: 94,
        why: 'Suaviza la geometría angular de los pómulos altos.',
        bridgeAndRimTip: 'Que no supere el ancho de los pómulos.'
      }
    ],
    eyewearAvoid: [
      'Monturas estrechas y puntiagudas a la altura del pómulo.',
      'Gafas demasiado anchas que sobresalgan de los huesos cigomáticos.'
    ],
    contouringGuide: {
      summary: 'Esculpido de suavizado cigomático: sombrea solo el extremo lateral del pómulo e ilumina frente y mandíbula.',
      contourWhere: 'Extremo lateral más saliente del pómulo y hueco inmediatamente inferior (nunca sombrear sienes ni mandíbula).',
      highlightWhere: 'Frente amplia hacia las sienes, laterales de la mandíbula, mentón y puente nasal.',
      blushWhere: 'Redondeado hacia el centro del pómulo sin extenderlo hacia la sien extrema.',
      stepByStep: [
        'Deja completamente limpias de contorno oscuro las sienes y la mandíbula para no estrecharlas.',
        'Aplica el contorno únicamente en el relieve lateral del pómulo difuminando hacia el centro.',
        'Ilumina de forma generosa la frente (hacia las sienes) y los laterales del maxilar inferior.',
        'Coloca el rubor en las manzanas centradas del pómulo.'
      ],
      zones: [
        { id: 'cheek-outer-l', type: 'contour', label: 'Lateral pómulo izq.', d: 'M 48 112 L 66 116 L 88 144 L 64 148 Z' },
        { id: 'cheek-outer-r', type: 'contour', label: 'Lateral pómulo der.', d: 'M 192 112 L 174 116 L 152 144 L 176 148 Z' },
        { id: 'blush-l', type: 'blush', label: 'Rubor centrado izq.', d: 'M 72 118 Q 90 120 100 134 Q 84 140 70 130 Z' },
        { id: 'blush-r', type: 'blush', label: 'Rubor centrado der.', d: 'M 168 118 Q 150 120 140 134 Q 156 140 170 130 Z' },
        { id: 'hl-forehead-wide', type: 'highlight', label: 'Luz amplia en frente', d: 'M 88 52 Q 120 42 152 52 Q 144 68 120 68 Q 96 68 88 52 Z' },
        { id: 'hl-jaw-l', type: 'highlight', label: 'Luz amplitud mandibular izq.', d: 'M 78 172 Q 92 186 104 196 L 96 202 Q 82 192 72 178 Z' },
        { id: 'hl-jaw-r', type: 'highlight', label: 'Luz amplitud mandibular der.', d: 'M 162 172 Q 148 186 136 196 L 144 202 Q 158 192 168 178 Z' },
        { id: 'hl-chin', type: 'highlight', label: 'Luz mentón', d: 'M 120 194 C 132 194, 132 208, 120 208 C 108 208, 108 194, 120 194 Z' }
      ]
    }
  }
};

/**
 * Servicio POO que determina la guía de visagismo (gafas ideales, contouring anatómico)
 * y el diagnóstico de metales (Dorado vs Plata), temperatura (Cálida vs Fría) y Contraste.
 */
export class VisagismAndStylingGuideService {
  /**
   * Devuelve todas las 6 formas de rostro catalogadas.
   */
  public getAllFaceShapes(): FaceShapeVisagismSpec[] {
    return Object.values(FACE_SHAPES_CATALOG);
  }

  /**
   * Normaliza y resuelve la forma de cara detectada en el análisis o seleccionada por el usuario.
   */
  public resolveFaceShape(rawFaceShape?: string | null): FaceShapeVisagismSpec {
    if (!rawFaceShape) {
      return FACE_SHAPES_CATALOG.oval;
    }
    const clean = rawFaceShape
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (clean.includes('redond')) return FACE_SHAPES_CATALOG.redonda;
    if (clean.includes('cuadrad')) return FACE_SHAPES_CATALOG.cuadrada;
    if (clean.includes('corazon') || clean.includes('triangul')) return FACE_SHAPES_CATALOG.corazon;
    if (clean.includes('alargad') || clean.includes('rectangul')) return FACE_SHAPES_CATALOG.alargada;
    if (clean.includes('diamant') || clean.includes('rombo')) return FACE_SHAPES_CATALOG.diamante;
    return FACE_SHAPES_CATALOG.oval;
  }

  /**
   * Evalúa si la persona es Cálida o Fría, si su contraste es Alto, Medio o Bajo,
   * y si le favorece mejor el Dorado o la Plata.
   */
  public buildThermalMetalAndContrastDiagnosis(
    analysis: Analysis | null
  ): ThermalMetalAndContrastDiagnosis {
    const seasonSpec = defaultColorimetryAtlas.findSeason(analysis?.colorimetry?.season);
    const rawTemp = (analysis?.colorimetry?.temperature || seasonSpec.temperature || 'cálida')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const rawContrast = (analysis?.colorimetry?.contrast || seasonSpec.contrast || 'medio')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // 1. Temperatura (Cálida vs Fría) y Metales (Dorado vs Plata)
    let temperatureCategory: ThermalMetalAndContrastDiagnosis['temperatureCategory'] = 'Cálida';
    let temperatureScoreWarm = 84;
    let metalWinner: ThermalMetalAndContrastDiagnosis['metalWinner'] =
      'Dorado (Oro Amarillo y Bronce)';
    let goldAffinity = 96;
    let silverAffinity = 42;
    let roseGoldAffinity = 88;
    let temperatureExplanation =
      'Tu piel refleja la luz con un subtono dorado/melocotón. Los colores con base amarilla, tierra, coral y oliva iluminan tu rostro de inmediato.';
    let metalExplanation =
      'El Dorado (oro amarillo, oro viejo, champán y bronce) armoniza con la calidez natural de tu dermis sin agrisarla. La plata fría pura puede verse desconectada cerca del rostro.';
    let eyewearMetalTip =
      'Prioriza monturas en oro cepillado, bronce, carey ámbar o acetato miel/terracota.';

    if (rawTemp.includes('fria-neutra') || (rawTemp.includes('fri') && seasonSpec.temperature.includes('neutra'))) {
      temperatureCategory = 'Neutra-Fría';
      temperatureScoreWarm = 32;
      metalWinner = 'Plata (Platino y Oro Blanco)';
      goldAffinity = 58;
      silverAffinity = 94;
      roseGoldAffinity = 86;
      temperatureExplanation =
        'Tu subtono dominante es frío-rosado con un matiz neutro equilibrado. Te favorecen los azules, malvas, frutos del bosque y verdes marinos.';
      metalExplanation =
        'La Plata satinada, el Oro Blanco y el Peltre realzan la limpieza de tu piel. También admites Oro Rosa frío o champán muy pálido.';
      eyewearMetalTip =
        'Monturas en plata satinada, titanio, gris humo translúcido o carey frío ceniza.';
    } else if (rawTemp.includes('fri')) {
      temperatureCategory = 'Fría';
      temperatureScoreWarm = 16;
      metalWinner = 'Plata (Platino y Oro Blanco)';
      goldAffinity = 34;
      silverAffinity = 98;
      roseGoldAffinity = 76;
      temperatureExplanation =
        'Tu piel posee un subtono frío (azulado/rosado puro). Los pigmentos fríos (cobalto, frambuesa, esmeralda, hielo y ciruela) neutralizan rojeces y definen tus facciones.';
      metalExplanation =
        'La Plata de ley, el Platino y el Oro Blanco son tus metales ganadores absolutos: multiplican la luminosidad de tu mirada, mientras que el oro amarillo intenso amarillea la tez.';
      eyewearMetalTip =
        'Elige monturas en plata pulida, acero, negro grafito, azul marino o cristal transparente.';
    } else if (rawTemp.includes('calida-neutra') || rawTemp.includes('neutr')) {
      temperatureCategory = 'Neutra-Cálida';
      temperatureScoreWarm = 68;
      metalWinner = 'Dual (Oro Champán y Plata Satinada)';
      goldAffinity = 92;
      silverAffinity = 72;
      roseGoldAffinity = 95;
      temperatureExplanation =
        'Tu piel combina una base cálida suave con equilibrio neutro. Te sientan de maravilla los tonos crema, salvia, terracota suave, melocotón y turquesas.';
      metalExplanation =
        'Te favorece en primer lugar el Dorado suave (oro champán, oro rosa y oro cepillado), pero gracias a tu equilibrio neutro puedes combinarlo con plata envejecida o bicolor.';
      eyewearMetalTip =
        'Monturas en oro champán, oro rosa, carey avellana o acetatos translúcidos cálidos.';
    }

    // 2. Nivel de Contraste (Alto, Medio o Bajo)
    let contrastLevel: ThermalMetalAndContrastDiagnosis['contrastLevel'] = 'Contraste Medio';
    let contrastScore = 55;
    let contrastExplanation =
      'Existe una diferencia equilibrada de luminosidad entre tu piel, tus cejas/cabello y el iris. Los conjuntos de contraste moderado acompañan tu rostro sin eclipsarlo.';
    let contrastStylingRule =
      'Combina tonos medios con un neutro claro o profundo (ej. blusa crema + blazer terracota o salvia). Evita tanto el monocromo plano lavado como los cortes extremos blanco/negro.';

    if (rawContrast.includes('extremo') || rawContrast.includes('alto')) {
      contrastLevel = 'Contraste Alto';
      contrastScore = 88;
      contrastExplanation =
        'Hay un salto lumínico marcado entre la claridad de tu piel y la intensidad oscura de tu mirada y cabello.';
      contrastStylingRule =
        'Tu rostro brilla con combinaciones de alto impacto: prenda clara luminosa junto a prenda profunda (ej. marfil/blanco + ébano/marino/carmesí) y labiales definidos.';
    } else if (rawContrast.includes('bajo')) {
      contrastLevel = 'Contraste Bajo';
      contrastScore = 28;
      contrastExplanation =
        'Tu piel, cabello y ojos comparten un rango de luminosidad cercano y armónico, creando una estética etérea y suave.';
      contrastStylingRule =
        'Prioriza estilismos monocromáticos o en degradado tonal (*ton sur ton*) con transiciones suaves. Evita bloques bruscos de color oscuro contra blanco puro.';
    }

    return {
      temperatureCategory,
      temperatureScoreWarm,
      temperatureExplanation,
      contrastLevel,
      contrastScore,
      contrastExplanation,
      contrastStylingRule,
      metalWinner,
      goldAffinity,
      silverAffinity,
      roseGoldAffinity,
      metalExplanation,
      eyewearMetalTip
    };
  }
}

export const defaultVisagismGuide = new VisagismAndStylingGuideService();
