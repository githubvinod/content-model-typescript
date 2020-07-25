import {
  artfPersist as ap,
  inflect,
  model as m,
  modelCSV as csv,
  polyglotArtfNature as ts,
} from "./deps.ts";
import * as td from "./typescript-decls.ts";

export interface TypeScriptCodeOptions {
  readonly moduleName?: inflect.InflectableValue;
  readonly interfIdentifier?: inflect.InflectableValue;
  readonly constIdentifier?: inflect.InflectableValue;
  readonly emitEmptyContent?: boolean;
}

export interface CsvContentOptions {
  readonly allowSingleRowAsObject?: boolean;
}

export interface CsvContent {
  readonly model: m.ContentModel;
  readonly content: any;
  readonly isArray: boolean;
  readonly isSingleRowObject: boolean;
}

export interface CsvSource {
  readonly sourceIdentity: string;
  readonly codeOptions?: TypeScriptCodeOptions;
  consume(): Promise<CsvContent | undefined>;
}

export interface CsvFileSource extends CsvSource {
}

export class CsvFileSource implements CsvFileSource {
  constructor(
    readonly sourceIdentity: string,
    readonly contentOptions?: CsvContentOptions,
    readonly codeOptions?: TypeScriptCodeOptions,
  ) {
  }

  async consume(): Promise<CsvContent | undefined> {
    const csvRows: object[] = [];
    const model = await csv.consumeCsvSourceWithHeader(
      this.sourceIdentity,
      (content: object, index: number, model: m.ContentModel): boolean => {
        csvRows.push(content);
        return true;
      },
    );
    if (model) {
      if (csvRows.length == 1 && this.contentOptions?.allowSingleRowAsObject) {
        return {
          model: model,
          content: csvRows[0],
          isArray: false,
          isSingleRowObject: true,
        };
      } else {
        return {
          model: model,
          content: csvRows,
          isArray: true,
          isSingleRowObject: false,
        };
      }
    } else {
      return undefined;
    }
  }
}

export class TransformCsvContentToTypeScript {
  readonly ph: ap.PersistenceHandler;
  readonly code: ts.TypeScriptArtifacts;

  constructor(ph?: ap.PersistenceHandler) {
    this.ph = ph || new ap.ConsolePersistenceHandler();
    this.code = new ts.TypeScriptArtifacts(this.ph, {});
  }

  async transformSourcesWithHeadersIntoSeparateModules(
    sources: CsvSource[],
  ): Promise<void> {
    for (const source of sources) {
      const moduleName = source.codeOptions?.moduleName ||
        inflect.guessCaseValue(source.sourceIdentity);
      const module = new ts.TypeScriptModule(
        this.code,
        moduleName,
      );
      const csvContent = await source.consume();
      if (csvContent) {
        const interfIdentifier = source.codeOptions?.interfIdentifier ||
          inflect.guessCaseValue(source.sourceIdentity);
        const contentIdentifier = source.codeOptions?.constIdentifier ||
          inflect.guessCaseValue(source.sourceIdentity);
        this.code.declareModule(module);
        const intrf = new ts.TypeScriptInterface(
          module,
          interfIdentifier,
          {},
        );
        td.createTypeScriptInterfaceDecl(csvContent.model, intrf);
        if (csvContent.content) {
          module.declareContent(
            new ts.TypeScriptContent(
              contentIdentifier,
              intrf,
              csvContent.content,
              { moduleExport: true },
            ),
          );
        }
        module.declareInterface(intrf);
      }
    }
    this.code.emit(
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

  async transformSourcesWithHeadersIntoSingleModule(
    main: Required<TypeScriptCodeOptions>,
    sources: CsvSource[],
  ): Promise<void> {
    const mainModule = new ts.TypeScriptModule(
      this.code,
      main.moduleName,
    );
    this.code.declareModule(mainModule);
    const mainIntrf = new ts.TypeScriptInterface(
      mainModule,
      main.interfIdentifier,
      {},
    );
    const mainContent: { [key: string]: any } = {};

    for (const source of sources) {
      const csvContent = await source.consume();
      if (csvContent) {
        const interfIdentifier = source.codeOptions?.interfIdentifier ||
          inflect.guessCaseValue(source.sourceIdentity);
        const intrf = new ts.TypeScriptInterface(
          mainModule,
          interfIdentifier,
          {},
        );
        td.createTypeScriptInterfaceDecl(csvContent.model, intrf);
        mainContent[inflect.toCamelCase(interfIdentifier)] = csvContent.content;
        const csvContentProp = mainIntrf.declareProperty(
          new ts.TypicalTypeScriptProperty(
            interfIdentifier,
            csvContent.isArray
              ? (inflect.toPascalCase(intrf.name) + "[]")
              : intrf,
          ),
        );
        mainModule.declareInterface(intrf);
      }
    }

    mainModule.declareInterface(mainIntrf);
    mainModule.declareContent(
      new ts.TypeScriptContent(
        main.constIdentifier,
        mainIntrf,
        mainContent,
        { moduleDefault: true, moduleExport: true },
      ),
    );

    this.code.emit(
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
}
