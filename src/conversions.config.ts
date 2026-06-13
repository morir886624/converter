export type ConversionCategory = 'image' | 'audio' | 'video' | 'document' | 'data' | 'archive';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ConversionDef {
  slug: string;
  from: string;
  to: string;
  category: ConversionCategory;
  title: string;
  description: string;
  specificFaq?: FaqItem;
}

export const DOMAIN = 'https://converter.morir.fr';

export const COMMON_FAQS: FaqItem[] = [
  {
    question: 'Est-ce gratuit ?',
    answer: 'Oui, totalement gratuit, sans inscription et sans limite d\'utilisation.',
  },
  {
    question: 'Mes fichiers sont-ils envoyés sur internet ?',
    answer: 'Non. Toutes les conversions s\'effectuent directement dans votre navigateur. Vos fichiers ne quittent jamais votre appareil.',
  },
  {
    question: 'Y a-t-il une limite de taille ?',
    answer: 'Il n\'y a pas de limite côté serveur (il n\'y en a pas). La seule contrainte est la mémoire disponible dans votre navigateur — généralement plusieurs centaines de Mo.',
  },
];

export const conversions: ConversionDef[] = [
  // ── Images ────────────────────────────────────────────────────────────────
  {
    slug: 'jpg-en-pdf',
    from: 'jpg',
    to: 'pdf',
    category: 'image',
    title: 'Convertir JPG en PDF gratuitement',
    description: 'Transformez vos images JPG en fichier PDF en quelques secondes, directement dans votre navigateur. Aucun logiciel à installer, aucun fichier envoyé en ligne.',
    specificFaq: {
      question: 'La qualité de l\'image est-elle préservée dans le PDF ?',
      answer: 'Oui. L\'image est intégrée dans le PDF sans compression supplémentaire. Vous pouvez également ajuster la qualité avant la conversion.',
    },
  },
  {
    slug: 'png-en-pdf',
    from: 'png',
    to: 'pdf',
    category: 'image',
    title: 'Convertir PNG en PDF gratuitement',
    description: 'Convertissez vos images PNG (avec transparence) en PDF instantanément, sans perte de qualité. Fonctionne hors ligne une fois la page chargée.',
    specificFaq: {
      question: 'La transparence du PNG est-elle conservée dans le PDF ?',
      answer: 'Le PDF ne supporte pas la transparence nativement : le fond transparent est remplacé par du blanc dans le document généré.',
    },
  },
  {
    slug: 'jpg-en-webp',
    from: 'jpg',
    to: 'webp',
    category: 'image',
    title: 'Convertir JPG en WebP gratuitement',
    description: 'Réduisez le poids de vos images JPEG jusqu\'à 30 % en les convertissant au format WebP, le format moderne supporté par tous les navigateurs récents.',
    specificFaq: {
      question: 'WebP est-il compatible avec tous les navigateurs ?',
      answer: 'Oui. WebP est supporté par Chrome, Firefox, Safari, Edge et Opera depuis plusieurs années. Il est recommandé pour les sites web.',
    },
  },
  {
    slug: 'png-en-webp',
    from: 'png',
    to: 'webp',
    category: 'image',
    title: 'Convertir PNG en WebP gratuitement',
    description: 'Transformez vos fichiers PNG en WebP pour alléger vos pages web tout en conservant une excellente qualité visuelle. Conversion 100 % locale.',
  },
  {
    slug: 'png-en-jpg',
    from: 'png',
    to: 'jpg',
    category: 'image',
    title: 'Convertir PNG en JPG gratuitement',
    description: 'Convertissez vos images PNG en JPEG pour réduire la taille des fichiers, compatible avec tous les logiciels et services photo.',
    specificFaq: {
      question: 'Quelle qualité JPEG choisir ?',
      answer: 'Pour un bon équilibre taille/qualité, 80 à 85 % est recommandé. Pour les photos très détaillées, montez à 90 %. Pour des miniatures web, 60-70 % suffisent.',
    },
  },
  {
    slug: 'webp-en-jpg',
    from: 'webp',
    to: 'jpg',
    category: 'image',
    title: 'Convertir WebP en JPG gratuitement',
    description: 'Transformez vos fichiers WebP en JPEG pour une meilleure compatibilité avec les logiciels photo et les services qui ne supportent pas encore WebP.',
  },
  {
    slug: 'webp-en-png',
    from: 'webp',
    to: 'png',
    category: 'image',
    title: 'Convertir WebP en PNG gratuitement',
    description: 'Convertissez des images WebP en PNG (sans perte) pour les éditer dans Photoshop, GIMP ou tout autre éditeur graphique.',
  },
  {
    slug: 'pdf-en-jpg',
    from: 'pdf',
    to: 'jpg',
    category: 'image',
    title: 'Convertir PDF en images JPG gratuitement',
    description: 'Extrayez toutes les pages d\'un PDF sous forme d\'images JPEG haute qualité, directement dans votre navigateur. Chaque page devient une image séparée.',
    specificFaq: {
      question: 'Chaque page du PDF devient-elle une image distincte ?',
      answer: 'Oui, chaque page est exportée comme une image JPG indépendante. Si le PDF comporte plusieurs pages, vous recevrez plusieurs fichiers.',
    },
  },
  {
    slug: 'bmp-en-jpg',
    from: 'bmp',
    to: 'jpg',
    category: 'image',
    title: 'Convertir BMP en JPG gratuitement',
    description: 'Réduisez drastiquement la taille de vos fichiers BMP en les convertissant au format JPEG, sans passer par un logiciel.',
  },
  {
    slug: 'gif-en-webp',
    from: 'gif',
    to: 'webp',
    category: 'image',
    title: 'Convertir GIF en WebP gratuitement',
    description: 'Convertissez vos GIF animés en WebP animé pour une taille de fichier considérablement réduite, idéal pour les sites web modernes.',
  },
  {
    slug: 'heic-en-jpg',
    from: 'heic',
    to: 'jpg',
    category: 'image',
    title: 'Convertir HEIC en JPG gratuitement',
    description: 'Convertissez vos photos iPhone au format HEIC en JPEG compatible avec Windows, Android et tous les logiciels photo. Conversion 100 % locale, vos photos ne quittent pas votre appareil.',
    specificFaq: {
      question: 'Pourquoi mes photos iPhone sont-elles au format HEIC ?',
      answer: 'Apple utilise HEIC (High Efficiency Image Container) par défaut depuis iOS 11 car il offre une qualité équivalente au JPEG en prenant deux fois moins de place. Il est cependant moins compatible avec les logiciels et services tiers.',
    },
  },
  {
    slug: 'heic-en-png',
    from: 'heic',
    to: 'png',
    category: 'image',
    title: 'Convertir HEIC en PNG gratuitement',
    description: 'Transformez vos photos iPhone HEIC en PNG sans perte pour les éditer dans Photoshop, GIMP ou tout autre éditeur graphique. Aucun upload, tout reste sur votre appareil.',
  },
  // ── Audio ─────────────────────────────────────────────────────────────────
  {
    slug: 'mp4-en-mp3',
    from: 'mp4',
    to: 'mp3',
    category: 'audio',
    title: 'Convertir MP4 en MP3 gratuitement',
    description: 'Extrayez la piste audio d\'une vidéo MP4 et enregistrez-la en MP3 directement dans votre navigateur. Aucun logiciel, aucun upload.',
    specificFaq: {
      question: 'Peut-on choisir le débit audio (bitrate) ?',
      answer: 'Oui. L\'outil propose plusieurs débits : 96 kbps (léger), 128 kbps (standard), 192 kbps (haute qualité) et 320 kbps (qualité maximale).',
    },
  },
  {
    slug: 'mp3-en-wav',
    from: 'mp3',
    to: 'wav',
    category: 'audio',
    title: 'Convertir MP3 en WAV gratuitement',
    description: 'Transformez vos fichiers MP3 en WAV non compressé pour l\'édition audio professionnelle ou la compatibilité avec des logiciels anciens.',
  },
  {
    slug: 'wav-en-mp3',
    from: 'wav',
    to: 'mp3',
    category: 'audio',
    title: 'Convertir WAV en MP3 gratuitement',
    description: 'Réduisez la taille de vos fichiers audio WAV en les convertissant en MP3, sans perte audible à 128 kbps ou plus.',
  },
  {
    slug: 'mp3-en-ogg',
    from: 'mp3',
    to: 'ogg',
    category: 'audio',
    title: 'Convertir MP3 en OGG gratuitement',
    description: 'Convertissez vos fichiers MP3 au format OGG Vorbis, libre de droits, idéal pour les jeux vidéo et les applications web.',
  },
  {
    slug: 'aac-en-mp3',
    from: 'aac',
    to: 'mp3',
    category: 'audio',
    title: 'Convertir AAC en MP3 gratuitement',
    description: 'Transformez vos fichiers audio AAC (format Apple) en MP3 universel, compatible avec tous les lecteurs audio.',
  },
  // ── Video ─────────────────────────────────────────────────────────────────
  {
    slug: 'avi-en-mp4',
    from: 'avi',
    to: 'mp4',
    category: 'video',
    title: 'Convertir AVI en MP4 gratuitement',
    description: 'Modernisez vos anciennes vidéos AVI en MP4 H.264 pour une meilleure compatibilité avec les smartphones, téléviseurs et plateformes vidéo.',
    specificFaq: {
      question: 'Combien de temps prend la conversion d\'une vidéo ?',
      answer: 'La durée dépend de la taille du fichier et de la puissance de votre appareil. L\'outil utilise ffmpeg.wasm : une vidéo de 5 minutes peut prendre 1 à 3 minutes.',
    },
  },
  {
    slug: 'mkv-en-mp4',
    from: 'mkv',
    to: 'mp4',
    category: 'video',
    title: 'Convertir MKV en MP4 gratuitement',
    description: 'Convertissez vos fichiers MKV en MP4 pour les lire sur n\'importe quel appareil, les partager sur les réseaux sociaux ou les importer dans un montage vidéo.',
  },
  {
    slug: 'mp4-en-webm',
    from: 'mp4',
    to: 'webm',
    category: 'video',
    title: 'Convertir MP4 en WebM gratuitement',
    description: 'Transformez vos vidéos MP4 en WebM, le format vidéo ouvert optimisé pour le web, pour réduire la bande passante sur votre site.',
  },
  {
    slug: 'webm-en-mp4',
    from: 'webm',
    to: 'mp4',
    category: 'video',
    title: 'Convertir WebM en MP4 gratuitement',
    description: 'Convertissez des vidéos WebM en MP4 compatible avec Windows, macOS, Android, iOS et tous les lecteurs multimédia courants.',
  },
  {
    slug: 'mov-en-mp4',
    from: 'mov',
    to: 'mp4',
    category: 'video',
    title: 'Convertir MOV en MP4 gratuitement',
    description: 'Transformez les vidéos QuickTime MOV (iPhone, macOS) en MP4 universellement compatible, sans logiciel à installer.',
  },
  // ── Documents ─────────────────────────────────────────────────────────────
  {
    slug: 'docx-en-pdf',
    from: 'docx',
    to: 'pdf',
    category: 'document',
    title: 'Convertir DOCX en PDF gratuitement',
    description: 'Transformez vos documents Word (.docx) en PDF prêts à partager ou imprimer, directement dans votre navigateur, sans Word ni Adobe.',
    specificFaq: {
      question: 'La mise en forme du document Word est-elle préservée ?',
      answer: 'Les styles de base (titres, gras, italique, listes) sont reproduits. Les mises en page complexes avec tableaux ou images avancées peuvent différer légèrement.',
    },
  },
  {
    slug: 'pdf-en-txt',
    from: 'pdf',
    to: 'txt',
    category: 'document',
    title: 'Extraire le texte d\'un PDF gratuitement',
    description: 'Extrayez le contenu textuel d\'un fichier PDF et enregistrez-le en fichier texte brut (.txt) pour l\'analyser, le copier ou le réutiliser.',
    specificFaq: {
      question: 'Fonctionne-t-il sur les PDF scannés ?',
      answer: 'Les PDF scannés (images) ne contiennent pas de texte extractible par cette méthode. Seuls les PDF "natifs" avec une couche texte sont supportés.',
    },
  },
  {
    slug: 'md-en-html',
    from: 'md',
    to: 'html',
    category: 'document',
    title: 'Convertir Markdown en HTML gratuitement',
    description: 'Transformez vos fichiers Markdown (.md) en HTML prêt à publier sur le web. Conversion instantanée avec rendu fidèle des titres, listes et liens.',
  },
  {
    slug: 'html-en-md',
    from: 'html',
    to: 'md',
    category: 'document',
    title: 'Convertir HTML en Markdown gratuitement',
    description: 'Extrayez le contenu d\'une page HTML et convertissez-le en Markdown propre, idéal pour la documentation, les wikis ou les CMS basés sur Markdown.',
  },
  // ── Data ──────────────────────────────────────────────────────────────────
  {
    slug: 'xlsx-en-csv',
    from: 'xlsx',
    to: 'csv',
    category: 'data',
    title: 'Convertir Excel XLSX en CSV gratuitement',
    description: 'Exportez votre classeur Excel (.xlsx) en fichier CSV (valeurs séparées par des virgules) compatible avec tous les tableurs et outils d\'analyse de données.',
    specificFaq: {
      question: 'Quelle feuille est exportée si le fichier XLSX en contient plusieurs ?',
      answer: 'Seule la première feuille du classeur est exportée en CSV. Pour les autres feuilles, ouvrez le fichier et réorganisez l\'ordre des feuilles.',
    },
  },
  {
    slug: 'csv-en-xlsx',
    from: 'csv',
    to: 'xlsx',
    category: 'data',
    title: 'Convertir CSV en Excel XLSX gratuitement',
    description: 'Importez un fichier CSV dans un classeur Excel (.xlsx) en un clic, sans ouvrir Excel. Idéal pour analyser des données exportées de bases de données.',
  },
  {
    slug: 'json-en-csv',
    from: 'json',
    to: 'csv',
    category: 'data',
    title: 'Convertir JSON en CSV gratuitement',
    description: 'Transformez un tableau JSON en fichier CSV tabulaire pour l\'analyser dans Excel, Google Sheets ou tout autre tableur.',
    specificFaq: {
      question: 'Quelles structures JSON sont supportées ?',
      answer: 'Les tableaux d\'objets plats (un niveau de profondeur) sont convertis directement. Les objets imbriqués sont sérialisés en texte dans la cellule correspondante.',
    },
  },
  {
    slug: 'csv-en-json',
    from: 'csv',
    to: 'json',
    category: 'data',
    title: 'Convertir CSV en JSON gratuitement',
    description: 'Transformez vos fichiers CSV en tableau JSON structuré, prêt à utiliser dans une application web, une API ou un script de traitement de données.',
  },
  {
    slug: 'xml-en-json',
    from: 'xml',
    to: 'json',
    category: 'data',
    title: 'Convertir XML en JSON gratuitement',
    description: 'Convertissez vos fichiers XML en JSON pour les intégrer dans des applications modernes, des APIs REST ou des pipelines de données JavaScript.',
  },
  {
    slug: 'yaml-en-json',
    from: 'yaml',
    to: 'json',
    category: 'data',
    title: 'Convertir YAML en JSON gratuitement',
    description: 'Transformez vos fichiers de configuration YAML en JSON pour les utiliser dans des outils qui ne supportent pas directement YAML.',
  },
];

export const CATEGORY_LABEL: Record<ConversionCategory, string> = {
  image: 'Images',
  audio: 'Audio',
  video: 'Vidéo',
  document: 'Documents',
  data: 'Données',
  archive: 'Archives',
};

export const CATEGORY_ICON_SEO: Record<ConversionCategory, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  document: '📄',
  data: '📊',
  archive: '📦',
};
