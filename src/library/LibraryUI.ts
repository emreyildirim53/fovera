import { $ } from '../utils/dom';
import type { Book, VisibleWordCount } from '../core/types';
import type { BookLibrary } from './BookLibrary';
import { I18n, type Locale } from '../i18n';
import { formatFileSize, PDF_UPLOAD_LIMITS } from './pdfUploadConfig';
import { PdfImportError } from './pdfUploadErrors';
import type { PdfImportReport } from './pdfImport';
import {
  PRESET_THEME_IDS,
  ThemeManager,
  getThemePreset,
  type CustomThemeOverrides,
  type ThemeId,
  type ThemePresetId,
  type ThemeSelection,
  type ThemeVars,
} from '../theme';

export interface LibraryUICallbacks {
  onBookSelected: (book: Book) => void;
  onWordTranslationsChanged?: (enabled: boolean) => void;
  onVisibleWordCountChanged?: (count: VisibleWordCount) => void;
  onGuideTourRequested?: () => void;
  onRestoreDefaultsRequested?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface CustomThemeFormState extends CustomThemeOverrides {
  baseThemeId: ThemePresetId;
}

type LibraryTab = 'preset' | 'custom';
type DrawerMode = 'library' | 'settings';
type SettingsTab = 'guide' | 'features' | 'visuals';

/**
 * Owns the library drawer, tab switching, and the "add a book" modal
 * (stacked upload plus optional manual text). Purely DOM wiring; catalog state lives in
 * `BookLibrary`.
 */
export class LibraryUI {
  private readonly menuBtn = $<HTMLButtonElement>('#menu-btn');
  private readonly settingsBtn = $<HTMLButtonElement>('#settings-btn');
  private readonly library = $<HTMLElement>('#library');
  private readonly libContent = $<HTMLDivElement>('#lib-content');
  private readonly libClose = $<HTMLButtonElement>('#lib-close');
  private readonly libraryTabsShell = $<HTMLDivElement>('.lib-tabs-shell');
  private readonly presetGrid = $<HTMLDivElement>('#preset-grid');
  private readonly customGrid = $<HTMLDivElement>('#custom-grid');
  private readonly settingsPanel = $<HTMLDivElement>('#settings-panel');
  private readonly libraryTitle = $<HTMLSpanElement>('.lib-title');
  private readonly librarySubtitle = $<HTMLSpanElement>('#lib-subtitle');
  private readonly libraryOverview = $<HTMLElement>('.lib-overview');
  private readonly libraryOverviewKicker = $<HTMLSpanElement>('#lib-overview-kicker');
  private readonly libraryOverviewTitle = $<HTMLHeadingElement>('#lib-overview-title');
  private readonly libraryOverviewAuthor = $<HTMLSpanElement>('#lib-overview-author');
  private readonly libraryOverviewPages = $<HTMLSpanElement>('#lib-overview-pages');
  private readonly libraryOverviewBody = $<HTMLParagraphElement>('#lib-overview-body');
  private readonly libraryOverviewAction = $<HTMLButtonElement>('#lib-overview-action');
  private readonly libraryCurrentCard = $<HTMLButtonElement>('#lib-current-card');
  private readonly libraryCurrentCardMedia = $<HTMLDivElement>('#lib-current-card-media');
  private readonly libraryCurrentCardKicker = $<HTMLSpanElement>('#lib-current-card-kicker');
  private readonly libraryCurrentCardTitle = $<HTMLHeadingElement>('#lib-current-card-title');
  private readonly libraryCurrentCardAuthor = $<HTMLSpanElement>('#lib-current-card-author');
  private readonly libraryCurrentCardPages = $<HTMLSpanElement>('#lib-current-card-pages');
  private readonly libraryStoriesStatValue = $<HTMLSpanElement>('#lib-stat-stories-value');
  private readonly libraryStoriesStatLabel = $<HTMLSpanElement>('#lib-stat-stories-label');
  private readonly libraryCustomStatValue = $<HTMLSpanElement>('#lib-stat-custom-value');
  private readonly libraryCustomStatLabel = $<HTMLSpanElement>('#lib-stat-custom-label');
  private readonly libraryThemesStatValue = $<HTMLSpanElement>('#lib-stat-themes-value');
  private readonly libraryThemesStatLabel = $<HTMLSpanElement>('#lib-stat-themes-label');
  private readonly storiesTab = $<HTMLButtonElement>('.lib-tab[data-tab="preset"]');
  private readonly customTab = $<HTMLButtonElement>('.lib-tab[data-tab="custom"]');
  private readonly sectionHead = $<HTMLElement>('#lib-section-head');
  private readonly sectionKicker = $<HTMLSpanElement>('#lib-section-kicker');
  private readonly sectionTitle = $<HTMLHeadingElement>('#lib-section-title');
  private readonly sectionBody = $<HTMLParagraphElement>('#lib-section-body');
  private readonly sectionAction = $<HTMLButtonElement>('#lib-section-action');
  private readonly settingsKicker = $<HTMLSpanElement>('#settings-kicker');
  private readonly settingsTitle = $<HTMLHeadingElement>('#settings-title');
  private readonly settingsCopy = $<HTMLParagraphElement>('#settings-copy');
  private readonly settingsRestoreBtn = $<HTMLButtonElement>('#settings-restore-btn');
  private readonly settingsGuideTab = $<HTMLButtonElement>('.settings-tab[data-settings-tab="guide"]');
  private readonly settingsGuidePanel = $<HTMLDivElement>('#settings-guide-panel');
  private readonly settingsFeaturesTab = $<HTMLButtonElement>('.settings-tab[data-settings-tab="features"]');
  private readonly settingsVisualsTab = $<HTMLButtonElement>('.settings-tab[data-settings-tab="visuals"]');
  private readonly settingsFeaturesPanel = $<HTMLDivElement>('#settings-features-panel');
  private readonly settingsVisualsPanel = $<HTMLDivElement>('#settings-visuals-panel');
  private readonly controlsTitle = $<HTMLSpanElement>('#controls-title');
  private readonly controlsCopy = $<HTMLParagraphElement>('#controls-copy');
  private readonly guideTourKicker = $<HTMLSpanElement>('#guide-tour-kicker');
  private readonly guideTourTitle = $<HTMLHeadingElement>('#guide-tour-title');
  private readonly guideTourCopy = $<HTMLParagraphElement>('#guide-tour-copy');
  private readonly guideTourBtn = $<HTMLButtonElement>('#guide-tour-btn');
  private readonly controlTapLabel = $<HTMLSpanElement>('#control-tap-label');
  private readonly controlTapCopy = $<HTMLParagraphElement>('#control-tap-copy');
  private readonly controlSwipeLabel = $<HTMLSpanElement>('#control-swipe-label');
  private readonly controlSwipeCopy = $<HTMLParagraphElement>('#control-swipe-copy');
  private readonly controlBrowseLabel = $<HTMLSpanElement>('#control-browse-label');
  private readonly controlBrowseCopy = $<HTMLParagraphElement>('#control-browse-copy');
  private readonly controlPagesLabel = $<HTMLSpanElement>('#control-pages-label');
  private readonly controlPagesCopy = $<HTMLParagraphElement>('#control-pages-copy');
  private readonly languageLabel = $<HTMLSpanElement>('#language-label');
  private readonly languageSelect = $<HTMLSelectElement>('#language-select');
  private readonly inlineTranslationLabel = $<HTMLSpanElement>('#inline-translation-label');
  private readonly inlineTranslationCopy = $<HTMLParagraphElement>('#inline-translation-copy');
  private readonly inlineTranslationToggle = $<HTMLInputElement>('#inline-translation-toggle');
  private readonly visibleWordsLabel = $<HTMLSpanElement>('#visible-words-label');
  private readonly visibleWordsCopy = $<HTMLParagraphElement>('#visible-words-copy');
  private readonly wordCountGroup = $<HTMLDivElement>('#word-count-group');
  private readonly wordCountButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-word-count]'));
  private readonly themeKicker = $<HTMLSpanElement>('#theme-kicker');
  private readonly themeCopy = $<HTMLParagraphElement>('#theme-copy');
  private readonly themeSection = $<HTMLElement>('#theme-section');
  private readonly themeGrid = $<HTMLDivElement>('#theme-grid');
  private readonly themePreviewLabel = $<HTMLSpanElement>('#theme-preview-label');
  private readonly themePreviewState = $<HTMLSpanElement>('#theme-preview-state');
  private readonly themePreviewCard = $<HTMLDivElement>('#theme-preview-card');
  private readonly themeApplyDock = $<HTMLDivElement>('#theme-apply-dock');
  private readonly themeApplyBtn = $<HTMLButtonElement>('#theme-apply-btn');
  private readonly customThemeLabel = $<HTMLSpanElement>('#custom-theme-label');
  private readonly customThemeCopy = $<HTMLParagraphElement>('#custom-theme-copy');
  private readonly baseThemeLabel = $<HTMLSpanElement>('#base-theme-label');
  private readonly customBaseTheme = $<HTMLSelectElement>('#custom-base-theme');
  private readonly mainWordLabel = $<HTMLSpanElement>('#main-word-label');
  private readonly mainWordColor = $<HTMLInputElement>('#main-word-color');
  private readonly secondaryTextLabel = $<HTMLSpanElement>('#secondary-text-label');
  private readonly secondaryTextColor = $<HTMLInputElement>('#secondary-text-color');
  private readonly accentColorLabel = $<HTMLSpanElement>('#accent-color-label');
  private readonly accentColor = $<HTMLInputElement>('#accent-color');
  private readonly backgroundStartLabel = $<HTMLSpanElement>('#background-start-label');
  private readonly backgroundStartColor = $<HTMLInputElement>('#background-start-color');
  private readonly backgroundEndLabel = $<HTMLSpanElement>('#background-end-label');
  private readonly backgroundEndColor = $<HTMLInputElement>('#background-end-color');
  private readonly gradientBalanceLabel = $<HTMLSpanElement>('#gradient-balance-label');
  private readonly gradientBalance = $<HTMLInputElement>('#gradient-balance');
  private readonly gradientBalanceOutput = $<HTMLOutputElement>('#gradient-balance-output');
  private readonly themeResetBtn = $<HTMLButtonElement>('#theme-reset-btn');
  private readonly settingsRestoreModal = $<HTMLDivElement>('#settings-restore-modal');
  private readonly settingsRestoreBackdrop = $<HTMLButtonElement>('#settings-restore-backdrop');
  private readonly settingsRestoreKicker = $<HTMLSpanElement>('#settings-restore-kicker');
  private readonly settingsRestoreClose = $<HTMLButtonElement>('#settings-restore-close');
  private readonly settingsRestoreTitle = $<HTMLHeadingElement>('#settings-restore-title');
  private readonly settingsRestoreCopy = $<HTMLParagraphElement>('#settings-restore-copy');
  private readonly settingsRestoreNote = $<HTMLDivElement>('#settings-restore-note');
  private readonly settingsRestoreCancel = $<HTMLButtonElement>('#settings-restore-cancel');
  private readonly settingsRestoreConfirm = $<HTMLButtonElement>('#settings-restore-confirm');
  private readonly addModal = $<HTMLElement>('#add-modal');
  private readonly addClose = $<HTMLButtonElement>('#add-close');
  private readonly addTitle = $<HTMLSpanElement>('.add-title');
  private readonly uploadSectionLabel = $<HTMLSpanElement>('#upload-section-label');
  private readonly textSectionLabel = $<HTMLSpanElement>('#text-section-label');
  private readonly titleInput = $<HTMLInputElement>('#book-title-input');
  private readonly textInput = $<HTMLTextAreaElement>('#book-text-input');
  private readonly saveTextBtn = $<HTMLButtonElement>('#btn-save-text');
  private readonly fileInput = $<HTMLInputElement>('#file-input');
  private readonly uploadArea = $<HTMLDivElement>('#upload-area');
  private readonly uploadText = $<HTMLSpanElement>('.upload-text');
  private readonly uploadHint = $<HTMLSpanElement>('.upload-hint');
  private readonly uploadPolicy = $<HTMLParagraphElement>('#upload-policy');
  private readonly uploadFeedback = $<HTMLDivElement>('#upload-feedback');
  private readonly uploadFeedbackStatus = $<HTMLSpanElement>('#upload-feedback-status');
  private readonly uploadFeedbackCopy = $<HTMLParagraphElement>('#upload-feedback-copy');
  private readonly uploadFeedbackList = $<HTMLUListElement>('#upload-feedback-list');

