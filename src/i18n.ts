export type LanguageCode = 'en' | 'fr' | 'rw' | 'sw' | 'ar' | 'es' | 'de' | 'pt' | 'zh' | 'hi';

export interface LanguageOption {
  code: LanguageCode;
  shortCode: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', shortCode: 'EN', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'fr', shortCode: 'FR', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'rw', shortCode: 'RW', name: 'Kinyarwanda', nativeName: 'Kinyarwanda', dir: 'ltr' },
  { code: 'sw', shortCode: 'SW', name: 'Kiswahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'ar', shortCode: 'AR', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'es', shortCode: 'ES', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'de', shortCode: 'DE', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'pt', shortCode: 'PT', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'zh', shortCode: 'ZH', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'hi', shortCode: 'HI', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
];

export interface TranslationDict {
  brandTagline: string;
  languageLabel: string;
  nav: {
    home: string;
    services: string;
    destinations: string;
    gallery: string;
    news: string;
    about: string;
    contact: string;
    bookNow: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    planTrip: string;
    chatWithUs: string;
    proof1: string;
    proof2: string;
    floatTitle: string;
    floatSubtitle: string;
  };
  airlineStrip: string;
  services: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    inquireCta: string;
    items: Record<string, { name: string; description: string }>;
  };
  destinations: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    exploreCta: string;
    names: Record<string, string>;
  };
  feature: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    bullet1: string;
    bullet2: string;
    cta: string;
  };
  about: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    badge1: string;
    badge2: string;
  };
  gallery: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    inquireItem: string;
    regardingPrefix: string;
  };
  news: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    readMore: string;
    closeLabel: string;
    inquireAbout: string;
    regardingPrefix: string;
    categories: Record<string, string>;
  };
  contact: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    followUs: string;
    whatsappLabel: string;
    emailLabel: string;
    bookingLabel: string;
    bookingCta: string;
  };
  footer: {
    rights: string;
    whatsappAria: string;
  };
  bookingModal: {
    eyebrow: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    fullName: string;
    email: string;
    phone: string;
    service: string;
    destination: string;
    travelDate: string;
    details: string;
    submit: string;
    submitting: string;
    clearDraft: string;
    receivedPrefix: string;
    receivedSuffix: string;
    sendWhatsappCopy: string;
    errorFallback: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  en: {
    brandTagline: 'TRAVEL AGENCY',
    languageLabel: 'Language',
    nav: {
      home: 'Home',
      services: 'Services',
      destinations: 'Destinations',
      gallery: 'Gallery',
      news: 'Travel News',
      about: 'About',
      contact: 'Contact',
      bookNow: 'Book now',
    },
    hero: {
      eyebrow: 'YOUR JOURNEY STARTS HERE',
      titleLine1: 'Explore the World',
      titleAccent: 'with TNP.',
      subtitle:
        'Flights, visa assistance, hotels, car rentals and unforgettable tours — travel planning made easier with personal support.',
      planTrip: 'Plan your trip',
      chatWithUs: 'Chat with us',
      proof1: 'Personal assistance',
      proof2: 'Worldwide destinations',
      floatTitle: 'Ready for take-off?',
      floatSubtitle: "Let's plan your next adventure.",
    },
    airlineStrip: 'TRAVEL WITH CONFIDENCE',
    services: {
      eyebrow: 'WHAT WE DO',
      titleLine1: 'Everything you need',
      titleAccent: 'to travel better.',
      subtitle:
        'One trusted partner for the details that make every journey smoother. Tell us what you need and our team will help with the next step.',
      inquireCta: 'Make an inquiry',
      items: {
        'Air ticketing': { name: 'Air ticketing', description: 'Flight inquiries and ticketing support.' },
        'Visa assistance': { name: 'Visa assistance', description: 'Application guidance and document preparation.' },
        'Hotel booking': { name: 'Hotel booking', description: 'Accommodation for business and leisure.' },
        'Car rental': { name: 'Car rental', description: 'Comfortable transport at your destination.' },
        'Tours & trip plans': { name: 'Tours & trip plans', description: 'Tailor-made holidays, trips and safaris.' },
        'Gorilla permits': { name: 'Gorilla permits', description: 'Assistance with Rwanda gorilla permit inquiries.' },
        'Study & work abroad': { name: 'Study & work abroad', description: 'Guidance for international opportunities.' },
        'Money transfer': { name: 'Money transfer', description: 'Ask us about supported transfer services.' },
      },
    },
    destinations: {
      eyebrow: 'GO FURTHER',
      titleLine1: 'Where will life',
      titleAccent: 'take you next?',
      subtitle:
        'Explore international study, work and travel opportunities. Our team can help you understand the process and prepare your next steps.',
      exploreCta: 'Explore destinations',
      names: {
        Canada: 'Canada',
        China: 'China',
        Poland: 'Poland',
        Serbia: 'Serbia',
        Luxembourg: 'Luxembourg',
        Germany: 'Germany',
        Dubai: 'Dubai',
        'United States': 'United States',
      },
    },
    feature: {
      eyebrow: 'FLIGHT & TRAVEL SUPPORT',
      titleLine1: 'Your world.',
      titleAccent: 'One booking away.',
      subtitle:
        'Need a flight, hotel, visa guidance or a complete holiday plan? Share your travel details and let TNP help coordinate your request.',
      bullet1: 'Clear booking updates and next steps',
      bullet2: 'Multiple travel services in one place',
      cta: 'Start a booking',
    },
    about: {
      eyebrow: 'ABOUT TNP',
      titleLine1: 'Your trusted',
      titleAccent: 'travel partner.',
      subtitle:
        'TNP Travel Agency helps individuals, families and businesses plan travel with confidence. We bring travel services together with responsive, personal support.',
      badge1: 'Helpful guidance',
      badge2: 'Service built around you',
    },
    gallery: {
      eyebrow: 'TRAVEL GALLERY',
      titleLine1: 'Moments &',
      titleAccent: 'highlights.',
      subtitle: 'Explore destinations, travel flyers, and updates shared directly by our team.',
      inquireItem: 'Inquire about this',
      regardingPrefix: 'Regarding:',
    },
    news: {
      eyebrow: 'TRAVEL NEWS & TIPS',
      titleLine1: 'Updates &',
      titleAccent: 'travel insights.',
      subtitle: 'Latest visa updates, airline tips, and announcements from TNP Travel Agency.',
      readMore: 'Read article',
      closeLabel: 'Close article',
      inquireAbout: 'Ask our team about this',
      regardingPrefix: 'Regarding news:',
      categories: {
        'Travel Tip': 'Travel Tip',
        'Visa Update': 'Visa Update',
        'Company News': 'Company News',
        'Flight Alert': 'Flight Alert',
        'Destination Guide': 'Destination Guide',
      },
    },
    contact: {
      eyebrow: "LET'S GET YOU MOVING",
      titleLine1: 'Have a trip',
      titleAccent: 'in mind?',
      subtitle: 'Talk to our team and tell us where you want to go.',
      followUs: 'FOLLOW TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'EMAIL',
      bookingLabel: 'BOOKING INQUIRY',
      bookingCta: 'Send your travel request',
    },
    footer: {
      rights: 'TNP Travel Agency. Explore the World with TNP.',
      whatsappAria: 'Chat on WhatsApp',
    },
    bookingModal: {
      eyebrow: 'START YOUR JOURNEY',
      titleLine1: 'Make a booking',
      titleAccent: 'inquiry.',
      subtitle: 'Share your details. Our team will confirm availability, pricing and next steps.',
      fullName: 'Full name',
      email: 'Email',
      phone: 'Phone / WhatsApp',
      service: 'Service',
      destination: 'Destination',
      travelDate: 'Travel date',
      details: 'Additional details',
      submit: 'Submit inquiry',
      submitting: 'Submitting…',
      clearDraft: 'Clear saved draft',
      receivedPrefix: 'Inquiry received',
      receivedSuffix: 'Our team will contact you shortly.',
      sendWhatsappCopy: 'Send copy on WhatsApp',
      errorFallback: 'Could not submit. Please contact us on WhatsApp.',
    },
  },

  fr: {
    brandTagline: 'AGENCE DE VOYAGES',
    languageLabel: 'Langue',
    nav: {
      home: 'Accueil',
      services: 'Services',
      destinations: 'Destinations',
      gallery: 'Galerie',
      news: 'Actualités',
      about: 'À propos',
      contact: 'Contact',
      bookNow: 'Réserver',
    },
    hero: {
      eyebrow: 'VOTRE VOYAGE COMMENCE ICI',
      titleLine1: 'Explorez le monde',
      titleAccent: 'avec TNP.',
      subtitle:
        'Billets d’avion, assistance visa, hôtels, location de voitures et circuits inoubliables — planifiez votre voyage avec un accompagnement personnalisé.',
      planTrip: 'Planifier un voyage',
      chatWithUs: 'Discuter sur WhatsApp',
      proof1: 'Accompagnement personnel',
      proof2: 'Destinations mondiales',
      floatTitle: 'Prêt pour le décollage ?',
      floatSubtitle: 'Organisons votre prochaine aventure.',
    },
    airlineStrip: 'VOYAGEZ EN TOUTE CONFIANCE',
    services: {
      eyebrow: 'NOS SERVICES',
      titleLine1: 'Tout ce qu’il faut',
      titleAccent: 'pour mieux voyager.',
      subtitle:
        'Un partenaire fiable pour chaque étape de votre voyage. Dites-nous ce dont vous avez besoin et notre équipe vous guidera.',
      inquireCta: 'Faire une demande',
      items: {
        'Air ticketing': { name: 'Billetterie aérienne', description: 'Recherche de vols et assistance billetterie.' },
        'Visa assistance': { name: 'Assistance visa', description: 'Conseils et préparation de vos dossiers.' },
        'Hotel booking': { name: 'Réservation d’hôtel', description: 'Hébergements pour affaires et loisirs.' },
        'Car rental': { name: 'Location de voiture', description: 'Transport confortable à votre arrivée.' },
        'Tours & trip plans': { name: 'Circuits et séjours', description: 'Vacances, voyages et safaris sur mesure.' },
        'Gorilla permits': { name: 'Permis gorilles', description: 'Assistance pour les permis au Rwanda.' },
        'Study & work abroad': { name: 'Études et travail à l’étranger', description: 'Orientation vers les opportunités internationales.' },
        'Money transfer': { name: 'Transfert d’argent', description: 'Renseignez-vous sur nos services disponibles.' },
      },
    },
    destinations: {
      eyebrow: 'ALLEZ PLUS LOIN',
      titleLine1: 'Où la vie vous',
      titleAccent: 'mènera-t-elle ?',
      subtitle:
        'Découvrez des opportunités d’études, de travail et de voyage à l’international. Notre équipe vous aide à préparer chaque démarche.',
      exploreCta: 'Explorer les destinations',
      names: {
        Canada: 'Canada',
        China: 'Chine',
        Poland: 'Pologne',
        Serbia: 'Serbie',
        Luxembourg: 'Luxembourg',
        Germany: 'Allemagne',
        Dubai: 'Dubaï',
        'United States': 'États-Unis',
      },
    },
    feature: {
      eyebrow: 'VOLS & ASSISTANCE VOYAGE',
      titleLine1: 'Votre monde.',
      titleAccent: 'À portée de réservation.',
      subtitle:
        'Besoin d’un vol, d’un hôtel, d’un visa ou d’un séjour complet ? Partagez vos détails et laissez TNP coordonner votre demande.',
      bullet1: 'Suivi clair et prochaines étapes détaillées',
      bullet2: 'Tous vos services de voyage au même endroit',
      cta: 'Commencer une réservation',
    },
    about: {
      eyebrow: 'À PROPOS DE TNP',
      titleLine1: 'Votre partenaire',
      titleAccent: 'voyage de confiance.',
      subtitle:
        'TNP Travel Agency aide les particuliers, familles et entreprises à voyager en toute sérénité grâce à un service réactif et humain.',
      badge1: 'Conseils utiles',
      badge2: 'Service adapté à vos besoins',
    },
    gallery: {
      eyebrow: 'GALERIE VOYAGE',
      titleLine1: 'Moments et',
      titleAccent: 'temps forts.',
      subtitle: 'Découvrez les destinations, affiches et nouveautés partagées par notre équipe.',
      inquireItem: 'Demander des infos',
      regardingPrefix: 'Concernant :',
    },
    news: {
      eyebrow: 'ACTUALITÉS & CONSEILS',
      titleLine1: 'Infos voyage &',
      titleAccent: 'mises à jour.',
      subtitle: 'Dernières actualités visa, conseils de vol et annonces de TNP Travel Agency.',
      readMore: 'Lire l’article',
      closeLabel: 'Fermer l’article',
      inquireAbout: 'Poser une question à notre équipe',
      regardingPrefix: 'À propos de l’article :',
      categories: {
        'Travel Tip': 'Conseil voyage',
        'Visa Update': 'Info visa',
        'Company News': 'Actualité TNP',
        'Flight Alert': 'Alerte vol',
        'Destination Guide': 'Guide destination',
      },
    },
    contact: {
      eyebrow: 'PASSONS À L’ACTION',
      titleLine1: 'Un voyage',
      titleAccent: 'en tête ?',
      subtitle: 'Parlez à notre équipe et dites-nous où vous souhaitez partir.',
      followUs: 'SUIVRE TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'E-MAIL',
      bookingLabel: 'DEMANDE DE RÉSERVATION',
      bookingCta: 'Envoyer votre demande',
    },
    footer: {
      rights: 'TNP Travel Agency. Explorez le monde avec TNP.',
      whatsappAria: 'Discuter sur WhatsApp',
    },
    bookingModal: {
      eyebrow: 'COMMENCEZ VOTRE VOYAGE',
      titleLine1: 'Faire une demande',
      titleAccent: 'de réservation.',
      subtitle: 'Partagez vos informations. Notre équipe confirmera disponibilité, tarif et prochaines étapes.',
      fullName: 'Nom complet',
      email: 'E-mail',
      phone: 'Téléphone / WhatsApp',
      service: 'Service',
      destination: 'Destination',
      travelDate: 'Date de voyage',
      details: 'Détails supplémentaires',
      submit: 'Envoyer la demande',
      submitting: 'Envoi en cours…',
      clearDraft: 'Effacer le brouillon',
      receivedPrefix: 'Demande reçue',
      receivedSuffix: 'Notre équipe vous contactera très prochainement.',
      sendWhatsappCopy: 'Envoyer une copie sur WhatsApp',
      errorFallback: 'Échec de l’envoi. Veuillez nous contacter sur WhatsApp.',
    },
  },

  rw: {
    brandTagline: 'IKIGO CY’INGENDO',
    languageLabel: 'Ururimi',
    nav: {
      home: 'Ahabanza',
      services: 'Serivisi',
      destinations: 'Ibyerekezo',
      gallery: 'Amafoto',
      news: 'Amakuru',
      about: 'Abo turi bo',
      contact: 'Twandikire',
      bookNow: 'Saba ubu',
    },
    hero: {
      eyebrow: 'URUGENDO RWAWE RUTANGIRIRA HANO',
      titleLine1: 'Tembera Isi yose',
      titleAccent: 'hamwe na TNP.',
      subtitle:
        'Amatike y’indege, ubufasha bwa viza, amahoteli, gukodesha imodoka n’ingendo z’ubukerarugendo — gutegura urugendo byoroshye kandi witaweho.',
      planTrip: 'Tegura urugendo',
      chatWithUs: 'Tuganire kuri WhatsApp',
      proof1: 'Ubufasha bwihariye',
      proof2: 'Ibyerekezo ku isi hose',
      floatTitle: 'Witeguye guhaguruka?',
      floatSubtitle: 'Reka dutegure urugendo rwawe rukurikira.',
    },
    airlineStrip: 'GENDA UFITE ICYIZERE',
    services: {
      eyebrow: 'IBYO DUKORA',
      titleLine1: 'Ibyo ukeneye byose',
      titleAccent: 'ngo ugende neza.',
      subtitle:
        'Umufatanyabikorwa wizewe mu gutunganya buri kantu mu rugendo rwawe. Tubwire icyo ukeneye tugufashe intambwe ikurikira.',
      inquireCta: 'Baza cyangwa usabe',
      items: {
        'Air ticketing': { name: 'Amatike y’indege', description: 'Gushaka no gukata amatike y’indege.' },
        'Visa assistance': { name: 'Ubufasha bwa Viza', description: 'Kugira inama no gutegura ibyangombwa bya viza.' },
        'Hotel booking': { name: 'Gufata amahoteli', description: 'Aho kurara habereye akazi cyangwa ikiruhuko.' },
        'Car rental': { name: 'Gukodesha imodoka', description: 'Imodoka zikugeza aho ugiye mu mutuzo.' },
        'Tours & trip plans': { name: 'Ubukerarugendo n’ingendo', description: 'Gahunda z’ibiruhuko na safari zateguwe neza.' },
        'Gorilla permits': { name: 'Impushya z’ingagi', description: 'Ubufasha mu kubona impushya zo gusura ingagi mu Rwanda.' },
        'Study & work abroad': { name: 'Kwiga no gukora hanze', description: 'Kugirwa inama ku mahirwe yo mu mahanga.' },
        'Money transfer': { name: 'Kohereza amafaranga', description: 'Tubaze serivisi zo kohereza amafaranga zihari.' },
      },
    },
    destinations: {
      eyebrow: 'JYA KURE KURUSHAHO',
      titleLine1: 'Ni hehe ubuzima',
      titleAccent: 'buzakujyana ubutaha?',
      subtitle:
        'Sobanukirwa amahirwe yo kwiga, gukora no gutembera mu mahanga. Ikipe yacu igufasha gusobanukirwa inzira no kwitegura neza.',
      exploreCta: 'Reba ibyerekezo',
      names: {
        Canada: 'Kanada',
        China: 'Ubushinwa',
        Poland: 'Polonye',
        Serbia: 'Seribiya',
        Luxembourg: 'Luxembourg',
        Germany: 'Ubudage',
        Dubai: 'Dubayi',
        'United States': 'Leta Zunze Ubumwe z’Amerika',
      },
    },
    feature: {
      eyebrow: 'UBUFASHA BW’INDEGE N’INGENDO',
      titleLine1: 'Isi yawe.',
      titleAccent: 'Mu ntambwe imwe yo gusaba.',
      subtitle:
        'Ukeneye itike y’indege, hoteli, inama za viza cyangwa gahunda y’ikiruhuko? Sangiza amakuru yawe TNP igufashe kubihura byose.',
      bullet1: 'Amakuru asobanutse kuri gahunda n’intambwe zikurikira',
      bullet2: 'Serivisi nyinshi z’ingendo hamwe mu mwanya umwe',
      cta: 'Tangira gusaba',
    },
    about: {
      eyebrow: 'ABO TURI BO — TNP',
      titleLine1: 'Umufatanyabikorwa',
      titleAccent: 'wizewe mu ngendo.',
      subtitle:
        'TNP Travel Agency ifasha abantu ku giti cyabo, imiryango n’ibigo gutegura ingendo bafite icyizere, binyuze muri serivisi yihuse kandi yita ku mukiriya.',
      badge1: 'Inama zingirakamaro',
      badge2: 'Serivisi ikubereye',
    },
    gallery: {
      eyebrow: 'AMAFOTO Y’INGENDO',
      titleLine1: 'Ibihe byiza',
      titleAccent: 'n’amafoto.',
      subtitle: 'Reba ibyerekezo, amafoto yamamaza n’amakuru mashya atangazwa n’ikipe yacu.',
      inquireItem: 'Baza kuri ibi',
      regardingPrefix: 'Bijyanye na:',
    },
    news: {
      eyebrow: 'AMAKURU N’INAMA Z’INGENDO',
      titleLine1: 'Amakuru mashya',
      titleAccent: 'ku ngendo.',
      subtitle: 'Amakuru ya viza, inama z’amatike y’indege n’amatangazo ya TNP Travel Agency.',
      readMore: 'Soma byose',
      closeLabel: 'Funga inkuru',
      inquireAbout: 'Baza ikipe yacu kuri ibi',
      regardingPrefix: 'Bijyanye n’amakuru:',
      categories: {
        'Travel Tip': 'Inama y’urugendo',
        'Visa Update': 'Amakuru ya Viza',
        'Company News': 'Amakuru ya TNP',
        'Flight Alert': 'Amakuru y’indege',
        'Destination Guide': 'Ubuhamya bw’ibyerekezo',
      },
    },
    contact: {
      eyebrow: 'REKA TUGUHAGURUTSE',
      titleLine1: 'Ufite urugendo',
      titleAccent: 'mu bitekerezo?',
      subtitle: 'Vugana n’ikipe yacu utubwire aho wifuza kujya.',
      followUs: 'KURIKIRA TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'IMEYILI',
      bookingLabel: 'GUSABA URUGENDO',
      bookingCta: 'Ohereza ubusabe bwawe',
    },
    footer: {
      rights: 'TNP Travel Agency. Tembera Isi yose hamwe na TNP.',
      whatsappAria: 'Tuganire kuri WhatsApp',
    },
    bookingModal: {
      eyebrow: 'TANGIRA URUGENDO RWAWE',
      titleLine1: 'Ohereza ubusabe',
      titleAccent: 'bw’urugendo.',
      subtitle: 'Tanga amakuru yawe. Ikipe yacu irakumenyesha niba bihari, ibiciro n’intambwe zikurikira.',
      fullName: 'Amazina yose',
      email: 'Imeyili',
      phone: 'Telefoni / WhatsApp',
      service: 'Serivisi',
      destination: 'Icyerekezo',
      travelDate: 'Itariki y’urugendo',
      details: 'Ibisobanuro byongeweho',
      submit: 'Ohereza ubusabe',
      submitting: 'Birimo koherezwa…',
      clearDraft: 'Siba ibyo wari wanditse',
      receivedPrefix: 'Ubusabe bwakiriwe',
      receivedSuffix: 'Ikipe yacu irakuvugisha vuba.',
      sendWhatsappCopy: 'Ohereza kopi kuri WhatsApp',
      errorFallback: 'Ntibyakunze koherezwa. Twandikire kuri WhatsApp.',
    },
  },

  sw: {
    brandTagline: 'WAKALA WA SAFARI',
    languageLabel: 'Lugha',
    nav: {
      home: 'Nyumbani',
      services: 'Huduma',
      destinations: 'Maeneo',
      gallery: 'Picha',
      news: 'Habari',
      about: 'Kuhusu',
      contact: 'Wasiliana',
      bookNow: 'Agiza sasa',
    },
    hero: {
      eyebrow: 'SAFARI YAKO INAANZIA HAPA',
      titleLine1: 'Gundua Dunia',
      titleAccent: 'na TNP.',
      subtitle:
        'Tiketi za ndege, msaada wa viza, hoteli, ukodishaji wa magari na ziara zisizosahaulika — mipango ya safari iliyorahisishwa kwa msaada wa karibu.',
      planTrip: 'Panga safari yako',
      chatWithUs: 'Zungumza nasi',
      proof1: 'Huduma ya binafsi',
      proof2: 'Maeneo duniani kote',
      floatTitle: 'Uko tayari kupaa?',
      floatSubtitle: 'Tupange safari yako ijayo.',
    },
    airlineStrip: 'SAFIRI KWA KUJIAMINI',
    services: {
      eyebrow: 'TUNACHOFANYA',
      titleLine1: 'Kila unachohitaji',
      titleAccent: 'kusafiri vizuri zaidi.',
      subtitle:
        'Mshirika wa kuaminika kwa maelezo yanayofanya kila safari kuwa rahisi. Tuambie unachohitaji na timu yetu itakusaidia hatua inayofuata.',
      inquireCta: 'Uliza sasa',
      items: {
        'Air ticketing': { name: 'Tiketi za ndege', description: 'Uchunguzi wa safari za ndege na ukataji tiketi.' },
        'Visa assistance': { name: 'Msaada wa viza', description: 'Mwongozo wa maombi na maandalizi ya nyaraka.' },
        'Hotel booking': { name: 'Uhifadhi wa hoteli', description: 'Malazi kwa ajili ya biashara na mapumziko.' },
        'Car rental': { name: 'Ukodishaji wa magari', description: 'Usafiri wa starehe katika eneo unaloenda.' },
        'Tours & trip plans': { name: 'Ziara na mipango ya safari', description: 'Likizo maalum, safari na utalii.' },
        'Gorilla permits': { name: 'Vibali vya sokwe', description: 'Msaada wa vibali vya kuona sokwe nchini Rwanda.' },
        'Study & work abroad': { name: 'Kusoma na kufanya kazi nje', description: 'Mwongozo wa fursa za kimataifa.' },
        'Money transfer': { name: 'Kutuma fedha', description: 'Tuulize kuhusu huduma za kutuma fedha zilizopo.' },
      },
    },
    destinations: {
      eyebrow: 'SONGA MBELE ZAIDI',
      titleLine1: 'Maisha yatakupeleka',
      titleAccent: 'wapi ijayo?',
      subtitle:
        'Gundua fursa za masomo, kazi na safari za kimataifa. Timu yetu inaweza kukusaidia kuelewa mchakato na kujiandaa.',
      exploreCta: 'Gundua maeneo',
      names: {
        Canada: 'Kanada',
        China: 'Uchina',
        Poland: 'Poland',
        Serbia: 'Serbia',
        Luxembourg: 'Luxembourg',
        Germany: 'Ujerumani',
        Dubai: 'Dubai',
        'United States': 'Marekani',
      },
    },
    feature: {
      eyebrow: 'MSAADA WA NDEGE NA SAFARI',
      titleLine1: 'Dunia yako.',
      titleAccent: 'Hatua moja tu ya kuhifadhi.',
      subtitle:
        'Unahitaji ndege, hoteli, mwongozo wa viza au mpango kamili wa likizo? Shiriki maelezo yako na TNP iratibu ombi lako.',
      bullet1: 'Taarifa zilizo wazi na hatua zinazofuata',
      bullet2: 'Huduma nyingi za safari mahali pamoja',
      cta: 'Anza kuhifadhi',
    },
    about: {
      eyebrow: 'KUHUSU TNP',
      titleLine1: 'Mshirika wako',
      titleAccent: 'wa safari unayemwamini.',
      subtitle:
        'TNP Travel Agency husaidia watu binafsi, familia na biashara kupanga safari kwa kujiamini, kwa huduma ya haraka na ya karibu.',
      badge1: 'Mwongozo wenye msaada',
      badge2: 'Huduma iliyojengwa kwako',
    },
    gallery: {
      eyebrow: 'MATUNZIO YA SAFARI',
      titleLine1: 'Matukio na',
      titleAccent: 'vivutio.',
      subtitle: 'Tazama maeneo, matangazo ya safari na taarifa mpya kutoka kwa timu yetu.',
      inquireItem: 'Ulizia kuhusu hili',
      regardingPrefix: 'Kuhusu:',
    },
    news: {
      eyebrow: 'HABARI NA VIDOKEZO VYA SAFARI',
      titleLine1: 'Taarifa mpya',
      titleAccent: 'za safari.',
      subtitle: 'Taarifa za viza, vidokezo vya ndege na matangazo mapya kutoka TNP Travel Agency.',
      readMore: 'Soma makala',
      closeLabel: 'Funga makala',
      inquireAbout: 'Uliza timu yetu kuhusu hili',
      regardingPrefix: 'Kuhusu habari:',
      categories: {
        'Travel Tip': 'Kidokezo cha Safari',
        'Visa Update': 'Taarifa ya Viza',
        'Company News': 'Habari za TNP',
        'Flight Alert': 'Taarifa ya Ndege',
        'Destination Guide': 'Mwongozo wa Eneo',
      },
    },
    contact: {
      eyebrow: 'TUKUANZISHE SAFARI',
      titleLine1: 'Una safari',
      titleAccent: 'akilini?',
      subtitle: 'Zungumza na timu yetu utuambie unapotaka kwenda.',
      followUs: 'FUATILIA TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'BARUA PEPE',
      bookingLabel: 'OMBI LA SAFARI',
      bookingCta: 'Tuma ombi lako la safari',
    },
    footer: {
      rights: 'TNP Travel Agency. Gundua Dunia na TNP.',
      whatsappAria: 'Zungumza kwenye WhatsApp',
    },
    bookingModal: {
      eyebrow: 'ANZA SAFARI YAKO',
      titleLine1: 'Tuma ombi',
      titleAccent: 'la kuhifadhi.',
      subtitle: 'Shiriki maelezo yako. Timu yetu itathibitisha upatikanaji, bei na hatua zinazofuata.',
      fullName: 'Jina kamili',
      email: 'Barua pepe',
      phone: 'Simu / WhatsApp',
      service: 'Huduma',
      destination: 'Eneo unaloenda',
      travelDate: 'Tarehe ya safari',
      details: 'Maelezo ya ziada',
      submit: 'Tuma ombi',
      submitting: 'Inatuma…',
      clearDraft: 'Futa rasimu iliyohifadhiwa',
      receivedPrefix: 'Ombi limepokelewa',
      receivedSuffix: 'Timu yetu itawasiliana nawe hivi karibuni.',
      sendWhatsappCopy: 'Tuma nakala kwenye WhatsApp',
      errorFallback: 'Imeshindwa kutuma. Tafadhali wasiliana nasi kupitia WhatsApp.',
    },
  },

  ar: {
    brandTagline: 'وكالة سفر وسياحة',
    languageLabel: 'اللغة',
    nav: {
      home: 'الرئيسية',
      services: 'الخدمات',
      destinations: 'الوجهات',
      gallery: 'المعرض',
      news: 'أخبار السفر',
      about: 'من نحن',
      contact: 'اتصل بنا',
      bookNow: 'احجز الآن',
    },
    hero: {
      eyebrow: 'رحلتك تبدأ من هنا',
      titleLine1: 'استكشف العالم',
      titleAccent: 'مع TNP.',
      subtitle:
        'تذاكر الطيران، المساعدة في التأشيرات، الفنادق، تأجير السيارات والجولات السياحية — تخطيط سفر أسهل بدعم شخصي متكامل.',
      planTrip: 'خطط لرحلتك',
      chatWithUs: 'تحدث معنا',
      proof1: 'مساعدة شخصية',
      proof2: 'وجهات حول العالم',
      floatTitle: 'هل أنت مستعد للإقلاع؟',
      floatSubtitle: 'دعنا نخطط لمغامرتك القادمة.',
    },
    airlineStrip: 'سافر بثقة واطمئنان',
    services: {
      eyebrow: 'ما نقدمه',
      titleLine1: 'كل ما تحتاجه',
      titleAccent: 'لسفر أفضل.',
      subtitle:
        'شريك موثوق لكل تفاصيل رحلتك. أخبرنا بما تحتاجه وسيساعدك فريقنا في الخطوة التالية.',
      inquireCta: 'قدّم استفساراً',
      items: {
        'Air ticketing': { name: 'حجز تذاكر الطيران', description: 'استفسارات الرحلات الجوية وحجز التذاكر.' },
        'Visa assistance': { name: 'المساعدة في التأشيرات', description: 'إرشادات التقديم وتجهيز المستندات.' },
        'Hotel booking': { name: 'حجز الفنادق', description: 'إقامة مريحة لرحلات العمل والترفيه.' },
        'Car rental': { name: 'تأجير السيارات', description: 'وسائل نقل مريحة في وجهتك.' },
        'Tours & trip plans': { name: 'الجولات وخطط السفر', description: 'عطلات ورحلات وسفاري مصممة خصيصاً لك.' },
        'Gorilla permits': { name: 'تصاريح الغوريلا', description: 'المساعدة في تصاريح مشاهدة الغوريلا في رواندا.' },
        'Study & work abroad': { name: 'الدراسة والعمل بالخارج', description: 'إرشادات للفرص الدراسية والمهنية الدولية.' },
        'Money transfer': { name: 'تحويل الأموال', description: 'استفسر عن خدمات التحويل المتوفرة لدينا.' },
      },
    },
    destinations: {
      eyebrow: 'انطلق أبعد',
      titleLine1: 'إلى أين ستأخذك',
      titleAccent: 'الحياة لاحقاً؟',
      subtitle:
        'اكتشف فرص الدراسة والعمل والسفر حول العالم. يساعدك فريقنا على فهم الإجراءات والاستعداد لخطواتك القادمة.',
      exploreCta: 'استكشف الوجهات',
      names: {
        Canada: 'كندا',
        China: 'الصين',
        Poland: 'بولندا',
        Serbia: 'صربيا',
        Luxembourg: 'لوكسمبورغ',
        Germany: 'ألمانيا',
        Dubai: 'دبي',
        'United States': 'الولايات المتحدة',
      },
    },
    feature: {
      eyebrow: 'دعم الطيران والسفر',
      titleLine1: 'عالمك بين يديك.',
      titleAccent: 'على بُعد حجز واحد.',
      subtitle:
        'هل تحتاج إلى رحلة طيران أو فندق أو تأشيرة أو خطة عطلة متكاملة؟ شاركنا تفاصيلك ليتولى فريق TNP تنسيق طلبك.',
      bullet1: 'تحديثات واضحة للحجز والخطوات التالية',
      bullet2: 'خدمات سفر متعددة في مكان واحد',
      cta: 'ابدأ الحجز',
    },
    about: {
      eyebrow: 'عن وكالة TNP',
      titleLine1: 'شريك السفر',
      titleAccent: 'الموثوق لك.',
      subtitle:
        'تساعد وكالة TNP الأفراد والعائلات والشركات على التخطيط للسفر بثقة من خلال دعم سريع واهتمام شخصي.',
      badge1: 'إرشاد موثوق',
      badge2: 'خدمة مصممة لك',
    },
    gallery: {
      eyebrow: 'معرض السفر',
      titleLine1: 'لحظات',
      titleAccent: 'ومحطات مميزة.',
      subtitle: 'تصفح الوجهات والعروض والتحديثات التي يشاركها فريقنا مباشرة.',
      inquireItem: 'استفسر عن هذا العرض',
      regardingPrefix: 'بخصوص:',
    },
    news: {
      eyebrow: 'أخبار ونصائح السفر',
      titleLine1: 'تحديثات',
      titleAccent: 'ومقالات السفر.',
      subtitle: 'أحدث مستجدات التأشيرات ونصائح الطيران وإعلانات وكالة TNP للسفر.',
      readMore: 'اقرأ المقال',
      closeLabel: 'إغلاق المقال',
      inquireAbout: 'اسأل فريقنا عن هذا الموضوع',
      regardingPrefix: 'بخصوص الخبر:',
      categories: {
        'Travel Tip': 'نصيحة سفر',
        'Visa Update': 'تحديث التأشيرات',
        'Company News': 'أخبار الوكالة',
        'Flight Alert': 'تنبيه رحلات',
        'Destination Guide': 'دليل الوجهات',
      },
    },
    contact: {
      eyebrow: 'لننطلق برحلتك',
      titleLine1: 'هل تفكر في',
      titleAccent: 'رحلة قادمة؟',
      subtitle: 'تواصل مع فريقنا وأخبرنا بالوجهة التي ترغب في زيارتها.',
      followUs: 'تابع TNP',
      whatsappLabel: 'واتساب',
      emailLabel: 'البريد الإلكتروني',
      bookingLabel: 'طلب حجز',
      bookingCta: 'أرسل طلب السفر الخاص بك',
    },
    footer: {
      rights: 'وكالة TNP للسفر. استكشف العالم مع TNP.',
      whatsappAria: 'تحدث عبر واتساب',
    },
    bookingModal: {
      eyebrow: 'ابدأ رحلتك',
      titleLine1: 'قدّم طلب',
      titleAccent: 'حجز.',
      subtitle: 'شاركنا بياناتك وسيتواصل فريقنا لتأكيد التوفر والأسعار والخطوات التالية.',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف / واتساب',
      service: 'الخدمة',
      destination: 'الوجهة',
      travelDate: 'تاريخ السفر',
      details: 'تفاصيل إضافية',
      submit: 'إرسال الطلب',
      submitting: 'جارٍ الإرسال…',
      clearDraft: 'مسح المسودة المحفوظة',
      receivedPrefix: 'تم استلام الطلب',
      receivedSuffix: 'سيتواصل معك فريقنا قريباً.',
      sendWhatsappCopy: 'إرسال نسخة عبر واتساب',
      errorFallback: 'تعذر الإرسال. يرجى التواصل معنا عبر واتساب.',
    },
  },

  es: {
    brandTagline: 'AGENCIA DE VIAJES',
    languageLabel: 'Idioma',
    nav: {
      home: 'Inicio',
      services: 'Servicios',
      destinations: 'Destinos',
      gallery: 'Galería',
      news: 'Noticias',
      about: 'Nosotros',
      contact: 'Contacto',
      bookNow: 'Reservar',
    },
    hero: {
      eyebrow: 'TU VIAJE COMIENZA AQUÍ',
      titleLine1: 'Explora el mundo',
      titleAccent: 'con TNP.',
      subtitle:
        'Vuelos, asesoría de visas, hoteles, alquiler de autos y tours inolvidables — planifica tu viaje fácilmente con atención personal.',
      planTrip: 'Planifica tu viaje',
      chatWithUs: 'Chatea con nosotros',
      proof1: 'Asistencia personal',
      proof2: 'Destinos mundiales',
      floatTitle: '¿Listo para despegar?',
      floatSubtitle: 'Planifiquemos tu próxima aventura.',
    },
    airlineStrip: 'VIAJA CON CONFIANZA',
    services: {
      eyebrow: 'LO QUE HACEMOS',
      titleLine1: 'Todo lo que necesitas',
      titleAccent: 'para viajar mejor.',
      subtitle:
        'Un aliado confiable para cuidar cada detalle de tu viaje. Cuéntanos qué necesitas y nuestro equipo te guiará.',
      inquireCta: 'Hacer una consulta',
      items: {
        'Air ticketing': { name: 'Boletos aéreos', description: 'Cotización de vuelos y soporte de boletos.' },
        'Visa assistance': { name: 'Asistencia de visas', description: 'Guía de solicitud y preparación de documentos.' },
        'Hotel booking': { name: 'Reserva de hoteles', description: 'Alojamiento para viajes de negocio y placer.' },
        'Car rental': { name: 'Alquiler de autos', description: 'Transporte cómodo en tu destino.' },
        'Tours & trip plans': { name: 'Tours y paquetes', description: 'Vacaciones, viajes y safaris a medida.' },
        'Gorilla permits': { name: 'Permisos de gorilas', description: 'Asistencia con permisos de gorilas en Ruanda.' },
        'Study & work abroad': { name: 'Estudio y trabajo exterior', description: 'Orientación para oportunidades internacionales.' },
        'Money transfer': { name: 'Transferencia de dinero', description: 'Consulta nuestros servicios de envío disponibles.' },
      },
    },
    destinations: {
      eyebrow: 'LLEGA MÁS LEJOS',
      titleLine1: '¿A dónde te llevará',
      titleAccent: 'la vida ahora?',
      subtitle:
        'Explora oportunidades internacionales de estudio, trabajo y viaje. Nuestro equipo te ayuda a preparar cada paso.',
      exploreCta: 'Explorar destinos',
      names: {
        Canada: 'Canadá',
        China: 'China',
        Poland: 'Polonia',
        Serbia: 'Serbia',
        Luxembourg: 'Luxemburgo',
        Germany: 'Alemania',
        Dubai: 'Dubái',
        'United States': 'Estados Unidos',
      },
    },
    feature: {
      eyebrow: 'SOPORTE DE VUELOS Y VIAJES',
      titleLine1: 'Tu mundo.',
      titleAccent: 'A una reserva de distancia.',
      subtitle:
        '¿Necesitas un vuelo, hotel, guía de visa o un plan completo? Comparte tus datos y deja que TNP coordine tu solicitud.',
      bullet1: 'Actualizaciones claras y próximos pasos',
      bullet2: 'Múltiples servicios de viaje en un solo lugar',
      cta: 'Iniciar reserva',
    },
    about: {
      eyebrow: 'SOBRE TNP',
      titleLine1: 'Tu aliado de',
      titleAccent: 'viajes de confianza.',
      subtitle:
        'TNP Travel Agency ayuda a personas, familias y empresas a viajar con tranquilidad gracias a un apoyo cercano y ágil.',
      badge1: 'Orientación útil',
      badge2: 'Servicio pensado para ti',
    },
    gallery: {
      eyebrow: 'GALERÍA DE VIAJES',
      titleLine1: 'Momentos y',
      titleAccent: 'destacados.',
      subtitle: 'Explora destinos, afiches y novedades compartidas por nuestro equipo.',
      inquireItem: 'Consultar sobre esto',
      regardingPrefix: 'Sobre:',
    },
    news: {
      eyebrow: 'NOTICIAS Y CONSEJOS',
      titleLine1: 'Novedades y',
      titleAccent: 'guías de viaje.',
      subtitle: 'Últimas actualizaciones de visas, consejos de vuelo y noticias de TNP Travel Agency.',
      readMore: 'Leer artículo',
      closeLabel: 'Cerrar artículo',
      inquireAbout: 'Consultar al equipo',
      regardingPrefix: 'Sobre noticia:',
      categories: {
        'Travel Tip': 'Consejo de viaje',
        'Visa Update': 'Aviso de visa',
        'Company News': 'Noticias TNP',
        'Flight Alert': 'Alerta de vuelo',
        'Destination Guide': 'Guía de destino',
      },
    },
    contact: {
      eyebrow: 'PONGÁMONOS EN MARCHA',
      titleLine1: '¿Tienes un viaje',
      titleAccent: 'en mente?',
      subtitle: 'Habla con nuestro equipo y cuéntanos a dónde quieres viajar.',
      followUs: 'SIGUE A TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'CORREO',
      bookingLabel: 'SOLICITUD DE RESERVA',
      bookingCta: 'Envía tu solicitud de viaje',
    },
    footer: {
      rights: 'TNP Travel Agency. Explora el mundo con TNP.',
      whatsappAria: 'Chatear en WhatsApp',
    },
    bookingModal: {
      eyebrow: 'COMIENZA TU VIAJE',
      titleLine1: 'Enviar consulta',
      titleAccent: 'de reserva.',
      subtitle: 'Comparte tus datos. Nuestro equipo confirmará disponibilidad, precios y siguientes pasos.',
      fullName: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono / WhatsApp',
      service: 'Servicio',
      destination: 'Destino',
      travelDate: 'Fecha de viaje',
      details: 'Detalles adicionales',
      submit: 'Enviar consulta',
      submitting: 'Enviando…',
      clearDraft: 'Borrar borrador guardado',
      receivedPrefix: 'Consulta recibida',
      receivedSuffix: 'Nuestro equipo se pondrá en contacto contigo pronto.',
      sendWhatsappCopy: 'Enviar copia por WhatsApp',
      errorFallback: 'No se pudo enviar. Contáctanos por WhatsApp.',
    },
  },

  de: {
    brandTagline: 'REISEBÜRO',
    languageLabel: 'Sprache',
    nav: {
      home: 'Start',
      services: 'Leistungen',
      destinations: 'Reiseziele',
      gallery: 'Galerie',
      news: 'Reisenews',
      about: 'Über uns',
      contact: 'Kontakt',
      bookNow: 'Jetzt buchen',
    },
    hero: {
      eyebrow: 'IHRE REISE BEGINNT HIER',
      titleLine1: 'Entdecken Sie die Welt',
      titleAccent: 'mit TNP.',
      subtitle:
        'Flüge, Visa-Hilfe, Hotels, Mietwagen und unvergessliche Touren — entspannte Reiseplanung mit persönlicher Betreuung.',
      planTrip: 'Reise planen',
      chatWithUs: 'Mit uns chatten',
      proof1: 'Persönliche Betreuung',
      proof2: 'Weltweite Ziele',
      floatTitle: 'Bereit zum Abflug?',
      floatSubtitle: 'Planen wir Ihr nächstes Abenteuer.',
    },
    airlineStrip: 'MIT VERTRAUEN REISEN',
    services: {
      eyebrow: 'WAS WIR BIETEN',
      titleLine1: 'Alles, was Sie für',
      titleAccent: 'besseres Reisen brauchen.',
      subtitle:
        'Ein verlässlicher Partner für jedes Detail Ihrer Reise. Sagen Sie uns, was Sie benötigen — unser Team unterstützt Sie sofort.',
      inquireCta: 'Anfrage senden',
      items: {
        'Air ticketing': { name: 'Flugtickets', description: 'Fluganfragen und Unterstützung bei der Ticketbuchung.' },
        'Visa assistance': { name: 'Visum-Service', description: 'Beratung und Vorbereitung Ihrer Antragsunterlagen.' },
        'Hotel booking': { name: 'Hotelbuchung', description: 'Unterkünfte für Geschäfts- und Urlaubsreisen.' },
        'Car rental': { name: 'Mietwagen', description: 'Komfortable Mobilität an Ihrem Reiseziel.' },
        'Tours & trip plans': { name: 'Touren & Reisepläne', description: 'Maßgeschneiderte Urlaube, Reisen und Safaris.' },
        'Gorilla permits': { name: 'Gorilla-Genehmigungen', description: 'Unterstützung bei Gorilla-Permits in Ruanda.' },
        'Study & work abroad': { name: 'Studium & Arbeit im Ausland', description: 'Beratung für internationale Perspektiven.' },
        'Money transfer': { name: 'Geldtransfer', description: 'Fragen Sie nach unseren unterstützten Transferdiensten.' },
      },
    },
    destinations: {
      eyebrow: 'WEITER KOMMEN',
      titleLine1: 'Wohin führt Sie',
      titleAccent: 'Ihr nächster Weg?',
      subtitle:
        'Entdecken Sie internationale Studien-, Arbeits- und Reisemöglichkeiten. Wir begleiten Sie Schritt für Schritt.',
      exploreCta: 'Reiseziele entdecken',
      names: {
        Canada: 'Kanada',
        China: 'China',
        Poland: 'Polen',
        Serbia: 'Serbien',
        Luxembourg: 'Luxemburg',
        Germany: 'Deutschland',
        Dubai: 'Dubai',
        'United States': 'Vereinigte Staaten',
      },
    },
    feature: {
      eyebrow: 'FLUG- & REISESUPPORT',
      titleLine1: 'Ihre Welt.',
      titleAccent: 'Nur eine Buchung entfernt.',
      subtitle:
        'Flug, Hotel, Visaberatung oder komplette Urlaubsplanung? Teilen Sie Ihre Wünsche mit — TNP koordiniert alles für Sie.',
      bullet1: 'Klare Updates und nächste Schritte',
      bullet2: 'Viele Reiseleistungen an einem Ort',
      cta: 'Buchung starten',
    },
    about: {
      eyebrow: 'ÜBER TNP',
      titleLine1: 'Ihr vertrauensvoller',
      titleAccent: 'Reisepartner.',
      subtitle:
        'TNP Travel Agency unterstützt Einzelpersonen, Familien und Unternehmen bei sicherer und persönlicher Reiseplanung.',
      badge1: 'Hilfreiche Beratung',
      badge2: 'Service nach Ihren Wünschen',
    },
    gallery: {
      eyebrow: 'REISEGALERIE',
      titleLine1: 'Momente &',
      titleAccent: 'Highlights.',
      subtitle: 'Entdecken Sie Reiseziele, Flyer und aktuelle Eindrücke unseres Teams.',
      inquireItem: 'Dazu anfragen',
      regardingPrefix: 'Betreff:',
    },
    news: {
      eyebrow: 'REISENEWS & TIPPS',
      titleLine1: 'Neuigkeiten &',
      titleAccent: 'Reisetipps.',
      subtitle: 'Aktuelle Visa-Hinweise, Flugtipps und Ankündigungen von TNP Travel Agency.',
      readMore: 'Beitrag lesen',
      closeLabel: 'Beitrag schließen',
      inquireAbout: 'Unser Team dazu fragen',
      regardingPrefix: 'Bezüglich Beitrag:',
      categories: {
        'Travel Tip': 'Reisetipp',
        'Visa Update': 'Visa-Update',
        'Company News': 'TNP News',
        'Flight Alert': 'Flug-Hinweis',
        'Destination Guide': 'Reiseziel-Guide',
      },
    },
    contact: {
      eyebrow: 'STARTEN WIR GEMEINSAM',
      titleLine1: 'Haben Sie eine Reise',
      titleAccent: 'im Sinn?',
      subtitle: 'Sprechen Sie mit unserem Team und verraten Sie uns Ihr Wunschziel.',
      followUs: 'TNP FOLGEN',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'E-MAIL',
      bookingLabel: 'BUCHUNGSANFRAGE',
      bookingCta: 'Reiseanfrage senden',
    },
    footer: {
      rights: 'TNP Travel Agency. Entdecken Sie die Welt mit TNP.',
      whatsappAria: 'Auf WhatsApp chatten',
    },
    bookingModal: {
      eyebrow: 'REISE STARTEN',
      titleLine1: 'Buchungsanfrage',
      titleAccent: 'stellen.',
      subtitle: 'Geben Sie Ihre Daten ein. Unser Team bestätigt Verfügbarkeit, Preise und nächste Schritte.',
      fullName: 'Vollständiger Name',
      email: 'E-Mail',
      phone: 'Telefon / WhatsApp',
      service: 'Leistung',
      destination: 'Reiseziel',
      travelDate: 'Reisedatum',
      details: 'Zusätzliche Angaben',
      submit: 'Anfrage absenden',
      submitting: 'Wird gesendet…',
      clearDraft: 'Gespeicherten Entwurf löschen',
      receivedPrefix: 'Anfrage erhalten',
      receivedSuffix: 'Unser Team meldet sich in Kürze bei Ihnen.',
      sendWhatsappCopy: 'Kopie per WhatsApp senden',
      errorFallback: 'Senden fehlgeschlagen. Bitte kontaktieren Sie uns über WhatsApp.',
    },
  },

  pt: {
    brandTagline: 'AGÊNCIA DE VIAGENS',
    languageLabel: 'Idioma',
    nav: {
      home: 'Início',
      services: 'Serviços',
      destinations: 'Destinos',
      gallery: 'Galeria',
      news: 'Notícias',
      about: 'Sobre',
      contact: 'Contato',
      bookNow: 'Reservar',
    },
    hero: {
      eyebrow: 'SUA JORNADA COMEÇA AQUI',
      titleLine1: 'Explore o Mundo',
      titleAccent: 'com a TNP.',
      subtitle:
        'Passagens aéreas, assistência de visto, hotéis, aluguel de carros e passeios inesquecíveis — planejamento simples com apoio pessoal.',
      planTrip: 'Planejar viagem',
      chatWithUs: 'Falar no WhatsApp',
      proof1: 'Atendimento pessoal',
      proof2: 'Destinos mundiais',
      floatTitle: 'Pronto para decolar?',
      floatSubtitle: 'Vamos planejar sua próxima aventura.',
    },
    airlineStrip: 'VIAJE COM CONFIANÇA',
    services: {
      eyebrow: 'O QUE FAZEMOS',
      titleLine1: 'Tudo o que precisa',
      titleAccent: 'para viajar melhor.',
      subtitle:
        'Um parceiro confiável para cada detalhe da sua viagem. Conte-nos o que procura e nossa equipe cuidará dos próximos passos.',
      inquireCta: 'Fazer consulta',
      items: {
        'Air ticketing': { name: 'Passagens aéreas', description: 'Cotações de voos e suporte de bilhetes.' },
        'Visa assistance': { name: 'Assistência de visto', description: 'Orientação e preparação de documentos.' },
        'Hotel booking': { name: 'Reserva de hotéis', description: 'Hospedagem para negócios e lazer.' },
        'Car rental': { name: 'Aluguel de carros', description: 'Transporte confortável no seu destino.' },
        'Tours & trip plans': { name: 'Passeios e roteiros', description: 'Férias, viagens e safáris sob medida.' },
        'Gorilla permits': { name: 'Permissões de gorilas', description: 'Suporte para autorizações em Ruanda.' },
        'Study & work abroad': { name: 'Estudo e trabalho fora', description: 'Orientação para oportunidades internacionais.' },
        'Money transfer': { name: 'Transferência de valores', description: 'Consulte nossos serviços de envio disponíveis.' },
      },
    },
    destinations: {
      eyebrow: 'VÁ MAIS LONGE',
      titleLine1: 'Para onde a vida',
      titleAccent: 'vai levá-lo agora?',
      subtitle:
        'Explore oportunidades internacionais de estudo, trabalho e turismo. Nossa equipe ajuda você a preparar cada etapa.',
      exploreCta: 'Explorar destinos',
      names: {
        Canada: 'Canadá',
        China: 'China',
        Poland: 'Polônia',
        Serbia: 'Sérvia',
        Luxembourg: 'Luxemburgo',
        Germany: 'Alemanha',
        Dubai: 'Dubai',
        'United States': 'Estados Unidos',
      },
    },
    feature: {
      eyebrow: 'SUPORTE AÉREO E DE VIAGEM',
      titleLine1: 'Seu mundo.',
      titleAccent: 'A uma reserva de distância.',
      subtitle:
        'Precisa de voo, hotel, visto ou pacote completo? Envie seus detalhes e deixe a TNP coordenar seu pedido.',
      bullet1: 'Atualizações claras e próximos passos',
      bullet2: 'Vários serviços de viagem em um só lugar',
      cta: 'Iniciar reserva',
    },
    about: {
      eyebrow: 'SOBRE A TNP',
      titleLine1: 'Seu parceiro de',
      titleAccent: 'viagem confiável.',
      subtitle:
        'A TNP Travel Agency ajuda pessoas, famílias e empresas a viajar com segurança, oferecendo atendimento ágil e dedicado.',
      badge1: 'Orientação dedicada',
      badge2: 'Serviço feito para você',
    },
    gallery: {
      eyebrow: 'GALERIA DE VIAGENS',
      titleLine1: 'Momentos e',
      titleAccent: 'destaques.',
      subtitle: 'Confira destinos, campanhas e novidades compartilhadas pela nossa equipe.',
      inquireItem: 'Consultar sobre isto',
      regardingPrefix: 'Sobre:',
    },
    news: {
      eyebrow: 'NOTÍCIAS E DICAS',
      titleLine1: 'Novidades e',
      titleAccent: 'dicas de viagem.',
      subtitle: 'Atualizações de visto, dicas de voos e comunicados da TNP Travel Agency.',
      readMore: 'Ler artigo',
      closeLabel: 'Fechar artigo',
      inquireAbout: 'Falar com a equipe sobre isto',
      regardingPrefix: 'Sobre a notícia:',
      categories: {
        'Travel Tip': 'Dica de Viagem',
        'Visa Update': 'Aviso de Visto',
        'Company News': 'Notícias TNP',
        'Flight Alert': 'Alerta de Voo',
        'Destination Guide': 'Guia de Destino',
      },
    },
    contact: {
      eyebrow: 'VAMOS COLOCAR VOCÊ EM MOVIMENTO',
      titleLine1: 'Tem uma viagem',
      titleAccent: 'em mente?',
      subtitle: 'Fale com nossa equipe e diga para onde deseja viajar.',
      followUs: 'SIGA A TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: 'E-MAIL',
      bookingLabel: 'SOLICITAÇÃO DE RESERVA',
      bookingCta: 'Enviar pedido de viagem',
    },
    footer: {
      rights: 'TNP Travel Agency. Explore o Mundo com a TNP.',
      whatsappAria: 'Conversar no WhatsApp',
    },
    bookingModal: {
      eyebrow: 'COMECE SUA JORNADA',
      titleLine1: 'Fazer pedido',
      titleAccent: 'de reserva.',
      subtitle: 'Informe seus dados. Nossa equipe confirmará disponibilidade, preços e próximos passos.',
      fullName: 'Nome completo',
      email: 'E-mail',
      phone: 'Telefone / WhatsApp',
      service: 'Serviço',
      destination: 'Destino',
      travelDate: 'Data da viagem',
      details: 'Detalhes adicionais',
      submit: 'Enviar solicitação',
      submitting: 'Enviando…',
      clearDraft: 'Limpar rascunho salvo',
      receivedPrefix: 'Solicitação recebida',
      receivedSuffix: 'Nossa equipe entrará em contato em breve.',
      sendWhatsappCopy: 'Enviar cópia no WhatsApp',
      errorFallback: 'Não foi possível enviar. Fale conosco pelo WhatsApp.',
    },
  },

  zh: {
    brandTagline: '旅行社',
    languageLabel: '语言',
    nav: {
      home: '首页',
      services: '服务',
      destinations: '目的地',
      gallery: '图库',
      news: '旅行资讯',
      about: '关于我们',
      contact: '联系我们',
      bookNow: '立即预订',
    },
    hero: {
      eyebrow: '您的旅程从这里开始',
      titleLine1: '与 TNP 一起',
      titleAccent: '探索世界。',
      subtitle: '机票预订、签证协助、酒店住宿、租车及精选旅游行程 — 贴心的一站式个人旅行支持。',
      planTrip: '规划行程',
      chatWithUs: '在线咨询',
      proof1: '一对一专属服务',
      proof2: '全球热门目的地',
      floatTitle: '准备好出发了吗？',
      floatSubtitle: '让我们为您规划下一次旅程。',
    },
    airlineStrip: '安心出行 信赖之选',
    services: {
      eyebrow: '我们的服务',
      titleLine1: '让每一次出行',
      titleAccent: '更加顺畅。',
      subtitle: '从出发到抵达的每一个细节，我们都为您提供可靠支持。告诉我们您的需求，团队将立即协助。',
      inquireCta: '立即咨询',
      items: {
        'Air ticketing': { name: '机票预订', description: '全球航班查询与出票支持。' },
        'Visa assistance': { name: '签证协助', description: '签证申请指导与材料准备。' },
        'Hotel booking': { name: '酒店预订', description: '商旅及度假优质住宿安排。' },
        'Car rental': { name: '租车服务', description: '目的地舒适专车与租车接送。' },
        'Tours & trip plans': { name: '旅游与行程定制', description: '量身定制假期、跟团游与游猎行程。' },
        'Gorilla permits': { name: '山地大猩猩许可', description: '卢旺达山地大猩猩观赏许可协助。' },
        'Study & work abroad': { name: '海外留学与工作', description: '国际留学及工作机会指导。' },
        'Money transfer': { name: '汇款咨询', description: '咨询我们支持的跨境汇款服务。' },
      },
    },
    destinations: {
      eyebrow: '走向更远',
      titleLine1: '下一站，',
      titleAccent: '想去哪里？',
      subtitle: '探索国际留学、工作与旅行机会，我们的团队将协助您了解流程并做好准备。',
      exploreCta: '探索目的地',
      names: {
        Canada: '加拿大',
        China: '中国',
        Poland: '波兰',
        Serbia: '塞尔维亚',
        Luxembourg: '卢森堡',
        Germany: '德国',
        Dubai: '迪拜',
        'United States': '美国',
      },
    },
    feature: {
      eyebrow: '航班与出行支持',
      titleLine1: '精彩世界，',
      titleAccent: '一键启程。',
      subtitle: '需要机票、酒店、签证指导或完整假期方案？提交您的行程信息，交由 TNP 为您统筹安排。',
      bullet1: '清晰的预订进度与后续指引',
      bullet2: '多项旅行服务一站集成',
      cta: '开始预订',
    },
    about: {
      eyebrow: '关于 TNP',
      titleLine1: '您值得信赖的',
      titleAccent: '旅行伙伴。',
      subtitle: 'TNP Travel Agency 致力于以高效贴心的个人支持，帮助个人、家庭及企业安心规划每一次出行。',
      badge1: '专业贴心指导',
      badge2: '围绕您的需求定制',
    },
    gallery: {
      eyebrow: '旅行图库',
      titleLine1: '精彩瞬间',
      titleAccent: '与精选推荐。',
      subtitle: '浏览我们团队分享的热门目的地、旅行海报与最新动态。',
      inquireItem: '咨询此项目',
      regardingPrefix: '咨询项目：',
    },
    news: {
      eyebrow: '旅行资讯与贴士',
      titleLine1: '最新动态',
      titleAccent: '与出行指南。',
      subtitle: '来自 TNP Travel Agency 的最新签证动态、机票贴士与公司公告。',
      readMore: '阅读全文',
      closeLabel: '关闭文章',
      inquireAbout: '向团队咨询此动态',
      regardingPrefix: '关于资讯：',
      categories: {
        'Travel Tip': '旅行贴士',
        'Visa Update': '签证动态',
        'Company News': '公司公告',
        'Flight Alert': '航班提醒',
        'Destination Guide': '目的地指南',
      },
    },
    contact: {
      eyebrow: '立即启程',
      titleLine1: '已有心仪的',
      titleAccent: '行程吗？',
      subtitle: '联系我们的团队，告诉我们您想去的目的地。',
      followUs: '关注 TNP',
      whatsappLabel: 'WHATSAPP',
      emailLabel: '电子邮箱',
      bookingLabel: '预订咨询',
      bookingCta: '发送您的旅行需求',
    },
    footer: {
      rights: 'TNP Travel Agency. 与 TNP 一起探索世界。',
      whatsappAria: '在 WhatsApp 上聊天',
    },
    bookingModal: {
      eyebrow: '开启您的旅程',
      titleLine1: '提交预订',
      titleAccent: '咨询。',
      subtitle: '请填写您的联系与出行信息，我们的团队将尽快确认名额、报价及后续安排。',
      fullName: '姓名',
      email: '电子邮箱',
      phone: '电话 / WhatsApp',
      service: '所需服务',
      destination: '目的地',
      travelDate: '出行日期',
      details: '补充说明',
      submit: '提交咨询',
      submitting: '正在提交…',
      clearDraft: '清除已保存草稿',
      receivedPrefix: '已收到您的咨询',
      receivedSuffix: '我们的团队将很快与您联系。',
      sendWhatsappCopy: '通过 WhatsApp 发送副本',
      errorFallback: '提交失败，请通过 WhatsApp 联系我们。',
    },
  },

  hi: {
    brandTagline: 'ट्रैवल एजेंसी',
    languageLabel: 'भाषा',
    nav: {
      home: 'होम',
      services: 'सेवाएँ',
      destinations: 'गंतव्य',
      gallery: 'गैलरी',
      news: 'यात्रा समाचार',
      about: 'हमारे बारे में',
      contact: 'संपर्क करें',
      bookNow: 'अभी बुक करें',
    },
    hero: {
      eyebrow: 'आपकी यात्रा यहाँ से शुरू होती है',
      titleLine1: 'दुनिया की सैर करें',
      titleAccent: 'TNP के साथ।',
      subtitle:
        'फ्लाइट्स, वीज़ा सहायता, होटल, कार रेंटल और यादगार टूर — व्यक्तिगत सहयोग के साथ आसान यात्रा योजना।',
      planTrip: 'यात्रा की योजना बनाएं',
      chatWithUs: 'हमसे चैट करें',
      proof1: 'व्यक्तिगत सहायता',
      proof2: 'दुनिया भर के गंतव्य',
      floatTitle: 'उड़ान के लिए तैयार?',
      floatSubtitle: 'आइए आपके अगले सफर की योजना बनाएं।',
    },
    airlineStrip: 'विश्वास के साथ यात्रा करें',
    services: {
      eyebrow: 'हमारी सेवाएँ',
      titleLine1: 'बेहतर यात्रा के लिए',
      titleAccent: 'सब कुछ एक जगह।',
      subtitle:
        'हर यात्रा को सहज बनाने के लिए एक भरोसेमंद साथी। अपनी आवश्यकता बताएं और हमारी टीम अगले कदम में आपकी मदद करेगी।',
      inquireCta: 'पूछताछ करें',
      items: {
        'Air ticketing': { name: 'फ्लाइट टिकटिंग', description: 'फ्लाइट जानकारी और टिकट बुकिंग सहायता।' },
        'Visa assistance': { name: 'वीज़ा सहायता', description: 'आवेदन मार्गदर्शन और दस्तावेज़ तैयारी।' },
        'Hotel booking': { name: 'होटल बुकिंग', description: 'व्यापार और अवकाश के लिए आरामदायक ठहराव।' },
        'Car rental': { name: 'कार रेंटल', description: 'आपके गंतव्य पर आरामदायक परिवहन।' },
        'Tours & trip plans': { name: 'टूर और यात्रा योजनाएँ', description: 'कस्टमाइज़्ड हॉलिडे, ट्रिप और सफारी।' },
        'Gorilla permits': { name: 'गोरिल्ला परमिट', description: 'रवांडा गोरिल्ला परमिट पूछताछ में सहायता।' },
        'Study & work abroad': { name: 'विदेश में अध्ययन और कार्य', description: 'अंतर्राष्ट्रीय अवसरों के लिए मार्गदर्शन।' },
        'Money transfer': { name: 'मनी ट्रांसफर', description: 'उपलब्ध ट्रांसफर सेवाओं के बारे में पूछें।' },
      },
    },
    destinations: {
      eyebrow: 'और आगे बढ़ें',
      titleLine1: 'अगली यात्रा आपको',
      titleAccent: 'कहाँ ले जाएगी?',
      subtitle:
        'अंतर्राष्ट्रीय अध्ययन, कार्य और यात्रा के अवसर जानें। हमारी टीम प्रक्रिया को समझने और तैयारी में आपकी मदद करती है।',
      exploreCta: 'गंतव्य देखें',
      names: {
        Canada: 'कनाडा',
        China: 'चीन',
        Poland: 'पोलैंड',
        Serbia: 'सर्बिया',
        Luxembourg: 'लक्ज़मबर्ग',
        Germany: 'जर्मनी',
        Dubai: 'दुबई',
        'United States': 'संयुक्त राज्य अमेरिका',
      },
    },
    feature: {
      eyebrow: 'फ्लाइट और ट्रैवल सपोर्ट',
      titleLine1: 'आपकी दुनिया।',
      titleAccent: 'बस एक बुकिंग दूर।',
      subtitle:
        'फ्लाइट, होटल, वीज़ा मार्गदर्शन या पूरी हॉलिडे योजना चाहिए? अपनी जानकारी साझा करें और TNP को समन्वय करने दें।',
      bullet1: 'स्पष्ट बुकिंग अपडेट और अगले कदम',
      bullet2: 'एक ही स्थान पर कई यात्रा सेवाएँ',
      cta: 'बुकिंग शुरू करें',
    },
    about: {
      eyebrow: 'TNP के बारे में',
      titleLine1: 'आपका भरोसेमंद',
      titleAccent: 'यात्रा साथी।',
      subtitle:
        'TNP Travel Agency व्यक्तियों, परिवारों और व्यवसायों को व्यक्तिगत और त्वरित सहयोग के साथ आत्मविश्वास से यात्रा की योजना बनाने में मदद करती है।',
      badge1: 'सहायक मार्गदर्शन',
      badge2: 'आपकी ज़रूरत के अनुसार सेवा',
    },
    gallery: {
      eyebrow: 'यात्रा गैलरी',
      titleLine1: 'खास पल और',
      titleAccent: 'झलकियाँ।',
      subtitle: 'हमारी टीम द्वारा साझा किए गए गंतव्य, यात्रा पोस्टर और नवीनतम अपडेट देखें।',
      inquireItem: 'इस बारे में पूछें',
      regardingPrefix: 'विषय:',
    },
    news: {
      eyebrow: 'यात्रा समाचार और सुझाव',
      titleLine1: 'नवीनतम अपडेट',
      titleAccent: 'और यात्रा सुझाव।',
      subtitle: 'TNP Travel Agency की ओर से वीज़ा अपडेट, फ्लाइट टिप्स और ताज़ा घोषणाएँ।',
      readMore: 'लेख पढ़ें',
      closeLabel: 'लेख बंद करें',
      inquireAbout: 'हमारी टीम से इस बारे में पूछें',
      regardingPrefix: 'समाचार विषय:',
      categories: {
        'Travel Tip': 'यात्रा सुझाव',
        'Visa Update': 'वीज़ा अपडेट',
        'Company News': 'कंपनी समाचार',
        'Flight Alert': 'फ्लाइट सूचना',
        'Destination Guide': 'गंतव्य गाइड',
      },
    },
    contact: {
      eyebrow: 'चलिए सफर शुरू करें',
      titleLine1: 'मन में कोई',
      titleAccent: 'यात्रा योजना है?',
      subtitle: 'हमारी टीम से बात करें और बताएं कि आप कहाँ जाना चाहते हैं।',
      followUs: 'TNP को फॉलो करें',
      whatsappLabel: 'व्हाट्सएप',
      emailLabel: 'ईमेल',
      bookingLabel: 'बुकिंग पूछताछ',
      bookingCta: 'अपना यात्रा अनुरोध भेजें',
    },
    footer: {
      rights: 'TNP Travel Agency. TNP के साथ दुनिया की सैर करें।',
      whatsappAria: 'WhatsApp पर चैट करें',
    },
    bookingModal: {
      eyebrow: 'अपनी यात्रा शुरू करें',
      titleLine1: 'बुकिंग पूछताछ',
      titleAccent: 'भेजें।',
      subtitle: 'अपना विवरण साझा करें। हमारी टीम उपलब्धता, कीमत और अगले कदम की पुष्टि करेगी।',
      fullName: 'पूरा नाम',
      email: 'ईमेल',
      phone: 'फ़ोन / WhatsApp',
      service: 'सेवा',
      destination: 'गंतव्य',
      travelDate: 'यात्रा की तारीख',
      details: 'अतिरिक्त विवरण',
      submit: 'अनुरोध भेजें',
      submitting: 'भेजा जा रहा है…',
      clearDraft: 'सहेजा गया ड्राफ्ट मिटाएं',
      receivedPrefix: 'अनुरोध प्राप्त हुआ',
      receivedSuffix: 'हमारी टीम शीघ्र ही आपसे संपर्क करेगी।',
      sendWhatsappCopy: 'WhatsApp पर कॉपी भेजें',
      errorFallback: 'भेजा नहीं जा सका। कृपया WhatsApp पर संपर्क करें।',
    },
  },
};

const LANG_STORAGE_KEY = 'tnp_lang_v1';

export function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved as LanguageCode;
    }
    const browserLang = (window.navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) {
      return browserLang as LanguageCode;
    }
  } catch {
    // Ignore storage errors
  }
  return 'en';
}

export function persistLanguage(code: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    // Ignore storage errors
  }
}
