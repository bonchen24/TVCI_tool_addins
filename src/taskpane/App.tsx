import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { readSelection, readDocumentText, replaceSelection, replaceSelectionIfMatches, insertBelowSelection, insertBelowSelectionIfMatches, replaceFirstInSelection } from "../word/selection.service";
import { inspectSelectionParagraphs, inspectDocumentParagraphs, applyIssueFix, applyTextIssueFix, selectParagraphByTargetId } from "../word/formatting.service";
import { validateParagraph } from "../rules/validator";
import { classifyDocumentComponents, type ClassifiedComponent } from "../rules/component-classifier";
import { getComponentRule, getRecipientsItemRule } from "../rules/component-rules";
import { validateComponentParagraph } from "../rules/component-validator";
import type { ValidationIssue } from "../rules/models";
import { ACTIVE_RULE_PROFILES, getRuleProfile, resolveRuleProfileForOrganization, type RuleProfileId } from "../rules/profiles";
import { validatePageSetup } from "../rules/page-validator";
import { applyPageIssueFix, applyPageRules, inspectPageSetup } from "../word/page-formatting.service";
import { TEMPLATE_CATALOG } from "../templates/catalog";
import { distinctTemplateValues, searchTemplates, type TemplateOrganization, type TemplateRecord } from "../templates/library";
import { deleteUserTemplate, getUserTemplateData, listUserTemplates, saveUserTemplate } from "../templates/storage";
import { makeUserTemplateRecord, updateUserTemplateRecord } from "../templates/user-template";
import { insertTemplate } from "../word/template.service";
import { addContentControlAtSelection, addContentControlAroundFirstMatch, listTaggedContentControls, setContentControlText, setMultipleContentControlTexts } from "../word/content-control.service";
import { exportCurrentDocumentAsDocx } from "../word/document-export.service";
import { CONTENT_CONTROL_FIELDS } from "../content-controls/field-map";
import { requestAiPromptDirect, type AiProviderName } from "../ai/direct-client";
import { clearAiSettings, defaultModelFor, loadAiSettings, saveAiSettings } from "../ai/settings";
import { chooseConfiguredModel, discoverAvailableModels, KNOWN_MODELS } from "../ai/model-discovery";
import { TVCI_TEMPLATE_TABS } from "../templates/tvci-tabs";
import { PARTY_DOCUMENT_TYPES } from "../templates/party";
import { buildTemplateFieldPrompt, parseTemplateFieldSuggestions, type TemplateFieldSuggestion } from "../ai/template-field-analysis";
import { applyTemplatePreferences, moveTemplate, setTemplateDefault, setTemplateHidden, type TemplatePreferences } from "../templates/management";
import { loadTemplatePreferences, saveTemplatePreferences } from "../templates/preferences";
import { ADDIN_BRANDING } from "../branding";
import { QUICK_GUIDANCE, searchQuickGuidance } from "../reference/quick-guidance";
import { validateAddresseeBlock } from "../rules/addressee-validator";
import { validateRecipientsBlock } from "../rules/recipients-validator";
import { validateLegalBasisBlock } from "../rules/legal-basis-validator";
import type { HorizontalRuleKind } from "../rules/horizontal-rules";
import { getPageNumberPreset, RECIPIENT_PRESETS, type OutlineKind, type PageNumberPosition } from "../drafting/presets";
import { configureHeaderFooter, configurePageNumbers, insertAddressee, insertAppendix, insertAppendixTable, insertHorizontalRule, insertOutline, insertRecipients, insertStandardList, insertStandardTable, numberSelectedTable } from "../word/drafting.service";
import { WRITING_STYLES, buildWritingPrompt, type ChatMessage, type WritingStyleId } from "../ai/writing-workspace";
import { buildTemplateFillPrompt, filterTemplateFillFieldsToControls, MIN_AUTO_FILL_CONFIDENCE, parseTemplateFillResult, selectSafeTemplateFills, type TemplateFillField } from "../ai/template-fill";
import { buildProofreadingPrompt, parseProofreadingResult, type ProofreadingIssue, type ProofreadingResult } from "../ai/proofreading";
import { QUICK_DRAFT_ACTIONS, buildDocumentContextBlock, buildQuickDraftPrompt, type AiDocumentContext, type QuickDraftActionId } from "../ai/document-context";
import { readWordAiDocumentContext } from "../word/ai-context.service";
import { createChatConversation, deleteChatConversation, loadChatConversations, renameChatConversation, saveChatConversations, updateChatConversation, upsertChatConversation, clearChatConversations, type ChatConversation } from "../ai/chat-history";
import { applyProofreadingIssueToText, applySafeProofreadingIssues, isSafeProofreadingIssue } from "../ai/proofreading-actions";
import { buildTemplateNarrativePrompt } from "../ai/template-drafting";
import { runTemplateInsertion } from "./template-insertion";
import { getTemplateFormSchema, type TemplateFormSchema, type TemplateFormValue, type TemplateFormValues } from "../templates/form-schema";
import { normalizeTemplateFormValues, validateTemplateForm } from "../templates/form-validation";
import { deleteTemplateFormDraft, getLatestActiveDraft, loadTemplateFormDraft, saveTemplateFormDraft, type TemplateFormDraft } from "../templates/form-drafts";
import { addRecentTemplate, getFavoriteTemplateIds, getRecentTemplateIds, toggleFavoriteTemplate } from "../templates/recent-favorites";
import { applyTemplateFormToWord } from "../word/form-content-control.service";
import { buildTemplateFormPrompt, filterTemplateFormSuggestions, parseTemplateFormSuggestions, type TemplateFormAiSuggestion } from "../ai/template-form";
import { describeTemplateFormSync, mergeAcceptedTemplateFormSuggestions } from "./template-form.service";
import { TemplateFormPanel } from "./TemplateFormPanel";
import { SmartStartScreen } from "./components/SmartStartScreen";
import { FormDraftingView } from "./components/FormDraftingView";
import { TemplateWizardModal } from "./components/TemplateWizardModal";
import { KnowledgeBaseView } from "./components/KnowledgeBaseView";
import { InspectionEditorView } from "./components/InspectionEditorView";
import { evaluateDocumentRules } from "../rules/document-evaluator";
import type { DocumentEvaluationSummary } from "../rules/models";
import { getSuggestedQuickPrompts, buildAugmentedAiPrompt } from "../ai/contextual-pipeline";
import { getAllKnowledgeRecords, saveCustomKnowledgeRecord, deleteCustomKnowledgeRecord } from "../knowledge/storage";
import type { KnowledgeRecord } from "../knowledge/models";
import { processAttachmentFile, type AiAttachment } from "../ai/attachment.service";
import { AiSettingsModal } from "./components/AiSettingsModal";
import { suggestMatchingTemplates, mapDraftToFormValues, decomposeDraftIntoFormFields } from "../ai/template-matcher";
import { detectDocumentContext, type AutoDetectResult } from "../rules/auto-detect.service";
import { profileStorage } from "../profiles/profile-storage";
import { DraftingProfilesView } from "./components/DraftingProfilesView";

type AppMainTab = "drafting" | "inspect" | "library" | "knowledge" | "utilities";

const TEMPLATE_ORGANIZATIONS: Array<{ value: TemplateOrganization; label: string }> = [
  { value: "TVCI", label: "TVCI" },
  { value: "IEMM", label: "IEMM" },
  { value: "DANG", label: "Đảng" },
];

const TEMPLATE_FORM_SESSION_TAGS = new Set(["NGAY_BAN_HANH", "NGUOI_KY"]);

function sendDebug(msg: string) {
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "App.tsx", msg }),
    }).catch(() => {});
  } catch {}
}

