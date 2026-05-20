import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeContinuityText } from "./sanitize";

describe("sanitizeContinuityText", () => {
  it("repairs mojibake em dash and arrow", () => {
    assert.equal(sanitizeContinuityText("foo \u00e2\u20ac\u201d bar"), "foo - bar");
    assert.equal(sanitizeContinuityText("x \u00e2\u2020\u2019 y"), "x -> y");
    assert.equal(sanitizeContinuityText("a \u00c2\u00b7 b"), "a - b");
  });

  it("folds Unicode punctuation to ASCII", () => {
    assert.equal(sanitizeContinuityText("a\u2014b"), "a-b");
    assert.equal(sanitizeContinuityText("a\u2192b"), "a->b");
    assert.equal(sanitizeContinuityText("a\u00b7b"), "a-b");
    assert.equal(sanitizeContinuityText("a\u2018b\u2019"), "a'b'");
    assert.equal(sanitizeContinuityText("a\u201cb\u201d"), 'a"b"');
  });

  it("leaves plain ASCII untouched", () => {
    const plain = "ARCHIVIST wrote continuity snapshot - 20 projects, 67 signals.";
    assert.equal(sanitizeContinuityText(plain), plain);
  });

  it("never leaves mojibake markers in output", () => {
    const samples = [
      "summary \u00e2\u20ac\u201d file",
      "label \u00e2\u2020\u2019 core",
      "dot \u00c2\u00b7 between",
      "\u00e2\u20ac\u0153quoted\u00e2\u20ac\u009d",
    ];
    for (const s of samples) {
      const out = sanitizeContinuityText(s);
      assert.ok(!out.includes("\u00e2"), `expected no \\u00e2 in: ${out}`);
      assert.ok(!out.includes("\u00c2"), `expected no \\u00c2 in: ${out}`);
      assert.ok(!out.includes("\u00c3"), `expected no \\u00c3 in: ${out}`);
    }
  });
});
