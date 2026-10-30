# CONTEXTO

Diseño de arquitectura conceptual, flujo operativo y prompt del sistema de Inteligencia Artificial para aplicación móvil de belleza y estilismo personal. Integración multimodal (visión + texto) con la suite agéntica de Meta: Muse Code, Muse Spark, Muse Image y SAM 3.1.

---

### 1. SYSTEM PROMPT DE PRODUCCIÓN (PARA INCORPORAR EN LA APP)

Este prompt debe configurarse como el **System Prompt** del modelo central (Llama 3.2 Vision / Muse Spark) en el backend de la aplicación:

```sysprompt
SYSTEM PROMPT: Beauty & Personal Styling AI Core Agent

[ROLE & PURPOSE]
You are the Lead Stylist and Beauty Intelligence Engine for a mobile application. Your core job is to analyze multimodal user input (facial photos, garment photos, and text questionnaire) to deliver personalized recommendations across 4 modules: Chromatic Analysis, Virtual Wardrobe, Personalized Makeup, and Skincare Routines.

[INPUT SPECIFICATION]
You will receive:
1. `face_image`: High-res image of the user's face.
2. `garment_images`: Optional array of user clothing photos.
3. `user_meta`: JSON containing skin_type_self_reported, allergies, and style_preferences.

[CRITICAL SAFETY & MEDICAL BOUNDARIES - MANDATORY]
1. YOU ARE NOT A DERMATOLOGIST OR MEDICAL PROFESSIONAL. Do NOT diagnose medical skin conditions (e.g., acne, rosacea, eczema, melasma, hyperpigmentation).
2. USE COSMETIC DESCRIPTORS ONLY: Instead of "acne", use "areas of texture/blemishes". Instead of "rosacea", use "surface redness/flush". Instead of "hyperpigmentation", use "uneven tone".
3. STRICT ALLERGY FILTERING: If the user lists allergies or sensitivities (e.g., Retinoids, Fragrances, Salicylates), you MUST systematically exclude those ingredients and all their derivatives from the recommendations.
4. Always include the standard cosmetic disclaimer in the output.

[ANALYSIS & REASONING PROTOCOL]
1. Colorimetry Evaluation:
   - Determine skin undertone (Warm, Cool, Neutral) using skin, iris, and hair contrast.
   - Assign seasonal palette (e.g., Dark Autumn, Bright Spring, Soft Summer, Light Spring).
   - Evaluate contrast ratio (High, Medium, Low) and clarity (Bright, Soft, Dark).

2. Morphological Parsing:
   - Identify facial shape (Oval, Round, Square, Heart, Diamond).
   - Evaluate eyelid crease type (e.g., Hooded, Monolid, Deep-set, Almond) for targeted eyeliner recommendations.

3. Wardrobe & Outfit Curation:
   - Cross-reference user's chromatic palette with catalog items/garments to generate 3 complete outfit combinations.

4. Agentic Downstream Directives:
   - Formulate exact execution instructions for SAM 3.1 (segmentation masks for face parsing and garment isolation).
   - Formulate exact prompts for Muse Image (inpainting and image generation).

[OUTPUT FORMAT]
You MUST respond EXCLUSIVELY with a valid JSON object adhering strictly to the schema provided below. Do NOT add markdown wrappers outside the JSON code block, introductory text, or conversational fluff.

REQUIRED JSON SCHEMA:
{
  "user_profile": {
    "chromatic_season": "string",
    "undertone": "string",
    "contrast": "string",
    "skin_type": "string",
    "allergies": ["string"]
  },
  "agentic_instructions": {
    "sam31_masks": {
      "face_parsing": ["string"],
      "garment_segmentation": ["string"]
    },
    "muse_image_prompts": {
      "makeup_inpainting": "string",
      "outfit_generation": "string"
    }
  },
  "recommendations": {
    "color_palette": {
      "recommended_hex": ["string"],
      "avoid_colors": ["string"]
    },
    "outfits": [
      {
        "outfit_id": "string",
        "description": "string",
        "generated_image_prompt": "string"
      }
    ],
    "makeup_guide": {
      "eyeliner_style": "string",
      "blush_technique": "string",
      "lip_tones": ["string"],
      "application_steps": ["string"]
    },
    "skincare_routine": {
      "disclaimer": "This skincare routine is for cosmetic and educational purposes only. Consult a certified dermatologist for clinical conditions.",
      "am": ["string"],
      "pm": ["string"]
    }
  }
}
```

---

### 2. DIAGNÓSTICO DE ENTRADA (EJEMPLO EVALUADO)

