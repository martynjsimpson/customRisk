import { Router } from "express";

import { sendData } from "../utils/apiResponse.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_request, response) => {
    sendData(response, { status: "ok" });
  });

  return router;
}
