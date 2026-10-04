export type TemplateVerificationStatus = "verified" | "unverified" | "quarantined";

export interface ExternalCanonicalDocxSource {
  kind: "official-canonical-docx";
  name: string;
  path: string;
  id?: string;
  version?: string;
  effectiveDate?: string;
  sha256: string;
}

export interface GeneratedCanonicalDocxSource {
  kind: "generated-canonical";
  name: string;
  path: string;
  sha256: string;
  version?: string;
  ruleSpecVersion: string;
  generatorVersion: string;
  generatorSha256: string;
  normativeSources: Array<{ label: string; id: string }>;
  referenceSources: string[];
  structuralQa: { status: "passed" | "failed" | "unverified"; reportPath: string; sha256: string };
  visualQa: { status: "passed" | "failed" | "unverified"; renderer?: string; reportPath: string; sha256: string };
}

export type CanonicalDocxSource = ExternalCanonicalDocxSource | GeneratedCanonicalDocxSource;

export interface RuntimeDocxEvidence {
  path: string;
  sha256: string | null;
  derivedFromCanonicalSha256?: string;
  comparison?: "byte-exact" | "content-controls-only";
}

export interface TemplateVerification {
  status: TemplateVerificationStatus;
  reason: string;
  canonicalSource: CanonicalDocxSource | null;
  runtime: RuntimeDocxEvidence;
}

const RUNTIME_SHA256_BY_PATH: Record<string, string> = {
  "/templates/dang-sample.docx": "1abd2abe6a8912f07af4f4788be039ee107efd2e13758eb022e0726a9ea78f5e",
  "/templates/iemm/01-quyet-dinh-ca-biet.docx": "be284a9c372dd688ffb284581ea7aaf5e4f805e9dd2416f11c77c2264608fb00",
  "/templates/iemm/02-quyet-dinh-ban-hanh-van-ban.docx": "1f27ac28c500f3cb12a7728f4c325aa23d51e0ceff66d8cf3fc13e824800c7ce",
  "/templates/iemm/03-quy-che-quy-dinh.docx": "50ea561ecdef57299534670c96a08674f378fbf3cd227918e7c3c22b4762148b",
  "/templates/iemm/04-van-ban-ban-hanh-kem-theo-quyet-dinh.docx": "a26ebbe798d175e6e2337479b265818aaee4a0b992caed7d8a6cfacac75cf91a",
  "/templates/iemm/05-cong-van-hanh-chinh.docx": "9088dc7b279787a6b8f8391de4a17067e079e654493668fdd99e080522dad6f3",
  "/templates/iemm/06-thong-bao-noi-bo-vien.docx": "1941b475c557cb98be462dd4380c624d7efdf62950d8f0a736dd17a607a02270",
  "/templates/iemm/07-to-trinh-cua-vien.docx": "ac6faec89fc0fe336633d9560d494dd72b9064290cd78ecbe3009612a8aa8f16",
  "/templates/iemm/08-to-trinh-cua-don-vi-gui-vien.docx": "d403ca491efdcc4aa0bba39c7cda457d6e62dc72c8276d426675817a01625338",
  "/templates/iemm/09-bien-ban.docx": "dc96d8be0d172a2b9e3d05c8dd13ff8cebfee18f5cd06fb095c3e81ea7bfe761",
  "/templates/iemm/10-van-ban-chung.docx": "f1a07e1e982af0ac060540b32509b7e703d64a890e4fe3c58a23fdf1780a266f",
  "/templates/iemm/11-ban-sao-van-ban.docx": "38a25d81dae89a4207d5832963f06c689217ad8a324b10cc389271c3067daa7b",
  "/templates/iemm/12-thu-moi-hop.docx": "8c565c85deac2c38cd06878ab2cefc6256eebc00ab35d4b510495fadd73de933",
  "/templates/iemm/13-thu-bao-hoan-hop.docx": "55e13f1ab18f433bef053a66845b0196fd1b36b6616aeaa8b64f43e13c26cf34",
  "/templates/iemm/14-cong-van-dinh-chinh.docx": "a8e5e5ba4e32d5bd43de31a8493039755c12abccf234d06e4cc04028f6087c3e",
  "/templates/iemm-don-xin-nghi-phep-template.docx": "ecec4bdbd864cf0756d7ab7ec072f8e354c7878f041219be82cc80149fccfe1d",
  "/templates/tvci-cong-van-template.docx": "29bcd69b4cadeabcdeb7495507a1c382ff6a96086ed43114d1d034704e705fa1",
  "/templates/tvci-thong-bao-template.docx": "b53c35525ee2dd66b416143426adc556a2f61577ae3d0fb0ae17b0322a996c45",
  "/templates/tvci-sample.docx": "aac92663d74536c7534d2f7970b69bfc5275d4b823244963256c70c3da7f9a5a",
  "/templates/iemm-sample.docx": "b54d1edc4ff493370fe3555874ef252b4dad4f0bca97de467601b4ef3916ab9d",
};

