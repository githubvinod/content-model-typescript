import { stdAsserts as a, artfPersist as ap } from "./deps.ts";
import * as trJSON from "./transform-json.ts";

Deno.test("Transform CSV to TypeScript", async () => {
  const ph = new ap.InMemoryPersistenceHandler();
  const transformer = new trJSON.TransformJsonContentToTypeScript(ph);
  await transformer.transformSources(
    [
      { jsonSource: "transform-json_test-simple.json" },
    ],
  );
  a.assertEquals(ph.results.length, 1, "Expected one results");
  console.log(ph.results[0].artifactText);

  // const firstTest = ap.readFileAsTextFromPaths(
  //   "transform-csv_test-single-row.csv.ts.golden",
  //   ["."],
  // );
  // a.assertEquals(ph.results[0].artifactText, firstTest);

  // const secondTest = ap.readFileAsTextFromPaths(
  //   "transform-csv_test-complex.csv.ts.golden",
  //   ["."],
  // );
  // a.assertEquals(ph.results[1].artifactText, secondTest);
});
