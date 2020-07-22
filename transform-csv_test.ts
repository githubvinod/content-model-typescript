import { artfPersist as ap, stdAsserts as a, inflect } from "./deps.ts";
import * as trCSV from "./transform-csv.ts";

Deno.test("Import from CSV and generate separate TypeScript modules", async () => {
  const ph = new ap.InMemoryPersistenceHandler();
  const transformer = new trCSV.TransformCsvContentToTypeScript(ph);
  await transformer.transformSourcesWithHeaders(
    [
      new trCSV.CsvFileSource(
        "transform-csv_test-single-row.csv",
        {
          constIdentifier: inflect.guessCaseValue(
            "transform-csv_test-single-row.csv Content",
          ),
        },
      ),
      new trCSV.CsvFileSource("transform-csv_test-complex.csv", {
        constIdentifier: inflect.guessCaseValue(
          "transform-csv_test-complex.csv Content",
        ),
      }),
    ],
  );
  a.assertEquals(ph.results.length, 2, "Expected two results");

  const firstTest = ap.readFileAsTextFromPaths(
    "transform-csv_test-single-row.csv.ts.golden",
    ["."],
  );
  a.assertEquals(ph.results[0].artifactText, firstTest);

  const secondTest = ap.readFileAsTextFromPaths(
    "transform-csv_test-complex.csv.ts.golden",
    ["."],
  );
  a.assertEquals(ph.results[1].artifactText, secondTest);
});

Deno.test("Import from CSV and generate single TypeScript module", async () => {
  const ph = new ap.InMemoryPersistenceHandler();
  const transformer = new trCSV.TransformCsvContentToTypeScript(ph);
  const moduleName = inflect.guessCaseValue("transform-csv_test-common");
  await transformer.transformSourcesWithHeaders(
    [
      new trCSV.CsvFileSource(
        "transform-csv_test-single-row.csv",
        { moduleName: moduleName },
      ),
      new trCSV.CsvFileSource(
        "transform-csv_test-complex.csv",
        { moduleName: moduleName },
      ),
    ],
  );
  a.assertEquals(ph.results.length, 1, "Expected one result");
  //console.dir(ph.results[0].artifactText);

  // const secondTest = ap.readFileAsTextFromPaths(
  //   "transform-csv_test-complex.csv.ts.golden",
  //   ["."],
  // );
  // a.assertEquals(ph.results[1].artifactText, secondTest);
});