function messageOf(error: unknown): string {
  console.error("Taskpane operation error:", error);
  sendDebug(`messageOf error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  if (error && typeof error === "object") {
    const errorObj = error as { message?: string; debugInfo?: { message?: string; errorLocation?: string } };
    if (errorObj.debugInfo?.message) {
      return `Lỗi Word: ${errorObj.debugInfo.message}${errorObj.debugInfo.errorLocation ? ` (${errorObj.debugInfo.errorLocation})` : ""}`;
    }
  }
  const message = error instanceof Error ? error.message : "Có lỗi xảy ra. Hãy thử lại.";
  if (/Office is not defined|Word is not defined/i.test(message)) {
    return "Không kết nối được Word. Hãy mở task pane trong Word desktop rồi thử lại.";
  }
  return message;
}

function proofreadingCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    spelling: "Chính tả",
    grammar: "Ngữ pháp",
    capitalization: "Viết hoa",
    punctuation: "Dấu câu",
    administrative_style: "Văn phong hành chính",
  };
  return labels[category] ?? category;
}

export default function App() {
  const [brandExpanded, setBrandExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem("tvci_brand_expanded");
      return saved === null ? false : saved === "true";
    } catch {
      return false;
    }
  });
  const toggleBrand = () => {
    setBrandExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tvci_brand_expanded", String(next));
      } catch {}
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<AppMainTab>("drafting");
  const [status, setStatus] = useState("Sẵn sàng");
  const [selection, setSelection] = useState("");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [evaluationSummary, setEvaluationSummary] = useState<DocumentEvaluationSummary | null>(null);
  const [recognizedComponents, setRecognizedComponents] = useState<Array<ClassifiedComponent & { text: string }>>([]);
  const [ruleProfileId, setRuleProfileId] = useState<RuleProfileId>("IEMM");
  const [validationScope, setValidationScope] = useState<"selection" | "document">("selection");
  const [customerName, setCustomerName] = useState("");
  const [legalBasisInputText, setLegalBasisInputText] = useState("");
  const [signerRoleInput, setSignerRoleInput] = useState("GIÁM ĐỐC");
  const [signerNameInput, setSignerNameInput] = useState("");
  const [userTemplates, setUserTemplates] = useState<TemplateRecord[]>([]);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [templateOrg, setTemplateOrg] = useState<TemplateOrganization>("TVCI");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateDepartment, setTemplateDepartment] = useState("Văn bản chung");
  const [templateType, setTemplateType] = useState("");
  const [showHiddenTemplates, setShowHiddenTemplates] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState("");
  const [templatePreferences, setTemplatePreferences] = useState<TemplatePreferences>(() => loadTemplatePreferences());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteTemplateIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentTemplateIds());
  const [pendingDraft, setPendingDraft] = useState<TemplateFormDraft | null>(() => getLatestActiveDraft());
  const [hasDocumentContent, setHasDocumentContent] = useState(false);
  const [autoDetectResult, setAutoDetectResult] = useState<AutoDetectResult | null>(null);
  const [docStats, setDocStats] = useState<{ paragraphs: number; words: number; snippet: string }>({
    paragraphs: 0,
    words: 0,
    snippet: "",
  });
  const [builderOrg, setBuilderOrg] = useState<TemplateOrganization>("TVCI");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [builderName, setBuilderName] = useState("Biểu mẫu mới");
  const [builderDepartment, setBuilderDepartment] = useState("Văn bản chung");
  const [builderType, setBuilderType] = useState("Biểu mẫu");
  const [builderKeywords, setBuilderKeywords] = useState("");
  const [builderField, setBuilderField] = useState<string>("TEN_KHACH_HANG");
  const [templateFieldSuggestions, setTemplateFieldSuggestions] = useState<TemplateFieldSuggestion[]>([]);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiPreview, setAiPreview] = useState("");
  const [aiDraftAccepted, setAiDraftAccepted] = useState(false);
  const [aiTargetSelection, setAiTargetSelection] = useState("");
  const [aiWorkspaceOpen, setAiWorkspaceOpen] = useState(false);
  const [aiWorkspaceTab, setAiWorkspaceTab] = useState<"chat" | "template" | "proofread">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatAttachments, setChatAttachments] = useState<AiAttachment[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const [fileFilterAccept, setFileFilterAccept] = useState<string>(".pdf,.docx,.doc,image/*");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>(() => loadChatConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<AiDocumentContext | null>(null);
  const [writingStyle, setWritingStyle] = useState<WritingStyleId>("administrative");
  const [activeTemplateName, setActiveTemplateName] = useState("");
  const [templateFillInput, setTemplateFillInput] = useState("");
  const [templateFillFields, setTemplateFillFields] = useState<TemplateFillField[]>([]);
  const [templateNarrativePreview, setTemplateNarrativePreview] = useState("");
  const [templateNarrativeAccepted, setTemplateNarrativeAccepted] = useState(false);
  const [activeFormTemplate, setActiveFormTemplate] = useState<TemplateRecord | null>(null);
  const [templateFormValues, setTemplateFormValues] = useState<TemplateFormValues>({});
  const [templateFormSessionValues, setTemplateFormSessionValues] = useState<TemplateFormValues>({});
  const [templateFormSource, setTemplateFormSource] = useState("");
  const [templateFormSuggestions, setTemplateFormSuggestions] = useState<TemplateFormAiSuggestion[]>([]);
  const [templateFormSyncMessage, setTemplateFormSyncMessage] = useState("");
  const [proofreadingInput, setProofreadingInput] = useState("");
  const [proofreadingResult, setProofreadingResult] = useState<ProofreadingResult | null>(null);
  const initialAiSettings = useMemo(() => loadAiSettings(), []);
  const [aiProvider, setAiProvider] = useState<AiProviderName>(initialAiSettings.provider);
  const [aiModel, setAiModel] = useState(initialAiSettings.model);
  const [aiApiKey, setAiApiKey] = useState(initialAiSettings.apiKey);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [aiSettingsModalOpen, setAiSettingsModalOpen] = useState(false);
  const [matchedTemplateId, setMatchedTemplateId] = useState<string>("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [lastDraftInput, setLastDraftInput] = useState<string>("");

  useEffect(() => {
    if (aiProvider === "gemini" && aiModel.includes("2.5")) {
      const fixedModel = defaultModelFor("gemini");
      setAiModel(fixedModel);
      saveAiSettings({ provider: aiProvider, model: fixedModel, apiKey: aiApiKey });
    }
  }, [aiProvider, aiModel, aiApiKey]);

  const recommendedTemplates = useMemo(() => {
    const textToMatch = aiPreview || chatInput;
    return suggestMatchingTemplates(textToMatch, TEMPLATE_CATALOG);
  }, [aiPreview, chatInput]);

  useEffect(() => {
    if (activeFormTemplate) {
      setMatchedTemplateId(activeFormTemplate.id);
    } else if (recommendedTemplates.length > 0 && !matchedTemplateId) {
      setMatchedTemplateId(recommendedTemplates[0].id);
    }
  }, [activeFormTemplate]);

  useEffect(() => {
    if (!matchedTemplateId && recommendedTemplates.length > 0) {
      setMatchedTemplateId(recommendedTemplates[0].id);
    }
  }, [recommendedTemplates, matchedTemplateId]);

  const selectedTemplateForMatch = useMemo(() => {
    if (matchedTemplateId) {
      return TEMPLATE_CATALOG.find((t) => t.id === matchedTemplateId) || activeFormTemplate || null;
    }
    return activeFormTemplate || recommendedTemplates[0] || null;
  }, [matchedTemplateId, activeFormTemplate, recommendedTemplates]);

  const selectedTemplateSchema = useMemo(() => {
    return selectedTemplateForMatch ? getTemplateFormSchema(selectedTemplateForMatch) : null;
  }, [selectedTemplateForMatch]);

  const currentFormBaseValues = useMemo(() => {
    return { ...templateFormValues, ...templateFormSessionValues };
  }, [templateFormValues, templateFormSessionValues]);

  const segmentedFields = useMemo(() => {
    if (!aiPreview || !selectedTemplateSchema) return null;
    return decomposeDraftIntoFormFields(selectedTemplateSchema, aiPreview, currentFormBaseValues);
  }, [aiPreview, selectedTemplateSchema, currentFormBaseValues]);

  useEffect(() => {
    if (chatHistory.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, aiPreview]);

  const initialPagePreset = getPageNumberPreset(ruleProfileId);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [tableHeaderRow, setTableHeaderRow] = useState(true);
  const [appendixTitle, setAppendixTitle] = useState("PHỤ LỤC");
  const [appendixRows, setAppendixRows] = useState(4);
  const [appendixColumns, setAppendixColumns] = useState(3);
  const [appendixHeaderRow, setAppendixHeaderRow] = useState(true);
  const [listItems, setListItems] = useState(3);
  const [listLevel, setListLevel] = useState(0);
  const [addresseeText, setAddresseeText] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [recipientPresetId, setRecipientPresetId] = useState(RECIPIENT_PRESETS[0]?.id ?? "above");
  const [pageNumbersEnabled, setPageNumbersEnabled] = useState(initialPagePreset.enabled);
  const [pageNumberPosition, setPageNumberPosition] = useState<PageNumberPosition>(initialPagePreset.position);
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const updateDocumentStatus = async () => {
    try {
      const text = await readDocumentText();
      const trimmed = (text || "").trim();
      if (trimmed.length > 0) {
        const rawParagraphs = trimmed.split(/\r?\n+/).filter(Boolean);
        const paragraphs = rawParagraphs.length;
        const words = trimmed.split(/\s+/).filter(Boolean).length;
        const snippet = trimmed.slice(0, 160).replace(/\s+/g, " ");
        setHasDocumentContent(true);
        setDocStats({ paragraphs, words, snippet });
        const detected = detectDocumentContext(rawParagraphs);
        setAutoDetectResult(detected);
        if (detected.confidence >= 0.75) {
          setRuleProfileId(detected.ruleProfileId);
        }
      } else {
        setHasDocumentContent(false);
        setDocStats({ paragraphs: 0, words: 0, snippet: "" });
        setAutoDetectResult(null);
      }
    } catch {
      // Ignore if outside Word context
    }
  };

  useEffect(() => {
    listUserTemplates().then(setUserTemplates).catch(() => undefined);
    getAllKnowledgeRecords().then(setKnowledgeRecords).catch(() => undefined);
  }, []);
  useEffect(() => {
    const preset = getPageNumberPreset(ruleProfileId);
    setPageNumberPosition(preset.position);
  }, [ruleProfileId]);
  useEffect(() => {
    void updateDocumentStatus();
    setPendingDraft(getLatestActiveDraft());
  }, [activeTab]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "ai" || view === "proofread") {
      const tab = params.get("tab");
      setAiWorkspaceOpen(true);
      setAiWorkspaceTab(view === "proofread" ? "proofread" : tab === "template" ? "template" : "chat");
      return;
    }
    if (view === "standardize" || view === "inspect" || view === "addressee" || view === "recipients" || view === "appendix") {
      setActiveTab("inspect");
      return;
    }
    if (view === "library") {
      setActiveTab("library");
      return;
    }
    const sectionMap: Record<string, string> = {
      guidance: "reference-guidance",
      builder: "template-builder",
      drafting: "drafting-tools",
    };
    const scrollToSection = (sectionId: string) => {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    if (view === "builder" || view === "guidance" || view === "utilities") {
      setActiveTab("utilities");
      const sectionId = sectionMap[view] || "drafting-tools";
      scrollToSection(sectionId);
      return;
    }
    if (view === "knowledge") {
      setActiveTab("knowledge");
      return;
    }
    if (view === "drafting") {
      setActiveTab("drafting");
      return;
    }
  }, []);

  const autoFixCount = useMemo(() => issues.filter((i) => i.autoFixable).length, [issues]);
  const templateFillReadyCount = useMemo(() => templateFillFields.filter((field) => Boolean(field.value?.trim())
    && (field.reviewed === true || field.confidence >= MIN_AUTO_FILL_CONFIDENCE)).length, [templateFillFields]);
  const rawTemplates = useMemo(() => [...TEMPLATE_CATALOG, ...userTemplates], [userTemplates]);
  const allTemplates = useMemo(() => applyTemplatePreferences(rawTemplates, templatePreferences), [rawTemplates, templatePreferences]);
  const filteredTemplates = useMemo(() => searchTemplates(allTemplates, {
    organization: templateOrg,
    department: templateDepartment || undefined,
    documentType: templateType || undefined,
    query: templateQuery,
    includeHidden: showHiddenTemplates,
  }), [allTemplates, templateOrg, templateDepartment, templateType, templateQuery, showHiddenTemplates]);
  const templateEmptyMessage = templateQuery.trim()
    ? "Không tìm thấy biểu mẫu phù hợp với từ khóa hoặc bộ lọc."
    : templateOrg === "TVCI" && templateDepartment !== "Văn bản chung"
      ? `Chưa có biểu mẫu hệ thống cho ${templateDepartment}. Hãy dùng Import DOCX ở phần Tạo biểu mẫu để thêm mẫu đã được phê duyệt.`
      : "Không tìm thấy biểu mẫu phù hợp.";
  const departments = useMemo(() => distinctTemplateValues(allTemplates, "department", templateOrg), [allTemplates, templateOrg]);
  const documentTypes = useMemo(() => distinctTemplateValues(allTemplates, "documentType", templateOrg), [allTemplates, templateOrg]);
  const partyDocumentTypes = useMemo(() => [...new Set([...PARTY_DOCUMENT_TYPES, ...documentTypes])], [documentTypes]);
  const filteredGuidance = useMemo(() => searchQuickGuidance(QUICK_GUIDANCE, referenceQuery), [referenceQuery]);
  const activeFormSchema: TemplateFormSchema | null = activeFormTemplate ? getTemplateFormSchema(activeFormTemplate) : null;

  const favoriteTemplates = useMemo(() => {
    return favoriteIds
      .map((id) => allTemplates.find((t) => t.id === id))
      .filter((t): t is TemplateRecord => Boolean(t));
  }, [favoriteIds, allTemplates]);

  const recentTemplates = useMemo(() => {
    return recentIds
      .map((id) => allTemplates.find((t) => t.id === id))
      .filter((t): t is TemplateRecord => Boolean(t));
  }, [recentIds, allTemplates]);

  const pendingDraftTemplateName = useMemo(() => {
    if (!pendingDraft) return undefined;
    return allTemplates.find((t) => t.id === pendingDraft.templateId)?.name;
  }, [pendingDraft, allTemplates]);

  const relatedKnowledgeCount = useMemo(() => {
    if (!activeFormTemplate) return 0;
    return knowledgeRecords.filter(
      (r) => r.scope === activeFormTemplate.organization || r.scope === "COMMON"
    ).length;
  }, [activeFormTemplate, knowledgeRecords]);

  const handleSaveKnowledgeRecord = async (record: KnowledgeRecord) => {
    await saveCustomKnowledgeRecord(record);
    const refreshed = await getAllKnowledgeRecords();
    setKnowledgeRecords(refreshed);
  };

  const handleDeleteKnowledgeRecord = async (id: string) => {
    await deleteCustomKnowledgeRecord(id);
    const refreshed = await getAllKnowledgeRecords();
    setKnowledgeRecords(refreshed);
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } catch (error) { setStatus(messageOf(error)); } finally { setBusy(false); }
  }

  async function copyText(text: string): Promise<void> {
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") throw new Error("Clipboard unavailable");
      await clipboard.writeText(text);
      setStatus("Đã sao chép nội dung.");
    } catch {
      setStatus("Không thể sao chép tự động. Hãy chọn nội dung và sao chép thủ công.");
    }
  }

  const refreshUserTemplates = async () => setUserTemplates(await listUserTemplates());

  const persistTemplatePreferences = (next: TemplatePreferences) => {
    saveTemplatePreferences(next);
    setTemplatePreferences(next);
  };

  const applyActivePageRules = async () => {
    const page = getRuleProfile(ruleProfileId).page;
    if (page) await applyPageRules(page);
  };

  const handleRead = () => run(async () => {
    const text = await readSelection();
    setSelection(text);
    setStatus(`Đã đọc ${text.length} ký tự từ đoạn chọn.`);
  });

  const handleCheck = () => run(async () => {
    const profile = getRuleProfile(ruleProfileId);
    const snapshots = validationScope === "selection" ? await inspectSelectionParagraphs() : await inspectDocumentParagraphs();
    if (validationScope === "selection" && snapshots.length === 0) throw new Error("Hãy chọn ít nhất một đoạn văn bản trước khi kiểm tra.");

    const pageSnapshot = validationScope === "document" && profile.page ? await inspectPageSetup() : null;
    const summary = evaluateDocumentRules({
      profileId: ruleProfileId,
      validationScope,
      paragraphSnapshots: snapshots,
      pageSnapshot,
      horizontalRuleSnapshot: null,
    });

    setEvaluationSummary(summary);

    if (summary.isBlankDocument) {
      setIssues([]);
      setRecognizedComponents([]);
      setStatus("Tài liệu chưa có nội dung để kiểm tra.");
      return;
    }

    const family = ruleProfileId === "DANG_05_HD_VPTW_2026" ? "PARTY" : "ADMINISTRATIVE";
    const components = classifyDocumentComponents(snapshots.map((s) => s.text), family);
    setRecognizedComponents(components.map((component) => ({ ...component, text: snapshots[component.paragraphIndex]?.text ?? "" })));

    setIssues(summary.issues);
    const pageNote = validationScope === "document" && profile.page && !pageSnapshot ? " Word hiện tại không hỗ trợ kiểm tra lề tự động." : "";
    const componentNote = ` Nhận diện ${components.length} thành phần thể thức.`;
    setStatus(
      `Kiểm tra theo ${profile.name}: Đạt ${summary.passedRules}/${summary.applicableRules} tiêu chuẩn (${summary.healthScore}%).${componentNote}${pageNote}`
    );
  });

  const handleFix = (issue: ValidationIssue) => run(async () => {
    if (issue.targetId === "page") await applyPageIssueFix(issue);
    else if (issue.ruleId.startsWith("text.")) await applyTextIssueFix(issue);
    else await applyIssueFix(issue);
    setIssues((current) => current.filter((item) => item.id !== issue.id));
    setStatus("Đã sửa lỗi được chọn. Nên kiểm tra lại sau khi hoàn tất.");
  });

  const handleFixAllSafeIssues = () => run(async () => {
    const safeIssues = issues.filter((i) => i.autoFixable);
    if (safeIssues.length === 0) return;
    let fixed = 0;
    for (const issue of safeIssues) {
      try {
        if (issue.targetId === "page") await applyPageIssueFix(issue);
        else if (issue.ruleId.startsWith("text.")) await applyTextIssueFix(issue);
        else await applyIssueFix(issue);
        fixed++;
      } catch {
        // Continue fixing remaining safe issues
      }
    }
    await handleCheck();
    setStatus(`Đã tự động sửa thành công ${fixed}/${safeIssues.length} lỗi thể thức an toàn.`);
  });

  const handleLocateIssue = (issue: ValidationIssue) => run(async () => {
    const success = await selectParagraphByTargetId(issue.targetId);
    if (success) {
      setStatus(`Đã chọn đoạn văn bản liên quan đến lỗi "${issue.message}".`);
    } else {
      setStatus(`Không thể định vị trực tiếp đoạn văn bản cho mục "${issue.message}".`);
    }
  });

  const handleInsertLegalBasisBlock = () => run(async () => {
    const lines = legalBasisInputText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Hãy nhập ít nhất một dòng căn cứ ban hành.");
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      for (const raw of lines) {
        let text = raw;
        if (!/^Căn cứ\b/i.test(text)) text = `Căn cứ ${text}`;
        const p = selection.insertParagraph(text, Word.InsertLocation.after);
        p.font.name = "Times New Roman";
        p.font.size = 13;
        p.font.italic = true;
        p.font.bold = false;
        p.alignment = Word.Alignment.left;
        p.firstLineIndent = 0;
        p.spaceBefore = 0;
        p.spaceAfter = 0;
      }
      await context.sync();
    });
    setStatus("Đã chèn khối Căn cứ ban hành chuẩn.");
  });

  const handleInsertSignerBlock = () => run(async () => {
    const role = signerRoleInput.trim() || "GIÁM ĐỐC";
    const name = signerNameInput.trim() || "Họ và tên";
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      const roleP = selection.insertParagraph(role.toUpperCase(), Word.InsertLocation.after);
      roleP.font.name = "Times New Roman";
      roleP.font.size = 13;
      roleP.font.bold = true;
      roleP.font.italic = false;
      roleP.alignment = Word.Alignment.right;
      roleP.spaceBefore = 6;
      roleP.spaceAfter = 48;

      const nameP = roleP.insertParagraph(name, Word.InsertLocation.after);
      nameP.font.name = "Times New Roman";
      nameP.font.size = 13;
      nameP.font.bold = true;
      nameP.font.italic = false;
      nameP.alignment = Word.Alignment.right;
      nameP.spaceBefore = 0;
      nameP.spaceAfter = 6;

      await context.sync();
    });
    setStatus(`Đã chèn khối chữ ký: ${role} - ${name}.`);
  });

  const handleAskAiAboutIssue = (issue: ValidationIssue) => {
    setAiWorkspaceOpen(true);
    setAiWorkspaceTab("chat");
    setChatInput(`Hãy giải thích nguyên nhân và hướng dẫn tôi sửa lỗi thể thức này theo quy định: "${issue.message}". Giá trị hiện tại: "${String(issue.actual)}", quy chuẩn yêu cầu: "${String(issue.expected)}".`);
  };

  const handleSaveAiExperience = async (content: string) => {
    const title = window.prompt("Tiêu đề kinh nghiệm / mẫu câu", "Kinh nghiệm từ phản hồi AI");
    if (!title || !title.trim()) return;
    const newRecord: KnowledgeRecord = {
      id: `ai-exp-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category: "experience",
      scope: (activeFormTemplate?.organization as KnowledgeRecord["scope"]) || "COMMON",
      tags: ["ai", "kinh nghiem"],
      referenceSource: `Trợ lý AI (${aiProvider === "openai" ? "OpenAI" : "Gemini"})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await handleSaveKnowledgeRecord(newRecord);
    setStatus(`Đã lưu "${title}" vào Kho kiến thức nghiệp vụ.`);
  };

  const loadFormValuesForTemplate = (template: TemplateRecord): TemplateFormValues => {
    if (activeFormTemplate?.id === template.id) return templateFormValues;
    return loadTemplateFormDraft(template.id, template.organization, template.documentType)?.values ?? {};
  };

  const handleToggleFavorite = (templateId: string) => {
    toggleFavoriteTemplate(templateId);
    setFavoriteIds(getFavoriteTemplateIds());
  };

  const handleResumeDraft = (draft: TemplateFormDraft) => {
    const template = allTemplates.find((t) => t.id === draft.templateId);
    if (template) {
      void handleOpenTemplateForm(template);
    }
  };

  const handleDiscardDraft = (draft: TemplateFormDraft) => {
    deleteTemplateFormDraft(draft.templateId, draft.organization, draft.documentType);
    setPendingDraft(getLatestActiveDraft());
    setStatus("Đã hủy bản nháp biểu mẫu.");
  };

  const handleSaveDraftExplicit = () => {
    if (activeFormTemplate) {
      saveTemplateFormDraft(activeFormTemplate.id, activeFormTemplate.organization, activeFormTemplate.documentType, templateFormValues);
      setPendingDraft(getLatestActiveDraft());
      setStatus(`Đã lưu bản nháp "${activeFormTemplate.name}".`);
    }
  };

  const handleOpenTemplateForm = (template: TemplateRecord, initialValues?: TemplateFormValues) => run(async () => {
    sendDebug(`handleOpenTemplateForm: ${template.id} (${template.name})`);
    const schema = getTemplateFormSchema(template);
    if (!schema) throw new Error("Mẫu này không thuộc phạm vi form Viện, Trung tâm hoặc Văn bản Đảng.");
    addRecentTemplate(template.id);
    setRecentIds(getRecentTemplateIds());
    const draft = loadTemplateFormDraft(template.id, template.organization, template.documentType);
    const activeProfile = profileStorage.getActiveProfile();
    const profileValues: TemplateFormValues = {};
    if (activeProfile && !draft) {
      profileValues["NGUOI_KY"] = activeProfile.fullName;
      profileValues["CHUC_VU_NGUOI_KY"] = activeProfile.jobTitle;
      profileValues["DIA_DANH"] = activeProfile.defaultLocation;
      // We could map more based on the form, but these are most common.
    }
    const values = { ...profileValues, ...templateFormSessionValues, ...(draft?.values ?? {}), ...(initialValues ?? {}) };
    setActiveFormTemplate(template);
    setActiveTab("drafting");
    setAiWorkspaceOpen(false);
    setTemplateLibraryOpen(false);
    setTemplateFormValues(values);
    setTemplateFormSource("");
    setTemplateFormSuggestions([]);
    setTemplateFormSyncMessage("");
    setStatus(draft ? `Đã mở bản nháp form "${template.name}".` : `Đã mở form "${schema.label}" cho ${template.name}. Hãy điền thông tin rồi bấm "Chèn mẫu & Điền vào Word".`);
    try {
      setTimeout(() => {
        document.getElementById("template-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {}
  });

  const handleInsertTemplateBlank = (template: TemplateRecord) => run(async () => {
    sendDebug(`handleInsertTemplateBlank: ${template.id} (${template.name})`);
    setStatus(`Đang chèn mẫu "${template.name}" vào Word...`);
    await runTemplateInsertion(() => insertTemplate(template));
    setActiveTemplateName(template.name);
    setStatus(`Đã chèn mẫu "${template.name}" vào văn bản soạn thảo thành công!`);
    sendDebug(`handleInsertTemplateBlank succeeded: ${template.name}`);
  });

  const handleInsertTemplateAndFill = (template: TemplateRecord) => run(async () => {
    const schema = getTemplateFormSchema(template);
    if (!schema) throw new Error("Mẫu này không thuộc phạm vi form Viện, Trung tâm hoặc Văn bản Đảng.");
    sendDebug(`handleInsertTemplateAndFill: ${template.id} (${template.name})`);
    setStatus(`Đang chèn mẫu và điền thông tin cho "${template.name}"...`);
    const values = { ...templateFormSessionValues, ...loadFormValuesForTemplate(template) };
    const normalized = normalizeTemplateFormValues(schema, values);
    const errors = validateTemplateForm(schema, values);
    setActiveFormTemplate(template);
    setTemplateFormValues(values);
    saveTemplateFormDraft(template.id, template.organization, template.documentType, values);
    await runTemplateInsertion(() => insertTemplate(template));
    const sync = await applyTemplateFormToWord(schema, normalized);
    setActiveTemplateName(template.name);
    setTemplateFormSyncMessage(describeTemplateFormSync(sync));
    const hint = errors.length ? ` (còn ${errors.length} trường chưa nhập có thể sửa trực tiếp trên Word)` : "";
    setStatus(`Đã chèn mẫu và điền dữ liệu thành công cho "${template.name}"!${hint}`);
    sendDebug(`handleInsertTemplateAndFill succeeded: ${template.name}`);
  });

  const handleApplyDraftDirectToTemplate = (template?: TemplateRecord) => run(async () => {
    if (!aiPreview.trim()) throw new Error("Chưa có nội dung dự thảo để áp dụng.");
    const target = template || selectedTemplateForMatch || activeFormTemplate;
    if (!target) throw new Error("Chưa chọn biểu mẫu để áp dụng.");
    const schema = getTemplateFormSchema(target);
    if (!schema) throw new Error("Mẫu này không thuộc phạm vi điền tự động.");
    sendDebug(`handleApplyDraftDirectToTemplate: ${target.id} (${target.name})`);
    setStatus(`Đang áp dụng toàn bộ nội dung vừa soạn vào biểu mẫu "${target.name}"...`);

    const baseValues = { ...templateFormValues, ...templateFormSessionValues };
    const mappedValues = mapDraftToFormValues(schema, aiPreview, baseValues);
    const normalized = normalizeTemplateFormValues(schema, mappedValues);

    setActiveFormTemplate(target);
    setActiveTemplateName(target.name);
    setTemplateFormValues(mappedValues);
    saveTemplateFormDraft(target.id, target.organization, target.documentType, mappedValues);

    let alreadyInWord = false;
    try {
      alreadyInWord = await Word.run(async (context) => {
        const controls = context.document.contentControls;
        controls.load("items/tag");
        await context.sync();
        return controls.items.some((c) => schema.fields.some((f) => f.tag === c.tag));
      });
    } catch {
      alreadyInWord = false;
    }

    if (!alreadyInWord) {
      setStatus(`Đang chèn khung mẫu "${target.name}" và điền các trường vào Word...`);
      await runTemplateInsertion(() => insertTemplate(target));
    }

    const sync = await applyTemplateFormToWord(schema, normalized);
    setTemplateFormSyncMessage(describeTemplateFormSync(sync));
    setStatus(`✓ Đã áp dụng thành công toàn bộ nội dung vừa soạn vào biểu mẫu "${target.name}" trên Word!`);
  });

  const handleOpenTemplateFormWithDraft = (template?: TemplateRecord) => run(async () => {
    if (!aiPreview.trim()) throw new Error("Chưa có nội dung dự thảo để đưa vào biểu mẫu.");
    const target = template || selectedTemplateForMatch || activeFormTemplate;
    if (!target) throw new Error("Chưa chọn biểu mẫu.");
    const schema = getTemplateFormSchema(target);
    if (!schema) throw new Error("Mẫu này không thuộc phạm vi form.");
    const baseValues = { ...templateFormValues, ...templateFormSessionValues };
    const mappedValues = mapDraftToFormValues(schema, aiPreview, baseValues);
    await handleOpenTemplateForm(target, mappedValues);
    setStatus(`✓ Đã nạp toàn bộ nội dung soạn thảo vào form "${target.name}". Hãy rà soát thêm thông tin và bấm Chèn vào Word.`);
  });

  const handleTemplateFormChange = (tag: string, value: TemplateFormValue) => {
    const next = { ...templateFormValues, [tag]: value };
    setTemplateFormValues(next);
    if (TEMPLATE_FORM_SESSION_TAGS.has(tag)) setTemplateFormSessionValues((current) => ({ ...current, [tag]: value }));
    if (activeFormTemplate) saveTemplateFormDraft(activeFormTemplate.id, activeFormTemplate.organization, activeFormTemplate.documentType, next);
  };

  const handleApplyTemplateForm = () => run(async () => {
    if (!activeFormTemplate || !activeFormSchema) throw new Error("Hãy mở form từ một biểu mẫu trước.");
    const normalized = normalizeTemplateFormValues(activeFormSchema, templateFormValues);
    const errors = validateTemplateForm(activeFormSchema, templateFormValues);
    saveTemplateFormDraft(activeFormTemplate.id, activeFormTemplate.organization, activeFormTemplate.documentType, templateFormValues);
    setTemplateFormSessionValues((current) => {
      const next = { ...current };
      for (const tag of TEMPLATE_FORM_SESSION_TAGS) if (normalized[tag] !== undefined) next[tag] = normalized[tag];
      return next;
    });
    const result = await applyTemplateFormToWord(activeFormSchema, normalized);
    const message = describeTemplateFormSync(result);
    setTemplateFormSyncMessage(message);
    const hint = errors.length ? ` (Còn ${errors.length} trường chưa nhập)` : "";
    setStatus(`Đã cập nhật các trường vào văn bản Word!${hint}`);
  });

  const handleSuggestTemplateForm = () => run(async () => {
    if (!activeFormSchema) throw new Error("Hãy mở form từ một biểu mẫu trước.");
    if (!templateFormSource.trim()) throw new Error("Hãy nhập dữ liệu nguồn cho AI.");
    const raw = await requestAiPromptDirect(
      { provider: aiProvider, model: aiModel, apiKey: aiApiKey },
      buildTemplateFormPrompt(activeFormSchema, templateFormSource),
    );
    const suggestions = filterTemplateFormSuggestions(activeFormSchema, parseTemplateFormSuggestions(raw, activeFormSchema));
    setTemplateFormSuggestions(suggestions);
    setStatus(`AI đã đề xuất ${suggestions.length} trường theo schema.`);
  });

  const handleAcceptTemplateFormAi = () => {
    if (templateFormSuggestions.some((suggestion) => suggestion.confidence < 0.8 && suggestion.reviewed !== true)) {
      setStatus("Hãy rà soát các đề xuất độ tin cậy dưới 80% trước khi chấp nhận.");
      return;
    }
    const next = mergeAcceptedTemplateFormSuggestions(templateFormValues, templateFormSuggestions);
    setTemplateFormValues(next);
    setTemplateFormSessionValues((current) => {
      const updated = { ...current };
      for (const tag of TEMPLATE_FORM_SESSION_TAGS) if (next[tag] !== undefined) updated[tag] = next[tag];
      return updated;
    });
    if (activeFormTemplate) saveTemplateFormDraft(activeFormTemplate.id, activeFormTemplate.organization, activeFormTemplate.documentType, next);
    setTemplateFormSuggestions([]);
    setStatus("Đã chấp nhận đề xuất AI vào form. Bấm 'Áp dụng vào Word' để điền.");
  };

  const handleReviewTemplateFormAi = (tag: string) => {
    setTemplateFormSuggestions((current) => current.map((suggestion) => suggestion.tag === tag ? { ...suggestion, reviewed: true } : suggestion));
  };

  const handleTemplateFormAiValueChange = (tag: string, value: string) => {
    setTemplateFormSuggestions((current) => current.map((suggestion) => suggestion.tag === tag ? { ...suggestion, value: value || null, reviewed: true } : suggestion));
  };

  const handleCloseTemplateForm = () => {
    setActiveFormTemplate(null);
    setTemplateFormValues({});
    setTemplateFormSuggestions([]);
    setTemplateFormSource("");
    setTemplateFormSyncMessage("");
  };

  const handleImportTemplate = (file: File | undefined) => run(async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) throw new Error("Chỉ hỗ trợ file .docx.");
    const record = makeUserTemplateRecord({ name: builderName, organization: builderOrg, department: builderDepartment, documentType: builderType, keywords: builderKeywords });
    await saveUserTemplate(record, await file.arrayBuffer());
    await refreshUserTemplates();
    setStatus(`Đã thêm ${record.name} vào kho ${record.organization}.`);
  });

  const handleDeleteTemplate = (template: TemplateRecord) => run(async () => {
    if (template.source.kind !== "user") return;
    await deleteUserTemplate(template.source.storageId);
    await refreshUserTemplates();
    setStatus("Đã xóa biểu mẫu cục bộ.");
  });

  const handleToggleHidden = (template: TemplateRecord) => run(async () => {
    const next = setTemplateHidden(templatePreferences, template.id, !template.hidden);
    persistTemplatePreferences(next);
    setStatus(template.hidden ? "Đã hiện lại biểu mẫu." : "Đã ẩn biểu mẫu khỏi danh sách mặc định.");
  });

  const handleSetDefault = (template: TemplateRecord) => run(async () => {
    const next = setTemplateDefault(allTemplates, templatePreferences, template.id);
    persistTemplatePreferences(next);
    setStatus(`Đã đặt ${template.name} làm biểu mẫu mặc định cho ${template.documentType}.`);
  });

  const handleMoveTemplate = (template: TemplateRecord, direction: "up" | "down") => run(async () => {
    const next = moveTemplate(allTemplates, templatePreferences, template.id, direction);
    persistTemplatePreferences(next);
    setStatus(direction === "up" ? "Đã chuyển biểu mẫu lên." : "Đã chuyển biểu mẫu xuống.");
  });

  const handleEditTemplate = (template: TemplateRecord) => run(async () => {
    if (template.source.kind !== "user") throw new Error("Mẫu hệ thống chỉ cho phép ẩn, sắp xếp và đặt mặc định. Hãy import một bản cá nhân để sửa nội dung metadata.");
    const name = window.prompt("Tên biểu mẫu", template.name);
    if (name === null) return;
    const department = window.prompt("Phòng / tab", template.department);
    if (department === null) return;
    const documentType = window.prompt("Loại văn bản", template.documentType);
    if (documentType === null) return;
    const version = window.prompt("Version", template.version);
    if (version === null) return;
    const keywords = window.prompt("Từ khóa, cách nhau bằng dấu phẩy", template.keywords.join(", "));
    if (keywords === null) return;
    const description = window.prompt("Mô tả", template.description ?? "");
    if (description === null) return;
    const updated = updateUserTemplateRecord(template, { name, department, documentType, version, keywords, description });
    const data = await getUserTemplateData(template.source.storageId);
    await saveUserTemplate(updated, data);
    await refreshUserTemplates();
    setStatus(`Đã cập nhật ${updated.name} lên version ${updated.version}.`);
  });

  const handleAddField = () => run(async () => {
    await addContentControlAtSelection(builderField, builderField.split("_").join(" "));
    setStatus(`Đã tạo Content Control ${builderField} tại vùng chọn.`);
  });

  const handleExportTemplate = () => run(async () => {
    const safeName = builderName.trim() || "TVCI-template";
    await exportCurrentDocumentAsDocx(safeName);
    setStatus("Đã xuất tài liệu hiện tại thành file DOCX template.");
  });

  const handleAnalyzeTemplate = () => run(async () => {
    const text = await readDocumentText();
    if (!text) throw new Error("Tài liệu đang trống.");
    const raw = await requestAiPromptDirect({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }, buildTemplateFieldPrompt(text));
    const suggestions = parseTemplateFieldSuggestions(raw);
    setTemplateFieldSuggestions(suggestions);
    setStatus(`AI đề xuất ${suggestions.length} trường động.`);
  });

  const handleApplyTemplateSuggestion = (suggestion: TemplateFieldSuggestion) => run(async () => {
    await addContentControlAroundFirstMatch(suggestion.sourceText, suggestion.tag, suggestion.title);
    setTemplateFieldSuggestions((current) => current.filter((item) => item !== suggestion));
    setStatus(`Đã tạo Content Control ${suggestion.tag}.`);
  });

  const handleFillCustomer = () => run(async () => {
    if (!customerName.trim()) throw new Error("Nhập tên khách hàng trước khi điền biểu mẫu.");
    await setContentControlText("TEN_KHACH_HANG", customerName.trim());
    setStatus("Đã điền trường TEN_KHACH_HANG.");
  });

  const handleDiscoverModels = () => run(async () => {
    if (!aiApiKey.trim()) throw new Error("Vui lòng nhập API Key trước khi kiểm tra.");
    setStatus("Đang kết nối tới máy chủ AI để lấy danh sách mô hình...");
    const result = await discoverAvailableModels(aiProvider, aiApiKey);
    setAvailableModels(result.models);
    const selected = chooseConfiguredModel(aiModel, result.models, result.recommended);
    setAiModel(selected);
    saveAiSettings({ provider: aiProvider, model: selected, apiKey: aiApiKey });
    setStatus(`✓ Kết nối thành công! Đã lấy ${result.models.length} mô hình hợp lệ từ ${aiProvider === "gemini" ? "Google" : "OpenAI"}; đang dùng "${selected}".`);
  });

  const handleSaveAiSettings = () => run(async () => {
    if (!aiApiKey.trim()) throw new Error("Vui lòng nhập API Key trước khi lưu.");
    const result = await discoverAvailableModels(aiProvider, aiApiKey);
    setAvailableModels(result.models);
    const selectedModel = chooseConfiguredModel(aiModel, result.models, result.recommended);
    setAiModel(selectedModel);
    saveAiSettings({ provider: aiProvider, model: selectedModel, apiKey: aiApiKey });
    setStatus(`✓ Đã xác thực API và lưu cấu hình với mô hình "${selectedModel}".`);
  });

  const handleTemplateOrgChange = (organization: TemplateOrganization) => {
    setTemplateOrg(organization);
    setRuleProfileId(resolveRuleProfileForOrganization(organization).id);
    setTemplateDepartment(organization === "TVCI" ? "Văn bản chung" : organization === "DANG" ? "Văn bản Đảng" : "");
    setTemplateType("");
  };

  const handleBuilderOrgChange = (organization: TemplateOrganization) => {
    setBuilderOrg(organization);
    setBuilderDepartment(organization === "TVCI" ? "Văn bản chung" : organization === "DANG" ? "Văn bản Đảng" : "Dùng chung");
    if (organization === "DANG" && !PARTY_DOCUMENT_TYPES.includes(builderType as (typeof PARTY_DOCUMENT_TYPES)[number])) setBuilderType("Nghị quyết");
  };

  const handleCreateTable = () => run(async () => {
    await applyActivePageRules();
    await insertStandardTable(ruleProfileId, tableRows, tableColumns, tableHeaderRow);
    setStatus(`Đã tạo bảng ${tableRows}×${tableColumns} theo ${getRuleProfile(ruleProfileId).name}.`);
  });
  const handleInsertAppendix = () => run(async () => {
    await applyActivePageRules();
    await insertAppendix(ruleProfileId, appendixTitle);
    setStatus(`Đã thêm ${appendixTitle.trim() || "PHỤ LỤC"} ở cuối tài liệu.`);
  });
  const handleCreateAppendixTable = () => run(async () => {
    await applyActivePageRules();
    await insertAppendixTable(ruleProfileId, appendixRows, appendixColumns, appendixHeaderRow);
    setStatus(`Đã tạo bảng phụ lục ${appendixRows}×${appendixColumns}. Cột STT đã sẵn sàng.`);
  });
  const handleNumberSelectedTable = () => run(async () => {
    await numberSelectedTable();
    setStatus("Đã đánh lại STT cho bảng đang chọn.");
  });
  const handleCreateList = (kind: "BULLET" | "NUMBERED") => run(async () => {
    await applyActivePageRules();
    await insertStandardList(ruleProfileId, kind, listItems, listLevel);
    setStatus(kind === "BULLET" ? "Đã tạo danh sách gạch đầu dòng chuẩn." : "Đã tạo danh sách đánh số chuẩn.");
  });
  const handleInsertOutline = (kind: OutlineKind) => run(async () => {
    await applyActivePageRules();
    await insertOutline(ruleProfileId, kind);
    setStatus("Đã chèn đề mục theo bộ quy tắc hiện tại.");
  });
  const handleInsertAddressee = () => run(async () => {
    await applyActivePageRules();
    const recipients = addresseeText.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
    await insertAddressee(ruleProfileId, recipients);
    setStatus("Đã chèn phần Kính gửi theo quy cách.");
  });
  const handleInsertRecipients = () => run(async () => {
    await applyActivePageRules();
    const recipients = recipientsText.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
    await insertRecipients(ruleProfileId, recipients);
    setStatus("Đã chèn phần Nơi nhận theo quy cách.");
  });
  const handleAddRecipientPreset = () => {
    const preset = RECIPIENT_PRESETS.find((item) => item.id === recipientPresetId);
    if (!preset) return;
    setRecipientsText((current) => current.trim() ? `${current.trim()}\n${preset.value}` : preset.value);
  };
  const handleInsertRule = (kind: HorizontalRuleKind) => run(async () => {
    await applyActivePageRules();
    await insertHorizontalRule(kind);
    setStatus("Đã chèn đường kẻ theo quy cách tại vùng chọn.");
  });
  const handleApplyPageNumbers = () => run(async () => {
    await configurePageNumbers(ruleProfileId, pageNumbersEnabled, pageNumberPosition);
    setStatus(pageNumbersEnabled ? "Đã áp dụng đánh số trang." : "Đã gỡ số trang.");
  });
  const handleApplyHeaderFooter = () => run(async () => {
    await configureHeaderFooter(headerEnabled ? headerText : "", footerEnabled ? footerText : "");
    setStatus("Đã cập nhật Header/Footer.");
  });

  const persistConversation = (messages: ChatMessage[]) => {
    const now = new Date().toISOString();
    const existing = activeConversationId ? chatConversations.find((item) => item.id === activeConversationId) : undefined;
    const conversation: ChatConversation = existing
      ? updateChatConversation(existing, messages, now)
      : createChatConversation(messages, now);
    const next = upsertChatConversation(chatConversations, conversation);
    saveChatConversations(next);
    setChatConversations(next);
    setActiveConversationId(conversation.id);
  };

  const collectDocumentContext = async (): Promise<AiDocumentContext> => {
    const context = await readWordAiDocumentContext(activeTemplateName, getRuleProfile(ruleProfileId).name);
    setDocumentContext(context);
    return context;
  };

  const handleReadDocumentContext = () => run(async () => {
    const context = await collectDocumentContext();
    setAiTargetSelection(context.selectionText ?? "");
    setStatus(`Đã đọc tài liệu: ${context.documentText.length} ký tự.`);
  });
  const handleLoadSelectionForAi = () => run(async () => {
    const text = await readSelection();
    setChatInput(text);
    setProofreadingInput(text);
    setAiTargetSelection(text);
    setStatus(`Đã nạp ${text.length} ký tự từ đoạn đang chọn.`);
  });
  const handlePickAttachment = (accept: string) => {
    setFileFilterAccept(accept);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setAttachmentLoading(true);
    setStatus("Đang đọc tệp đính kèm...");
    try {
      const list: AiAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const att = await processAttachmentFile(files[i]);
        list.push(att);
      }
      setChatAttachments((prev) => [...prev, ...list]);
      setStatus(`Đã đính kèm ${list.length} tài liệu nguồn.`);
    } catch (err) {
      setStatus(`Lỗi đọc tệp: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAttachmentLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setChatAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendChat = (overridePrompt?: unknown) => run(async () => {
    const input = (typeof overridePrompt === "string" ? overridePrompt : chatInput).trim();
    if (!input && chatAttachments.length === 0) throw new Error("Nhập yêu cầu soạn thảo hoặc đính kèm tài liệu nguồn cho AI.");
    if (!aiApiKey || !aiApiKey.trim()) {
      setAiSettingsModalOpen(true);
      throw new Error(`Chưa có khóa API Key cho ${aiProvider === "gemini" ? "Google Gemini" : "OpenAI"}. Đã mở hộp thoại Cài đặt, vui lòng dán API Key để AI bắt đầu soạn thảo.`);
    }
    const targetSelection = aiTargetSelection.trim() && aiTargetSelection.trim() === input ? aiTargetSelection : "";
    const attachmentNote = chatAttachments.length > 0
      ? ` (Kèm ${chatAttachments.length} tệp nguồn: ${chatAttachments.map((a) => a.name).join(", ")})`
      : "";
    const effectiveInput = input || "Soạn thảo văn bản hành chính hoàn chỉnh dựa trên các tài liệu nguồn đính kèm.";
    const userMessage: ChatMessage = { role: "user", content: input ? `${input}${attachmentNote}` : `Soạn thảo văn bản theo tài liệu đính kèm:${attachmentNote}` };
    const augmentedInstruction = buildAugmentedAiPrompt({
      userMessage: input,
      template: activeFormTemplate,
      knowledgeRecords,
      selection: targetSelection || aiTargetSelection,
      documentSnippet: docStats.snippet,
      ruleProfileName: getRuleProfile(ruleProfileId).name,
    });
    const contextInstruction = [
      aiInstruction,
      augmentedInstruction,
      documentContext ? `Ngữ cảnh Word đang mở:\n${buildDocumentContextBlock(documentContext)}` : "",
    ].filter(Boolean).join("\n\n");
    const prompt = buildWritingPrompt({ input: effectiveInput, style: writingStyle, history: chatHistory, instruction: contextInstruction });
    const output = await requestAiPromptDirect(
      { provider: aiProvider, model: aiModel, apiKey: aiApiKey },
      prompt,
      fetch,
      chatAttachments
    );
    const nextMessages = [...chatHistory, userMessage, { role: "assistant", content: output } as ChatMessage];
    persistConversation(nextMessages);
    setChatHistory(nextMessages);
    setAiPreview(output);
    setAiDraftAccepted(false);
    setAiTargetSelection(targetSelection);
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setLastDraftInput(input || "Soạn thảo văn bản theo tài liệu đính kèm");
    setChatInput("");
    setStatus("✓ Soạn thảo thành công! Hãy xem nội dung đã bóc tách và chọn áp dụng vào biểu mẫu bên dưới.");
    setTimeout(() => {
      document.getElementById("ai-proposal-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  });

  const handleRedraft = () => {
    const promptToUse = lastDraftInput.trim() || chatInput.trim();
    if (!promptToUse && chatAttachments.length === 0) {
      setStatus("Chưa có nội dung yêu cầu trước đó để soạn lại. Hãy nhập yêu cầu vào khung soạn thảo.");
      return;
    }
    void handleSendChat(promptToUse);
  };

  const handleEditAndRedraft = () => {
    const promptToUse = lastDraftInput.trim() || chatInput.trim();
    if (promptToUse) {
      setChatInput(promptToUse);
    }
    const textarea = document.querySelector(".aiDraftingTextarea") as HTMLTextAreaElement | null;
    textarea?.focus();
    textarea?.scrollIntoView({ behavior: "smooth", block: "center" });
    setStatus("Đã nạp lại yêu cầu vào khung soạn thảo. Bạn có thể chỉnh sửa và bấm Gửi AI soạn thảo.");
  };
  const handleQuickDraft = (action: QuickDraftActionId) => run(async () => {
    if (!aiApiKey || !aiApiKey.trim()) {
      setAiSettingsModalOpen(true);
      throw new Error(`Chưa có khóa API Key cho ${aiProvider === "gemini" ? "Google Gemini" : "OpenAI"}. Đã mở hộp thoại Cài đặt, vui lòng dán API Key.`);
    }
    const context = documentContext ?? await collectDocumentContext();
    const actionMeta = QUICK_DRAFT_ACTIONS.find((item) => item.id === action);
    const prompt = buildQuickDraftPrompt({ action, context, userInstruction: aiInstruction });
    const output = await requestAiPromptDirect({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }, prompt, fetch, chatAttachments);
    const nextMessages: ChatMessage[] = [...chatHistory, { role: "user", content: `Viết nhanh: ${actionMeta?.label ?? action}` }, { role: "assistant", content: output }];
    persistConversation(nextMessages);
    setChatHistory(nextMessages);
    setAiPreview(output);
    setAiDraftAccepted(false);
    setAiTargetSelection(context.selectionText ?? "");
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus(`✓ Đã soạn xong phần ${actionMeta?.label ?? action}. Hãy xem đề xuất bên dưới.`);
    setTimeout(() => {
      document.getElementById("ai-proposal-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  });
  const handleApplyInputDirectToTemplate = () => {
    const input = chatInput.trim();
    if (!input) return;
    setAiPreview(input);
    setAiDraftAccepted(false);
    const target = selectedTemplateForMatch || activeFormTemplate;
    if (target) {
      void handleApplyDraftDirectToTemplate(target);
    } else {
      setStatus("✓ Đã nhận diện văn bản! Chọn biểu mẫu phù hợp bên dưới để áp dụng vào Word.");
      setTimeout(() => {
        document.getElementById("ai-proposal-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };
  const handleNewChat = () => { setChatHistory([]); setChatAttachments([]); setAiPreview(""); setAiDraftAccepted(false); setAiTargetSelection(""); setTemplateNarrativePreview(""); setTemplateNarrativeAccepted(false); setActiveConversationId(null); setStatus("Đã mở cuộc chat mới."); };
  const handleSelectAiDraft = (content: string) => {
    setAiPreview(content);
    setAiDraftAccepted(true);
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus("Đã chấp nhận bản AI. Chọn vị trí chèn vào Word.");
  };
  const handleRenameConversation = (conversation: ChatConversation) => run(async () => {
    const title = window.prompt("Tên cuộc chat", conversation.title);
    if (title === null || !title.trim()) return;
    const next = renameChatConversation(chatConversations, conversation.id, title);
    saveChatConversations(next);
    setChatConversations(next);
    setStatus("Đã đổi tên cuộc chat.");
  });
  const handleDeleteConversation = (conversation: ChatConversation) => run(async () => {
    if (!window.confirm(`Xóa cuộc chat "${conversation.title}"?`)) return;
    const next = deleteChatConversation(chatConversations, conversation.id);
    saveChatConversations(next);
    setChatConversations(next);
    if (activeConversationId === conversation.id) {
      setActiveConversationId(null);
      setChatHistory([]);
      setAiPreview("");
      setAiDraftAccepted(false);
      setAiTargetSelection("");
      setTemplateNarrativePreview("");
      setTemplateNarrativeAccepted(false);
    }
    setStatus("Đã xóa cuộc chat.");
  });
  const handleOpenConversation = (conversation: ChatConversation) => {
    setActiveConversationId(conversation.id);
    setChatHistory(conversation.messages);
    const lastAssistant = [...conversation.messages].reverse().find((item) => item.role === "assistant");
    setAiPreview(lastAssistant?.content ?? "");
    setAiDraftAccepted(false);
    setAiTargetSelection("");
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus(`Đã mở lại: ${conversation.title}`);
  };
  const handleClearStoredChats = () => run(async () => {
    if (!window.confirm("Xóa toàn bộ lịch sử chat cục bộ?")) return;
    clearChatConversations();
    setChatConversations([]);
    setActiveConversationId(null);
    setChatHistory([]);
    setAiPreview("");
    setAiDraftAccepted(false);
    setAiTargetSelection("");
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus("Đã xóa lịch sử chat cục bộ.");
  });
  const handleAnalyzeTemplateFill = () => run(async () => {
    const controls = await listTaggedContentControls();
    const prompt = buildTemplateFillPrompt(controls, templateFillInput);
    const raw = await requestAiPromptDirect({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }, prompt);
    const fields = filterTemplateFillFieldsToControls(controls, parseTemplateFillResult(raw));
    setTemplateFillFields(fields);
    setStatus(`AI đã phân tích ${fields.length} trường.`);
  });
  const handleApplyTemplateFill = () => run(async () => {
    const controls = await listTaggedContentControls();
    const safeValues = selectSafeTemplateFills(controls, templateFillFields);
    if (!safeValues.length) throw new Error("Chưa có trường đủ tin cậy để điền. Hãy rà soát hoặc chỉnh giá trị cần dùng.");
    const updated = await setMultipleContentControlTexts(safeValues);
    setStatus(`Đã điền ${updated} Content Control vào biểu mẫu.`);
  });
  const handleDraftTemplateNarrative = () => run(async () => {
    const controls = await listTaggedContentControls();
    const documentText = await readDocumentText();
    const prompt = buildTemplateNarrativePrompt({ templateName: activeTemplateName, controls, fields: templateFillFields, sourceText: templateFillInput, documentText });
    const output = await requestAiPromptDirect({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }, prompt);
    setTemplateNarrativePreview(output);
    setTemplateNarrativeAccepted(false);
    setAiPreview(output);
    setAiDraftAccepted(false);
    setStatus("AI đã soạn phần nội dung tự do còn thiếu.");
  });
  const handleAcceptTemplateNarrative = () => {
    if (!templateNarrativePreview.trim()) {
      setStatus("Chưa có nội dung AI để chấp nhận.");
      return;
    }
    setTemplateNarrativeAccepted(true);
    setStatus("Đã chấp nhận nội dung AI. Chọn thao tác để điền vào Word.");
  };
  const handleInsertTemplateNarrative = () => run(async () => {
    if (!templateNarrativePreview) throw new Error("Chưa có nội dung AI để chèn.");
    if (!templateNarrativeAccepted) throw new Error("Hãy chấp nhận nội dung AI trước khi điền vào Word.");
    await applyActivePageRules();
    await insertBelowSelection(templateNarrativePreview);
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus("Đã chèn nội dung AI bên dưới vùng chọn.");
  });
  const handleProofread = () => run(async () => {
    const source = proofreadingInput.trim();
    if (!source) throw new Error("Nhập nội dung hoặc lấy đoạn đang chọn để kiểm tra.");
    const raw = await requestAiPromptDirect({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }, buildProofreadingPrompt(source));
    const result = parseProofreadingResult(raw);
    setProofreadingResult(result);
    setAiPreview(result.revisedText);
    setAiDraftAccepted(false);
    setTemplateNarrativePreview("");
    setTemplateNarrativeAccepted(false);
    setStatus(`Đã kiểm tra: phát hiện ${result.issues.length} vấn đề cần xem xét.`);
  });
  const handleApplyProofreadingIssue = (issue: ProofreadingIssue) => run(async () => {
    await replaceFirstInSelection(issue.original, issue.suggestion);
    setProofreadingInput((current) => applyProofreadingIssueToText(current, issue));
    setProofreadingResult((current) => current ? { ...current, issues: current.issues.filter((item) => item !== issue) } : current);
    setStatus("Đã sửa lỗi được chọn trong vùng Word hiện tại.");
  });
  const handleIgnoreProofreadingIssue = (issue: ProofreadingIssue) => {
    setProofreadingResult((current) => current ? { ...current, issues: current.issues.filter((item) => item !== issue) } : current);
    setStatus("Đã bỏ qua lỗi được chọn; tài liệu Word chưa thay đổi.");
  };
  const handleApplySafeProofreading = () => run(async () => {
    if (!proofreadingResult) throw new Error("Chưa có kết quả kiểm tra.");
    const safeText = applySafeProofreadingIssues(proofreadingInput, proofreadingResult.issues);
    await replaceSelectionIfMatches(proofreadingInput, safeText);
    setProofreadingInput(safeText);
    setProofreadingResult({ ...proofreadingResult, revisedText: safeText, issues: proofreadingResult.issues.filter((issue) => !isSafeProofreadingIssue(issue)) });
    setAiPreview(safeText);
    setAiDraftAccepted(false);
    setStatus("Đã áp dụng các lỗi an toàn; lỗi văn phong vẫn giữ để người dùng duyệt.");
  });
  const handleLoadSelectionForTemplateFill = () => run(async () => {
    const text = await readSelection();
    setTemplateFillInput(text);
    setStatus(`Đã nạp ${text.length} ký tự làm dữ liệu điền biểu mẫu.`);
  });
  const handleLoadSelectionForProofread = () => run(async () => {
    const text = await readSelection();
    setProofreadingInput(text);
    setStatus(`Đã nạp ${text.length} ký tự để kiểm tra.`);
  });
  const handleApplyProofreadReplace = () => run(async () => {
    if (!proofreadingResult?.revisedText) throw new Error("Chưa có bản hiệu chỉnh.");
    await replaceSelectionIfMatches(proofreadingInput, proofreadingResult.revisedText);
    setStatus("Đã thay đoạn chọn bằng bản đã hiệu chỉnh.");
  });

  const handleClearAiSettings = () => run(async () => { clearAiSettings(); setAiApiKey(""); setStatus("Đã xóa API key đã lưu trên máy này."); });
  const handleProviderChange = (provider: AiProviderName) => { setAiProvider(provider); setAiModel(defaultModelFor(provider)); setAvailableModels([]); };
  const handleApplyReplace = () => run(async () => {
    if (!aiPreview) throw new Error("Chưa có nội dung AI để áp dụng.");
    if (!aiDraftAccepted) throw new Error("Hãy chấp nhận bản AI trước khi áp dụng vào Word.");
    await applyActivePageRules();
    if (aiTargetSelection.trim()) await replaceSelectionIfMatches(aiTargetSelection, aiPreview);
    else await replaceSelection(aiPreview);
    setAiDraftAccepted(false);
    setAiTargetSelection("");
    setStatus("Đã điền nội dung AI vào Word bằng cách thay đoạn đang chọn.");
  });
  const handleApplyBelow = () => run(async () => {
    if (!aiPreview) throw new Error("Chưa có nội dung AI để áp dụng.");
    if (!aiDraftAccepted) throw new Error("Hãy chấp nhận bản AI trước khi áp dụng vào Word.");
    await applyActivePageRules();
    if (aiTargetSelection.trim()) await insertBelowSelectionIfMatches(aiTargetSelection, aiPreview);
    else await insertBelowSelection(aiPreview);
    setAiDraftAccepted(false);
    setAiTargetSelection("");
    setStatus("Đã điền nội dung AI vào Word bên dưới đoạn đang chọn.");
  });

  return (
    <main className="app">
      {/* Brand Header: Slim & Collapsible */}
      <header className={`brandHeader ${brandExpanded ? "expanded" : "collapsed"}`}>
        <div className="brandTopRow">
          <div className="brandLogo brandLogoLeft">
            <img src={ADDIN_BRANDING.logos.iemm} alt="Logo Viện Cơ khí Năng lượng và Mỏ - Vinacomin" />
          </div>
          <div className="brandText">
            <div className="brandTitle1">{ADDIN_BRANDING.titleLines[0]}</div>
            {brandExpanded && (
              <details className="aboutTools" open>
                <summary>Thông tin TVCI Tools</summary>
                <div className="brandTitle2">{ADDIN_BRANDING.titleLines[1]}</div>
                <div className="brandContact">{ADDIN_BRANDING.developerCredit}</div>
              </details>
            )}
          </div>
          <div className="primaryTools" aria-label="Thao tác chính" style={{ display: "none" }} />
          <div className="brandLogo brandLogoRight">
            <img src={ADDIN_BRANDING.logos.tvci} alt="Logo Trung tâm Thử nghiệm - Kiểm định Công nghiệp" />
          </div>
          <button
            type="button"
            className="brandToggleBtn"
            onClick={toggleBrand}
            title={brandExpanded ? "Thu gọn phần nhận diện" : "Mở rộng thông tin nhận diện"}
            aria-label={brandExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {brandExpanded ? "▲" : "▼"}
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="mainNav" aria-label="Điều hướng chính">
        <button
          type="button"
          className={activeTab === "drafting" ? "navTab active" : "navTab"}
          onClick={() => setActiveTab("drafting")}
        >
          <span className="navIcon">✍️</span>
          <span>Soạn thảo</span>
        </button>
        <button
          type="button"
          className={activeTab === "inspect" ? "navTab active" : "navTab"}
          onClick={() => setActiveTab("inspect")}
        >
          <span className="navIcon">🔍</span>
          <span>Kiểm tra</span>
        </button>
        <button
          type="button"
          className={activeTab === "library" ? "navTab active" : "navTab"}
          onClick={() => setActiveTab("library")}
        >
          <span className="navIcon">📋</span>
          <span>Biểu mẫu</span>
        </button>
        <button
          type="button"
          className={activeTab === "knowledge" ? "navTab active" : "navTab"}
          onClick={() => setActiveTab("knowledge")}
        >
          <span className="navIcon">💡</span>
          <span>Kiến thức</span>
        </button>
        <button
          type="button"
          className={activeTab === "utilities" ? "navTab active" : "navTab"}
          onClick={() => setActiveTab("utilities")}
        >
          <span className="navIcon">⚙️</span>
          <span>Tiện ích</span>
        </button>
      </nav>

      {/* Status Bar */}
      <div role="status" aria-live="polite" className={`status ${busy ? "busy" : ""}`}>
        {busy ? "Đang xử lý…" : status}
      </div>

      {/* TAB 1: SOẠN THẢO */}
      {activeTab === "drafting" && (
        <section className="tabContent" id="drafting-hub">
          {activeFormTemplate && activeFormSchema ? (
            <FormDraftingView
              template={activeFormTemplate}
              schema={activeFormSchema}
              values={templateFormValues}
              sourceText={templateFormSource}
              suggestions={templateFormSuggestions}
              busy={busy}
              syncMessage={templateFormSyncMessage}
              relatedKnowledgeCount={relatedKnowledgeCount}
              onOpenRelatedKnowledge={() => setActiveTab("knowledge")}
              onChange={handleTemplateFormChange}
              onClose={handleCloseTemplateForm}
              onInsertBlank={() => handleInsertTemplateBlank(activeFormTemplate)}
              onInsertAndFill={() => handleInsertTemplateAndFill(activeFormTemplate)}
              onApplyToWord={handleApplyTemplateForm}
              onSaveDraft={handleSaveDraftExplicit}
              onChangeTemplate={() => setActiveFormTemplate(null)}
              onSourceTextChange={setTemplateFormSource}
              onSuggestAi={handleSuggestTemplateForm}
              onAcceptAi={handleAcceptTemplateFormAi}
              onReviewAi={handleReviewTemplateFormAi}
              onAiValueChange={handleTemplateFormAiValueChange}
            />
          ) : (
            <SmartStartScreen
              hasDocumentContent={hasDocumentContent}
              docStats={docStats}
              autoDetectResult={autoDetectResult}
              pendingDraft={pendingDraft}
              pendingDraftTemplateName={pendingDraftTemplateName}
              recentTemplates={recentTemplates}
              favoriteTemplates={favoriteTemplates}
              onInspectDocument={() => {
                setActiveTab("inspect");
                void handleCheck();
              }}
              onNewDocument={() => setActiveTab("library")}
              onChangeRuleProfile={() => setActiveTab("inspect")}
              onResumeDraft={handleResumeDraft}
              onDiscardDraft={handleDiscardDraft}
              onSelectTemplate={handleOpenTemplateForm}
              onToggleFavorite={handleToggleFavorite}
              onOpenLibrary={() => setActiveTab("library")}
            />
          )}
        </section>
      )}

      {/* TAB 3: KHO BIỂU MẪU */}
      {activeTab === "library" && (
        <section className="card collapsibleCard" id="template-library">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>📋 Kho biểu mẫu ({filteredTemplates.length})</h2>
            <button
              type="button"
              className="primary"
              style={{ fontSize: "11px", padding: "4px 8px" }}
              onClick={() => setWizardOpen(true)}
              title="Mở Wizard hướng dẫn 5 bước tạo biểu mẫu mới"
            >
              ➕ Thêm mẫu mới
            </button>
          </div>

          <div className="orgTabs">
            {TEMPLATE_ORGANIZATIONS.map((org) => (
              <button
                key={org.value}
                className={templateOrg === org.value ? "active" : ""}
                onClick={() => handleTemplateOrgChange(org.value)}
              >
                {org.label}
              </button>
            ))}
          </div>

          {templateOrg === "TVCI" && (
            <div className="tvciSubTabs">
              {TVCI_TEMPLATE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  disabled={!tab.enabled}
                  title={tab.enabled ? tab.label : "Dành chỗ để bổ sung phòng ban sau"}
                  className={templateDepartment === tab.label ? "subTab active" : "subTab"}
                  onClick={() => tab.enabled && setTemplateDepartment(tab.label)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="searchBar">
            <input
              value={templateQuery}
              onChange={(e) => setTemplateQuery(e.target.value)}
              placeholder="Tìm kiếm tên, ký hiệu biểu mẫu..."
            />
          </div>

          <div className="grid2">
            {templateOrg !== "TVCI" && templateOrg !== "DANG" && (
              <label>
                Phòng ban
                <select value={templateDepartment} onChange={(e) => setTemplateDepartment(e.target.value)}>
                  <option value="">Tất cả</option>
                  {departments.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
            )}
            <label>
              Loại văn bản
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value)}>
                <option value="">Tất cả</option>
                {(templateOrg === "DANG" ? partyDocumentTypes : documentTypes).map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <label className="checkRow">
            <input type="checkbox" checked={showHiddenTemplates} onChange={(e) => setShowHiddenTemplates(e.target.checked)} />
            Hiện mẫu đã ẩn
          </label>

          {/* Danh sách thẻ biểu mẫu */}
          <div className="templateList">
            {filteredTemplates.map((template) => (
              <div className={`templateCard ${template.hidden ? "templateHidden" : ""}`} key={template.id}>
                <div
                  className="templateCardHeader"
                  onClick={() => handleOpenTemplateForm(template)}
                  style={{ cursor: "pointer" }}
                  title="Bấm để mở biểu mẫu và soạn thảo"
                >
                  <div>
                    <div className="templateName">
                      {favoriteIds.includes(template.id) ? "⭐ " : template.isDefault ? "★ " : ""}{template.name}
                    </div>
                    <div className="templateTags">
                      <span className="tagBadge">{template.organization}</span>
                      <span className="tagBadge">{template.department}</span>
                      <span className="tagBadge">{template.documentType}</span>
                      <span className="tagBadge">v{template.version}</span>
                      {template.source.kind === "user" && <span className="tagBadge user">Cá nhân</span>}
                      {template.isDefault && <span className="tagBadge default">Mặc định</span>}
                      {template.hidden && <span className="tagBadge">Đã ẩn</span>}
                    </div>
                  </div>
                </div>

                {(template.description || template.symbolHint || template.usageNotes?.length || template.referenceSources?.length) ? (
                  <details className="templateDetails">
                    <summary>Chi tiết mẫu &amp; hướng dẫn</summary>
                    <div className="templateDetailsBody">
                      {template.description && <small>{template.description}</small>}
                      {template.symbolHint && <small><strong>Ký hiệu:</strong> {template.symbolHint}</small>}
                      {template.usageNotes?.length ? <small><strong>Lưu ý:</strong> {template.usageNotes.join(" · ")}</small> : null}
                      {template.referenceSources?.length ? <small>Tham chiếu: {template.referenceSources.join("; ")}</small> : null}
                    </div>
                  </details>
                ) : null}

                <div className="templateActionsRow">
                  <div className="templatePrimaryActions">
                    <button
                      type="button"
                      onClick={() => handleInsertTemplateBlank(template)}
                      disabled={busy || template.hidden}
                      title="Chèn nguyên văn bản mẫu vào Word"
                    >
                      Chèn mẫu trống
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => handleOpenTemplateForm(template)}
                      disabled={busy || template.hidden}
                      title="Mở form để điền thông tin vào mẫu"
                    >
                      Mở form
                    </button>
                  </div>
                  <div className="templateSecondaryActions">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(template.id)}
                      disabled={busy}
                      title={favoriteIds.includes(template.id) ? "Bỏ yêu thích" : "Đánh dấu yêu thích"}
                    >
                      {favoriteIds.includes(template.id) ? "⭐" : "☆"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDefault(template)}
                      disabled={busy || template.hidden}
                      title="Đặt làm biểu mẫu mặc định"
                    >
                      {template.isDefault ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(template)}
                      disabled={busy}
                      title={template.hidden ? "Hiện mẫu" : "Ẩn mẫu"}
                    >
                      {template.hidden ? "Hiện" : "Ẩn"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTemplate(template, "up")}
                      disabled={busy}
                      title="Đưa lên"
                      aria-label="Đưa biểu mẫu lên"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTemplate(template, "down")}
                      disabled={busy}
                      title="Đưa xuống"
                      aria-label="Đưa biểu mẫu xuống"
                    >
                      ↓
                    </button>
                    {template.source.kind === "user" && (
                      <>
                        <button type="button" onClick={() => handleEditTemplate(template)} disabled={busy} title="Sửa thông tin">
                          Sửa
                        </button>
                        <button type="button" onClick={() => handleDeleteTemplate(template)} disabled={busy} title="Xóa mẫu">
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filteredTemplates.length && <div className="empty">{templateEmptyMessage}</div>}

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <label>
              Điền nhanh Tên khách hàng (Content Control)
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="VD: CÔNG TY TNHH ABC..." />
            </label>
            <button onClick={handleFillCustomer} disabled={busy}>Điền trường TEN_KHACH_HANG</button>
          </div>
        </section>
      )}

      {/* TAB 4: KHO KIẾN THỨC */}
      {activeTab === "knowledge" && (
        <section className="card" id="knowledge-base" style={{ padding: 0, border: "none", background: "transparent" }}>
          <KnowledgeBaseView
            records={knowledgeRecords}
            onSaveRecord={handleSaveKnowledgeRecord}
            onDeleteRecord={handleDeleteKnowledgeRecord}
            onNotify={(msg) => setStatus(msg)}
          />
        </section>
      )}

      {/* TAB 2: KIỂM TRA THỂ THỨC */}
      {activeTab === "inspect" && (
        <InspectionEditorView
          issues={issues}
          evaluationSummary={evaluationSummary}
          recognizedComponents={recognizedComponents}
          ruleProfileId={ruleProfileId}
          validationScope={validationScope}
          selection={selection}
          busy={busy}
          onRuleProfileChange={setRuleProfileId}
          onValidationScopeChange={setValidationScope}
          onReadSelection={handleRead}
          onCheck={handleCheck}
          onFixIssue={handleFix}
          onFixAllSafe={handleFixAllSafeIssues}
          onLocateIssue={handleLocateIssue}
          onAskAiAboutIssue={handleAskAiAboutIssue}
        />
      )}

      {/* Floating AI Workspace */}
      <button type="button" className="aiFloatingButton" onClick={() => setAiWorkspaceOpen(true)} aria-label="Mở AI Workspace">🤖</button>
      {aiWorkspaceOpen && (
        <section className="card aiWorkspaceModal" role="dialog" aria-label="AI Workspace">
          <div className="aiWorkspaceTopbar">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: "13px", display: "flex", alignItems: "center", gap: 5 }}>
                ✍️ Trợ lý Soạn thảo AI
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "8px",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 600,
                }}
                title="Mô hình AI đang kết nối"
              >
                ⚡ {aiProvider === "gemini" ? "Gemini" : "OpenAI"}: {aiModel || defaultModelFor(aiProvider)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button
                type="button"
                onClick={() => setAiSettingsModalOpen(true)}
                title="Cài đặt kết nối API AI & Quản lý mô hình"
                style={{
                  fontSize: "10.5px",
                  padding: "3px 7px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                ⚙️ Cài đặt
              </button>
              <button type="button" onClick={() => setAiWorkspaceOpen(false)} aria-label="Đóng AI Workspace" style={{ fontSize: "12px", padding: "2px 6px" }}>✕</button>
            </div>
          </div>

          {/* Context Recognition Banner */}
          <div
            style={{
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              borderRadius: "5px",
              padding: "4px 8px",
              marginBottom: 6,
              fontSize: "10.5px",
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: "12px" }}>🎯</span>
            <div>
              <strong>Ngữ cảnh:</strong>{" "}
              {activeFormTemplate
                ? `Đang soạn "${activeFormTemplate.name}" (${activeFormTemplate.organization})`
                : activeTab === "inspect"
                ? `Kiểm tra thể thức (${issues.length} vấn đề)`
                : activeTab === "library"
                ? "Đang duyệt Kho biểu mẫu"
                : activeTab === "knowledge"
                ? "Đang tra cứu Kho kiến thức"
                : "Soạn thảo văn bản"}
            </div>
          </div>

          {/* In-Modal Status & Alert Banner */}
          {status && (
            <div
              className="aiModalStatus"
              style={{
                background: busy
                  ? "#eff6ff"
                  : status.startsWith("✓")
                  ? "#ecfdf5"
                  : status.toLowerCase().includes("lỗi") || status.toLowerCase().includes("chưa") || status.toLowerCase().includes("thất bại")
                  ? "#fef2f2"
                  : "#f8fafc",
                border: `1px solid ${
                  busy
                    ? "#bfdbfe"
                    : status.startsWith("✓")
                    ? "#a7f3d0"
                    : status.toLowerCase().includes("lỗi") || status.toLowerCase().includes("chưa") || status.toLowerCase().includes("thất bại")
                    ? "#fecaca"
                    : "#e2e8f0"
                }`,
                borderRadius: "5px",
                padding: "5px 8px",
                marginBottom: 6,
                fontSize: "11px",
                color: busy
                  ? "#1d4ed8"
                  : status.startsWith("✓")
                  ? "#065f46"
                  : status.toLowerCase().includes("lỗi") || status.toLowerCase().includes("chưa") || status.toLowerCase().includes("thất bại")
                  ? "#991b1b"
                  : "#334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>
                  {busy
                    ? "⏳"
                    : status.startsWith("✓")
                    ? "✅"
                    : status.toLowerCase().includes("lỗi") || status.toLowerCase().includes("chưa") || status.toLowerCase().includes("thất bại")
                    ? "⚠️"
                    : "ℹ️"}
                </span>
                <span>{busy ? "Đang xử lý dữ liệu và kết nối AI..." : status}</span>
              </div>
              {!aiApiKey && (
                <button
                  type="button"
                  onClick={() => setAiSettingsModalOpen(true)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                >
                  ⚙️ Cài đặt Key
                </button>
              )}
            </div>
          )}

          {/* Single Unified AI Chat Window */}
          <div className="chatHistory">
            {chatHistory.length === 0 ? (
              <div className="chatEmpty" style={{ textAlign: "center", padding: "10px 8px" }}>
                <div style={{ fontSize: "22px", marginBottom: 4 }}>✍️</div>
                <div style={{ fontWeight: 700, fontSize: "12px", color: "#0f3f67", marginBottom: 3 }}>
                  Trợ lý AI Soạn thảo văn bản hành chính
                </div>
                <div style={{ color: "#64748b", fontSize: "10.5px", marginBottom: 8 }}>
                  Nhập yêu cầu, dàn ý hoặc đính kèm tài liệu nguồn (PDF, Word, Ảnh) để AI tự động soạn thảo và điền vào biểu mẫu chuẩn.
                </div>

                {/* Quick Prompts */}
                <div style={{ textAlign: "left", background: "#f1f5f9", padding: "7px 9px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    💡 Gợi ý câu lệnh mẫu theo ngữ cảnh:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {getSuggestedQuickPrompts({
                      activeTab,
                      template: activeFormTemplate,
                      issueCount: issues.length,
                      selection: aiTargetSelection,
                    }).map((qp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setChatInput(qp.prompt)}
                        style={{
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "10px",
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          color: "#0f3f67",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick drafting parts */}
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: "9.5px", fontWeight: 600, color: "#64748b", marginBottom: 3 }}>
                      Viết nhanh từng phần văn bản:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {QUICK_DRAFT_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => handleQuickDraft(action.id)}
                          disabled={busy}
                          style={{ fontSize: "9.5px", padding: "2px 6px", borderRadius: 3, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", color: "#334155" }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              chatHistory.map((message, index) => {
                const isAssistant = message.role === "assistant";
                const isLatestAssistant = isAssistant && (
                  message.content === aiPreview || index === chatHistory.length - 1 || (!aiPreview && index === chatHistory.map((m) => m.role).lastIndexOf("assistant"))
                );

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chatBubble ${message.role}`}
                    style={isAssistant ? { width: "100%", maxWidth: "100%", boxSizing: "border-box" } : undefined}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong style={{ fontSize: "11px", color: isAssistant ? "#166534" : "#0c3b66" }}>
                        {isAssistant ? "🤖 Trợ lý AI TVCI" : "👤 Bạn"}
                      </strong>
                      {isAssistant && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => void copyText(message.content)}
                            style={{ fontSize: "10px", padding: "1px 6px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer" }}
                            title="Sao chép nội dung này"
                          >
                            📋 Sao chép
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const userMsg = chatHistory[index - 1]?.content;
                              const cleanPrompt = userMsg ? userMsg.split(" (Kèm ")[0] : "";
                              if (cleanPrompt) setChatInput(cleanPrompt);
                              void handleSendChat(cleanPrompt || undefined);
                            }}
                            style={{ fontSize: "10px", padding: "1px 6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                            title="Yêu cầu AI soạn thảo lại"
                          >
                            🔄 Soạn lại
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "11px", color: "#1e293b" }}>
                      {message.content}
                    </div>

                    {/* Integrated Template Application Card for Assistant Draft */}
                    {isAssistant && isLatestAssistant && (
                      <div id="ai-proposal-section" style={{ marginTop: 8, borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#dcfce7",
                            border: "1px solid #86efac",
                            borderRadius: "5px",
                            padding: "4px 8px",
                            marginBottom: 6,
                            color: "#166534",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: "12px" }}>🎉</span>
                            <span>Soạn thảo thành công!</span>
                          </div>
                          <span style={{ fontSize: "9.5px", fontWeight: 500, color: "#15803d" }}>
                            Đã bóc tách trường &amp; sẵn sàng đưa vào Word
                          </span>
                        </div>

                        {/* Template Selection Box */}
                        <div className="aiTemplateMatchCard" style={{ margin: 0, padding: "6px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5 }}>
                          <div className="aiTemplateMatchHeader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div className="aiTemplateMatchTitle" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: "11px" }}>🎯</span>
                              <span style={{ fontWeight: 600, fontSize: "11px" }}>Biểu mẫu áp dụng:</span>
                            </div>
                            {selectedTemplateForMatch ? (
                              <span style={{ fontSize: "10px", color: "#065f46", fontWeight: 700, background: "#dcfce7", padding: "1px 5px", borderRadius: 3 }}>
                                📌 Đang chọn: {selectedTemplateForMatch.name}
                              </span>
                            ) : activeFormTemplate ? (
                              <span style={{ fontSize: "10px", color: "#065f46", fontWeight: 700, background: "#dcfce7", padding: "1px 5px", borderRadius: 3 }}>
                                📌 Đang chọn: {activeFormTemplate.name}
                              </span>
                            ) : null}
                          </div>

                          <div className="aiTemplateSelectRow" style={{ marginBottom: 6 }}>
                            <select
                              value={selectedTemplateForMatch?.id || matchedTemplateId}
                              onChange={(e) => {
                                const newId = e.target.value;
                                setMatchedTemplateId(newId);
                                const chosen = TEMPLATE_CATALOG.find((t) => t.id === newId);
                                if (chosen) setActiveFormTemplate(chosen);
                              }}
                              disabled={busy}
                              style={{ width: "100%", padding: "4px 6px", fontSize: "11px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                            >
                              <optgroup label="⭐ Biểu mẫu gợi ý phù hợp nhất">
                                {recommendedTemplates.slice(0, 4).map((t) => (
                                  <option key={`rec-${t.id}`} value={t.id}>
                                    {t.id === (selectedTemplateForMatch?.id || matchedTemplateId) ? "★ [Đang chọn] " : "★ "}{t.name} ({t.organization})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Tất cả biểu mẫu TVCI">
                                {TEMPLATE_CATALOG.filter((t) => t.organization === "TVCI").map((t) => (
                                  <option key={`tvci-${t.id}`} value={t.id}>
                                    {t.id === (selectedTemplateForMatch?.id || matchedTemplateId) ? "★ [Đang chọn] " : ""}{t.name}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Tất cả biểu mẫu Viện (IEMM)">
                                {TEMPLATE_CATALOG.filter((t) => t.organization === "IEMM").map((t) => (
                                  <option key={`iemm-${t.id}`} value={t.id}>
                                    {t.id === (selectedTemplateForMatch?.id || matchedTemplateId) ? "★ [Đang chọn] " : ""}{t.name}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Văn bản Đảng">
                                {TEMPLATE_CATALOG.filter((t) => t.organization === "DANG").map((t) => (
                                  <option key={`dang-${t.id}`} value={t.id}>
                                    {t.id === (selectedTemplateForMatch?.id || matchedTemplateId) ? "★ [Đang chọn] " : ""}{t.name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          {/* Segments Preview */}
                          {segmentedFields && selectedTemplateSchema && (
                            <div className="aiSegmentedFieldsPreview" style={{ marginBottom: 6 }}>
                              <div className="segmentedHeader" style={{ fontSize: "10px", fontWeight: 600, color: "#475569", marginBottom: 3 }}>
                                <span>🔍 Đã tự động bóc tách các trường của "{selectedTemplateForMatch?.name}":</span>
                              </div>
                              <div className="segmentedBadges" style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                {selectedTemplateSchema.fields.map((field) => {
                                  const val = segmentedFields[field.tag];
                                  if (!val || (Array.isArray(val) && val.length === 0)) return null;
                                  const displayVal = Array.isArray(val)
                                    ? `${val.length} mục (${val[0]?.slice(0, 30)}...)`
                                    : val.length > 50
                                    ? `${val.slice(0, 50)}...`
                                    : val;
                                  return (
                                    <div key={field.tag} className="segmentedBadge" style={{ fontSize: "9.5px", padding: "1px 5px", borderRadius: 3 }} title={`${field.label}: ${Array.isArray(val) ? val.join("\n") : val}`}>
                                      <strong>{field.label}:</strong> <span>{displayVal}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="aiApplyActions" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <button
                              type="button"
                              className="aiApplyBtn direct"
                              onClick={() => {
                                const target = selectedTemplateForMatch || activeFormTemplate || recommendedTemplates[0];
                                if (target) void handleApplyDraftDirectToTemplate(target);
                              }}
                              disabled={busy}
                              title="Tự động áp dụng toàn bộ nội dung vừa soạn thảo vào biểu mẫu đã chọn trên Word"
                              style={{
                                background: "#16a34a",
                                color: "#fff",
                                padding: "6px 10px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                borderRadius: 5,
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                              }}
                            >
                              <span>🚀</span>
                              <span>
                                Áp dụng luôn vào biểu mẫu "{selectedTemplateForMatch?.name || activeFormTemplate?.name || 'đã chọn'}" (Đưa vào Word)
                              </span>
                            </button>

                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="aiApplyBtn form"
                                onClick={() => {
                                  const target = selectedTemplateForMatch || activeFormTemplate || recommendedTemplates[0];
                                  if (target) void handleOpenTemplateFormWithDraft(target);
                                }}
                                disabled={busy}
                                style={{ flex: 1, fontSize: "10px", padding: "4px 6px", borderRadius: 4 }}
                                title="Mở form chi tiết của mẫu này với các trường đã được điền sẵn để rà soát thêm"
                              >
                                📝 Mở Form chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyReplace}
                                disabled={busy}
                                style={{ flex: 1, fontSize: "10px", padding: "4px 6px", borderRadius: 4 }}
                                title="Thay thế đoạn văn bản đang bôi đen trong Word bằng nội dung này"
                              >
                                📥 Thay đoạn chọn
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyBelow}
                                disabled={busy}
                                style={{ flex: 1, fontSize: "10px", padding: "4px 6px", borderRadius: 4 }}
                                title="Chèn nội dung này tiếp bên dưới vị trí con trỏ trong Word"
                              >
                                ➕ Chèn dưới con trỏ
                              </button>
                            </div>

                            <div style={{ display: "flex", gap: 4, marginTop: 1 }}>
                              <button
                                type="button"
                                onClick={handleEditAndRedraft}
                                disabled={busy}
                                style={{ fontSize: "10px", padding: "2px 6px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", color: "#334155" }}
                                title="Nạp lại yêu cầu vào khung soạn thảo để chỉnh sửa và gửi lại"
                              >
                                ✏️ Sửa yêu cầu
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveAiExperience(aiPreview || message.content)}
                                title="Lưu văn bản này vào Kho kiến thức nghiệp vụ để AI học tập cho các lần sau"
                                style={{ fontSize: "10px", padding: "2px 6px", background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 4, cursor: "pointer" }}
                              >
                                ⭐ Lưu kinh nghiệm
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selection button for older assistant drafts */}
                    {isAssistant && !isLatestAssistant && (
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAiDraft(message.content)}
                          style={{ fontSize: "10px", padding: "2px 6px", background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                        >
                          🎯 Chọn bản này để áp dụng vào biểu mẫu
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Unified Chat Input Area at the bottom */}
          <div className="aiDraftingContainer" style={{ marginTop: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={fileFilterAccept}
              multiple
              style={{ display: "none" }}
              onChange={(e) => void handleFileInputChange(e)}
            />

            {/* Attachments Chips */}
            {chatAttachments.length > 0 && (
              <div className="aiAttachmentChips" style={{ marginBottom: 6 }}>
                <div style={{ width: "100%", fontSize: "10.5px", fontWeight: 600, color: "#475569", marginBottom: 2 }}>
                  Tài liệu nguồn ({chatAttachments.length}):
                </div>
                {chatAttachments.map((att) => {
                  const icon = att.type === "pdf" ? "📑" : att.type === "word" ? "📄" : "🖼️";
                  const sizeKb = Math.round(att.size / 1024);
                  const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                  return (
                    <div key={att.id} className={`aiAttachmentChip ${att.type}`}>
                      <span>{icon}</span>
                      <span className="chipName" title={att.name}>{att.name}</span>
                      <span className="chipSize">({sizeStr})</span>
                      <button
                        type="button"
                        className="chipRemove"
                        onClick={() => handleRemoveAttachment(att.id)}
                        title="Xóa tệp đính kèm này"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {attachmentLoading && (
              <div style={{ fontSize: "11px", color: "#0284c7", marginBottom: 6, fontStyle: "italic" }}>
                ⏳ Đang xử lý và trích xuất tài liệu đính kèm...
              </div>
            )}

            {!aiApiKey && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 6,
                  padding: "8px 10px",
                  marginBottom: 8,
                  fontSize: "11.5px",
                  color: "#92400e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>⚠️ Chưa cài đặt API Key cho {aiProvider === "gemini" ? "Google Gemini" : "OpenAI"}.</span>
                <button
                  type="button"
                  onClick={() => setAiSettingsModalOpen(true)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    background: "#d97706",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  ⚙️ Cài đặt ngay
                </button>
              </div>
            )}

            {/* Input Toolbar */}
            <div className="aiDraftingToolbar" style={{ marginBottom: 6, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <div className="aiAttachDropdownContainer">
                <button
                  type="button"
                  className="aiAttachBtn"
                  onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                  title="Đính kèm tài liệu nguồn (PDF, Word, Ảnh/Scan)"
                  disabled={busy || attachmentLoading}
                >
                  📎 Đính kèm tệp ▾
                </button>
                {attachmentMenuOpen && (
                  <div className="aiAttachDropdownMenu">
                    <button
                      type="button"
                      className="aiAttachDropdownItem"
                      onClick={() => {
                        setAttachmentMenuOpen(false);
                        handlePickAttachment(".pdf,application/pdf");
                      }}
                    >
                      📑 Tệp PDF (.pdf)
                    </button>
                    <button
                      type="button"
                      className="aiAttachDropdownItem"
                      onClick={() => {
                        setAttachmentMenuOpen(false);
                        handlePickAttachment(".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                      }}
                    >
                      📄 Tệp Word (.docx)
                    </button>
                    <button
                      type="button"
                      className="aiAttachDropdownItem"
                      onClick={() => {
                        setAttachmentMenuOpen(false);
                        handlePickAttachment("image/*");
                      }}
                    >
                      🖼️ Ảnh chụp / Bản scan
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="aiAttachBtn"
                onClick={handleLoadSelectionForAi}
                title="Lấy nội dung đang chọn trong Word đưa vào khung soạn thảo"
                disabled={busy}
                style={{ background: "#f8fafc", color: "#475569", borderColor: "#cbd5e1", fontSize: "10px", padding: "3px 6px" }}
              >
                ✂️ Lấy đoạn chọn
              </button>
              <button
                type="button"
                className="aiAttachBtn"
                onClick={handleReadDocumentContext}
                title="Đọc toàn bộ nội dung tài liệu Word hiện tại làm ngữ cảnh"
                disabled={busy}
                style={{ background: "#f8fafc", color: "#475569", borderColor: "#cbd5e1", fontSize: "10px", padding: "3px 6px" }}
              >
                📝 Đọc văn bản Word
              </button>
              <button
                type="button"
                className="aiAttachBtn"
                onClick={handleNewChat}
                title="Xóa nội dung và bắt đầu phiên soạn thảo mới"
                disabled={busy}
                style={{ background: "#f8fafc", color: "#475569", borderColor: "#cbd5e1", fontSize: "10px", padding: "3px 6px" }}
              >
                🔄 Làm mới
              </button>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
                <select
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value as WritingStyleId)}
                  style={{ fontSize: "10px", padding: "2px 5px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155" }}
                  title="Chọn phong cách văn phong soạn thảo"
                >
                  {WRITING_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Single Unified Textarea */}
            <textarea
              className="aiDraftingTextarea"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleSendChat();
                }
              }}
              placeholder="Nhập yêu cầu, dàn ý hoặc thông tin cần soạn thảo... (Ctrl + Enter để gửi)&#10;AI hỗ trợ đọc nội dung từ file PDF, Word, Ảnh quét đính kèm để tự động soạn thảo văn bản hành chính hoàn chỉnh."
              disabled={busy}
              style={{ minHeight: "65px", fontSize: "11px", padding: "6px 8px" }}
            />

            {/* Send Buttons Row */}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                type="button"
                className="aiDraftingSubmitBtn"
                style={{ flex: 2, marginTop: 0, fontSize: "11px", padding: "6px 10px" }}
                onClick={handleSendChat}
                disabled={busy || (!chatInput.trim() && chatAttachments.length === 0)}
              >
                <span>⚡</span>
                <span>{busy ? "ĐANG SOẠN..." : "GỬI AI SOẠN THẢO (Ctrl + Enter)"}</span>
              </button>
              <button
                type="button"
                onClick={handleApplyInputDirectToTemplate}
                disabled={busy || !chatInput.trim()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  fontSize: "10.5px",
                  fontWeight: 600,
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  color: "#166534",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: "6px 8px",
                }}
                title={
                  (selectedTemplateForMatch || activeFormTemplate)
                    ? `Áp dụng luôn nội dung vào toàn bộ biểu mẫu "${(selectedTemplateForMatch || activeFormTemplate)?.name}" đang chọn trên phần soạn thảo`
                    : "Bỏ qua AI và dùng trực tiếp đoạn văn bản đang nhập để áp dụng vào biểu mẫu"
                }
              >
                <span>📋</span>
                <span>
                  {(selectedTemplateForMatch || activeFormTemplate)
                    ? `Áp dụng vào "${(selectedTemplateForMatch || activeFormTemplate)!.name.length > 15 ? (selectedTemplateForMatch || activeFormTemplate)!.name.slice(0, 15) + '...' : (selectedTemplateForMatch || activeFormTemplate)!.name}"`
                    : "Áp dụng vào mẫu"}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: TIỆN ÍCH & TẠO MẪU */}
      {activeTab === "utilities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <section className="card" id="user-profiles">
            <h2>👤 Hồ sơ soạn thảo (Tự động điền)</h2>
            <DraftingProfilesView />
          </section>

          {/* Công cụ soạn thảo chuẩn */}
          <section className="card collapsibleCard" id="drafting-tools">
            <h2>📐 Soạn thảo chuẩn</h2>

            <div className="sectionGroup">
              <strong>Phụ lục &amp; Bảng phụ lục</strong>
              <label>
                Tên phụ lục
                <input value={appendixTitle} onChange={(e) => setAppendixTitle(e.target.value)} placeholder="PHỤ LỤC" />
              </label>
              <div className="grid3">
                <label>Hàng<input type="number" min="1" max="50" value={appendixRows} onChange={(e) => setAppendixRows(Number(e.target.value))} /></label>
                <label>Cột<input type="number" min="1" max="20" value={appendixColumns} onChange={(e) => setAppendixColumns(Number(e.target.value))} /></label>
                <label className="checkRow"><input type="checkbox" checked={appendixHeaderRow} onChange={(e) => setAppendixHeaderRow(e.target.checked)} />Tiêu đề</label>
              </div>
              <div className="toolButtons" style={{ marginTop: 6 }}>
                <button onClick={handleInsertAppendix} disabled={busy}>Thêm phụ lục</button>
                <button onClick={handleCreateAppendixTable} disabled={busy}>Tạo bảng phụ lục</button>
                <button onClick={handleNumberSelectedTable} disabled={busy}>Đánh số bảng</button>
              </div>
            </div>

            <div className="sectionGroup">
              <strong>Bảng &amp; Danh sách</strong>
              <div className="grid3">
                <label>Hàng<input type="number" min="1" max="50" value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} /></label>
                <label>Cột<input type="number" min="1" max="20" value={tableColumns} onChange={(e) => setTableColumns(Number(e.target.value))} /></label>
                <button onClick={handleCreateTable} disabled={busy}>Tạo bảng</button>
              </div>
              <div className="grid3" style={{ marginTop: 6 }}>
                <label>Số mục<input type="number" min="1" max="20" value={listItems} onChange={(e) => setListItems(Number(e.target.value))} /></label>
                <label>
                  Cấp
                  <select value={listLevel} onChange={(e) => setListLevel(Number(e.target.value))}>
                    <option value={0}>Cấp 1</option>
                    <option value={1}>Cấp 2</option>
                    <option value={2}>Cấp 3</option>
                  </select>
                </label>
                <button onClick={() => handleCreateList("BULLET")} disabled={busy}>Gạch đầu dòng</button>
              </div>
            </div>

            <div className="sectionGroup">
              <strong>Đề mục văn bản</strong>
              <div className="toolButtons">
                <button onClick={() => handleInsertOutline("PART")} disabled={busy}>Phần</button>
                <button onClick={() => handleInsertOutline("CHAPTER")} disabled={busy}>Chương</button>
                <button onClick={() => handleInsertOutline("SECTION")} disabled={busy}>Mục</button>
                <button onClick={() => handleInsertOutline("ARTICLE")} disabled={busy}>Điều</button>
                <button onClick={() => handleInsertOutline("CLAUSE")} disabled={busy}>Khoản</button>
                <button onClick={() => handleInsertOutline("POINT")} disabled={busy}>Điểm</button>
              </div>
            </div>

            <div className="sectionGroup">
              <strong>Kính gửi &amp; Nơi nhận</strong>
              <label>
                Kính gửi (mỗi dòng một nơi)
                <textarea value={addresseeText} onChange={(e) => setAddresseeText(e.target.value)} placeholder="Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam" />
              </label>
              <button onClick={handleInsertAddressee} disabled={busy} style={{ marginBottom: 8 }}>Chèn Kính gửi chuẩn</button>

              <label>
                Thêm nơi nhận có sẵn
                <select value={recipientPresetId} onChange={(e) => setRecipientPresetId(e.target.value)}>
                  {RECIPIENT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
              </label>
              <div className="toolButtons" style={{ marginBottom: 6 }}>
                <button onClick={handleAddRecipientPreset} disabled={busy}>Thêm dòng</button>
                <button onClick={handleInsertRecipients} disabled={busy}>Chèn Nơi nhận chuẩn</button>
              </div>
              <textarea value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} placeholder="Như trên&#10;Lưu: VT, Văn phòng." />
            </div>

            <div className="sectionGroup">
              <strong>Đánh số trang &amp; Đường kẻ</strong>
              <div className="grid2">
                <label className="checkRow">
                  <input type="checkbox" checked={pageNumbersEnabled} onChange={(e) => setPageNumbersEnabled(e.target.checked)} />
                  Đánh số trang
                </label>
                <label>
                  Vị trí
                  <select value={pageNumberPosition} onChange={(e) => setPageNumberPosition(e.target.value as PageNumberPosition)}>
                    <option value="header-center">Giữa lề trên</option>
                    <option value="footer-right">Phải Footer</option>
                    <option value="footer-center">Giữa Footer</option>
                  </select>
                </label>
              </div>
              <div className="toolButtons" style={{ marginTop: 6 }}>
                <button onClick={handleApplyPageNumbers} disabled={busy}>Áp dụng số trang</button>
                <button onClick={() => handleInsertRule("TITLE_ABSTRACT")} disabled={busy}>Chèn đường kẻ tiêu đề</button>
              </div>
            </div>

            <div className="sectionGroup">
              <strong>Tiêu đề đầu &amp; Chân trang (Header / Footer)</strong>
              <div className="grid2">
                <label className="checkRow">
                  <input type="checkbox" checked={headerEnabled} onChange={(e) => setHeaderEnabled(e.target.checked)} />
                  Bật Header
                </label>
                <label className="checkRow">
                  <input type="checkbox" checked={footerEnabled} onChange={(e) => setFooterEnabled(e.target.checked)} />
                  Bật Footer
                </label>
              </div>
              <div className="grid2" style={{ marginTop: 6 }}>
                <label>
                  Nội dung Header
                  <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="BẢN THẢO LƯU HÀNH NỘI BỘ" disabled={!headerEnabled} />
                </label>
                <label>
                  Nội dung Footer
                  <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Trung tâm TVCI · Hotline..." disabled={!footerEnabled} />
                </label>
              </div>
              <div className="toolButtons" style={{ marginTop: 6 }}>
                <button onClick={handleApplyHeaderFooter} disabled={busy}>Áp dụng Header / Footer</button>
              </div>
            </div>

            <div className="sectionGroup">
              <strong>Căn cứ ban hành &amp; Khối chữ ký</strong>
              <label>
                Căn cứ ban hành (mỗi dòng một căn cứ)
                <textarea
                  value={legalBasisInputText}
                  onChange={(e) => setLegalBasisInputText(e.target.value)}
                  placeholder="Căn cứ Luật Tiêu chuẩn và Quy chuẩn kỹ thuật ngày 29 tháng 6 năm 2006;&#10;Căn cứ Quyết định số 123/QĐ-TVCI ngày 15 tháng 01 năm 2026..."
                  rows={3}
                />
              </label>
              <button onClick={handleInsertLegalBasisBlock} disabled={busy} style={{ marginBottom: 8 }}>Chèn Khối Căn cứ ban hành</button>

              <div className="grid2">
                <label>
                  Chức danh ký
                  <input value={signerRoleInput} onChange={(e) => setSignerRoleInput(e.target.value)} placeholder="GIÁM ĐỐC" />
                </label>
                <label>
                  Họ tên người ký
                  <input value={signerNameInput} onChange={(e) => setSignerNameInput(e.target.value)} placeholder="Nguyễn Văn A" />
                </label>
              </div>
              <button onClick={handleInsertSignerBlock} disabled={busy} style={{ marginTop: 6 }}>Chèn Khối Chữ ký chuẩn</button>
            </div>
          </section>

          <section className="card collapsibleCard" id="template-builder">
            <h2>⚙️ Tạo biểu mẫu &amp; Content Control</h2>
            <button
              type="button"
              className="primary full"
              style={{ marginBottom: 10 }}
              onClick={() => setWizardOpen(true)}
              title="Mở Wizard 5 bước"
            >
              🧙‍♂️ Mở Wizard Tạo Biểu Mẫu (5 bước hướng dẫn)
            </button>
            <div className="grid2">
              <label>
                Tên mẫu
                <input value={builderName} onChange={(e) => setBuilderName(e.target.value)} />
              </label>
              <label>
                Nhóm
                <select value={builderOrg} onChange={(e) => handleBuilderOrgChange(e.target.value as TemplateOrganization)}>
                  {TEMPLATE_ORGANIZATIONS.map((org) => <option key={org.value} value={org.value}>{org.label}</option>)}
                </select>
              </label>
            </div>
            <div className="builderBox">
              <label>
                Đặt Content Control tại vùng chọn Word
                <select value={builderField} onChange={(e) => setBuilderField(e.target.value)}>
                  {CONTENT_CONTROL_FIELDS.map((field) => <option key={field}>{field}</option>)}
                </select>
              </label>
              <button onClick={handleAddField} disabled={busy}>Đặt trường tại vùng chọn</button>
            </div>
            <div className="aiTemplateBox">
              <div>
                <strong>AI phân tích văn bản cũ</strong>
                <small>Quét toàn bộ tài liệu đang mở để gợi ý tạo trường động.</small>
              </div>
              <button onClick={handleAnalyzeTemplate} disabled={busy}>Phân tích bằng AI</button>
            </div>
            {templateFieldSuggestions.length > 0 && (
              <div style={{ display: "grid", gap: 5, marginBottom: 8 }}>
                {templateFieldSuggestions.map((item, idx) => (
                  <div className="issue" key={idx}>
                    <div>
                      <strong>{item.title} ({item.tag})</strong>
                      <small>“{item.sourceText}” · {Math.round(item.confidence * 100)}%</small>
                    </div>
                    <button className="primary" onClick={() => handleApplyTemplateSuggestion(item)} disabled={busy}>Tạo trường</button>
                  </div>
                ))}
              </div>
            )}
            <div className="actions">
              <label className="fileButton">
                Import file DOCX
                <input type="file" accept=".docx" onChange={(e) => handleImportTemplate(e.target.files?.[0])} />
              </label>
              <button onClick={handleExportTemplate} disabled={busy}>Xuất DOCX mẫu</button>
            </div>
          </section>

          <section className="card collapsibleCard" id="reference-guidance">
            <h2>📖 Hướng dẫn nhanh từ tài liệu nguồn</h2>
            <input
              value={referenceQuery}
              onChange={(e) => setReferenceQuery(e.target.value)}
              placeholder="Tìm kiếm quy trình, quy chế, lưu ý..."
            />
            <div className="guidanceList">
              {filteredGuidance.map((item) => (
                <details className="guidanceItem" key={item.id}>
                  <summary><span>{item.group}</span>{item.title}</summary>
                  <p>{item.content}</p>
                  <small>Nguồn: {item.source}</small>
                </details>
              ))}
            </div>
            {!filteredGuidance.length && <div className="empty">Không tìm thấy hướng dẫn phù hợp.</div>}
          </section>
        </div>
      )}

      {/* Template Creation Wizard Modal */}
      <TemplateWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={(newTemplate) => {
          void refreshUserTemplates();
          void handleOpenTemplateForm(newTemplate);
          setStatus(`Đã lưu và mở biểu mẫu mới "${newTemplate.name}" thành công!`);
        }}
        onError={(msg) => setStatus(`Lỗi tạo mẫu: ${msg}`)}
      />

      {/* AI Settings Dedicated Modal */}
      <AiSettingsModal
        isOpen={aiSettingsModalOpen}
        onClose={() => setAiSettingsModalOpen(false)}
        aiProvider={aiProvider}
        onProviderChange={handleProviderChange}
        aiModel={aiModel}
        onModelChange={setAiModel}
        aiApiKey={aiApiKey}
        onApiKeyChange={setAiApiKey}
        availableModels={availableModels}
        onDiscoverModels={handleDiscoverModels}
        onSaveAiSettings={handleSaveAiSettings}
        onClearAiSettings={handleClearAiSettings}
        busy={busy}
      />
    </main>
  );
}

