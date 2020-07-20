import {
  artfPersist as ap,
  inflect,
  model as m,
  modelCSV as csv,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface CsvSource {
  readonly csvFileName: string;
  readonly moduleName?: inflect.InflectableValue;
  readonly interfIdentifier?: inflect.InflectableValue;
}

export class TransformCsvContentToTypeScript {
  readonly ph: ap.PersistenceHandler;
  readonly code: ts.TypeScriptArtifacts;

  constructor(ph?: ap.PersistenceHandler) {
    this.ph = ph || new ap.ConsolePersistenceHandler();
    this.code = new ts.TypeScriptArtifacts(this.ph, {});
  }

  async transformSourcesWithHeaders(sources: CsvSource[]): Promise<void> {
    for (const source of sources) {
      const module = new ts.TypeScriptModule(
        this.code,
        source.moduleName || inflect.guessCaseValue(source.csvFileName),
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

  async transformSourceWithHeaders(source: CsvSource): Promise<void> {
    this.transformSourcesWithHeaders([source]);
  }

  protected createCodeContainer(): ts.TypeScriptArtifacts {
    const ph = new ap.ConsolePersistenceHandler();
    return new ts.TypeScriptArtifacts(ph, {});
  }

  protected emit(code: ap.PolyglotCodeArtifacts): void {
    code.emit(
      {
        isContext: true,
        execEnvs: {
          isExecutionEnvironments: true,
          environmentsName: inflect.guessCaseValue("CLI"),
        },
      },
      ap.consolePolyglotErrorHandler,
    );
  }

  protected async transformSingleSource(
    source: CsvSource,
    module: ts.TypeScriptModule,
  ): Promise<[m.ContentModel | undefined, ts.TypeScriptInterface]> {
    const interfIdentifier = source.interfIdentifier ||
      inflect.guessCaseValue(source.csvFileName);
    const intrf = new ts.TypeScriptInterface(
      module,
      source.interfIdentifier ||
        inflect.guessCaseValue(source.csvFileName),
      {},
    );
    const model = await this.consumeSingleSource(source, intrf);
    td.createTypeScriptInterfaceDecl(model!, intrf);
    return [model, intrf];
  }

  protected async consumeSingleSource(
    source: CsvSource,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined> {
    return csv.consumeCsvSourceWithHeader(
      source.csvFileName,
      (content: object, index: number, model: m.ContentModel): boolean => {
        intrf.declareContent(content);
        return true;
      },
    );
  }
}
