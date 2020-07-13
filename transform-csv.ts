import { ap, csv, inflect, model as m, poly } from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface Source {
  readonly csvSource: string;
  readonly moduleName?: inflect.InflectableValue;
  readonly interfIdentifier?: inflect.InflectableValue;
}

export class TransformCsvContentToTypeScript {
  readonly ph: ap.PersistenceHandler;
  readonly code: poly.TypeScriptCodeDeclaration;

  constructor(ph?: ap.PersistenceHandler) {
    this.ph = ph || new ap.ConsolePersistenceHandler();
    this.code = new poly.TypeScriptCodeDeclaration(this.ph);
  }

  async transformSourcesWithHeaders(sources: Source[]): Promise<void> {
    for (const source of sources) {
      const module = new poly.TypeScriptModuleDeclaration(
        this.code,
        source.moduleName || inflect.guessCaseValue(source.csvSource),
      );
      this.code.declareModule(module);
      const [model, intrfDecl] = await this.transformSingleSource(
        source,
        module,
      );
      module.declareInterface(intrfDecl);
    }
    this.emit(this.code);
  }

  async transformSourceWithHeaders(source: Source): Promise<void> {
    this.transformSourcesWithHeaders([source]);
  }

  protected createCodeContainer(): poly.TypeScriptCodeDeclaration {
    const ph = new ap.ConsolePersistenceHandler();
    return new poly.TypeScriptCodeDeclaration(ph);
  }

  protected emit(code: poly.PolyglotCodeDecl): void {
    code.emit(
      {
        isContext: true,
        execEnvs: {
          isExecutionEnvironments: true,
          environmentsName: inflect.guessCaseValue("CLI"),
        },
      },
      poly.consolePolyglotErrorHandler,
    );
  }

  protected async transformSingleSource(
    source: Source,
    module: poly.TypeScriptModuleDeclaration,
  ): Promise<[m.ContentModel, poly.TypeScriptInterfaceDeclaration]> {
    const interfIdentifier = source.interfIdentifier ||
      inflect.guessCaseValue(source.csvSource);
    const intrf = new poly.TypeScriptInterfaceDeclaration(
      module,
      source.interfIdentifier ||
        inflect.guessCaseValue(source.csvSource),
    );
    const model = await this.consumeSingleSource(source, intrf);
    td.createTypeScriptInterfaceDecl(model!, intrf);
    return [model, intrf];
  }

  protected async consumeSingleSource(
    source: Source,
    intrf: poly.TypeScriptInterfaceDeclaration,
  ): Promise<m.ContentModel> {
    const f = await Deno.open(source.csvSource);
    let contentIndex = 0;
    let model = undefined;
    for await (const row of csv.readCSVObjects(f)) {
      if (contentIndex == 0) {
        const tdg = new m.TypicalModelGuesser({});
        tdg.guessDefnFromContent(row);
        model = tdg.model;
      }
      const content = m.typedContentTransformer(
        model!,
        row,
        contentIndex,
        m.consoleErrorHandler,
      );
      intrf.declareContent(content);
      contentIndex++;
    }
    f.close();
    return model!;
  }
}
