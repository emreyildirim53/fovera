import type { Book, BookLocale } from './core/types';
import { presetLocalizedTitles } from './library/presetBookCatalog.generated';

export type Locale = 'en' | 'tr';

const STORAGE_KEY = 'fixate-reader:locale:v1';

type TranslationKey =
  | 'appTitle'
  | 'appDescription'
  | 'brandSubtitle'
  | 'appAriaLabel'
  | 'startHint'
  | 'startHintSubcopy'
  | 'finishedWord'
  | 'finishedHint'
  | 'completionTitle'
  | 'completionSubtitle'
  | 'completionElapsed'
  | 'completionPace'
  | 'wpmTooltip'
  | 'completionPages'
  | 'completionRewinds'
  | 'completionRestart'
  | 'completionChartLabel'
  | 'completionChartPace'
  | 'completionChartCoverage'
  | 'completionChartDepth'
  | 'completionChartControl'
  | 'completionSessions'
  | 'completionCompletions'
  | 'completionBestSession'
  | 'completionReturned'
  | 'pausedHint'
  | 'pageLabel'
  | 'pageChipLabel'
  | 'pagesTitle'
  | 'pagesIntro'
  | 'closePages'
  | 'currentPage'
  | 'jumpPage'
  | 'menuOpen'
  | 'openSettings'
  | 'library'
  | 'closeLibrary'
  | 'currentReading'
  | 'libraryOverviewBody'
  | 'continueReading'
  | 'readingNow'
  | 'libraryHeroKicker'
  | 'libraryHeroTitle'
  | 'libraryHeroBody'
  | 'libraryStoriesStat'
  | 'libraryCustomStat'
  | 'libraryThemesStat'
  | 'stories'
  | 'storiesSectionTitle'
  | 'storiesSectionCopy'
  | 'myBooks'
  | 'myBooksSectionTitle'
  | 'myBooksSectionCopy'
  | 'settings'
  | 'settingsGuide'
  | 'settingsFeatures'
  | 'settingsVisuals'
  | 'readerSetup'
  | 'settingsIntro'
  | 'restoreDefaults'
  | 'restoreDefaultsTitle'
  | 'restoreDefaultsCopy'
  | 'restoreDefaultsNote'
  | 'confirmRestoreDefaults'
  | 'cancel'
  | 'controlsTitle'
  | 'controlsCopy'
  | 'guideTourKicker'
  | 'guideTourTitle'
  | 'guideTourCopy'
  | 'guideTourAction'
  | 'guideTapLabel'
  | 'guideTapCopy'
  | 'guideSwipeLabel'
  | 'guideSwipeCopy'
  | 'guideBrowseLabel'
  | 'guideBrowseCopy'
  | 'guidePagesLabel'
  | 'guidePagesCopy'
  | 'onboardingKicker'
  | 'onboardingStepCounter'
  | 'onboardingSkip'
  | 'onboardingBack'
  | 'onboardingNext'
  | 'onboardingFinish'
  | 'onboardingFocusLabel'
  | 'onboardingFocusTitle'
  | 'onboardingFocusCopy'
  | 'onboardingFocusPointOne'
  | 'onboardingFocusPointTwo'
  | 'onboardingDemoTap'
  | 'onboardingDemoSlow'
  | 'onboardingDemoFast'
  | 'onboardingDemoTranslate'
  | 'onboardingDemoFocusBefore'
  | 'onboardingDemoFocusCenter'
  | 'onboardingDemoFocusAfter'
  | 'onboardingDemoBrowseBefore'
  | 'onboardingDemoBrowseCenter'
  | 'onboardingDemoBrowseAfter'
  | 'onboardingDemoPreviewWord'
  | 'onboardingDemoPreviewTranslation'
  | 'onboardingPaceLabel'
  | 'onboardingPaceTitle'
  | 'onboardingPaceCopy'
  | 'onboardingPacePointOne'
  | 'onboardingPacePointTwo'
  | 'onboardingBrowseLabel'
  | 'onboardingBrowseTitle'
  | 'onboardingBrowseCopy'
  | 'onboardingBrowsePointOne'
  | 'onboardingBrowsePointTwo'
  | 'onboardingSettingsLabel'
  | 'onboardingSettingsTitle'
  | 'onboardingSettingsCopy'
  | 'onboardingSettingsPointOne'
  | 'onboardingSettingsPointTwo'
  | 'language'
  | 'languageEnglish'
  | 'languageTurkish'
  | 'inlineTranslation'
  | 'inlineTranslationEnToTr'
  | 'inlineTranslationTrToEn'
  | 'visibleWords'
  | 'visibleWordsCopy'
  | 'theme'
  | 'themeMidnight'
  | 'themePaper'
  | 'themeSage'
  | 'themeEmber'
  | 'themeMist'
  | 'themeLinen'
  | 'themeStudio'
  | 'themeStudioIntro'
  | 'themePreview'
  | 'themeDraft'
  | 'themeApplied'
  | 'applyTheme'
  | 'customTheme'
  | 'customThemeIntro'
  | 'baseTheme'
  | 'mainWordColor'
  | 'secondaryTextColor'
  | 'accentColor'
  | 'backgroundStart'
  | 'backgroundEnd'
  | 'gradientBalance'
  | 'resetCustom'
  | 'featuredShelfCopy'
  | 'addBook'
  | 'addBookCardCopy'
  | 'close'
  | 'addBookDialog'
  | 'textTab'
  | 'fileTab'
  | 'bookTitlePlaceholder'
  | 'bookTextPlaceholder'
  | 'save'
  | 'uploadText'
  | 'uploadHint'
  | 'uploadPolicy'
  | 'uploadChecking'
  | 'uploadCheckingCopy'
  | 'uploadSuccess'
  | 'uploadSuccessCopy'
  | 'uploadError'
  | 'uploadErrorUnsupported'
  | 'uploadErrorFileTooLarge'
  | 'uploadErrorInvalidPdf'
  | 'uploadErrorPassword'
  | 'uploadErrorPageCount'
  | 'uploadErrorScripts'
  | 'uploadErrorAttachments'
  | 'uploadErrorXfa'
  | 'uploadErrorNoText'
  | 'uploadErrorEmptyText'
  | 'uploadErrorParse'
  | 'uploadReportFileSize'
  | 'uploadReportSourcePages'
  | 'uploadReportImportedPages'
  | 'uploadReportStripped'
  | 'done'
  | 'personalAuthor';

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    appTitle: 'Fovera',
    appDescription: 'Fovera is a focused reading app that keeps every word centered, supports bilingual stories, and helps you read faster with calm, gesture-based control.',
    brandSubtitle: 'The new era of focused reading.',
    appAriaLabel: 'Reader',
    startHint: 'Tap anywhere to begin',
    startHintSubcopy: 'One word stays centered while you control pace, pause, and browsing with simple gestures.',
    finishedWord: 'Finished',
    finishedHint: 'Book finished &middot; {{elapsed}}<br>Tap &middot; Restart',
    completionTitle: 'Story complete',
    completionSubtitle: 'A sharper finish screen with stats from your full reading run.',
    completionElapsed: 'Time',
    completionPace: 'Pace',
    wpmTooltip: 'WPM means words per minute. It shows how many words you read on average in one minute.',
    completionPages: 'Best Session',
    completionRewinds: 'Rewinds',
    completionRestart: 'Tap anywhere to restart.',
    completionChartLabel: 'Reading profile',
    completionChartPace: 'Pace',
    completionChartCoverage: 'Coverage',
    completionChartDepth: 'Depth',
    completionChartControl: 'Control',
    completionSessions: '{{count}} sessions',
    completionCompletions: '{{count}} completions',
    completionBestSession: 'Best run: {{count}} pages',
    completionReturned: 'Returned after {{days}} days',
    pausedHint: 'Paused<br>Tap again to continue',
    pageLabel: 'Page {{page}}',
    pageChipLabel: 'Page {{page}} / {{total}}',
    pagesTitle: 'Pages',
    pagesIntro: 'Jump to any page and restart the flow from its first word.',
    closePages: 'Close pages',
    currentPage: 'Now',
    jumpPage: 'Jump',
    menuOpen: 'Open library',
    openSettings: 'Open settings',
    library: 'Library',
    closeLibrary: 'Close library',
    currentReading: 'Current Reading',
    libraryOverviewBody: 'Return to your current story or switch shelves below without losing your reading rhythm.',
    continueReading: 'Continue Reading',
    readingNow: 'Reading Now',
    libraryHeroKicker: 'Focused Reading Space',
    libraryHeroTitle: 'Choose a story that deserves your full attention.',
    libraryHeroBody: 'A premium shelf for timeless tales, personal texts, and beautifully tuned reading settings.',
    libraryStoriesStat: 'Curated stories',
    libraryCustomStat: 'Personal books',
    libraryThemesStat: 'Theme presets',
    stories: 'Stories',
    storiesSectionTitle: 'Story Shelf',
    storiesSectionCopy: 'Public-domain classics, poster-led covers, and bilingual editions prepared for focused reading.',
    myBooks: 'My Books',
    myBooksSectionTitle: 'Personal Shelf',
    myBooksSectionCopy: 'Keep your own texts here and open them in the same calm, centered reading flow.',
    settings: 'Settings',
    settingsGuide: 'Guide',
    settingsFeatures: 'Features',
    settingsVisuals: 'Visuals',
    readerSetup: 'Reader Setup',
    settingsIntro: 'Language, themes, and controls tuned for focused reading.',
    restoreDefaults: 'Restore defaults',
    restoreDefaultsTitle: 'Reset reader settings?',
    restoreDefaultsCopy: 'Language, theme, speed, visible words, and inline translation will return to their default state.',
    restoreDefaultsNote: 'Your reading stats, current progress, and library stay exactly as they are.',
    confirmRestoreDefaults: 'Restore defaults',
    cancel: 'Cancel',
    controlsTitle: 'Reading Controls',
    controlsCopy: 'Learn the gestures once and they stay consistent across every story.',
    guideTourKicker: 'Guided Tour',
    guideTourTitle: 'Walk through Fovera before your first story.',
    guideTourCopy: 'See pace, browse, multi-word focus, and inline translation in motion.',
    guideTourAction: 'Start Tour',
    guideTapLabel: 'Tap',
    guideTapCopy: 'Start or pause from anywhere on the screen.',
    guideSwipeLabel: 'Swipe',
    guideSwipeCopy: 'Swipe left to speed up. Swipe right to slow down.',
    guideBrowseLabel: 'Browse',
    guideBrowseCopy: 'Drag up or down to preview the surrounding sentence flow.',
    guidePagesLabel: 'Pages',
    guidePagesCopy: 'Use the page pill to jump anywhere in the story.',
    onboardingKicker: 'Fovera Flow',
    onboardingStepCounter: '{{current}} / {{total}}',
    onboardingSkip: 'Skip tour',
    onboardingBack: 'Back',
    onboardingNext: 'Next',
    onboardingFinish: 'Start Reading',
    onboardingFocusLabel: 'Start & pause',
    onboardingFocusTitle: 'Tap anywhere to start or pause.',
    onboardingFocusCopy: 'Fovera keeps the word centered, so your eye stays on the reading line instead of the controls.',
    onboardingFocusPointOne: 'Whole screen is the control',
    onboardingFocusPointTwo: 'Focus never jumps away',
    onboardingDemoTap: 'Tap anywhere',
    onboardingDemoSlow: 'Slow',
    onboardingDemoFast: 'Fast',
    onboardingDemoTranslate: 'Translate',
    onboardingDemoFocusBefore: 'stay',
    onboardingDemoFocusCenter: 'centered',
    onboardingDemoFocusAfter: 'here',
    onboardingDemoBrowseBefore: 'the line glides up',
    onboardingDemoBrowseCenter: 'you stay anchored',
    onboardingDemoBrowseAfter: 'context keeps pace',
    onboardingDemoPreviewWord: 'focus flow',
    onboardingDemoPreviewTranslation: 'odak akışı',
    onboardingPaceLabel: 'Adjust pace',
    onboardingPaceTitle: 'Swipe left to speed up. Swipe right to slow down.',
    onboardingPaceCopy: 'The tempo updates while your finger moves and holds that pace when you release.',
    onboardingPacePointOne: 'Continuous speed control',
    onboardingPacePointTwo: 'No separate slider',
    onboardingBrowseLabel: 'Browse vertically',
    onboardingBrowseTitle: 'Drag up or down to move through the sentence window.',
    onboardingBrowseCopy: 'Fovera previews the nearby line flow without moving the centered anchor from its place.',
    onboardingBrowsePointOne: 'Word-by-word browsing',
    onboardingBrowsePointTwo: 'Resumes where you stop',
    onboardingSettingsLabel: 'Personalize',
    onboardingSettingsTitle: 'Settings adapts Fovera to the way you read.',
    onboardingSettingsCopy: 'Choose one, two, or three visible words, and turn inline translation on whenever a bilingual edition is available.',
    onboardingSettingsPointOne: '1, 2, or 3-word focus',
    onboardingSettingsPointTwo: 'Inline translation',
    language: 'Language',
    languageEnglish: 'English',
    languageTurkish: 'Turkish',
    inlineTranslation: 'Inline Translation',
    inlineTranslationEnToTr: 'Show Turkish under each focused English word when a bilingual edition is available.',
    inlineTranslationTrToEn: 'Show English under each focused Turkish word when a bilingual edition is available.',
    visibleWords: 'Visible Words',
    visibleWordsCopy: 'Keep 1, 2, or 3 words in focus at once. The flow still advances one word at a time.',
    theme: 'Theme',
    themeMidnight: 'Midnight',
    themePaper: 'Paper',
    themeSage: 'Sage',
    themeEmber: 'Ember',
    themeMist: 'Mist',
    themeLinen: 'Linen',
    themeStudio: 'Theme Studio',
    themeStudioIntro: 'Preview first, then apply. Build your own theme with readable contrast.',
    themePreview: 'Live Preview',
    themeDraft: 'Draft',
    themeApplied: 'Applied',
    applyTheme: 'Apply Theme',
    customTheme: 'Custom Theme',
    customThemeIntro: 'Adjust the main word, supporting text, accent, and gradient balance.',
    baseTheme: 'Base Theme',
    mainWordColor: 'Main Word',
    secondaryTextColor: 'Secondary Text',
    accentColor: 'Accent',
    backgroundStart: 'Background Start',
    backgroundEnd: 'Background End',
    gradientBalance: 'Gradient Balance',
    resetCustom: 'Reset Custom',
    featuredShelfCopy: 'Poster-led covers, bilingual stories, and themes tuned for long reading sessions.',
    addBook: 'Add Book',
    addBookCardCopy: 'Paste text or drop a .txt/.pdf file to add it to your shelf in seconds.',
    close: 'Close',
    addBookDialog: 'Add a book',
    textTab: 'Text',
    fileTab: 'File',
    bookTitlePlaceholder: 'Book title...',
    bookTextPlaceholder: "Paste your book here...\n\nSeparate paragraphs with a blank line.\nSplit pages with '---PAGE---'.",
    save: 'Save',
    uploadText: 'Drag and drop a file',
    uploadHint: 'or tap to choose (.txt, .pdf)',
    uploadPolicy:
      'Text-based PDFs only, up to {{size}} and {{pages}} source pages. Password-protected files, scripts, attachments, and image-only scans are blocked.',
    uploadChecking: 'Checking file',
    uploadCheckingCopy: 'Validating size, file signature, page count, and extractable text before adding it to your shelf.',
    uploadSuccess: 'Book added to your shelf',
    uploadSuccessCopy: '{{title}} is ready in My Books.',
    uploadError: 'Import stopped',
    uploadErrorUnsupported: 'Only .txt and .pdf files are supported here.',
    uploadErrorFileTooLarge: 'This file is {{size}}. The current safe limit is {{limit}}.',
    uploadErrorInvalidPdf: 'The selected file does not look like a valid PDF.',
    uploadErrorPassword: 'Password-protected PDFs are blocked. Export an unlocked copy and try again.',
    uploadErrorPageCount: 'This PDF has {{pages}} pages. The current safe limit is {{limit}} source pages.',
    uploadErrorScripts: 'This PDF contains JavaScript actions, so it was blocked for safety.',
    uploadErrorAttachments: 'This PDF contains embedded attachments, so it was blocked for safety.',
    uploadErrorXfa: 'This PDF uses an unsupported XFA form format and could not be imported safely.',
    uploadErrorNoText: 'This PDF does not contain enough selectable text. Image-only scans and OCR-free exports are blocked.',
    uploadErrorEmptyText: 'The selected file does not contain readable text.',
    uploadErrorParse: 'This file could not be parsed safely. Try a clean text export or a born-digital PDF.',
    uploadReportFileSize: 'Validated size: {{value}}',
    uploadReportSourcePages: 'Source PDF pages: {{value}}',
    uploadReportImportedPages: 'Imported reader pages: {{value}}',
    uploadReportStripped: 'Removed repeated headers/footers: {{value}}',
    done: 'Done',
    personalAuthor: 'Personal',
  },
  tr: {
    appTitle: 'Fovera',
    appDescription: 'Fovera, her kelimeyi merkezde tutan, iki dilli hikayeleri destekleyen ve sakin jest kontrolleriyle daha hızlı okumaya yardımcı olan odaklı bir okuma uygulamasıdır.',
    brandSubtitle: 'Odaklı okumanın yeni çağı.',
    appAriaLabel: 'Okuyucu',
    startHint: 'Başlamak için herhangi bir yere dokun',
    startHintSubcopy: 'Tek kelime odakta kalır; hız, duraklatma ve gezinme jestlerle senin kontrolündedir.',
    finishedWord: 'Bitti',
    finishedHint: 'Kitap bitti &middot; {{elapsed}}<br>Dokun &middot; Yeniden başlat',
    completionTitle: 'Hikaye tamamlandı',
    completionSubtitle: 'Bu koşudaki okuma verilerin artık saklanıyor ve her bitişte burada özetleniyor.',
    completionElapsed: 'Süre',
    completionPace: 'Tempo',
    wpmTooltip: 'WPM, dakikadaki kelime sayısı demektir. Bir dakikada ortalama kaç kelime okuduğunu gösterir.',
    completionPages: 'En İyi Seans',
    completionRewinds: 'Geri Alım',
    completionRestart: 'Yeniden başlamak için herhangi bir yere dokun.',
    completionChartLabel: 'Okuma profili',
    completionChartPace: 'Tempo',
    completionChartCoverage: 'Kapsama',
    completionChartDepth: 'Derinlik',
    completionChartControl: 'Kontrol',
    completionSessions: '{{count}} seans',
    completionCompletions: '{{count}} tamamlama',
    completionBestSession: 'En iyi koşu: {{count}} sayfa',
    completionReturned: '{{days}} gün sonra geri dönüldü',
    pausedHint: 'Duraklatıldı<br>Devam etmek için tekrar dokunun',
    pageLabel: 'Sayfa {{page}}',
    pageChipLabel: 'Sayfa {{page}} / {{total}}',
    pagesTitle: 'Sayfalar',
    pagesIntro: 'İstediğin sayfaya atla ve akışı ilk kelimeden yeniden başlat.',
    closePages: 'Sayfaları kapat',
    currentPage: 'Şimdi',
    jumpPage: 'Git',
    menuOpen: 'Kütüphane aç',
    openSettings: 'Ayarları aç',
    library: 'Kütüphane',
    closeLibrary: 'Kütüphaneyi kapat',
    currentReading: 'Şu Anda Okunan',
    libraryOverviewBody: 'Okuma ritmini bozmadan mevcut hikayene dön veya aşağıdan başka bir raf seç.',
    continueReading: 'Okumaya Devam Et',
    readingNow: 'Şimdi Okunuyor',
    libraryHeroKicker: 'Odaklı Okuma Alanı',
    libraryHeroTitle: 'Tüm dikkatini hak eden bir hikaye seç.',
    libraryHeroBody: 'Zamansız masallar, kişisel metinler ve özenle ayarlanmış okuma atmosferi için premium bir raf.',
    libraryStoriesStat: 'Seçili hikaye',
    libraryCustomStat: 'Kişisel kitap',
    libraryThemesStat: 'Tema seçeneği',
    stories: 'Hikayeler',
    storiesSectionTitle: 'Hikaye Rafı',
    storiesSectionCopy: 'Kamusal mal olmuş klasikleri, poster hissi veren kapakları ve iki dilli sürümleriyle odaklı okumaya hazır.',
    myBooks: 'Kitaplarım',
    myBooksSectionTitle: 'Kişisel Raf',
    myBooksSectionCopy: 'Kendi metinlerini burada tut ve aynı sakin, merkezde kalan okuma akışıyla aç.',
    settings: 'Ayarlar',
    settingsGuide: 'Rehber',
    settingsFeatures: 'Özellikler',
    settingsVisuals: 'Görseller',
    readerSetup: 'Okuyucu Ayarları',
    settingsIntro: 'Dil, temalar ve odaklı okumaya göre ayarlanmış kontroller.',
    restoreDefaults: 'Varsayılanlara dön',
    restoreDefaultsTitle: 'Okuyucu ayarları sıfırlansın mı?',
    restoreDefaultsCopy: 'Dil, tema, hız, görünen kelime sayısı ve satır içi çeviri varsayılan durumuna döner.',
    restoreDefaultsNote: 'Okuma istatistiklerin, kaldığın yer ve kütüphanen aynen korunur.',
    confirmRestoreDefaults: 'Varsayılanlara dön',
    cancel: 'Vazgeç',
    controlsTitle: 'Okuma Kontrolleri',
    controlsCopy: 'Hareketleri bir kez öğren; her hikayede aynı şekilde çalışırlar.',
    guideTourKicker: 'Yönlendirilmiş Tur',
    guideTourTitle: 'İlk hikayene başlamadan önce Fovera akışını adım adım gör.',
    guideTourCopy: 'Hız, göz atma, çoklu kelime odağı ve satır içi çeviri hareket halinde gösterilir.',
    guideTourAction: 'Turu Başlat',
    guideTapLabel: 'Dokun',
    guideTapCopy: 'Ekranın herhangi bir yerinden başlat veya duraklat.',
    guideSwipeLabel: 'Kaydır',
    guideSwipeCopy: 'Sola kaydırarak hızlan, sağa kaydırarak yavaşlat.',
    guideBrowseLabel: 'Gözat',
    guideBrowseCopy: 'Yukarı veya aşağı sürükleyerek çevredeki cümle akışını önizle.',
    guidePagesLabel: 'Sayfalar',
    guidePagesCopy: 'Sayfa rozetine dokunup hikayede istediğin yere atla.',
    onboardingKicker: 'Fovera Flow',
    onboardingStepCounter: '{{current}} / {{total}}',
    onboardingSkip: 'Turu Geç',
    onboardingBack: 'Geri',
    onboardingNext: 'İleri',
    onboardingFinish: 'Okumaya Başla',
    onboardingFocusLabel: 'Başlat ve duraklat',
    onboardingFocusTitle: 'Başlatmak veya duraklatmak için her yere dokun.',
    onboardingFocusCopy: 'Fovera kelimeyi merkezde tutar; gözün kontrole değil, okuma çizgisine bağlı kalır.',
    onboardingFocusPointOne: 'Tüm ekran kontroldür',
    onboardingFocusPointTwo: 'Odak hiç sıçramaz',
    onboardingDemoTap: 'Her yere dokun',
    onboardingDemoSlow: 'Yavaş',
    onboardingDemoFast: 'Hızlı',
    onboardingDemoTranslate: 'Çeviri',
    onboardingDemoFocusBefore: 'hep',
    onboardingDemoFocusCenter: 'merkezde',
    onboardingDemoFocusAfter: 'kal',
    onboardingDemoBrowseBefore: 'satır yukarı kayar',
    onboardingDemoBrowseCenter: 'sen yerinde kalırsın',
    onboardingDemoBrowseAfter: 'bağlam seninle gider',
    onboardingDemoPreviewWord: 'odak akışı',
    onboardingDemoPreviewTranslation: 'focus flow',
    onboardingPaceLabel: 'Hızı ayarla',
    onboardingPaceTitle: 'Sola kaydırarak hızlan. Sağa kaydırarak yavaşla.',
    onboardingPaceCopy: 'Parmağın hareket ederken tempo güncellenir; bıraktığında seçtiğin hız korunur.',
    onboardingPacePointOne: 'Kesintisiz hız kontrolü',
    onboardingPacePointTwo: 'Ayrı bir slider gerekmez',
    onboardingBrowseLabel: 'Dikey göz at',
    onboardingBrowseTitle: 'Yukarı veya aşağı sürükleyerek cümle penceresinde ilerle.',
    onboardingBrowseCopy: 'Merkezdeki kelime sabit kalırken çevredeki satırlar bağlamı göstermek için seninle birlikte akar.',
    onboardingBrowsePointOne: 'Kelime kelime gezinme',
    onboardingBrowsePointTwo: 'Durduğun yerden devam',
    onboardingSettingsLabel: 'Kişiselleştir',
    onboardingSettingsTitle: 'Ayarlar Fovera’yı okuma biçimine göre uyumlar.',
    onboardingSettingsCopy: 'Aynı anda bir, iki veya üç kelime gösterebilir; iki dilli sürümlerde satır içi çeviriyi açabilirsin.',
    onboardingSettingsPointOne: '1, 2 veya 3 kelime odağı',
    onboardingSettingsPointTwo: 'Satır içi çeviri',
    language: 'Dil',
    languageEnglish: 'İngilizce',
    languageTurkish: 'Türkçe',
    inlineTranslation: 'Satır İçi Çeviri',
    inlineTranslationEnToTr: 'İki dilli sürüm varsa merkezdeki İngilizce kelimenin altında Türkçe karşılığını göster.',
    inlineTranslationTrToEn: 'İki dilli sürüm varsa merkezdeki Türkçe kelimenin altında İngilizce karşılığını göster.',
    visibleWords: 'Görünen Kelime',
    visibleWordsCopy: 'Aynı anda 1, 2 veya 3 kelime göster. Akış yine her adımda sadece bir kelime ilerler.',
    theme: 'Tema',
    themeMidnight: 'Gece',
    themePaper: 'Kağıt',
    themeSage: 'Ada Çayı',
    themeEmber: 'Kehribar',
    themeMist: 'Sis',
    themeLinen: 'Keten',
    themeStudio: 'Tema Stüdyosu',
    themeStudioIntro: 'Önce önizle, sonra uygula. Okunurluğu yüksek kendi temanı oluştur.',
    themePreview: 'Canlı Önizleme',
    themeDraft: 'Taslak',
    themeApplied: 'Uygulandı',
    applyTheme: 'Temayı Uygula',
    customTheme: 'Özel Tema',
    customThemeIntro: 'Ana kelimeyi, ikincil metinleri, vurgu rengini ve gradyan dengesini ayarla.',
    baseTheme: 'Temel Tema',
    mainWordColor: 'Ana Kelime',
    secondaryTextColor: 'İkinci Metin',
    accentColor: 'Vurgu Rengi',
    backgroundStart: 'Arkaplan Başlangıcı',
    backgroundEnd: 'Arkaplan Sonu',
    gradientBalance: 'Gradient Dengesi',
    resetCustom: 'Özeli Sıfırla',
    featuredShelfCopy: 'Poster hissi veren kapaklar, iki dilli hikayeler ve uzun okumaya göre ayarlanmış temalar.',
    addBook: 'Kitap Ekle',
    addBookCardCopy: 'Metin yapıştır veya bir .txt/.pdf dosyası bırak; birkaç saniyede rafına eklensin.',
    close: 'Kapat',
    addBookDialog: 'Kitap ekle',
    textTab: 'Metin',
    fileTab: 'Dosya',
    bookTitlePlaceholder: 'Kitap başlığı...',
    bookTextPlaceholder: "Kitap metnini buraya yapıştır...\n\nParagrafları boş bir satırla ayır.\nSayfaları '---PAGE---' ile böl.",
    save: 'Kaydet',
    uploadText: 'Dosyayı sürükleyip bırak',
    uploadHint: 'veya seçmek için dokun (.txt, .pdf)',
    uploadPolicy:
      'Yalnızca seçilebilir metin içeren PDF dosyaları kabul edilir. En fazla {{size}} ve {{pages}} kaynak sayfa desteklenir. Parolalı dosyalar, script içeren PDF’ler, ekler ve sadece görselden oluşan taramalar engellenir.',
    uploadChecking: 'Dosya kontrol ediliyor',
    uploadCheckingCopy: 'Boyut, dosya imzası, sayfa sayısı ve seçilebilir metin katmanı kontrol ediliyor.',
    uploadSuccess: 'Kitap rafına eklendi',
    uploadSuccessCopy: '{{title}} artık Kitaplarım bölümünde hazır.',
    uploadError: 'İçe aktarma durduruldu',
    uploadErrorUnsupported: 'Burada yalnızca .txt ve .pdf dosyaları desteklenir.',
    uploadErrorFileTooLarge: 'Bu dosya {{size}} boyutunda. Mevcut güvenli sınır {{limit}}.',
    uploadErrorInvalidPdf: 'Seçilen dosya geçerli bir PDF gibi görünmüyor.',
    uploadErrorPassword: 'Parola korumalı PDF dosyaları engellenir. Kilidi açık bir kopya dışa aktar ve tekrar dene.',
    uploadErrorPageCount: 'Bu PDF {{pages}} sayfa içeriyor. Mevcut güvenli sınır {{limit}} kaynak sayfa.',
    uploadErrorScripts: 'Bu PDF JavaScript eylemleri içerdiği için güvenlik nedeniyle engellendi.',
    uploadErrorAttachments: 'Bu PDF gömülü ekler içerdiği için güvenlik nedeniyle engellendi.',
    uploadErrorXfa: 'Bu PDF desteklenmeyen XFA form biçimini kullanıyor ve güvenli şekilde içe aktarılamadı.',
    uploadErrorNoText: 'Bu PDF yeterli seçilebilir metin içermiyor. Sadece görselden oluşan taramalar ve OCR olmayan dışa aktarmalar engellenir.',
    uploadErrorEmptyText: 'Seçilen dosyada okunabilir metin bulunamadı.',
    uploadErrorParse: 'Bu dosya güvenli biçimde ayrıştırılamadı. Temiz bir metin dışa aktarımı veya metin tabanlı bir PDF deneyin.',
    uploadReportFileSize: 'Doğrulanan boyut: {{value}}',
    uploadReportSourcePages: 'Kaynak PDF sayfası: {{value}}',
    uploadReportImportedPages: 'Okuyucuya aktarılan sayfa: {{value}}',
    uploadReportStripped: 'Temizlenen tekrar eden üst/alt bilgi satırı: {{value}}',
    done: 'Tamam',
    personalAuthor: 'Kişisel',
  },
};

