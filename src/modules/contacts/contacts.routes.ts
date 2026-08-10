import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { ContactsController } from "./contacts.controller";
import { createContactSchema } from "./contacts.schema";

const contactsRouter = Router();
const contactsController = new ContactsController();

contactsRouter.post(
  "/",
  verifyFirebaseToken,
  validateBody(createContactSchema),
  contactsController.createContact,
);

contactsRouter.get(
  "/",
  verifyFirebaseToken,
  contactsController.listContacts,
);

contactsRouter.delete(
  "/:id",
  verifyFirebaseToken,
  contactsController.deleteContact,
);

export { contactsRouter };
