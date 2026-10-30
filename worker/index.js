import { Container, getContainer } from "@cloudflare/containers";

const REQUIRED_SECRETS = [
  "DATABASE_URL",
  "META_AI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

function missingSecrets(env) {
  return REQUIRED_SECRETS.filter(name => !String(env[name] || "").trim());
}

function containerEnv(env) {
  return {
    NODE_ENV: "production",
    PORT: "8080",
    TRUST_PROXY: "1",
    PG_POOL_MAX: "5",
    DATABASE_URL: env.DATABASE_URL,
    AI_PROVIDER: env.AI_PROVIDER || "meta",
    META_AI_API_KEY: env.META_AI_API_KEY,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: env.SUPABASE_STORAGE_BUCKET || "stylingu-photos",
    ANALYSIS_DAILY_LIMIT: env.ANALYSIS_DAILY_LIMIT || "10",
    RELEASE_VERSION: env.RELEASE_VERSION || "cloudflare"
  };
}

export class StylinguContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "15m";
  enableInternet = true;
  pingEndpoint = "localhost/api/health";

  constructor(ctx, env) {
    super(ctx, env, { envVars: containerEnv(env) });
  }

  async fetch(request) {
    // El origen público se fija en el primer arranque. Si se define el secreto
    // PUBLIC_ORIGIN, se usa ese valor; si no, se deriva del Worker. Así la
    // primera preview funciona sin conocer la URL antes de desplegar.
    const origin = this.env.PUBLIC_ORIGIN || new URL(request.url).origin;
    if (!origin.startsWith("https://")) {
      return Response.json(
        { code: "HTTPS_REQUIRED", error: "PUBLIC_ORIGIN debe ser una URL HTTPS." },
        { status: 503 }
      );
    }
    await this.startAndWaitForPorts({
      startOptions: {
        envVars: { ...this.envVars, PUBLIC_ORIGIN: origin }
      }
    });
    return this.containerFetch(request);
  }

  onError(error) {
    console.error("Stylingu container failed", error);
    throw error;
  }
}

export default {
  async fetch(request, env) {
    const missing = missingSecrets(env);
    if (missing.length) {
      return Response.json(
        {
          code: "DEPLOY_CONFIG",
          error: "Faltan secretos de Cloudflare: " + missing.join(", ")
        },
        { status: 503 }
      );
    }
    return getContainer(env.STYLINGU_CONTAINER, "app").fetch(request);
  }
};