* **Resumen de Colorimetría:**
  * **Estación Cromática:** Otoño Profundo (*Dark Autumn*). Subtono cálido/neutro con alta saturación.
  * **Contraste:** Alto (diferencia marcada entre piel, iris y cabello).
  * **Claridad:** Media-Baja (predominio de pigmentos oscuros y ricos).

* **Evaluación Facial y Tópica (Visión + Datos de Usuario):**
  * **Morfología Facial:** Rostro ovalado con pómulos definidos. Párpado ligeramente encapotado.
  * **Estado Cutáneo Visual:** Zonas de oleosidad en la zona T (frente y nariz), textura levemente irregular en mejillas y descamación puntual en comisuras. Sin signos de inflamación aguda.

* **Detección de Restricciones y Filtros:**
  * **Tipo de Piel:** Mixta con tendencia a la deshidratación.
  * **Alergias / Sensibilidades:** Retinol / Retinoides sintéticos, Fragancias sintéticas (*Linalool*, *Limonene*).
  * **Preferencias del Usuario:** Acabado *dewy* / jugoso, estilismo ejecutivo casual (*smart casual*), paletas de maquillaje en tonos tierra/terracota.

---

### 3. PROTOCOLO DE ORQUESTACIÓN AGÉNTICA

```
[Usuario: Fotos + Respuestas] 
       │
       ▼
[Muse Code: Orquestador Core]
       │
       ├───► [SAM 3.1: Segmentación Multicapa] ───► Mask Tensors (Ropa / Zonas Rostro)
       │
       ├───► [Llama 3.2 Vision + Muse Spark] ──────► Razonamiento / Extracción de Atributos
       │
       └───► [Muse Image: Inpainting / Diffusion] ─► Outfits Virtuales + Bocetos Makeup
```

#### Instrucción para SAM 3.1 (Segmentación de Máscara de Precisión)
* **Máscara Facial (Face Parsing):** Segmentar en capas vectoriales independientes: `[skin_base, eyes_canvas, upper_eyelid, cheeks, lips]`.
* **Máscara de Prenda (Garment Segmentation):** Aislar torso superior `[torso_upper]` y torso inferior `[torso_lower]`. Extraer canales alpha de fondo para proyección en vestidor virtual.

#### Instrucción para Muse Image (Generación y Renderizado)
* **Outfits Virtuales:**
  * *Prompt Base:* `Photorealistic full-body shot of a garment composite, tailored smart casual outfit featuring dark olive blazer and camel trousers, high resolution, Studio lighting --mask garment_layer --seed 40291`
* **Bocetos de Maquillaje (Inpainting Facial):**
  * *Prompt Base:* `Hyper-realistic close-up portrait of the user face, wearing terracotta satin lipstick, winged cat-eye eyeliner aligned with outer crease, warm bronze blush on high cheekbones, natural skin texture preserved --mask [lips, upper_eyelid, cheeks]`

---

### 4. GUÍA DE RECOMENDACIONES PERSONALIZADAS

#### Colorimetría
* **Paleta Ideal:** Verde oliva (`#556B2F`), terracota (`#E2725B`), mostaza profundo (`#E1AD01`), borgoña (`#800020`), marrón chocolate (`#D2691E`).
* **Colores a Evitar:** Tonos pastel lavanda, rosa chicle, amarillo neón y blanco puro óptico.

#### Armario y Outfits
1. **Look Exec-Casual Warm:** Blazer estructurado verde oliva + Camiseta seda color marfil + Pantalón recto terracota.
2. **Look Weekend Chic:** Jersey de punto grueso color camel + Jeans índigo oscuro de tiro alto + Mocasines marrón chocolate.
3. **Look Night Glam:** Vestido satinado borgoña + Trench coat beige cálido + Accesorios dorados mate.

#### Maquillaje (Paso a Paso)
1. **Eyeliner:** Trazar una línea fina con tono café oscuro o negro suave a lo largo de las pestañas superiores, elevando la esquina exterior 30° para compensar el párpado encapotado.
2. **Sombras:** Aplicar sombra base vainilla en todo el párpado móvil. Definir la cuenca con un tono cobre/terracota difuminando hacia arriba y hacia afuera.
3. **Colorete:** Aplicar tono bronce/albaricoque cálido justo sobre el hueso del pómulo, difuminando en dirección ascendente hacia la sien para un efecto *lifting*.
4. **Labial:** Perfilar con lápiz marrón cálido y rellenar con un labial hidratante tono borgoña suave o ladrillo.

#### Rutina Skincare (Perfil: Piel Mixta / Sensibilidad a Fragancias y Retinol)

> **Nota:** Esta rutina es una propuesta cosmética de cuidado diario. Si presenta condiciones severas como acné quístico o rosácea, consulte a un dermatólogo.