  private draftSelection: ThemeSelection = { id: 'midnight' };
  private appliedSelection: ThemeSelection = { id: 'midnight' };
  private activeBookId: string | null = null;
  private activeTab: LibraryTab = 'preset';
  private drawerMode: DrawerMode = 'library';
  private activeSettingsTab: SettingsTab = 'guide';
  private inlineTranslationsEnabled = false;
  private visibleWordCount: VisibleWordCount = 1;
  private uploadBusy = false;

  constructor(
    private readonly library_: BookLibrary,
    private readonly i18n: I18n,
    private readonly themeManager: ThemeManager,
    private readonly callbacks: LibraryUICallbacks
  ) {
    this.wireMenu();
    this.wireTabs();
    this.wireSettingsTabs();
    this.wireOverview();
    this.wireAddModal();
    this.wireLanguageSelect();
    this.wireVisibleWordCount();
    this.wireThemeStudio();
    this.wireThemeApplyDock();
    this.wireGuideTour();
    this.wireRestoreDefaults();
    this.themeManager.subscribe((_resolved, selection) => {
      this.appliedSelection = cloneThemeSelection(selection);
      this.setDraftSelection(selection);
      this.renderThemeStudio();
    });
    this.i18n.subscribe((locale) => this.applyTranslations(locale));
    this.renderCards();
  }

