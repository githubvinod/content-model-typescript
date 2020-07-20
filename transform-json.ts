import {
  artfPersist as ap,
  inflect,
  model as m,
  modelJSON as mj,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface JsonSource {
  readonly jsonFileName: string;
  readonly moduleName?: inflect.InflectableValue;
  readonly interfIdentifier?: inflect.InflectableValue;
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
        source.moduleName || inflect.guessCaseValue(source.jsonFileName),
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
    const interfIdentifier = source.interfIdentifier ||
      inflect.guessCaseValue(source.jsonFileName);
    const intrf = new ts.TypeScriptInterface(
      module,
      source.interfIdentifier ||
        inflect.guessCaseValue(source.jsonFileName),
      {},
    );
    const model = await this.consumeSingleSource(source, intrf);
    if (model) {
      td.createTypeScriptInterfaceDecl(model, intrf);
    }
    return [model, intrf];
  }

  protected async consumeSingleSource(
    source: JsonSource,
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel | undefined> {
    return mj.consumeJsonFileWithFirstRowAsModel(
      source.jsonFileName,
      (content: object, index: number): boolean => {
        intrf.declareContent(content);
        return true;
      },
    );
  }
}
