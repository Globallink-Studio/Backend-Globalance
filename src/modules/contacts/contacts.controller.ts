import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type { CreateContactInput } from "./contacts.schema";
import { contactIdSchema } from "./contacts.schema";
import { ContactsService } from "./contacts.service";

export class ContactsController {
  constructor(
    private readonly contactsService = new ContactsService(),
  ) {}

  createContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Usuario no autenticado",
          },
        });
        return;
      }

      const contact =
        await this.contactsService.createContact(
          firebaseUid,
          req.body as CreateContactInput,
        );

      res.status(201).json({ contact });
    } catch (error) {
      next(error);
    }
  };

  listContacts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Usuario no autenticado",
          },
        });
        return;
      }

      const contacts =
        await this.contactsService.listContacts(firebaseUid);

      res.status(200).json({ contacts });
    } catch (error) {
      next(error);
    }
  };

  deleteContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Usuario no autenticado",
          },
        });
        return;
      }

      const idResult = contactIdSchema.safeParse(req.params.id);

      if (!idResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_CONTACT_ID",
            message: "El identificador del contacto no es válido",
          },
        });
        return;
      }

      await this.contactsService.deleteContact(
        firebaseUid,
        idResult.data,
      );

      res.status(200).json({
        message: "Contacto eliminado correctamente",
      });
    } catch (error) {
      next(error);
    }
  };
}
