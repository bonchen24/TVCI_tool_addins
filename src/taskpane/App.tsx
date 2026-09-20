import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { readSelection, readDocumentText, replaceSelection, replaceSelectionIfMatches, insertBelowSelection, insertBelowSelectionIfMatches, replaceFirstInSelection } from "../word/selection.service";
import { inspectSelectionParagraphs, applyIssueFix, applyTextIssueFix, selectParagraphByTargetId, applyInversePatches } from "../word/formatting.service";
import { TransactionManager } from "../word/transaction.service";
import { validateParagraph } from "../rules/validator";
import { classifyDocumentComponents, type ClassifiedComponent } from "../rules/component-classifier";
import { getComponentRule, getRecipientsItemRule } from "../rules/component-rules";
import { validateComponentParagraph } from "../rules/component-validator";
import type { ValidationIssue } from "../rules/models";
import { ACTIVE_RULE_PROFILES, getRuleProfile, resolveRuleProfileForOrganization, type RuleProfileId } from "../rules/profiles";
import { validatePageSetup } from "../rules/page-validator";
import { applyPageIssueFix, applyPageRules } from "../word/page-formatting.service";
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
import { loadTemplateFormDraft, saveTemplateFormDraft } from "../templates/form-drafts";
import { addRecentTemplate, getFavoriteTemplateIds, getRecentTemplateIds, toggleFavoriteTemplate } from "../templates/recent-favorites";
import { applyTemplateFormToWord } from "../word/form-content-control.service";
import { buildTemplateFormPrompt, filterTemplateFormSuggestions, parseTemplateFormSuggestions, type TemplateFormAiSuggestion } from "../ai/template-form";
import { describeTemplateFormSync, mergeAcceptedTemplateFormSuggestions } from "./template-form.service";
import { TemplateWizardModal } from "./components/TemplateWizardModal";
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
import { AiTaskpaneView } from "./components/AiTaskpaneView";
import { DocumentSettingsModal } from "./components/DocumentSettingsModal";
import { InspectionModal } from "./components/InspectionModal";
import { TemplateLibraryModal } from "./components/TemplateLibraryModal";
import { KnowledgeModal } from "./components/KnowledgeModal";
import { TemplateFormModal } from "./components/TemplateFormModal";
import { SmartDraftingModal } from "./components/SmartDraftingModal";
import { openOfficeDialog } from "../commands/dialog";
import { applyA4Margins } from "../word/page-toolkit.service";
import {
  loadSavedSettings,
  saveDefaultSettings,
  saveAndApplySettings,
  applySettingsToWord,
  type DocumentSettings,
} from "../models/document-settings";
import { consumeFallbackView, closeDialogContainer } from "../commands/dialog";
import { inspectCurrentDocument } from "../rules/document-inspection";

type ActiveModalType = "none" | "document_settings" | "inspect" | "template_library" | "template_wizard" | "knowledge" | "ai_settings" | "smart_draft";

const TEMPLATE_ORGANIZATIONS: Array<{ value: TemplateOrganization; label: string }> = [
  { value: "TVCI", label: "Trung tâm Thử nghiệm - Kiểm định Công nghiệp" },
  { value: "IEMM", label: "Viện Cơ khí Năng lượng và Mỏ - Vinacomin" },
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

function getInitialDialogModal(): ActiveModalType {
  if (typeof window === "undefined") return "none";
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v === "smart_draft" || v === "smart-draft" || v === "draft") return "smart_draft";
  if (v === "settings" || v === "doc_settings") return "document_settings";
  if (v === "standardize" || v === "inspect") return "inspect";
  if (v === "template" || v === "template-form" || v === "library") return "template_library";
  if (v === "builder") return "template_wizard";
  if (v === "knowledge") return "knowledge";
  if (v === "settings_modal") return "ai_settings";
  const fallback = consumeFallbackView();
  if (fallback === "smart_draft") return "smart_draft";
  if (fallback === "settings" || fallback === "settings_modal") return "document_settings";
  if (fallback === "inspect") return "inspect";
  if (fallback === "template" || fallback === "template-form") return "template_library";
  if (fallback === "knowledge") return "knowledge";
  return "none";
}

