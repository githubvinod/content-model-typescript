import { cm, model as m, poly } from "./deps.ts";

export function createTypeScriptInterfaceDecl(
  model: m.ContentModel,
  intrf: poly.PolyglotInterfaceDecl,
): poly.PolyglotInterfaceDecl {
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
): poly.PolyglotPropertyDecl | undefined {
  const description = propDefn.description;

  if (propDefn instanceof m.pd.UnknownProperty) {
    return {
      getInterfaceDecl(
        ctx: cm.Context,
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}?: unknown; // ${description}`;
      },
      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: poly.PolyglotErrorHandler,
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
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: number; // ${description}`;
      },
      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: poly.PolyglotErrorHandler,
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
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: boolean; // ${description}`;
      },
      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: poly.PolyglotErrorHandler,
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
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: Date; // ${description}`;
      },
      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: poly.PolyglotErrorHandler,
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
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        return `readonly ${identifierName}${
          required ? "" : "?"
        }: string; // ${description}`;
      },
      getContentDecl(
        ctx: cm.Context,
        content: object,
        eh: poly.PolyglotErrorHandler,
      ): string | undefined {
        const value = (content as any)[srcPropName];
        return typeof value === "string"
          ? `${identifierName}: "${value}"` // TODO escape double-quotes inside $value
          : undefined;
      },
    };
  }

  return undefined;
}
