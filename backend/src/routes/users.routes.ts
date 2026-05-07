import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";

import {
  changeOwnPasswordController,
  activateUserController,
  createUserController,
  deactivateUserController,
  getUserController,
  listUsersController,
  unlockUserController,
  updateOwnProfileController,
  updateUserController
} from "../controllers/users.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requirePermission.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  changeOwnPasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateOwnProfileSchema,
  updateUserSchema,
  userIdParamsSchema
} from "../validators/users.schemas.js";

type AsyncHandler = (request: Request<any, any, any, any>, response: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createUsersRouter() {
  const router = Router();

  router.patch("/me", authenticate, validateRequest({ body: updateOwnProfileSchema }), asyncRoute(updateOwnProfileController));
  router.post(
    "/me/change-password",
    authenticate,
    validateRequest({ body: changeOwnPasswordSchema }),
    asyncRoute(changeOwnPasswordController)
  );

  router.use(authenticate, requireSystemAdmin);
  router.get("/", validateRequest({ query: listUsersQuerySchema }), asyncRoute(listUsersController));
  router.post("/", validateRequest({ body: createUserSchema }), asyncRoute(createUserController));
  router.post(
    "/:userId/activate",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(activateUserController)
  );
  router.post(
    "/:userId/deactivate",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(deactivateUserController)
  );
  router.post(
    "/:userId/unlock",
    validateRequest({ params: userIdParamsSchema }),
    asyncRoute(unlockUserController)
  );
  router.get("/:userId", validateRequest({ params: userIdParamsSchema }), asyncRoute(getUserController));
  router.patch(
    "/:userId",
    validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
    asyncRoute(updateUserController)
  );

  return router;
}
