import { stdAsserts as a, artfPersist as ap } from "./deps.ts";
import * as trCSV from "./transform-csv.ts";

Deno.test("Transform CSV to TypeScript", async () => {
  const ph = new ap.InMemoryPersistenceHandler();
  const transformer = new trCSV.TransformCsvContentToTypeScript(ph);
  await transformer.transformSourcesWithHeaders(
    [
      { csvSource: "transform-csv_test-single-row.csv" },
      { csvSource: "transform-csv_test-complex.csv" },
    ],
  );
  a.assertEquals(ph.results.length, 2, "Expected two results");

  const firstTest = ap.readFileAsTextFromPaths(
    "transform-csv_test-single-row.csv.ts.golden",
    ["."],
  );
  a.assertEquals(firstTest, ph.results[0].artifactText);

  const secondTest = ap.readFileAsTextFromPaths(
    "transform-csv_test-complex.csv.ts.golden",
    ["."],
  );
  a.assertEquals(secondTest, ph.results[1].artifactText);
});
