import {
  hasCompleteVerifiedProvenance,
  type TemplateVerification,
} from "../../src/templates/provenance";

const HASH = "a".repeat(64);

function generatedVerification(overrides: Record<string, unknown> = {}): TemplateVerification {
  return {
    status: "verified",
    reason: "Generated from the versioned rule spec and passed QA.",
    canonicalSource: {
      kind: "generated-canonical",
      name: "IEMM administrative letter",
      path: "canonical_templates/generated/iemm-cong-van.docx",
      sha256: HASH,
      ruleSpecVersion: "1.0.0",
      generatorVersion: "1.0.0",
      generatorSha256: HASH,
      normativeSources: [{ label: "Nghị định 30/2020/NĐ-CP", id: "30-2020" }],
      referenceSources: ["IEMM QĐ 731-2023, Appendix VII"],
      structuralQa: { status: "passed", reportPath: "canonical_templates/generated/qa.json", sha256: HASH },
      visualQa: { status: "passed", renderer: "LibreOffice", reportPath: "canonical_templates/generated/render.json", sha256: HASH },
    },
    runtime: {
      path: "/templates/iemm/05-cong-van-hanh-chinh.docx",
      sha256: HASH,
      derivedFromCanonicalSha256: HASH,
      comparison: "byte-exact",
    },
    ...overrides,
  } as unknown as TemplateVerification;
}

describe("generated canonical template provenance", () => {
  it("accepts generated canonical evidence after structural, visual, and runtime parity checks pass", () => {
    expect(hasCompleteVerifiedProvenance(generatedVerification())).toBe(true);
  });

  it("rejects generated evidence when visual QA has not passed", () => {
    const verification = generatedVerification();
    const canonicalSource = verification.canonicalSource as unknown as Record<string, any>;
    canonicalSource.visualQa.status = "unverified";

    expect(hasCompleteVerifiedProvenance(verification)).toBe(false);
  });

  it("rejects generated evidence when runtime bytes differ from canonical bytes", () => {
    const verification = generatedVerification();
    verification.runtime.sha256 = "b".repeat(64);

    expect(hasCompleteVerifiedProvenance(verification)).toBe(false);
  });
});
