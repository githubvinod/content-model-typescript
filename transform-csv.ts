import {
  artfPersist as ap,
  stdBufIO as bufIO,
  stdCSV as csv,
  inflect,
  model as m,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface Source {
  readonly csvSource: string;
  readonly moduleName?: inflect.InflectableValue;
  readonly interfIdentifier?: inflect.InflectableValue;
}

export class TransformCsvContentToTypeScript {
  readonly ph: ap.PersistenceHandler;
  readonly code: ts.TypeScriptArtifacts;

  constructor(ph?: ap.PersistenceHandler) {
    this.ph = ph || new ap.ConsolePersistenceHandler();
    this.code = new ts.TypeScriptArtifacts(this.ph);
  }

  async transformSourcesWithHeaders(sources: Source[]): Promise<void> {
    for (const source of sources) {
      const module = new ts.TypeScriptModule(
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

  protected createCodeContainer(): ts.TypeScriptArtifacts {
    const ph = new ap.ConsolePersistenceHandler();
    return new ts.TypeScriptArtifacts(ph);
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
    source: Source,
    module: ts.TypeScriptModule,
  ): Promise<[m.ContentModel, ts.TypeScriptInterface]> {
    const interfIdentifier = source.interfIdentifier ||
      inflect.guessCaseValue(source.csvSource);
    const intrf = new ts.TypeScriptInterface(
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
    intrf: ts.TypeScriptInterface,
  ): Promise<m.ContentModel> {
    const f = await Deno.open(source.csvSource);
    const matrix = await csv.readMatrix(new bufIO.BufReader(f));
    f.close();

    const colIndexByName: { [key: string]: number } = {};
    let headerRow: string[];
    let contentIndex = 0;
    let model = undefined;
    for (const row of matrix) {
      if (contentIndex == 0) {
        headerRow = row;
        row.map((col: string, index: number) => colIndexByName[col] = index);
        contentIndex++;
        continue;
      }

      const values: m.ContentValuesSupplier = {
        contentIndex: contentIndex,
        valueNames: headerRow!,
        valueByName: (name: string): any => {
          const index = colIndexByName[name];
          return row[index];
        },
      };

      if (contentIndex == 1) {
        const tdg = new m.TypicalModelGuesser({});
        tdg.guessDefnFromContent(values);
        model = tdg.model;
      }

      const content: { [name: string]: any } = {};
      m.typedContentTransformer(
        model!,
        values,
        {
          contentIndex: contentIndex - 1,
          assign: (
            name: string,
            value: any,
            transform: (name: string) => string,
          ): void => {
            const valueName = transform ? transform(name) : name;
            content[valueName] = value;
          },
        },
        m.consoleErrorHandler,
      );
      intrf.declareContent(content);
      contentIndex++;
    }
    return model!;
  }
}
