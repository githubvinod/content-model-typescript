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
      isPolyglotPropertyDecl: true,
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
    };
  }

  const required = typeof propDefn.valueRequired === "function"
    ? propDefn.valueRequired()
    : propDefn.valueRequired;

  if (propDefn instanceof m.pd.NumericProperty) {
    return {
      isPolyglotPropertyDecl: true,
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: number; // ${description}`;
      },
    };
  }

  if (propDefn instanceof m.pd.BooleanProperty) {
    return {
      isPolyglotPropertyDecl: true,
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: boolean; // ${description}`;
      },
    };
  }

  if (propDefn instanceof m.pd.DateTimeProperty) {
    return {
      isPolyglotPropertyDecl: true,
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: Date; // ${description}`;
      },
    };
  }

  if (propDefn instanceof m.pd.TextProperty) {
    return {
      isPolyglotPropertyDecl: true,
      getInterfaceDecl(
        ctx: cm.Context,
        eh: ap.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: string; // ${description}`;
      },
    };
  }

  if (
    propDefn instanceof m.pd.ObjectProperty ||
    propDefn instanceof m.pd.ObjectArrayProperty
  ) {
    return {
      isPolyglotPropertyDecl: true,
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
    };
  }

  return undefined;
}