const QUARANTINED_SAMPLE_IDS = new Set([
  "dang-sample-001",
  "iemm-sample-001",
  "tvci-sample-001",
]);

export function createBundledTemplateVerification(id: string, runtimePath: string): TemplateVerification {
  const status: TemplateVerificationStatus = QUARANTINED_SAMPLE_IDS.has(id) ? "quarantined" : "unverified";
  return {
    status,
    reason: status === "quarantined"
      ? "Generic/sample DOCX retained for audit only; no official canonical DOCX is present."
      : "No exact official canonical DOCX is present in the repository. Reference titles and bundled files do not prove the approved form.",
    canonicalSource: null,
    runtime: {
      path: runtimePath,
      sha256: RUNTIME_SHA256_BY_PATH[runtimePath] ?? null,
    },
  };
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CANONICAL_ROOT_PATTERN = /^\/?(?:canonical_templates\/|templates\/canonical\/).+\.docx$/i;

function isSha256(value: string | null | undefined): value is string {
  return SHA256_PATTERN.test(value ?? "");
}

function isCanonicalDocxPath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").includes("..") && CANONICAL_ROOT_PATTERN.test(normalized);
}

export function hasCompleteVerifiedProvenance(verification?: TemplateVerification): boolean {
  if (!verification || verification.status !== "verified") return false;
  const canonical = verification.canonicalSource;
  const runtime = verification.runtime;
  if (!canonical || !isCanonicalDocxPath(canonical.path) || !isSha256(canonical.sha256)) return false;
  if (!runtime.path || !isSha256(runtime.sha256)) return false;
  if (runtime.derivedFromCanonicalSha256 !== canonical.sha256) return false;
  if (runtime.comparison !== "byte-exact" && runtime.comparison !== "content-controls-only") return false;
  if (runtime.comparison === "byte-exact" && runtime.sha256 !== canonical.sha256) return false;
  if (canonical.kind === "official-canonical-docx") return true;

  const generatedCanonical = canonical;

  return Boolean(
    generatedCanonical.ruleSpecVersion
      && generatedCanonical.generatorVersion
      && isSha256(generatedCanonical.generatorSha256)
      && generatedCanonical.normativeSources.length > 0
      && generatedCanonical.normativeSources.every((source) => Boolean(source.label && source.id))
      && generatedCanonical.referenceSources.length > 0
      && generatedCanonical.structuralQa.status === "passed"
      && generatedCanonical.structuralQa.reportPath
      && isSha256(generatedCanonical.structuralQa.sha256)
      && generatedCanonical.visualQa.status === "passed"
      && generatedCanonical.visualQa.renderer
      && generatedCanonical.visualQa.reportPath
      && isSha256(generatedCanonical.visualQa.sha256),
  );
}
