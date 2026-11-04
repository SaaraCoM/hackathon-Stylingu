/**
 * Configuración centralizada y política orientada a objetos para la versión
 * de archivo requerida ([VERSION_ARCHIVO]) en importación, exportación y subida.
 */

export const REQUIRED_FILE_VERSION = 'v2.0' as const;
export const REQUIRED_SCHEMA_VERSION = 2 as const;

export interface FileVersionValidationResult {
  valid: boolean;
  version: string;
  reason?: string;
}

export interface FileSpecMetadata {
  version: string;
  schemaVersion: number;
  shortBadge: string;
  fullLabel: string;
  formatsLabel: string;
  maxSizeMb: number;
  maxMegapixels: number;
  acceptedMimeTypes: readonly string[];
}

export class FileSpecificationPolicy {
  private readonly version: string;
  private readonly schemaVersion: number;
  private readonly maxBytes: number;
  private readonly maxPixels: number;
  private readonly acceptedMimeTypes: readonly string[];

  constructor(
    version: string = REQUIRED_FILE_VERSION,
    schemaVersion: number = REQUIRED_SCHEMA_VERSION,
    maxBytes: number = 8 * 1024 * 1024,
    maxPixels: number = 20_000_000,
    acceptedMimeTypes: readonly string[] = ['image/png', 'image/jpeg', 'image/webp']
  ) {
    this.version = version;
    this.schemaVersion = schemaVersion;
    this.maxBytes = maxBytes;
    this.maxPixels = maxPixels;
    this.acceptedMimeTypes = acceptedMimeTypes;
  }

  public getVersion(): string {
    return this.version;
  }

  public getSchemaVersion(): number {
    return this.schemaVersion;
  }

  public getMetadata(): FileSpecMetadata {
    const maxSizeMb = Math.round(this.maxBytes / (1024 * 1024));
    const maxMegapixels = Math.round(this.maxPixels / 1_000_000);
    return {
      version: this.version,
      schemaVersion: this.schemaVersion,
      shortBadge: `Archivo ${this.version}`,
      fullLabel: `Formato Dossier/Foto ${this.version} · PNG/JPEG/WebP ≤ ${maxSizeMb} MB`,
      formatsLabel: `PNG, JPEG o WebP · máx. ${maxSizeMb} MB · ${maxMegapixels} MP`,
      maxSizeMb,
      maxMegapixels,
      acceptedMimeTypes: this.acceptedMimeTypes
    };
  }

  public validateImageFile(file: { type?: string; size?: number } | null | undefined): FileVersionValidationResult {
    if (!file) {
      return { valid: false, version: this.version, reason: 'Selecciona un archivo de imagen.' };
    }
    if (!file.type || !this.acceptedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        version: this.version,
        reason: `Formato no compatible con la especificación ${this.version}. Usa PNG, JPEG o WebP.`
      };
    }
    if (typeof file.size !== 'number' || file.size <= 0 || file.size > this.maxBytes) {
      return {
        valid: false,
        version: this.version,
        reason: `El archivo supera el límite de ${Math.round(this.maxBytes / (1024 * 1024))} MB de la versión ${this.version}.`
      };
    }
    return { valid: true, version: this.version };
  }

  public validateDossierPayload(payload: unknown): FileVersionValidationResult {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {
        valid: false,
        version: this.version,
        reason: `El archivo no contiene un objeto de dossier válido (${this.version}).`
      };
    }
    const record = payload as Record<string, unknown>;
    const fileVer = typeof record.fileVersion === 'string' ? record.fileVersion : undefined;
    const schemaVer = typeof record.schemaVersion === 'number' ? record.schemaVersion : undefined;

    if (fileVer && fileVer !== this.version) {
      return {
        valid: false,
        version: this.version,
        reason: `Versión de archivo incompatible (${fileVer}). Se requiere ${this.version}.`
      };
    }
    if (schemaVer !== undefined && schemaVer !== this.schemaVersion) {
      return {
        valid: false,
        version: this.version,
        reason: `Esquema de archivo v${schemaVer} no soportado. Se requiere esquema v${this.schemaVersion} (${this.version}).`
      };
    }
    if (!record.colorimetry || typeof record.colorimetry !== 'object') {
      return {
        valid: false,
        version: this.version,
        reason: `El dossier no incluye la sección colorimetry requerida en ${this.version}.`
      };
    }
    return { valid: true, version: this.version };
  }

  public stampDossierExport<T extends Record<string, unknown>>(analysis: T, accountId: string): T & {
    fileVersion: string;
    schemaVersion: number;
    exportedAt: string;
    accountId: string;
  } {
    return {
      ...analysis,
      fileVersion: this.version,
      schemaVersion: this.schemaVersion,
      accountId,
      exportedAt: new Date().toISOString()
    };
  }
}

export const defaultFileSpecPolicy = new FileSpecificationPolicy();