  open(mode: DrawerMode = this.drawerMode): void {
    const wasOpen = this.isOpen;
    this.drawerMode = mode;
    if (mode === 'settings') {
      this.activeSettingsTab = 'guide';
    }
    if (!wasOpen) {
      this.library.classList.add('open');
      this.library.setAttribute('aria-hidden', 'false');
      this.library.removeAttribute('inert');
    }

    this.refreshVisibleSection(false);
    this.hydrateLibraryVisuals();
    this.updateThemeApplyStickyState();
    if (!wasOpen) {
      this.callbacks.onOpen?.();
    }
  }

  close(): void {
    if (!this.isOpen) return;
    this.setRestoreDefaultsModalOpen(false, false);
    this.library.classList.remove('open');
    this.library.setAttribute('aria-hidden', 'true');
    this.library.setAttribute('inert', '');
    this.menuBtn.classList.remove('is-active');
    this.settingsBtn.classList.remove('is-active');
    this.setThemeApplyStickyActive(false);
    this.callbacks.onClose?.();
  }

  get isOpen(): boolean {
    return this.library.classList.contains('open');
  }

  private wireMenu(): void {
    this.menuBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.settingsBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open('library');
    });
    this.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open('settings');
    });
    this.libClose.addEventListener('click', () => this.close());
  }

  private wireTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.lib-tab'));
    for (const tab of tabs) {
      tab.addEventListener('click', () => this.activateTab((tab.dataset['tab'] as LibraryTab) ?? 'preset'));
    }
  }

  private wireSettingsTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.settings-tab'));
    for (const tab of tabs) {
      tab.addEventListener('click', () => this.activateSettingsTab((tab.dataset['settingsTab'] as SettingsTab) ?? 'guide'));
    }
  }

  private wireOverview(): void {
    this.libraryOverviewAction.addEventListener('click', () => this.close());
    this.libraryCurrentCard.addEventListener('click', () => this.close());
    this.sectionAction.addEventListener('click', () => this.setAddModalOpen(true));
  }

  private activateTab(tabName: LibraryTab): void {
    this.activeTab = tabName;
    this.drawerMode = 'library';
    this.refreshVisibleSection(true);
  }

  private activateSettingsTab(tabName: SettingsTab): void {
    this.activeSettingsTab = tabName;
    this.drawerMode = 'settings';
    this.refreshVisibleSection(true);
  }

  private refreshVisibleSection(scrollToSection: boolean): void {
    const settingsMode = this.drawerMode === 'settings';
    const tabName = this.activeTab;
    const libraryTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.lib-tab'));
    for (const tab of libraryTabs) {
      const active = tab.dataset['tab'] === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    const settingsTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.settings-tab'));
    for (const tab of settingsTabs) {
      const active = tab.dataset['settingsTab'] === this.activeSettingsTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    this.library.dataset['mode'] = this.drawerMode;
    this.libraryTabsShell.hidden = settingsMode;
    this.menuBtn.classList.toggle('is-active', this.isOpen && !settingsMode);
    this.settingsBtn.classList.toggle('is-active', this.isOpen && settingsMode);
    this.presetGrid.style.display = !settingsMode && tabName === 'preset' ? 'grid' : 'none';
    this.customGrid.style.display = !settingsMode && tabName === 'custom' ? 'grid' : 'none';
    this.settingsPanel.style.display = settingsMode ? 'grid' : 'none';
    this.settingsGuidePanel.hidden = this.activeSettingsTab !== 'guide';
    this.settingsFeaturesPanel.hidden = this.activeSettingsTab !== 'features';
    this.settingsVisualsPanel.hidden = this.activeSettingsTab !== 'visuals';
    this.settingsGuidePanel.classList.toggle('active', this.activeSettingsTab === 'guide');
    this.settingsFeaturesPanel.classList.toggle('active', this.activeSettingsTab === 'features');
    this.settingsVisualsPanel.classList.toggle('active', this.activeSettingsTab === 'visuals');
    this.libraryOverview.hidden = settingsMode;
    this.sectionHead.hidden = settingsMode;
    this.sectionAction.hidden = settingsMode || tabName !== 'custom';

    if (!settingsMode && tabName === 'preset') {
      this.sectionKicker.textContent = this.i18n.t('stories');
      this.sectionTitle.textContent = this.i18n.t('storiesSectionTitle');
      this.sectionBody.textContent = this.i18n.t('storiesSectionCopy');
    } else if (!settingsMode && tabName === 'custom') {
      this.sectionKicker.textContent = this.i18n.t('myBooks');
      this.sectionTitle.textContent = this.i18n.t('myBooksSectionTitle');
      this.sectionBody.textContent = this.i18n.t('myBooksSectionCopy');
    }
    this.sectionAction.textContent = this.i18n.t('addBook');
    this.updateThemeApplyStickyState();

    if (!scrollToSection || !this.isOpen) return;
    const target = settingsMode ? this.settingsPanel : tabName === 'preset' ? this.libraryOverview : this.sectionHead;
    this.libContent.scrollTo({ top: Math.max(0, target.offsetTop - 18), behavior: 'smooth' });
  }

  private wireAddModal(): void {
    this.addClose.addEventListener('click', () => this.setAddModalOpen(false));

    this.saveTextBtn.addEventListener('click', () => {
      void this.saveTextBook();
    });

    this.uploadArea.addEventListener('click', () => {
      if (this.uploadBusy) return;
      this.fileInput.click();
    });
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.style.borderColor = 'var(--primary)';
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.style.borderColor = '';
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.style.borderColor = '';
      const file = e.dataTransfer?.files?.[0];
      if (file) void this.handleFile(file);
    });
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) void this.handleFile(file);
    });
  }

  private wireLanguageSelect(): void {
    this.languageSelect.value = this.i18n.locale;
    this.languageSelect.addEventListener('change', () => {
      const next = this.languageSelect.value === 'tr' ? 'tr' : 'en';
      this.i18n.setLocale(next);
    });
    this.inlineTranslationToggle.checked = this.inlineTranslationsEnabled;
    this.inlineTranslationToggle.addEventListener('change', () => {
      this.inlineTranslationsEnabled = this.inlineTranslationToggle.checked;
      this.callbacks.onWordTranslationsChanged?.(this.inlineTranslationsEnabled);
    });
  }

  private wireVisibleWordCount(): void {
    for (const button of this.wordCountButtons) {
      button.addEventListener('click', () => {
        const rawValue = Number.parseInt(button.dataset['wordCount'] ?? '1', 10);
        const nextCount = rawValue === 2 || rawValue === 3 ? rawValue : 1;
        this.visibleWordCount = nextCount;
        this.renderVisibleWordCountOptions();
        this.callbacks.onVisibleWordCountChanged?.(nextCount);
      });
    }
  }

  private wireThemeStudio(): void {
    this.themeGrid.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.theme-option');
      if (!button) return;
      const themeId = button.dataset['themeId'] as ThemePresetId | undefined;
      if (!themeId || !PRESET_THEME_IDS.includes(themeId)) return;
      this.setDraftSelection({ id: themeId });
      this.renderThemeStudio();
    });

    this.customBaseTheme.addEventListener('change', () => {
      this.resetCustomControls(this.parseTheme(this.customBaseTheme.value));
    });

    const colorInputs = [
      this.mainWordColor,
      this.secondaryTextColor,
      this.accentColor,
      this.backgroundStartColor,
      this.backgroundEndColor,
    ];
    for (const input of colorInputs) {
      input.addEventListener('input', () => this.syncCustomDraftFromControls());
    }
    this.gradientBalance.addEventListener('input', () => this.syncCustomDraftFromControls());

    this.themeApplyBtn.addEventListener('click', () => this.applyDraftTheme());
    this.themeResetBtn.addEventListener('click', () => this.resetCustomControls(this.parseTheme(this.customBaseTheme.value)));
  }

  private wireThemeApplyDock(): void {
    this.libContent.addEventListener('scroll', () => this.updateThemeApplyStickyState(), { passive: true });
    window.addEventListener('resize', () => this.updateThemeApplyStickyState());
  }

  private wireGuideTour(): void {
    this.guideTourBtn.addEventListener('click', () => {
      this.close();
      this.callbacks.onGuideTourRequested?.();
    });
  }

  private wireRestoreDefaults(): void {
    this.settingsRestoreBtn.addEventListener('click', () => this.setRestoreDefaultsModalOpen(true));
    this.settingsRestoreBackdrop.addEventListener('click', () => this.setRestoreDefaultsModalOpen(false));
    this.settingsRestoreClose.addEventListener('click', () => this.setRestoreDefaultsModalOpen(false));
    this.settingsRestoreCancel.addEventListener('click', () => this.setRestoreDefaultsModalOpen(false));
    this.settingsRestoreConfirm.addEventListener('click', () => {
      this.callbacks.onRestoreDefaultsRequested?.();
      this.setRestoreDefaultsModalOpen(false);
    });
    this.settingsRestoreModal.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.setRestoreDefaultsModalOpen(false);
      }
    });
  }

  private async saveTextBook(): Promise<void> {
    const title = this.titleInput.value.trim();
    const text = this.textInput.value.trim();
    if (!title || !text) return;

    await this.library_.addFromText(title, text);
    this.renderCards();
    this.setAddModalOpen(false);
    this.titleInput.value = '';
    this.textInput.value = '';
  }

  private async handleFile(file: File): Promise<void> {
    if (this.uploadBusy) return;

    const limits = PDF_UPLOAD_LIMITS;
    this.setUploadBusy(true);
    this.renderUploadFeedback('neutral', this.i18n.t('uploadChecking'), this.i18n.t('uploadCheckingCopy'), []);

    try {
      if (file.size > limits.maxFileSizeBytes) {
        throw new PdfImportError('file_too_large', {
          limit: limits.maxFileSizeBytes,
          size: file.size,
        });
      }

      const extension = getFileExtension(file.name);
      if (extension === 'txt') {
        const text = (await file.text()).replace(/\r/g, '').trim();
        if (!text) {
          throw new PdfImportError('empty_text');
        }

        const title = file.name.replace(/\.txt$/i, '');
        const book = await this.library_.addFromText(title, text);
        this.renderCards();
        this.activateTab('custom');
        this.renderUploadFeedback('success', this.i18n.t('uploadSuccess'), this.i18n.format('uploadSuccessCopy', { title: book.title }), [
          this.i18n.format('uploadReportFileSize', { value: formatFileSize(file.size) }),
          this.i18n.format('uploadReportImportedPages', { value: String(book.pages.length) }),
        ]);
        return;
      }

      if (extension !== 'pdf') {
        throw new PdfImportError('unsupported_file_type');
      }

      const { importPdfBook } = await import('./pdfImport');
      const { book, report } = await importPdfBook(file);
      await this.library_.addBook(book);
      this.renderCards();
      this.activateTab('custom');
      this.renderUploadFeedback(
        'success',
        this.i18n.t('uploadSuccess'),
        this.i18n.format('uploadSuccessCopy', { title: report.title }),
        this.buildPdfReportItems(report)
      );
    } catch (error) {
      this.renderUploadError(error, file);
    } finally {
      this.fileInput.value = '';
      this.setUploadBusy(false);
    }
  }

  private setAddModalOpen(open: boolean): void {
    this.addModal.style.display = open ? 'flex' : 'none';
    this.addModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    this.addModal.toggleAttribute('inert', !open);
    if (open) {
      this.resetUploadFeedback();
      this.fileInput.value = '';
    }
  }

  private renderCards(): void {
    this.presetGrid.innerHTML = '';
    this.customGrid.innerHTML = '';
    this.renderHeroStats();

    this.library_.presets.forEach((book) => {
      this.presetGrid.appendChild(this.buildPresetCard(book));
    });
    this.library_.custom.forEach((book) => {
      this.customGrid.appendChild(this.buildCustomCard(book));
    });
    this.customGrid.appendChild(this.buildAddCard());
    this.renderOverview();
    this.refreshVisibleSection(false);
    this.hydrateLibraryVisuals();
  }

  private renderHeroStats(): void {
    this.libraryStoriesStatValue.textContent = String(this.library_.presets.length);
    this.libraryCustomStatValue.textContent = String(this.library_.custom.length);
    this.libraryThemesStatValue.textContent = String(PRESET_THEME_IDS.length);
  }

  private buildPresetCard(book: Book): HTMLElement {
    const localizedBook = this.i18n.localizeBook(book);
    const pageCount = this.i18n.pageCount(localizedBook.pages.length);
    const isCurrent = book.id === this.activeBookId;
    const card = document.createElement('div');
    card.className = `book-card${isCurrent ? ' current' : ''}`;
    const iconHtml = localizedBook.icon ? `<div class="card-cover-icon">${localizedBook.icon}</div>` : '';
    const activePillHtml = isCurrent ? `<div class="card-active-pill">${escapeHtml(this.i18n.t('readingNow'))}</div>` : '';
    const coverAttrs = localizedBook.cover
      ? `data-src="${escapeHtml(localizedBook.cover)}" loading="lazy" decoding="async" fetchpriority="low"`
      : '';
    card.innerHTML = `
      <div class="card-cover">
        <img ${coverAttrs} alt="${escapeHtml(localizedBook.title)}" onerror="this.style.display='none'">
        ${iconHtml}
        <div class="card-masthead">${escapeHtml(this.i18n.t('appTitle'))}</div>
        <div class="card-issue">${pageCount}</div>
        ${activePillHtml}
      </div>
      <div class="card-info">
        <div class="card-author">${escapeHtml(localizedBook.author)}</div>
        <div class="card-title">${escapeHtml(localizedBook.title)}</div>
        <div class="card-rule"></div>
      </div>`;
    card.addEventListener('click', () => {
      this.callbacks.onBookSelected(book);
      this.close();
    });
    return card;
  }

  private buildCustomCard(book: Book): HTMLElement {
    const localizedBook = this.i18n.localizeBook(book);
    const pageCount = this.i18n.pageCount(localizedBook.pages.length);
    const isCurrent = book.id === this.activeBookId;
    const card = document.createElement('div');
    const activePillHtml = isCurrent ? `<div class="card-active-pill">${escapeHtml(this.i18n.t('readingNow'))}</div>` : '';
    card.className = `book-card custom-shelf-card${isCurrent ? ' current' : ''}`;
    card.innerHTML = `
      <div class="card-cover card-cover-custom">
        <div class="card-cover-icon card-cover-monogram">${escapeHtml(getCoverMonogram(localizedBook.title))}</div>
        <div class="card-masthead">${escapeHtml(this.i18n.t('appTitle'))}</div>
        <div class="card-issue">${pageCount}</div>
        ${activePillHtml}
      </div>
      <div class="card-info">
        <div class="card-author">${escapeHtml(localizedBook.author)}</div>
        <div class="card-title">${escapeHtml(localizedBook.title)}</div>
        <div class="card-rule"></div>
      </div>`;
    card.addEventListener('click', () => {
      this.callbacks.onBookSelected(book);
      this.close();
    });
    return card;
  }

  private buildAddCard(featured = false): HTMLElement {
    const card = document.createElement('div');
    card.className = `add-card${featured ? ' featured' : ''}`;
    card.innerHTML = `
      <div class="add-card-icon">+</div>
      <div class="add-card-text">${escapeHtml(this.i18n.t('addBook'))}</div>
      <div class="add-card-copy">${escapeHtml(this.i18n.t('addBookCardCopy'))}</div>`;
    card.addEventListener('click', () => this.setAddModalOpen(true));
    return card;
  }

  private renderThemeStudio(): void {
    const resolvedDraft = this.themeManager.resolveSelection(this.draftSelection);
    this.themeGrid.innerHTML = PRESET_THEME_IDS.map((themeId) => this.buildThemeOption(themeId)).join('');
    this.themePreviewCard.innerHTML = this.buildThemePreview(resolvedDraft.vars);

    const applied = themeSelectionsEqual(this.draftSelection, this.appliedSelection);
    this.themePreviewState.textContent = applied ? this.i18n.t('themeApplied') : this.i18n.t('themeDraft');
    this.themePreviewState.classList.toggle('applied', applied);
    this.themeApplyBtn.textContent = this.i18n.t('applyTheme');
    this.themeApplyBtn.disabled = applied;
    this.themeApplyDock.hidden = applied;
    this.gradientBalanceOutput.textContent = `${this.gradientBalance.value}%`;
    this.updateThemeApplyStickyState();
  }

  private updateThemeApplyStickyState(): void {
    if (
      !this.isOpen ||
      this.drawerMode !== 'settings' ||
      this.activeSettingsTab !== 'visuals' ||
      this.settingsPanel.style.display === 'none' ||
      themeSelectionsEqual(this.draftSelection, this.appliedSelection)
    ) {
      this.setThemeApplyStickyActive(false);
      return;
    }

    const rootRect = this.libContent.getBoundingClientRect();
    const sectionRect = this.themeSection.getBoundingClientRect();
    const isVisible = sectionRect.bottom > rootRect.top + 20 && sectionRect.top < rootRect.bottom - 20;
    this.setThemeApplyStickyActive(isVisible);
  }

  private setThemeApplyStickyActive(active: boolean): void {
    this.settingsPanel.classList.toggle('theme-cta-active', active);
    this.libContent.classList.toggle('theme-cta-active', active);
    this.themeApplyDock.classList.toggle('sticky-active', active);
  }

  private buildThemeOption(themeId: ThemePresetId): string {
    const theme = getThemePreset(themeId);
    const draftActive = this.draftSelection.id === themeId;
    const appliedActive = this.appliedSelection.id === themeId;
    return `
      <button class="theme-option${draftActive ? ' draft-active' : ''}${appliedActive ? ' applied-active' : ''}" type="button" data-theme-id="${themeId}">
        <div class="theme-option-top">
          <span class="theme-option-name">${escapeHtml(this.getThemeLabel(themeId))}</span>
          <span class="theme-option-meta">${appliedActive ? escapeHtml(this.i18n.t('themeApplied')) : draftActive ? escapeHtml(this.i18n.t('themeDraft')) : ''}</span>
        </div>
        <div class="theme-option-swatches">
          <span style="background:${theme['--app-bg-elevated']}"></span>
          <span style="background:${theme['--app-bg']}"></span>
          <span style="background:${theme['--text-primary']}"></span>
          <span style="background:${theme['--primary']}"></span>
        </div>
      </button>`;
  }

  private buildThemePreview(vars: ThemeVars): string {
    const style = Object.entries(vars)
      .map(([key, value]) => `${key}:${value}`)
      .join(';');

    return `
      <div class="theme-preview-stage" style="${style}">
        <div class="theme-preview-reader">
          <div class="theme-preview-word">Focus</div>
          <div class="theme-preview-secondary">context · pacing · calm</div>
          <div class="theme-preview-page">${escapeHtml(this.i18n.format('pageLabel', { page: '1' }))}</div>
        </div>
        <div class="theme-preview-cover">
          <div class="theme-preview-cover-kicker">${escapeHtml(this.i18n.t('appTitle'))}</div>
          <div class="theme-preview-cover-title">Alice</div>
          <div class="theme-preview-cover-meta">Lewis Carroll · ${escapeHtml(this.i18n.pageCount(5))}</div>
        </div>
      </div>`;
  }

  private applyDraftTheme(): void {
    if (this.draftSelection.id === 'custom') {
      const overrides = this.readCustomControls();
      this.themeManager.applyCustomTheme(overrides.baseThemeId, overrides);
      return;
    }
    this.themeManager.setTheme(this.draftSelection.id);
  }

  private syncCustomDraftFromControls(): void {
    const overrides = this.readCustomControls();
    this.draftSelection = {
      id: 'custom',
      baseThemeId: overrides.baseThemeId,
      overrides,
    };
    this.renderThemeStudio();
  }

  private readCustomControls(): CustomThemeFormState {
    return {
      baseThemeId: this.parseTheme(this.customBaseTheme.value),
      textPrimary: this.mainWordColor.value,
      textSecondary: this.secondaryTextColor.value,
      accent: this.accentColor.value,
      backgroundStart: this.backgroundStartColor.value,
      backgroundEnd: this.backgroundEndColor.value,
      gradientBalance: Number.parseInt(this.gradientBalance.value, 10),
    };
  }

  private resetCustomControls(baseThemeId: ThemePresetId): void {
    const preset = getThemePreset(baseThemeId);
    this.customBaseTheme.value = baseThemeId;
    this.mainWordColor.value = preset['--text-primary'];
    this.secondaryTextColor.value = preset['--text-secondary'];
    this.accentColor.value = preset['--primary'];
    this.backgroundStartColor.value = preset['--app-bg-elevated'];
    this.backgroundEndColor.value = preset['--app-bg'];
    this.gradientBalance.value = String(Number.parseInt(preset['--app-bg-stop'], 10));
    this.syncCustomDraftFromControls();
  }

  private setDraftSelection(selection: ThemeSelection): void {
    this.draftSelection = cloneThemeSelection(selection);
    const resolved = this.themeManager.resolveSelection(selection);
    const baseThemeId = selection.id === 'custom' ? selection.baseThemeId ?? 'midnight' : selection.id;
    this.customBaseTheme.value = baseThemeId;
    this.mainWordColor.value = resolved.vars['--text-primary'];
    this.secondaryTextColor.value = resolved.vars['--text-secondary'];
    this.accentColor.value = resolved.vars['--primary'];
    this.backgroundStartColor.value = resolved.vars['--app-bg-elevated'];
    this.backgroundEndColor.value = resolved.vars['--app-bg'];
    this.gradientBalance.value = String(Number.parseInt(resolved.vars['--app-bg-stop'], 10));
  }

  private applyTranslations(locale: Locale): void {
    void locale;
    this.menuBtn.setAttribute('aria-label', this.i18n.t('menuOpen'));
    this.settingsBtn.setAttribute('aria-label', this.i18n.t('openSettings'));
    this.library.setAttribute('aria-label', this.i18n.t('library'));
    this.libraryTitle.textContent = this.i18n.t('appTitle');
    this.librarySubtitle.textContent = this.i18n.t('brandSubtitle');
    this.libraryOverviewKicker.textContent = this.i18n.t('currentReading');
    this.libraryOverviewBody.textContent = this.i18n.t('libraryOverviewBody');
    this.libraryOverviewAction.textContent = this.i18n.t('continueReading');
    this.libraryCurrentCardKicker.textContent = this.i18n.t('readingNow');
    this.libraryStoriesStatLabel.textContent = this.i18n.t('libraryStoriesStat');
    this.libraryCustomStatLabel.textContent = this.i18n.t('libraryCustomStat');
    this.libraryThemesStatLabel.textContent = this.i18n.t('libraryThemesStat');
    this.libClose.setAttribute('aria-label', this.i18n.t('closeLibrary'));
    this.storiesTab.textContent = this.i18n.t('stories');
    this.customTab.textContent = this.i18n.t('myBooks');
    this.settingsKicker.textContent = this.i18n.t('readerSetup');
    this.settingsTitle.textContent = this.i18n.t('settings');
    this.settingsCopy.textContent = this.i18n.t('settingsIntro');
    this.settingsRestoreBtn.textContent = this.i18n.t('restoreDefaults');
    this.settingsGuideTab.textContent = this.i18n.t('settingsGuide');
    this.settingsFeaturesTab.textContent = this.i18n.t('settingsFeatures');
    this.settingsVisualsTab.textContent = this.i18n.t('settingsVisuals');
    this.controlsTitle.textContent = this.i18n.t('controlsTitle');
    this.controlsCopy.textContent = this.i18n.t('controlsCopy');
    this.guideTourKicker.textContent = this.i18n.t('guideTourKicker');
    this.guideTourTitle.textContent = this.i18n.t('guideTourTitle');
    this.guideTourCopy.textContent = this.i18n.t('guideTourCopy');
    this.guideTourBtn.textContent = this.i18n.t('guideTourAction');
    this.controlTapLabel.textContent = this.i18n.t('guideTapLabel');
    this.controlTapCopy.textContent = this.i18n.t('guideTapCopy');
    this.controlSwipeLabel.textContent = this.i18n.t('guideSwipeLabel');
    this.controlSwipeCopy.textContent = this.i18n.t('guideSwipeCopy');
    this.controlBrowseLabel.textContent = this.i18n.t('guideBrowseLabel');
    this.controlBrowseCopy.textContent = this.i18n.t('guideBrowseCopy');
    this.controlPagesLabel.textContent = this.i18n.t('guidePagesLabel');
    this.controlPagesCopy.textContent = this.i18n.t('guidePagesCopy');
    this.languageLabel.textContent = this.i18n.t('language');
    this.languageSelect.value = this.i18n.locale;
    const [englishOption, turkishOption] = Array.from(this.languageSelect.options);
    if (englishOption) englishOption.text = this.i18n.t('languageEnglish');
    if (turkishOption) turkishOption.text = this.i18n.t('languageTurkish');
    this.inlineTranslationLabel.textContent = this.i18n.t('inlineTranslation');
    this.inlineTranslationCopy.textContent =
      this.i18n.locale === 'tr' ? this.i18n.t('inlineTranslationTrToEn') : this.i18n.t('inlineTranslationEnToTr');
    this.inlineTranslationToggle.checked = this.inlineTranslationsEnabled;
    this.visibleWordsLabel.textContent = this.i18n.t('visibleWords');
    this.visibleWordsCopy.textContent = this.i18n.t('visibleWordsCopy');
    this.wordCountGroup.setAttribute('aria-label', this.i18n.t('visibleWords'));

    this.themeKicker.textContent = this.i18n.t('themeStudio');
    this.themeCopy.textContent = this.i18n.t('themeStudioIntro');
    this.themePreviewLabel.textContent = this.i18n.t('themePreview');
    this.customThemeLabel.textContent = this.i18n.t('customTheme');
    this.customThemeCopy.textContent = this.i18n.t('customThemeIntro');
    this.baseThemeLabel.textContent = this.i18n.t('baseTheme');
    this.mainWordLabel.textContent = this.i18n.t('mainWordColor');
    this.secondaryTextLabel.textContent = this.i18n.t('secondaryTextColor');
    this.accentColorLabel.textContent = this.i18n.t('accentColor');
    this.backgroundStartLabel.textContent = this.i18n.t('backgroundStart');
    this.backgroundEndLabel.textContent = this.i18n.t('backgroundEnd');
    this.gradientBalanceLabel.textContent = this.i18n.t('gradientBalance');
    this.themeResetBtn.textContent = this.i18n.t('resetCustom');
    this.settingsRestoreKicker.textContent = this.i18n.t('restoreDefaults');
    this.settingsRestoreClose.setAttribute('aria-label', this.i18n.t('close'));
    this.settingsRestoreBackdrop.setAttribute('aria-label', this.i18n.t('close'));
    this.settingsRestoreTitle.textContent = this.i18n.t('restoreDefaultsTitle');
    this.settingsRestoreCopy.textContent = this.i18n.t('restoreDefaultsCopy');
    this.settingsRestoreNote.textContent = this.i18n.t('restoreDefaultsNote');
    this.settingsRestoreCancel.textContent = this.i18n.t('cancel');
    this.settingsRestoreConfirm.textContent = this.i18n.t('confirmRestoreDefaults');

    this.setThemeOptionLabels();

    this.addModal.setAttribute('aria-label', this.i18n.t('addBookDialog'));
    this.addTitle.textContent = this.i18n.t('addBook');
    this.addClose.setAttribute('aria-label', this.i18n.t('close'));
    this.uploadSectionLabel.textContent = this.i18n.t('fileTab');
    this.textSectionLabel.textContent = this.i18n.t('textTab');
    this.titleInput.placeholder = this.i18n.t('bookTitlePlaceholder');
    this.textInput.placeholder = this.i18n.t('bookTextPlaceholder');
    this.saveTextBtn.textContent = this.i18n.t('save');
    this.uploadText.textContent = this.i18n.t('uploadText');
    this.uploadHint.textContent = this.i18n.t('uploadHint');
    this.uploadPolicy.textContent = this.i18n.format('uploadPolicy', {
      pages: String(PDF_UPLOAD_LIMITS.maxSourcePages),
      size: formatFileSize(PDF_UPLOAD_LIMITS.maxFileSizeBytes),
    });

    this.renderCards();
    this.renderVisibleWordCountOptions();
    this.renderThemeStudio();
  }

  setWordTranslationEnabled(enabled: boolean): void {
    this.inlineTranslationsEnabled = enabled;
    this.inlineTranslationToggle.checked = enabled;
  }

  setVisibleWordCount(count: VisibleWordCount): void {
    this.visibleWordCount = count;
    this.renderVisibleWordCountOptions();
  }

  private setRestoreDefaultsModalOpen(open: boolean, restoreFocus = true): void {
    this.settingsRestoreModal.classList.toggle('hidden', !open);
    this.settingsRestoreModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    this.settingsRestoreModal.toggleAttribute('inert', !open);
    if (open) {
      this.settingsRestoreConfirm.focus();
    } else if (restoreFocus && this.isOpen) {
      this.settingsRestoreBtn.focus();
    }
  }

  setActiveBook(book: Book | null): void {
    this.activeBookId = book?.id ?? null;
    this.renderCards();
  }

  private renderOverview(): void {
    const activeBook = this.getPrimaryBook();
    if (!activeBook) return;

    const localizedBook = this.i18n.localizeBook(activeBook);
    const pageCount = this.i18n.pageCount(localizedBook.pages.length);
    const continueLabel = this.i18n.t('continueReading');

    this.libraryOverviewTitle.textContent = localizedBook.title;
    this.libraryOverviewAuthor.textContent = localizedBook.author;
    this.libraryOverviewPages.textContent = pageCount;
    this.libraryCurrentCardTitle.textContent = localizedBook.title;
    this.libraryCurrentCardAuthor.textContent = localizedBook.author;
    this.libraryCurrentCardPages.textContent = pageCount;
    this.libraryOverviewAction.setAttribute('aria-label', `${continueLabel}: ${localizedBook.title}`);
    this.libraryCurrentCard.setAttribute('aria-label', `${continueLabel}: ${localizedBook.title}`);

    if (localizedBook.cover) {
      this.libraryCurrentCardMedia.dataset['cover'] = localizedBook.cover;
      if (this.isOpen && this.drawerMode === 'library') {
        this.applyOverviewCover(localizedBook.cover);
      } else {
        this.showOverviewPlaceholder(localizedBook.title);
      }
      return;
    }

    delete this.libraryCurrentCardMedia.dataset['cover'];
    this.showOverviewPlaceholder(localizedBook.title);
  }

  private getPrimaryBook(): Book | null {
    const catalog = [...this.library_.presets, ...this.library_.custom];
    return catalog.find((book) => book.id === this.activeBookId) ?? catalog[0] ?? null;
  }

  private setThemeOptionLabels(): void {
    Array.from(this.customBaseTheme.options).forEach((option) => {
      const themeId = this.parseTheme(option.value);
      option.text = this.getThemeLabel(themeId);
    });
  }

  private renderVisibleWordCountOptions(): void {
    for (const button of this.wordCountButtons) {
      const rawValue = Number.parseInt(button.dataset['wordCount'] ?? '1', 10);
      const value = rawValue === 2 || rawValue === 3 ? rawValue : 1;
      const active = value === this.visibleWordCount;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  private getThemeLabel(themeId: ThemeId): string {
    switch (themeId) {
      case 'paper':
        return this.i18n.t('themePaper');
      case 'sage':
        return this.i18n.t('themeSage');
      case 'ember':
        return this.i18n.t('themeEmber');
      case 'mist':
        return this.i18n.t('themeMist');
      case 'linen':
        return this.i18n.t('themeLinen');
      case 'custom':
        return this.i18n.t('customTheme');
      default:
        return this.i18n.t('themeMidnight');
    }
  }

  private parseTheme(value: string): ThemePresetId {
    if (value === 'paper' || value === 'sage' || value === 'ember' || value === 'mist' || value === 'linen') return value;
    return 'midnight';
  }

  private hydrateLibraryVisuals(): void {
    if (!this.isOpen || this.drawerMode !== 'library') return;

    const deferredImages = Array.from(this.presetGrid.querySelectorAll<HTMLImageElement>('img[data-src]'));
    for (const image of deferredImages) {
      const src = image.dataset['src'];
      if (!src || image.getAttribute('src') === src) continue;
      image.src = src;
    }

    const overviewCover = this.libraryCurrentCardMedia.dataset['cover'];
    if (overviewCover) {
      this.applyOverviewCover(overviewCover);
    }
  }

  private applyOverviewCover(cover: string): void {
    this.libraryCurrentCardMedia.classList.remove('no-cover');
    this.libraryCurrentCardMedia.style.backgroundImage =
      `linear-gradient(180deg, rgba(5, 9, 15, 0.02) 0%, rgba(5, 9, 15, 0.34) 38%, rgba(5, 9, 15, 0.76) 100%), url("${cover}")`;
    this.libraryCurrentCardMedia.innerHTML = '';
  }

  private showOverviewPlaceholder(title: string): void {
    this.libraryCurrentCardMedia.classList.add('no-cover');
    this.libraryCurrentCardMedia.style.backgroundImage = '';
    this.libraryCurrentCardMedia.innerHTML = `<span class="lib-current-card-monogram">${escapeHtml(getCoverMonogram(title))}</span>`;
  }

  private buildPdfReportItems(report: PdfImportReport): string[] {
    const items = [
      this.i18n.format('uploadReportFileSize', { value: formatFileSize(report.fileSizeBytes) }),
      this.i18n.format('uploadReportSourcePages', { value: String(report.sourcePages) }),
      this.i18n.format('uploadReportImportedPages', { value: String(report.importedPages) }),
    ];
    if (report.strippedMarginLines > 0) {
      items.push(this.i18n.format('uploadReportStripped', { value: String(report.strippedMarginLines) }));
    }
    return items;
  }

  private renderUploadError(error: unknown, file: File): void {
    const limits = PDF_UPLOAD_LIMITS;
    let copy = this.i18n.t('uploadErrorParse');

    if (error instanceof PdfImportError) {
      switch (error.code) {
        case 'unsupported_file_type':
          copy = this.i18n.t('uploadErrorUnsupported');
          break;
        case 'file_too_large':
          copy = this.i18n.format('uploadErrorFileTooLarge', {
            limit: formatFileSize(error.details.limit ?? limits.maxFileSizeBytes),
            size: formatFileSize(error.details.size ?? file.size),
          });
          break;
        case 'invalid_pdf_signature':
          copy = this.i18n.t('uploadErrorInvalidPdf');
          break;
        case 'password_protected':
          copy = this.i18n.t('uploadErrorPassword');
          break;
        case 'too_many_pages':
          copy = this.i18n.format('uploadErrorPageCount', {
            limit: String(error.details.limit ?? limits.maxSourcePages),
            pages: String(error.details.pages ?? 0),
          });
          break;
        case 'javascript_actions':
          copy = this.i18n.t('uploadErrorScripts');
          break;
        case 'attachments_present':
          copy = this.i18n.t('uploadErrorAttachments');
          break;
        case 'xfa_document':
          copy = this.i18n.t('uploadErrorXfa');
          break;
        case 'no_extractable_text':
          copy = this.i18n.t('uploadErrorNoText');
          break;
        case 'empty_text':
          copy = this.i18n.t('uploadErrorEmptyText');
          break;
        default:
          copy = this.i18n.t('uploadErrorParse');
          break;
      }
    }

    this.renderUploadFeedback('error', this.i18n.t('uploadError'), copy, []);
  }

  private renderUploadFeedback(tone: 'neutral' | 'success' | 'error', title: string, copy: string, items: readonly string[]): void {
    this.uploadFeedback.hidden = false;
    this.uploadFeedback.classList.toggle('is-success', tone === 'success');
    this.uploadFeedback.classList.toggle('is-error', tone === 'error');
    this.uploadFeedbackStatus.textContent = title;
    this.uploadFeedbackCopy.textContent = copy;
    this.uploadFeedbackList.replaceChildren();

    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      this.uploadFeedbackList.appendChild(li);
    }
  }

  private resetUploadFeedback(): void {
    this.uploadFeedback.hidden = true;
    this.uploadFeedback.classList.remove('is-success', 'is-error');
    this.uploadFeedbackStatus.textContent = '';
    this.uploadFeedbackCopy.textContent = '';
    this.uploadFeedbackList.replaceChildren();
  }

  private setUploadBusy(busy: boolean): void {
    this.uploadBusy = busy;
    this.uploadArea.classList.toggle('is-loading', busy);
    this.uploadArea.setAttribute('aria-busy', busy ? 'true' : 'false');
    this.fileInput.disabled = busy;
  }
}

