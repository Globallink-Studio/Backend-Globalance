import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Globalance",
      version: "1.0.0",
      description:
        "Documentación de la API del backend de la billetera virtual Globalance.",
    },

    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Servidor local",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Firebase ID Token",
          description:
            "Ingresar el token de Firebase sin escribir la palabra Bearer.",
        },
      },

      schemas: {
  ErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            example: "UNAUTHORIZED",
          },
          message: {
            type: "string",
            example: "Usuario no autenticado",
          },
        },
      },
    },
  },

  FirebaseUser: {
    type: "object",
    required: ["uid"],
    properties: {
      uid: {
        type: "string",
        description: "Identificador único generado por Firebase",
        example: "firebase-user-123",
      },
      email: {
        type: "string",
        format: "email",
        nullable: true,
        example: "usuario@correo.com",
      },
      name: {
        type: "string",
        nullable: true,
        example: "Jazmín Morínigo",
      },
      picture: {
        type: "string",
        format: "uri",
        nullable: true,
      },
    },
  },

  User: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      firebase_uid: {
        type: "string",
      },
      email: {
        type: "string",
        format: "email",
      },
      user_type: {
        type: "string",
        enum: ["person", "company"],
        nullable: true,
      },
      display_currency: {
        type: "string",
        example: "ARS",
      },
      status: {
        type: "string",
        enum: ["active", "inactive", "blocked"],
      },
      created_at: {
        type: "string",
        format: "date-time",
      },
      last_access_at: {
        type: "string",
        format: "date-time",
        nullable: true,
      },
    },
  },

  Wallet: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      user_id: {
        type: "string",
        format: "uuid",
      },
      alias: {
        type: "string",
        example: "jazmin.globalance",
      },
      account_number: {
        type: "string",
        example: "0000000000000000000001",
      },
      status: {
        type: "string",
        enum: ["active", "inactive", "blocked"],
      },
      created_at: {
        type: "string",
        format: "date-time",
      },
    },
  },

  UserProfile: {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
    firebase_uid: {
      type: "string",
    },
    email: {
      type: "string",
      format: "email",
    },
    user_type: {
      type: "string",
      enum: ["person", "company"],
      nullable: true,
    },
    status: {
      type: "string",
      enum: ["active", "inactive", "blocked"],
    },
    first_name: {
      type: "string",
      nullable: true,
    },
    last_name: {
      type: "string",
      nullable: true,
    },
    legal_name: {
      type: "string",
      nullable: true,
    },
  },
},

PersonProfileInput: {
  type: "object",
  required: [
    "userType",
    "firstName",
    "lastName",
    "document",
    "phone",
    "alias",
  ],
  properties: {
    userType: {
      type: "string",
      enum: ["person"],
    },
    firstName: {
      type: "string",
      example: "Jazmín",
    },
    lastName: {
      type: "string",
      example: "Morínigo",
    },
    document: {
      type: "string",
      example: "12345678",
    },
    phone: {
      type: "string",
      example: "+5491123456789",
    },
    alias: {
      type: "string",
      example: "jazmin.globalance",
    },
  },
},

CompanyProfileInput: {
  type: "object",
  required: [
    "userType",
    "legalName",
    "document",
    "phone",
    "alias",
  ],
  properties: {
    userType: {
      type: "string",
      enum: ["company"],
    },
    legalName: {
      type: "string",
      example: "Globalance S.A.",
    },
    document: {
      type: "string",
      example: "30123456789",
    },
    phone: {
      type: "string",
      example: "+5491123456789",
    },
    alias: {
      type: "string",
      example: "globalance.empresa",
    },
  },
},

Balance: {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
    wallet_id: {
      type: "string",
      format: "uuid",
    },
    currency_code: {
      type: "string",
      enum: ["ARS", "USD", "EUR"],
    },
    amount: {
      type: "string",
      example: "1500.00",
      description: "El monto se devuelve como texto para conservar la precisión decimal.",
    },
    updated_at: {
      type: "string",
      format: "date-time",
    },
  },
},

WalletSummary: {
  type: "object",
  properties: {
    user: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        email: {
          type: "string",
          format: "email",
        },
        user_type: {
          type: "string",
          enum: ["person", "company"],
          nullable: true,
        },
        first_name: {
          type: "string",
          nullable: true,
        },
        last_name: {
          type: "string",
          nullable: true,
        },
        legal_name: {
          type: "string",
          nullable: true,
        },
      },
    },
    wallet: {
      $ref: "#/components/schemas/Wallet",
    },
    balances: {
      type: "array",
      items: {
        $ref: "#/components/schemas/Balance",
      },
    },
  },
},
},
    },
  },

  apis: ["./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);