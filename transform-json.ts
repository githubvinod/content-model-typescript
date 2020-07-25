import {
  artfPersist as ap,
  inflect,
  model as m,
  modelJSON as mj,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface JsonSourceOptions {
}

export interface JsonSource extends JsonSourceOptions {
  readonly moduleName: inflect.InflectableValue;
  readonly interfIdentifier: inflect.InflectableValue;
  generateTypeScript(
    module: ts.TypeScriptModule,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined>;
}

export interface JsonFileSource extends JsonSource {
  readonly jsonFileName: string;
}

export class JsonFileSource implements JsonFileSource {
  readonly moduleName: inflect.InflectableValue;
  readonly interfIdentifier: inflect.InflectableValue;

  constructor(readonly jsonFileName: string) {
    this.moduleName = inflect.guessCaseValue(jsonFileName);
    this.interfIdentifier = inflect.guessCaseValue(jsonFileName);
  }

  async generateTypeScript(
    module: ts.TypeScriptModule,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined> {
    return mj.consumeJsonFileWithFirstRowAsModel(
      this.jsonFileName,
      (content: object, index: number): boolean => {
        module.declareContent(
          new ts.TypeScriptContent(
            inflect.guessCaseValue(this.jsonFileName),
            intrf,
            content,
            { moduleExport: true },
          ),
        );
        return true;
      },
    );
  }
}

export class ObjectInstanceSource implements JsonSource {
  constructor(
    readonly instance: any,
    readonly moduleName: inflect.InflectableValue,
    readonly interfIdentifier: inflect.InflectableValue,
    readonly contentIdentifier: inflect.InflectableValue,
  ) {
  }

  async generateTypeScript(
    module: ts.TypeScriptModule,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined> {
    return mj.consumeJsonWithFirstRowAsModel(
      this.instance,
      (content: object, index: number): boolean => {
        module.declareContent(
          new ts.TypeScriptContent(
            this.contentIdentifier,
            intrf,
            content,
            { moduleExport: true },
          ),
        );
        return true;
      },
    );
  }
}

export class TransformJsonContentToTypeScript {
  readonly ph: ap.PersistenceHandler;
  readonly code: ts.TypeScriptArtifacts;

  constructor(ph?: ap.PersistenceHandler) {
    this.ph = ph || new ap.ConsolePersistenceHandler();
    this.code = new ts.TypeScriptArtifacts(this.ph, {});
  }

  async transformSources(sources: JsonSource[]): Promise<void> {
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

  async transformSourceWithHeaders(source: JsonSource): Promise<void> {
    this.transformSources([source]);
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
    source: JsonSource,
    module: ts.TypeScriptModule,
  ): Promise<[m.ContentModel | undefined, ts.TypeScriptInterface]> {
    const interfIdentifier = source.interfIdentifier;
    const intrf = new ts.TypeScriptInterface(
      module,
      interfIdentifier,
      {},
    );
    const model = await source.generateTypeScript(module, intrf);
    if (model) {
      td.createTypeScriptInterfaceDecl(model, intrf);
    }
    return [model, intrf];
  }
}