export class I18n {
  private locale_: Locale;
  private listeners = new Set<(locale: Locale) => void>();

  constructor() {
    this.locale_ = this.detectInitialLocale();
    this.applyDocumentTranslations();
  }

  get locale(): Locale {
    return this.locale_;
  }

  t(key: TranslationKey): string {
    return translations[this.locale_][key];
  }

  format(key: TranslationKey, values: Record<string, string>): string {
    return this.t(key).replace(/\{\{(\w+)\}\}/g, (_match, token: string) => values[token] ?? '');
  }

  pageCount(count: number): string {
    if (this.locale_ === 'tr') {
      return `${count} sayfa`;
    }
    return `${count} ${count === 1 ? 'page' : 'pages'}`;
  }

  localizeBook(book: Book): Book {
    const localizedTitle = presetLocalizedTitles[book.id]?.[this.locale_];
    const localizedAuthor = book.author === 'Personal' ? this.t('personalAuthor') : book.author;
    const localizedPages = book.localizedPages?.[this.locale_ as BookLocale];
    const contentLocale = localizedPages ? (this.locale_ as BookLocale) : book.sourceLocale;
    return {
      ...book,
      title: localizedTitle ?? book.title,
      author: localizedAuthor,
      sourceLocale: contentLocale,
      pages: localizedPages ?? book.pages,
    };
  }

