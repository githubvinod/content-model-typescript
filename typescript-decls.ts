import {
  contextMgr as cm,
  model as m,
  artfPersist as ap,
  serializeJS as js,
} from "./deps.ts";

export function createTypeScriptInterfaceDecl(
  model: m.ContentModel,
  intrf: ap.PolyglotInterfaceDecl,
): ap.PolyglotInterfaceDecl {
  for (const property of Object.entries(model)) {
    const propName = property[0];
    const propDefn = property[1];
    const tsPropDecl = createTypeScriptPropertyDecl(
      propDefn,
      propName,
      m.camelCasePropertyName(propName),
    );
    if (tsPropDecl) {
      intrf.declareProperty(tsPropDecl);
    } else if (!(propDefn instanceof m.pd.UnknownProperty)) {
      console.error(
        `Unable to find TypeScript PropertyDecl for '${propName}'`,
      );
    }
  }
  return intrf;
}

export function createTypeScriptPropertyDecl(
  propDefn: m.PropertyDefn,
  srcPropName: string,
  identifierName: string,
): ap.PolyglotPropertyDecl | undefined {
  const description = propDefn.description;

  if (propDefn instanceof m.pd.UnknownProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        switch (propDefn.propertyType) {
          case m.pd.UnknownPropertyType.Scalar:
            return `readonly ${identifierName}?: unknown; // ${description}`;

          case m.pd.UnknownPropertyType.Array:
            return `readonly ${identifierName}?: unknown[]; // ${description}`;

          case m.pd.UnknownPropertyType.Object:
            return `readonly ${identifierName}?: object; // ${description}`;
        }
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        // we're always going to skip adding Unkown properties into content
        return undefined;
      },
    };
  }

  const required = typeof propDefn.valueRequired === "function"
    ? propDefn.valueRequired()
    : propDefn.valueRequired;

  if (propDefn instanceof m.pd.NumericProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: number; // ${description}`;
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return typeof value === "number"
          ? `${identifierName}: ${value}`
          : undefined;
      },
    };
  }

  if (propDefn instanceof m.pd.BooleanProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: boolean; // ${description}`;
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return typeof value === "boolean"
          ? `${identifierName}: ${value}`
          : undefined;
      },
    };
  }

  if (propDefn instanceof m.pd.DateTimeProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: Date; // ${description}`;
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return value instanceof Date
          ? `${identifierName}: new Date("${value}")`
          : undefined;
      },
    };
  }

  if (propDefn instanceof m.pd.TextProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: string; // ${description}`;
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return typeof value === "string"
          ? `${identifierName}: "${value}"` // TODO escape double-quotes inside $value
          : undefined;
      },
    };
  }

  if (
    propDefn instanceof m.pd.ObjectProperty ||
    propDefn instanceof m.pd.ObjectArrayProperty
  ) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const propDecls: string[] = [];
        for (const property of Object.entries(propDefn.model)) {
          const propName = property[0];
          const propDefn = property[1];
          const tsPropDecl = createTypeScriptPropertyDecl(
            propDefn,
            propName,
            m.camelCasePropertyName(propName),
          );
          if (tsPropDecl) {
            const decl = tsPropDecl.getInterfaceDecl(ctx, eh);
            if (decl) {
              propDecls.push(decl);
            }
          } else if (!(propDefn instanceof m.pd.UnknownProperty)) {
            console.error(
              `Unable to find TypeScript PropertyDecl for '${propName}'`,
            );
          }
        }

        return `readonly ${identifierName}${required ? "" : "?"}: { 
          ${propDecls.join("\n    ")}
        }${
          propDefn instanceof m.pd.ObjectArrayProperty ? "[]" : ""
        }; // ${description}`;
      },

      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return `${identifierName}: ${js.stringify(value)}`;
      },
    };
  }

  return undefined;
}
