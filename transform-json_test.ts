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

  const golden = ap.readFileAsTextFromPaths(
    "transform-json_test-simple.json.ts.golden",
    ["."],
  );
  a.assertEquals(ph.results[0].artifactText, golden);
});