  setLocale(locale: Locale): void {
    if (this.locale_ === locale) return;
    this.locale_ = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore persistence failures and keep the active in-memory locale.
    }
    this.applyDocumentTranslations();
    for (const listener of this.listeners) listener(locale);
  }

  resetToDefault(): void {
    const nextLocale = this.detectNavigatorLocale();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore persistence failures and keep the active in-memory locale.
    }
    if (this.locale_ === nextLocale) {
      this.applyDocumentTranslations();
      for (const listener of this.listeners) listener(nextLocale);
      return;
    }
    this.locale_ = nextLocale;
    this.applyDocumentTranslations();
    for (const listener of this.listeners) listener(nextLocale);
  }

  subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    listener(this.locale_);
    return () => this.listeners.delete(listener);
  }

  private detectInitialLocale(): Locale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'tr') return stored;
    } catch {
      // Fall through to navigator detection.
    }
    return this.detectNavigatorLocale();
  }

  private detectNavigatorLocale(): Locale {
    return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  private applyDocumentTranslations(): void {
    document.documentElement.lang = this.locale_;
    const metaTitle = `${this.t('appTitle')} | ${this.t('brandSubtitle')}`;
    document.title = metaTitle;

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute('content', this.t('appDescription'));
    setMetaContent('meta[name="robots"]', 'content', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setMetaContent('meta[name="googlebot"]', 'content', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setMetaContent('meta[name="application-name"]', 'content', this.t('appTitle'));
    setMetaContent('meta[name="apple-mobile-web-app-title"]', 'content', this.t('appTitle'));
    setMetaContent('meta[property="og:site_name"]', 'content', this.t('appTitle'));
    setMetaContent('meta[property="og:title"]', 'content', metaTitle);
    setMetaContent('meta[property="og:description"]', 'content', this.t('appDescription'));
    setMetaContent('meta[property="og:type"]', 'content', 'website');
    setMetaContent('meta[name="twitter:title"]', 'content', metaTitle);
    setMetaContent('meta[name="twitter:description"]', 'content', this.t('appDescription'));
    const absoluteUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
    const imageUrl = new URL('icons/icon-512.png', absoluteUrl).toString();
    setMetaContent('meta[property="og:url"]', 'content', absoluteUrl);
    setMetaContent('meta[property="og:image"]', 'content', imageUrl);
    setMetaContent('meta[property="og:image:alt"]', 'content', `${this.t('appTitle')} app icon`);
    setMetaContent('meta[name="twitter:image"]', 'content', imageUrl);
    const canonical = document.querySelector<HTMLLinkElement>('#canonical-link');
    canonical?.setAttribute('href', absoluteUrl);
    const structuredDataEl = document.querySelector<HTMLScriptElement>('#structured-data');
    if (structuredDataEl) {
      structuredDataEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: this.t('appTitle'),
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        description: this.t('appDescription'),
        url: absoluteUrl,
        image: imageUrl,
        inLanguage: this.locale_,
        availableLanguage: ['en', 'tr'],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: {
          '@type': 'Organization',
          name: this.t('appTitle'),
          url: absoluteUrl,
        },
      });
    }

    const app = document.getElementById('app');
    app?.setAttribute('aria-label', this.t('appAriaLabel'));
  }
}

function setMetaContent(selector: string, attribute: string, value: string): void {
  document.querySelector<HTMLElement>(selector)?.setAttribute(attribute, value);
}
