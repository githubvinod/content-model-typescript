import {
  artfPersist as ap,
  inflect,
  model as m,
  modelCSV as csv,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface CsvSourceOptions {
}

export interface CsvSource extends CsvSourceOptions {
  readonly moduleName: inflect.InflectableValue;
  readonly interfIdentifier: inflect.InflectableValue;
  readonly constIdentifier: inflect.InflectableValue;
  generateTypeScript(
    module: ts.TypeScriptModule,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined>;
}

export interface CsvFileSource extends CsvSource {
  readonly csvFileName: string;
}

export class CsvFileSource implements CsvFileSource {
  readonly moduleName: inflect.InflectableValue;
  readonly interfIdentifier: inflect.InflectableValue;
  readonly constIdentifier: inflect.InflectableValue;

  constructor(
    readonly csvFileName: string,
    options?: {
      moduleName?: inflect.InflectableValue;
      interfIdentifier?: inflect.InflectableValue;
      constIdentifier?: inflect.InflectableValue;
    },
  ) {
    this.moduleName = options?.moduleName ||
      inflect.guessCaseValue(csvFileName);
    this.interfIdentifier = options?.interfIdentifier ||
      inflect.guessCaseValue(csvFileName);
    this.constIdentifier = options?.constIdentifier ||
      inflect.guessCaseValue(csvFileName);
  }

  async generateTypeScript(
    module: ts.TypeScriptModule,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined> {
    const csvRows: object[] = [];
    const model = await csv.consumeCsvSourceWithHeader(
      this.csvFileName,
      (content: object, index: number, model: m.ContentModel): boolean => {
        csvRows.push(content);
        return true;
      },
    );
    if (csvRows.length > 0) {
      module.declareContent(
        new ts.TypeScriptContent(
          this.constIdentifier,
          intrf,
          csvRows.length > 1 ? csvRows : csvRows[0],
          {},
        ),
      );
    }
    return model;
  }
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
        source.moduleName,
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
      { appendIfExists: true },
    );
  }

  protected async transformSingleSource(
    source: CsvSource,
    module: ts.TypeScriptModule,
  ): Promise<[m.ContentModel | undefined, ts.TypeScriptInterface]> {
    const interfIdentifier = source.interfIdentifier;
    const intrf = new ts.TypeScriptInterface(
      module,
      source.interfIdentifier,
      {},
    );
    const model = await source.generateTypeScript(module, intrf);
    td.createTypeScriptInterfaceDecl(model!, intrf);
    return [model, intrf];
  }
}