export default function App() {
  const isDialog = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("dialog") === "1" || window.location.pathname.endsWith("dialog.html"));
  const closeActiveModal = () => {
    if (isDialog) closeDialogContainer();
    else setActiveModal("none");
  };

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

  const [activeModal, setActiveModal] = useState<ActiveModalType>(() => {
    return isDialog ? getInitialDialogModal() : "none";
  });
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings>(() => loadSavedSettings());
  const [templateLibraryFilter, setTemplateLibraryFilter] = useState<"all" | "recent" | "favorite">("all");
  const [status, setStatus] = useState("Sẵn sàng");
  const [selection, setSelection] = useState("");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [evaluationSummary, setEvaluationSummary] = useState<DocumentEvaluationSummary | null>(null);
  const [recognizedComponents, setRecognizedComponents] = useState<Array<ClassifiedComponent & { text: string }>>([]);
  const [ruleProfileId, setRuleProfileId] = useState<RuleProfileId>("NĐ30_TVCI");
  const [validationScope, setValidationScope] = useState<"selection" | "document">("document");
  const [customerName, setCustomerName] = useState("");
  const [legalBasisInputText, setLegalBasisInputText] = useState("");
  const [signerRoleInput, setSignerRoleInput] = useState("GIÁM ĐỐC");
  const [signerNameInput, setSignerNameInput] = useState("");
  const [userTemplates, setUserTemplates] = useState<TemplateRecord[]>([]);
  const [templateOrg, setTemplateOrg] = useState<TemplateOrganization>("TVCI");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateDepartment, setTemplateDepartment] = useState("Văn bản chung");
  const [templateType, setTemplateType] = useState("");
  const [showHiddenTemplates, setShowHiddenTemplates] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState("");
  const [templatePreferences, setTemplatePreferences] = useState<TemplatePreferences>(() => loadTemplatePreferences());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteTemplateIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentTemplateIds());
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
  }, []);
  useEffect(() => {
    if (!isDialog) {
      // In Task Pane mode: strictly keep activeModal as "none".
      // Dialogs are opened exclusively via openOfficeDialog floating window!
      return;
    }

    const handleViewParam = (v: string | null, filterParam?: string | null) => {
      if (!v) return;
      if (v === "settings" || v === "doc_settings") {
        setActiveModal("document_settings");
      } else if (v === "standardize" || v === "inspect") {
        setActiveModal("inspect");
        setValidationScope("document");
        void handleCheck("document");
      } else if (v === "template-form" || v === "template") {
        setActiveModal("template_library");
      } else if (v === "library") {
        setActiveModal("template_library");
        if (filterParam === "recent" || filterParam === "favorite") {
          setTemplateLibraryFilter(filterParam);
        }
      } else if (v === "builder") {
        setActiveModal("template_wizard");
      } else if (v === "knowledge") {
        setActiveModal("knowledge");
      } else if (v === "settings_modal") {
        setActiveModal("ai_settings");
      }
    };

    const params = new URLSearchParams(window.location.search);
    const initialView = params.get("view");
    const filter = params.get("filter") as "recent" | "favorite" | null;
    handleViewParam(initialView, filter);
  }, [isDialog]);

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

  const handleCheck = (requestedScope: "selection" | "document" = validationScope) => run(async () => {
    if (requestedScope === "document") {
      const inspection = await inspectCurrentDocument(ruleProfileId);
      const { summary, components, pageSnapshot } = inspection;
      setRuleProfileId(inspection.profileId);
      setEvaluationSummary(summary);
      setRecognizedComponents(components);
      setIssues(summary.isBlankDocument ? [] : summary.issues);
      if (summary.isBlankDocument) {
        setStatus("Tài liệu chưa có nội dung để kiểm tra.");
        return;
      }
      const profile = getRuleProfile(inspection.profileId);
      const pageNote = profile.page && !pageSnapshot ? " Word hiện tại không hỗ trợ kiểm tra lề tự động." : "";
      setStatus(`Kiểm tra theo ${profile.name}: Đạt ${summary.passedRules}/${summary.applicableRules} tiêu chuẩn (${summary.healthScore}%). Nhận diện ${components.length} thành phần thể thức.${pageNote}`);
      return;
    }

    const profile = getRuleProfile(ruleProfileId);
    const snapshots = await inspectSelectionParagraphs();
    if (snapshots.length === 0) throw new Error("Hãy chọn ít nhất một đoạn văn bản trước khi kiểm tra.");

    const summary = evaluateDocumentRules({
      profileId: ruleProfileId,
      validationScope: "selection",
      paragraphSnapshots: snapshots,
      pageSnapshot: null,
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
    const componentNote = ` Nhận diện ${components.length} thành phần thể thức.`;
    setStatus(
      `Kiểm tra theo ${profile.name}: Đạt ${summary.passedRules}/${summary.applicableRules} tiêu chuẩn (${summary.healthScore}%).${componentNote}`
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

  const handle1ClickStandardize = () => run(async () => {
    await applyA4Margins();
    await handleFixAllSafeIssues();
    setStatus("Đã hoàn tất Chuẩn hóa 1-click (Lề A4 + Sửa toàn bộ lỗi an toàn).");
  });

  const handleRollbackLastAction = () => run(async () => {
    const txManager = new TransactionManager();
    const tx = await txManager.getLatestTransaction();
    if (tx && tx.inversePatches && tx.inversePatches.length > 0) {
      await applyInversePatches(tx.inversePatches);
      await txManager.clearHistory();
      setStatus("Đã hoàn tác thao tác chuẩn hóa gần nhất.");
    } else {
      setStatus("Không có thao tác nào trong lịch sử để hoàn tác.");
    }
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

  const handleSaveDraftExplicit = () => {
    if (activeFormTemplate) {
      saveTemplateFormDraft(activeFormTemplate.id, activeFormTemplate.organization, activeFormTemplate.documentType, templateFormValues);
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
    setAiWorkspaceOpen(false);
    setTemplateFormValues(values);
    setTemplateFormSource("");
    setTemplateFormSuggestions([]);
    setTemplateFormSyncMessage("");
    setStatus(draft ? `Đã mở bản nháp form "${template.name}".` : `Đã mở form "${schema.label}" cho ${template.name}. Hãy điền thông tin rồi bấm "Chèn mẫu & Điền vào Word".`);
  });

  const handleInsertTemplateBlank = (template: TemplateRecord) => run(async () => {
    sendDebug(`handleInsertTemplateBlank: ${template.id} (${template.name})`);
    setStatus(`Đang chèn mẫu "${template.name}" vào Word...`);
    if (isDialog) {
      try {
        Office.context.ui.messageParent(JSON.stringify({ type: "insert_template", template }));
        return;
      } catch (e) {
        sendDebug(`messageParent failed, fallback to local insert: ${String(e)}`);
      }
    }
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
    if (isDialog) {
      try {
        Office.context.ui.messageParent(JSON.stringify({
          type: "insert_template_fill",
          template,
          values: normalized,
        }));
        return;
      } catch (e) {
        sendDebug(`messageParent fill failed: ${String(e)}`);
      }
    }
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
    if (isDialog) {
      try {
        Office.context.ui.messageParent(JSON.stringify({
          type: "apply_template_form",
          template: activeFormTemplate,
          values: normalized,
        }));
        return;
      } catch (e) {
        sendDebug(`messageParent apply failed: ${String(e)}`);
      }
    }
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

  const handleRefineMessage = async (msgIndex: number, instructionPrompt: string, currentText: string): Promise<string> => {
    if (!aiApiKey || !aiApiKey.trim()) {
      setAiSettingsModalOpen(true);
      throw new Error(`Chưa có khóa API Key cho ${aiProvider === "gemini" ? "Google Gemini" : "OpenAI"}. Đã mở hộp thoại Cài đặt, vui lòng cấu hình API Key.`);
    }
    setStatus("Đang tinh chỉnh nội dung theo yêu cầu...");
    const refineSystemInstruction = "Bạn là trợ lý AI chuyên gia soạn thảo văn bản hành chính theo Nghị định 30/2020/NĐ-CP và chuẩn quy định của Trung tâm Thử nghiệm - Kiểm định Công nghiệp (TVCI).\nNhiệm vụ của bạn là tinh chỉnh lại nội dung được cung cấp theo đúng yêu cầu, giữ nguyên các số liệu kỹ thuật/pháp lý nếu có, trả về nội dung hoàn chỉnh, không kèm lời chào hỏi hay giải thích rườm rà.";
    const refineUserPrompt = `${instructionPrompt}\n\nNội dung cần tinh chỉnh:\n"${currentText}"`;
    const prompt = buildWritingPrompt({
      input: refineUserPrompt,
      style: writingStyle,
      history: [],
      instruction: refineSystemInstruction,
    });
    const output = await requestAiPromptDirect(
      { provider: aiProvider, model: aiModel, apiKey: aiApiKey },
      prompt,
      fetch,
      []
    );
    // Update active assistant message in chatHistory as well so persistence reflects the active content
    setChatHistory((prev) => {
      const copy = [...prev];
      if (copy[msgIndex]) {
        copy[msgIndex] = { ...copy[msgIndex], content: output };
        persistConversation(copy);
      }
      return copy;
    });
    setAiPreview(output);
    setStatus("✓ Đã tinh chỉnh phiên bản mới thành công!");
    return output;
  };

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

  if (isDialog) {
    return (
      <div className="dialogRootWindow">
        {/* MODAL 1: Thiết lập Văn bản */}
        <DocumentSettingsModal
          isOpen={activeModal === "document_settings"}
          onClose={closeActiveModal}
          onApply={async (s) => {
            await applySettingsToWord(s);
            setDocumentSettings(s);
            closeDialogContainer();
          }}
          onSaveDefault={(s) => {
            saveDefaultSettings(s);
            setDocumentSettings(s);
            closeDialogContainer();
          }}
          onSaveAndApply={async (s) => {
            await saveAndApplySettings(s);
            setDocumentSettings(s);
            closeDialogContainer();
          }}
        />

        {/* MODAL 2: Kiểm tra Thể thức Văn bản */}
        <InspectionModal
          isOpen={activeModal === "inspect"}
          onClose={closeActiveModal}
          onCheck={handleCheck}
          summary={evaluationSummary}
          issues={issues}
          onLocateIssue={handleLocateIssue}
          onFixIssue={handleFix}
          onFixAllSafe={handleFixAllSafeIssues}
          on1ClickStandardize={handle1ClickStandardize}
          onRollback={handleRollbackLastAction}
          busy={busy}
        />

        {/* MODAL 3: Kho Biểu Mẫu */}
        <TemplateLibraryModal
          isOpen={activeModal === "template_library"}
          onClose={closeActiveModal}
          templates={allTemplates}
          initialFilter={templateLibraryFilter}
          onOpenForm={(tmpl) => {
            setActiveModal("none");
            void handleOpenTemplateForm(tmpl);
          }}
          onDirectInsert={(tmpl) => {
            void handleInsertTemplateBlank(tmpl);
          }}
          onOpenWizard={() => setActiveModal("template_wizard")}
        />

        {/* MODAL 4: Tạo Biểu Mẫu (Wizard) */}
        <TemplateWizardModal
          isOpen={activeModal === "template_wizard" || wizardOpen}
          onClose={() => {
            closeActiveModal();
            setWizardOpen(false);
          }}
          onSaved={(newTemplate) => {
            void refreshUserTemplates();
            setWizardOpen(false);
            void handleOpenTemplateForm(newTemplate);
          }}
          onError={(msg) => console.error(msg)}
        />

        {/* MODAL 5: Kho Kiến Thức */}
        <KnowledgeModal
          isOpen={activeModal === "knowledge"}
          onClose={closeActiveModal}
          records={knowledgeRecords}
          onSaveRecord={handleSaveKnowledgeRecord}
          onDeleteRecord={handleDeleteKnowledgeRecord}
          onNotify={setStatus}
        />

        {/* MODAL 6: Cài Đặt AI */}
        <AiSettingsModal
          isOpen={activeModal === "ai_settings" || aiSettingsModalOpen}
          onClose={() => {
            closeActiveModal();
            setAiSettingsModalOpen(false);
          }}
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

        {/* MODAL 7: Điền Biểu Mẫu */}
        {Boolean(activeFormTemplate && activeFormSchema) && (
          <TemplateFormModal
            isOpen={true}
            template={activeFormTemplate!}
            schema={activeFormSchema!}
            values={templateFormValues}
            sourceText={templateFormSource}
            suggestions={templateFormSuggestions}
            busy={busy}
            syncMessage={templateFormSyncMessage}
            relatedKnowledgeCount={relatedKnowledgeCount}
            onOpenRelatedKnowledge={() => setActiveModal("knowledge")}
            onChange={handleTemplateFormChange}
            onClose={handleCloseTemplateForm}
            onInsertBlank={() => handleInsertTemplateBlank(activeFormTemplate!)}
            onInsertAndFill={() => handleInsertTemplateAndFill(activeFormTemplate!)}
            onApplyToWord={handleApplyTemplateForm}
            onSaveDraft={handleSaveDraftExplicit}
            onChangeTemplate={handleCloseTemplateForm}
            onSourceTextChange={setTemplateFormSource}
            onSuggestAi={handleSuggestTemplateForm}
            onAcceptAi={handleAcceptTemplateFormAi}
            onReviewAi={handleReviewTemplateFormAi}
            onAiValueChange={handleTemplateFormAiValueChange}
          />
        )}

        {/* MODAL 8: Soạn Thảo AI (5 bước chuẩn thể thức) */}
        <SmartDraftingModal
          isOpen={activeModal === "smart_draft"}
          onClose={closeActiveModal}
          templates={allTemplates}
          initialTemplate={activeFormTemplate}
          aiSettings={{ provider: aiProvider, model: aiModel, apiKey: aiApiKey }}
          onOpenAiSettings={() => {
            setActiveModal("ai_settings");
          }}
          onCompleteAndFill={async (template, values) => {
            try {
              Office.context.ui.messageParent(
                JSON.stringify({
                  type: "smart_draft_complete",
                  template,
                  values,
                })
              );
            } catch {
              await run(async () => {
                const schema = getTemplateFormSchema(template);
                setActiveFormTemplate(template);
                setActiveTemplateName(template.name);
                setTemplateFormValues(values);
                saveTemplateFormDraft(template.id, template.organization, template.documentType, values);

                await runTemplateInsertion(() => insertTemplate(template));
                if (schema) {
                  await applyTemplateFormToWord(schema, values);
                } else {
                  const items = Object.entries(values).map(([tag, value]) => ({
                    tag,
                    value: Array.isArray(value) ? value.join("\n") : String(value || ""),
                  }));
                  await setMultipleContentControlTexts(items);
                }
                closeActiveModal();
              });
            }
          }}
        />
      </div>
    );
  }

  return (
    <main className="aiTaskpaneContainer" role="main" aria-label="TVCI AI Chatbot">
      {status && (
        <div
          className="appStatusBanner"
          aria-live="polite"
          style={{
            padding: "3px 6px",
            background: "#eff6ff",
            borderBottom: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: "9px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{status}</span>
          <button
            type="button"
            onClick={() => setStatus("")}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px", lineHeight: 1 }}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
      <AiTaskpaneView
        documentSettings={documentSettings}
        activeTemplate={activeFormTemplate}
        onOpenAiSettings={() => {
          void openOfficeDialog("settings_modal");
        }}
        onOpenTemplateLibrary={() => {
          void openOfficeDialog("template");
        }}
        onStandardizeQuick={handle1ClickStandardize}
        onApplyA4Quick={async () => {
          await run(async () => {
            await applyA4Margins();
            setStatus("Đã áp dụng căn lề A4 chuẩn.");
          });
        }}
        onCheckQuick={async () => {
          await handleCheck("document");
        }}
        messages={chatHistory}
        busy={busy}
        onSendMessage={async (text, style, att) => {
          if (att) setChatAttachments([att]);
          setWritingStyle(style);
          await handleSendChat(text);
        }}
        onRefineMessage={handleRefineMessage}
        onVersionChange={(text) => setAiPreview(text)}
        onNewConversation={handleNewChat}
        conversations={chatConversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          const found = chatConversations.find((c) => c.id === id);
          if (found) setChatHistory(found.messages);
        }}
        onApplyText={async (text) => {
          await run(async () => {
            await applyActivePageRules();
            if (selection.trim()) {
              await replaceSelection(text);
            } else {
              await insertBelowSelection(text);
            }
            setStatus("Đã áp dụng nội dung AI vào văn bản.");
          });
        }}
        onReplaceSelection={async (text) => {
          await run(async () => {
            await applyActivePageRules();
            await replaceSelection(text);
            setStatus("Đã thay thế đoạn đang chọn bằng văn bản AI.");
          });
        }}
        onInsertBelow={async (text) => {
          await run(async () => {
            await applyActivePageRules();
            await insertBelowSelection(text);
            setStatus("Đã chèn nội dung AI bên dưới vùng chọn.");
          });
        }}
        onCopyText={copyText}
        onSaveToKnowledge={async (text) => {
          try {
            const rec: KnowledgeRecord = {
              id: `k-custom-${Date.now()}`,
              category: "experience",
              scope: (documentSettings.agency.agencyAbbr as any) || "TVCI",
              title: `Kinh nghiệm AI: ${text.slice(0, 40)}...`,
              content: text,
              tags: ["ai", "kinh-nghiem"],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await handleSaveKnowledgeRecord(rec);
            setStatus("Đã lưu nội dung vào Kho Kiến thức nghiệp vụ.");
          } catch (err) {
            setStatus(`Lỗi lưu kiến thức: ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
        onRollback={handleRollbackLastAction}
        onApplyFieldsToForm={async (fields) => {
          await run(async () => {
            if (activeFormSchema) {
              await applyTemplateFormToWord(activeFormSchema, fields);
            }
            setTemplateFormValues((prev) => ({ ...prev, ...fields }));
            const items = Object.entries(fields).map(([tag, value]) => ({ tag, value }));
            await setMultipleContentControlTexts(items);
            setStatus(`Đã lưu và cập nhật ${items.length} trường thông tin vào văn bản Word.`);
          });
        }}
        hasSelection={Boolean(selection.trim())}
        selectionWordCount={selection.trim() ? selection.trim().split(/\s+/).length : 0}
      />

      <TemplateFormModal
        isOpen={Boolean(activeFormTemplate && activeFormSchema)}
        template={activeFormTemplate!}
        schema={activeFormSchema!}
        values={templateFormValues}
        sourceText={templateFormSource}
        suggestions={templateFormSuggestions}
        busy={busy}
        syncMessage={templateFormSyncMessage}
        relatedKnowledgeCount={relatedKnowledgeCount}
        onOpenRelatedKnowledge={() => {
          void openOfficeDialog("knowledge");
        }}
        onChange={handleTemplateFormChange}
        onClose={handleCloseTemplateForm}
        onInsertBlank={() => handleInsertTemplateBlank(activeFormTemplate!)}
        onInsertAndFill={() => handleInsertTemplateAndFill(activeFormTemplate!)}
        onApplyToWord={handleApplyTemplateForm}
        onSaveDraft={handleSaveDraftExplicit}
        onChangeTemplate={handleCloseTemplateForm}
        onSourceTextChange={setTemplateFormSource}
        onSuggestAi={handleSuggestTemplateForm}
        onAcceptAi={handleAcceptTemplateFormAi}
        onReviewAi={handleReviewTemplateFormAi}
        onAiValueChange={handleTemplateFormAiValueChange}
      />
    </main>
  );
}
