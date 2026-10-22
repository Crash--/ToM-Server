import { beforeAll, describe, expect, it } from "bun:test";

import express from "express";
import request from "supertest";
import { createLogger } from "winston";

import { loadMessages } from "../i18n/index";
import { DomainError } from "./domain-error";
import { UNAUTHORIZED } from "./error-codes";
import { errorMiddleware } from "./error-middleware";

const FRENCH = "Authentification requise";
const ENGLISH = "Authentication required";

const setupApp = (locale: string): express.Express => {
  const app = express();
  app.get("/fail", () => {
    throw new DomainError(UNAUTHORIZED, "M_UNAUTHORIZED");
  });
  app.use(
    errorMiddleware({
      locale,
    }),
  );

  return app;
};

describe("errorMiddleware locale", () => {
  beforeAll(() => {
    loadMessages(
      "assets/i18n",
      createLogger({
        silent: true,
      }),
    );
  });

  it("should use the first Accept-Language entry", async () => {
    const response = await request(setupApp("en")).get("/fail").set("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(FRENCH);
  });

  it("should drop the quality value of the first entry", async () => {
    const response = await request(setupApp("en")).get("/fail").set("Accept-Language", "fr;q=0.9, en;q=0.8");

    expect(response.body.error).toBe(FRENCH);
  });

  it("should use the configured locale without Accept-Language", async () => {
    const response = await request(setupApp("fr")).get("/fail");

    expect(response.body.error).toBe(FRENCH);
  });

  it("should use the configured locale for an empty Accept-Language", async () => {
    const response = await request(setupApp("fr")).get("/fail").set("Accept-Language", "");

    expect(response.body.error).toBe(FRENCH);
  });

  it("should fall back to English for a language without a catalog", async () => {
    const response = await request(setupApp("fr")).get("/fail").set("Accept-Language", "ja");

    expect(response.body.error).toBe(ENGLISH);
  });
});