* **Rutina AM (Protección e Hidratación Equilibrio):**
  1. *Limpieza:* Gel limpiador suave a base de aminoácidos, libre de sulfatos y sin perfume.
  2. *Hidratación / Antioxidante:* Serum de Niacinamida al 5% con Ácido Hialurónico (aporta control de sebo sin irritar).
  3. *Sellado:* Crema fluida no comedogénica con Ceramidas.
  4. *Protección:* Fotoprotector solar SPF 50+ fluido de acabado toque seco (sin fragancias).
* **Rutina PM (Restauración y Textura):**
  1. *Doble Limpieza:* Aceite limpiador emulsionable (para retirar maquillaje/solar) seguido de gel limpiador suave AM.
  2. *Tratamiento Alternativo a Retinoides:* Serum con **Bakuchiol al 1%** o Péptidos (alternativa vegetal segura para renovar textura sin irritación).
  3. *Reparación:* Crema hidratante intensiva rica en Escualano y Pantenol.

---

### 5. JSON OUTPUT (Ejemplo de respuesta consumible por la App)

```json
{
  "user_profile": {
    "chromatic_season": "Dark Autumn",
    "undertone": "Warm-Neutral",
    "contrast": "High",
    "skin_type": "Combination / Dehydrated",
    "allergies": [
      "Retinoids",
      "Synthetic Fragrances"
    ]
  },
  "agentic_instructions": {
    "sam31_masks": {
      "face_parsing": ["skin_base", "eyes_canvas", "upper_eyelid", "cheeks", "lips"],
      "garment_segmentation": ["torso_upper", "torso_lower"]
    },
    "muse_image_prompts": {
      "makeup_inpainting": "Hyper-realistic close-up portrait of user face, wearing terracotta satin lipstick, winged cat-eye eyeliner, warm bronze blush, natural skin texture preserved --mask [lips, upper_eyelid, cheeks]",
      "outfit_generation": "Photorealistic full-body shot of dark olive blazer, ivory silk top, and terracota trousers on mannequin, studio lighting"
    }
  },
  "recommendations": {
    "color_palette": {
      "recommended_hex": [
        "#556B2F",
        "#E2725B",
        "#E1AD01",
        "#800020",
        "#D2691E"
      ],
      "avoid_colors": [
        "#E6E6FA",
        "#FF69B4",
        "#CCFF00",
        "#FFFFFF"
      ]
    },
    "outfits": [
      {
        "outfit_id": "outfit_001",
        "description": "Blazer verde oliva, camiseta seda marfil y pantalón terracota.",
        "generated_image_prompt": "Smart casual outfit featuring an olive green blazer, ivory silk top, and terracotta trousers"
      },
      {
        "outfit_id": "outfit_002",
        "description": "Jersey de punto camel con jeans índigo oscuro y mocasines marrón chocolate.",
        "generated_image_prompt": "Casual chic ensemble with camel knit sweater, dark indigo denim jeans, chocolate brown loafers"
      },
      {
        "outfit_id": "outfit_003",
        "description": "Vestido satinado borgoña con trench coat beige y accesorios dorados.",
        "generated_image_prompt": "Evening outfit composition featuring burgundy satin slip dress, warm beige trench coat, gold minimalist jewelry"
      }
    ],
    "makeup_guide": {
      "eyeliner_style": "Soft Winged Coffee Eye (30 degree lift for hooded eyelid)",
      "blush_technique": "Ascending Cheekbone Bronze",
      "lip_tones": [
        "Terracotta",
        "Deep Brick Red",
        "Warm Burgundy"
      ],
      "application_steps": [
        "Apply soft coffee eyeliner ascending at 30 degrees.",
        "Use vanilla base on eyelid and define crease with copper tone.",
        "Apply bronze blush along high cheekbone towards temples.",
        "Line lips with warm brown pencil and fill with hydrated burgundy lipstick."
      ]
    },
    "skincare_routine": {
      "disclaimer": "This skincare routine is for cosmetic and educational purposes only. Consult a certified dermatologist for clinical conditions.",
      "am": [
        "Sulfate-free Gentle Amino Acid Cleanser",
        "5% Niacinamide + Hyaluronic Acid Serum",
        "Lightweight Ceramides Moisturizer",
        "Fragrance-free SPF 50+ Sunscreen"
      ],
      "pm": [
        "Emulsifying Oil Cleanser",
        "Sulfate-free Gentle Amino Acid Cleanser",
        "1% Bakuchiol Renewal Serum",
        "Squalane + Panthenol Barrier Repair Cream"
      ]
    }
  }
}
```