function cloneThemeSelection(selection: ThemeSelection): ThemeSelection {
  return {
    id: selection.id,
    baseThemeId: selection.baseThemeId,
    overrides: selection.overrides ? { ...selection.overrides } : undefined,
  };
}

function themeSelectionsEqual(a: ThemeSelection, b: ThemeSelection): boolean {
  return JSON.stringify(normalizeThemeSelection(a)) === JSON.stringify(normalizeThemeSelection(b));
}

function normalizeThemeSelection(selection: ThemeSelection): ThemeSelection {
  return {
    id: selection.id,
    baseThemeId: selection.baseThemeId,
    overrides: selection.overrides
      ? {
          accent: selection.overrides.accent,
          backgroundEnd: selection.overrides.backgroundEnd,
          backgroundStart: selection.overrides.backgroundStart,
          gradientBalance: selection.overrides.gradientBalance,
          textPrimary: selection.overrides.textPrimary,
          textSecondary: selection.overrides.textSecondary,
        }
      : undefined,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function getCoverMonogram(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'TXT';
  const [firstWord = '', secondWord = ''] = words;
  if (words.length === 1) return firstWord.slice(0, 3).toUpperCase();

  return `${firstWord[0] ?? ''}${secondWord[0] ?? ''}`.toUpperCase();
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] ?? '' : '';
}
