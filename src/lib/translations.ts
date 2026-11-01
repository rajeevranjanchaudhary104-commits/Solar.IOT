export type SupportedLanguage = 'en' | 'hi' | 'as' | 'ta' | 'bho';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', flag: '🌾' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🦏' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🏛️' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Nav
    overview: 'Overview',
    liveMonitor: 'Live Monitor',
    updates: 'Updates',
    weather: 'Weather & UV',
    research: 'Research Mode',
    calculators: 'Calculators',
    store: 'Buy Hardware',
    firmware: 'Firmware (ESP32)',
    about: 'About & Media',
    reviews: 'Reviews',
    model3d: '3D Hardware',
    settings: 'Settings',
    signIn: 'Sign In',
    signOut: 'Log Out',
    
    // Auth & Gate
    loginRequired: 'Authentication Required',
    loginSubtitle: 'No one can use the Farm.IOT Station without logging in. Please sign in with your authorized Google or Engineer account.',
    signInGoogle: 'Sign In with Google',
    signInDemo: 'Quick Engineer Access',
    loginSecurityNotice: '🔒 Station security active. Telemetry, wiper controls, and sizing calculations are locked.',
    
    // Theme & Lang
    theme: 'Theme',
    darkTheme: 'Dark Theme',
    lightTheme: 'White / Light Theme',
    language: 'Language',
    selectLanguage: 'Select Language',
    
    // Support & Contact
    support: 'Support & Contact',
    contactUs: 'Contact Us by Email',
    contactDescription: 'Need engineering assistance, hardware support, or wiper parts replacement? Email our system administrator directly.',
    supportEmail: 'Support Email',
    copyEmail: 'Copy Email',
    copied: 'Copied!',
    openMailClient: 'Open Email Client',
    sendEmailMessage: 'Send Support Message',
    subject: 'Subject',
    queryType: 'Query Type',
    yourMessage: 'Your Message',
    sendTicket: 'Submit Support Ticket',
    ticketSent: 'Support email request generated successfully!',
    ticketNotice: 'Official inquiries are answered within 24 hours by the Engineering Team.',

    // Live Metrics
    inverterLoad: 'Inverter Load',
    panelVoltage: 'Panel Voltage',
    panelCurrent: 'DC Current',
    generationWatt: 'Live Generation',
    ambientTemp: 'Ambient Temp',
    batteryLevel: 'Battery Level',
    wiperStatus: 'Wiper Status',
    cleaningActive: 'Cleaning Active',
    idle: 'Idle',
    overloadWarning: 'Overload Warning',
    systemNormal: 'System Normal',

    // Windmill & Peltier Thermoelectric Telemetry
    windmillPeltier: 'Windmill & Peltier',
    securitySystem: 'Security System',
    peltierCurrent: 'Peltier Module Current',
    sandTemp: 'Sand Temperature',
    peltierTemp: 'Peltier Temperature',
    environmentTemp: 'Environment Temperature',
    windmill: 'Windmill',
    windmillRpm: 'Windmill RPM',
    electricityGenerated: 'Electricity Generated',
    airPressure: 'Air Pressure',
  },

  hi: {
    // Nav
    overview: 'अवलोकन',
    liveMonitor: 'लाइव मॉनिटर',
    updates: 'अपडेट्स और डाउनलोड',
    weather: 'मौसम और यूवी',
    research: 'रिसर्च मोड',
    calculators: 'कैलकुलेटर',
    store: 'हार्डवेयर खरीदें',
    firmware: 'फर्मवेयर (ESP32)',
    about: 'बारे में और मीडिया',
    reviews: 'समीक्षाएं',
    model3d: '3D हार्डवेयर मॉडल',
    settings: 'सेटिंग्स',
    signIn: 'साइन इन करें',
    signOut: 'लॉग आउट',
    
    // Auth & Gate
    loginRequired: 'लॉगिन अनिवार्य है',
    loginSubtitle: 'फार्म IoT (Farm.IOT) स्टेशन का उपयोग बिना लॉगिन किए कोई नहीं कर सकता। कृपया अपने अधिकृत गूगल या इंजीनियर खाते से साइन इन करें।',
    signInGoogle: 'Google से साइन इन करें',
    signInDemo: 'त्वरित इंजीनियर प्रवेश',
    loginSecurityNotice: '🔒 स्टेशन सुरक्षा सक्रिय। टेलीमेट्री, वाइपर नियंत्रण और गणनाएं सुरक्षित रूप से बंद हैं।',
    
    // Theme & Lang
    theme: 'थीम',
    darkTheme: 'डार्क थीम (Dark)',
    lightTheme: 'व्हाइट थीम (White / Light)',
    language: 'भाषा (Language)',
    selectLanguage: 'भाषा चुनें',
    
    // Support & Contact
    support: 'सहायता और संपर्क',
    contactUs: 'ईमेल द्वारा संपर्क करें',
    contactDescription: 'इंजीनियरिंग सहायता, हार्डवेयर समस्या या वाइपर पुर्जों के लिए हमारे सिस्टम प्रशासक को सीधे ईमेल भेजें।',
    supportEmail: 'सपोर्ट ईमेल',
    copyEmail: 'ईमेल कॉपी करें',
    copied: 'कॉपी हो गया!',
    openMailClient: 'ईमेल ऐप खोलें',
    sendEmailMessage: 'सपोर्ट संदेश भेजें',
    subject: 'विषय',
    queryType: 'पूछताछ का प्रकार',
    yourMessage: 'आपका संदेश',
    sendTicket: 'सपोर्ट संदेश भेजें',
    ticketSent: 'सपोर्ट ईमेल अनुरोध सफलतापूर्वक तैयार हो गया!',
    ticketNotice: 'आधिकारिक पूछताछ का उत्तर 24 घंटे के भीतर राजीव रंजन चौधरी द्वारा दिया जाता है।',

    // Live Metrics
    inverterLoad: 'इन्वर्टर लोड',
    panelVoltage: 'पैनल वोल्टेज',
    panelCurrent: 'डीसी करंट',
    generationWatt: 'उत्पादित वाट',
    ambientTemp: 'तापमान',
    batteryLevel: 'बैटरी स्तर',
    wiperStatus: 'वाइपर स्थिति',
    cleaningActive: 'सफाई जारी है',
    idle: 'निष्क्रिय',
    overloadWarning: 'ओवरलोड चेतावनी!',
    systemNormal: 'सिस्टम सामान्य',

    // Windmill & Peltier Thermoelectric Telemetry
    windmillPeltier: 'पवनचक्की और पेल्टियर',
    securitySystem: 'सुरक्षा प्रणाली',
    peltierCurrent: 'पेल्टियर मॉड्यूल करंट',
    sandTemp: 'रेत का तापमान',
    peltierTemp: 'पेल्टियर तापमान',
    environmentTemp: 'पर्यावरण तापमान',
    windmill: 'पवनचक्की',
    windmillRpm: 'पवनचक्की आरपीएम (RPM)',
    electricityGenerated: 'उत्पन्न बिजली (Watts)',
    airPressure: 'वायुमंडलीय दबाव',
  },

  bho: {
    // Nav
    overview: 'विवरण',
    liveMonitor: 'लाइव मॉनिटर',
    updates: 'अपडेट आ डाउनलोड',
    weather: 'मौसम आ धूप',
    research: 'रिसर्च मोड',
    calculators: 'कैलकुलेटर',
    store: 'सामान खरीदीं',
    firmware: 'फर्मवेयर (ESP32)',
    about: 'प्रोजेक्ट के बारे में',
    reviews: 'समीक्षा',
    model3d: '3D मॉडल',
    settings: 'सेटिंग',
    signIn: 'साइन इन करीं',
    signOut: 'लॉग आउट',
    
    // Auth & Gate
    loginRequired: 'बिना लॉगिन के प्रयोग मना बा',
    loginSubtitle: 'फार्म IoT (Farm.IOT) स्टेशन बिना लॉगिन कईले केहू इस्तेमाल ना कर सकेला। रउआ अपना गूगल भा इंजीनियर खाता से साइन इन करीं।',
    signInGoogle: 'Google से साइन इन करीं',
    signInDemo: 'इंजीनियर डेमो लॉगिन',
    loginSecurityNotice: '🔒 स्टेशन सुरक्षा चालू बा। लाइव टेलीमेट्री आ वाइपर कंट्रोल बंद बा।',
    
    // Theme & Lang
    theme: 'थीम चुनीं',
    darkTheme: 'डार्क थीम (करिया)',
    lightTheme: 'व्हाइट थीम (उज्जर)',
    language: 'भाषा चुनीं',
    selectLanguage: 'भाषा',
    
    // Support & Contact
    support: 'मदद आ संपर्क',
    contactUs: 'ईमेल से बात करीं',
    contactDescription: 'कोनो समस्या, वाइपर खराबी भा तकनीकी सलाह खातिर सीधा राजीव रंजन चौधरी के ईमेल भेजीं।',
    supportEmail: 'सपोर्ट ईमेल आईडी',
    copyEmail: 'ईमेल कॉपी करीं',
    copied: 'कॉपी हो गइल!',
    openMailClient: 'ईमेल एप खोलीं',
    sendEmailMessage: 'मदद के संदेश भेजीं',
    subject: 'विषय',
    queryType: 'पूछताछ प्रकार',
    yourMessage: 'रउआ संदेश',
    sendTicket: 'ईमेल भेजीं',
    ticketSent: 'सपोर्ट ईमेल तइयार हो गइल बा!',
    ticketNotice: '24 घंटा के भीतर राजीव रंजन चौधरी रउआ के जवाब दिहें।',

    // Live Metrics
    inverterLoad: 'इन्वर्टर लोड',
    panelVoltage: 'पैनल वोल्टेज',
    panelCurrent: 'करंट',
    generationWatt: 'उत्पादन वाट',
    ambientTemp: 'तापमान',
    batteryLevel: 'बैटरी चार्ज',
    wiperStatus: 'वाइपर हालचाल',
    cleaningActive: 'सफाई चल रहल बा',
    idle: 'रुकि गइल',
    overloadWarning: 'अरे लोड गिर गइल!',
    systemNormal: 'सब ठीक बा',

    // Windmill & Peltier Thermoelectric Telemetry
    windmillPeltier: 'पवनचक्की आ पेल्टियर',
    securitySystem: 'सुरक्षा सिस्टम',
    peltierCurrent: 'पेल्टियर मॉड्यूल करंट',
    sandTemp: 'बालू के तापमान',
    peltierTemp: 'पेल्टियर तापमान',
    environmentTemp: 'वातावरण तापमान',
    windmill: 'पवनचक्की',
    windmillRpm: 'पवनचक्की आरपीएम (RPM)',
    electricityGenerated: 'पैदा भइल बिजली (Watts)',
    airPressure: 'हवा के दबाव',
  },

  as: {
    // Nav
    overview: 'অৱলোকন',
    liveMonitor: 'লাইভ মনিটৰ',
    updates: 'আপডেট আৰু ডাউনলোড',
    weather: 'বতৰ আৰু ইউভি',
    research: 'গৱেষণা ম’ড',
    calculators: 'কেলকুলেটৰ',
    store: 'হাৰ্ডৱেৰ ক্ৰয়',
    firmware: 'ফাৰ্মৱেৰ (ESP32)',
    about: 'প্ৰজেক্টৰ বিষয়ে',
    reviews: 'পৰ্যালোচনা',
    model3d: '৩ডি হাৰ্ডৱেৰ মডেল',
    settings: 'ছেটিংছ',
    signIn: 'ছাইন ইন কৰক',
    signOut: 'লগ আউট',
    
    // Auth & Gate
    loginRequired: 'লগইন কৰাটো বাধ্যতামূলক',
    loginSubtitle: 'লগইন নকৰাকৈ কোনেও এই ফাৰ্ম আইঅ’টি (Farm.IOT) ষ্টেচন ব্যৱহাৰ কৰিব নোৱাৰে। অনুগ্ৰহ কৰি Google বা অভিযন্তা একাউণ্টেৰে ছাইন ইন কৰক।',
    signInGoogle: 'Google ৰে ছাইন ইন কৰক',
    signInDemo: 'দ্ৰুত অভিযন্তা প্ৰৱেশ',
    loginSecurityNotice: '🔒 ষ্টেচনৰ নিৰাপত্তা সক্ৰিয় হৈ আছে। লাইভ তথ্য আৰু ৱাইপাৰ নিয়ন্ত্ৰণ বন্ধ আছে।',
    
    // Theme & Lang
    theme: 'থীম (Theme)',
    darkTheme: 'ডাৰ্ক থীম (Dark)',
    lightTheme: 'হোৱাইট থীম (White / Light)',
    language: 'ভাষা নিৰ্বাচন (Language)',
    selectLanguage: 'ভাষা বাছক',
    
    // Support & Contact
    support: 'সহায় আৰু যোগাযোগ',
    contactUs: 'ইমেইল যোগে যোগাযোগ কৰক',
    contactDescription: 'কাৰিকৰী সহায়, হাৰ্ডৱেৰ বা ৱাইপাৰৰ অংশৰ বাবে আমাৰ ছিষ্টেম প্ৰশাসকক পোনপটীয়াকৈ ইমেইল কৰক।',
    supportEmail: 'সহায় ইমেইল',
    copyEmail: 'ইমেইল কপি কৰক',
    copied: 'কপি কৰা হ’ল!',
    openMailClient: 'ইমেইল এপ খোলক',
    sendEmailMessage: 'বাৰ্তা প্ৰেৰণ কৰক',
    subject: 'বিষয়',
    queryType: 'অনুসন্ধানৰ ধৰণ',
    yourMessage: 'আপোনাৰ বাৰ্তা',
    sendTicket: 'ইমেইল পঠিয়াওক',
    ticketSent: 'সহায় ইমেইল অনুৰোধ সফলতাৰে সৃষ্টি কৰা হ’ল!',
    ticketNotice: '২৪ ঘণ্টাৰ ভিতৰত ৰাজীৱ ৰঞ্জন চৌধুৰীয়ে উত্তৰ দিব।',

    // Live Metrics
    inverterLoad: 'ইনভাৰ্টাৰ লোড',
    panelVoltage: 'পেনেল ভল্টেজ',
    panelCurrent: 'ডিচি কাৰেণ্ট',
    generationWatt: 'উৎপাদিত ৱাট',
    ambientTemp: 'উত্তাপ',
    batteryLevel: 'বেটাৰী পৰ্যায়',
    wiperStatus: 'ৱাইপাৰ অৱস্থা',
    cleaningActive: 'চাফাই চলি আছে',
    idle: 'নিষ্ক্ৰিয়',
    overloadWarning: 'অভাৰলোড সতৰ্কবাৰ্তা!',
    systemNormal: 'ছিষ্টেম স্বাভাৱিক',

    // Windmill & Peltier Thermoelectric Telemetry
    windmillPeltier: 'উইণ্ডমিল আৰু পেল্টিয়াৰ',
    securitySystem: 'নিৰাপত্তা প্ৰণালী',
    peltierCurrent: 'পেল্টিয়াৰ মডিউল কাৰেণ্ট',
    sandTemp: 'বালিশালৰ উত্তাপ',
    peltierTemp: 'পেল্টিয়াৰ উত্তাপ',
    environmentTemp: 'পৰিৱেশৰ উত্তাপ',
    windmill: 'উইণ্ডমিল',
    windmillRpm: 'উইণ্ডমিল আৰপিএম (RPM)',
    electricityGenerated: 'উৎপাদিত বিদ্যুৎ (Watts)',
    airPressure: 'বায়ুৰ চাপ',
  },

  ta: {
    // Nav
    overview: 'கண்ணோட்டம்',
    liveMonitor: 'நேரடி மானிட்டர்',
    updates: 'புதுப்பிப்புகள்',
    weather: 'வானிலை & புற ஊதா',
    research: 'ஆராய்ச்சி முறை',
    calculators: 'கால்குலேட்டர்கள்',
    store: 'வன்பொருள் வாங்க',
    firmware: 'மென்பொருள் (ESP32)',
    about: 'எங்களை பற்றி',
    reviews: 'மதிப்புரைகள்',
    model3d: '3D மாதிரி',
    settings: 'அமைப்புகள்',
    signIn: 'உள்நுழைக',
    signOut: 'வெளியேறு',
    
    // Auth & Gate
    loginRequired: 'உள்நுழைவு கட்டாயமாகும்',
    loginSubtitle: 'உள்நுழையாமல் யாரும் இந்த Farm.IOT அமைப்பைப் பயன்படுத்த முடியாது. தயவுசெய்து உங்கள் Google கணக்குடன் உள்நுழையவும்.',
    signInGoogle: 'Google மூலம் உள்நுழைக',
    signInDemo: 'பொறியாளர் நேரடி அணுகல்',
    loginSecurityNotice: '🔒 நிலைய பாதுகாப்பு செயலில் உள்ளது. நேரடி தரவு மற்றும் துடைப்பான் கட்டுப்பாடுகள் பூட்டப்பட்டுள்ளன.',
    
    // Theme & Lang
    theme: 'வடிவமைப்பு தீம்',
    darkTheme: 'இருண்ட தீம் (Dark)',
    lightTheme: 'வெள்ளை தீம் (White / Light)',
    language: 'மொழி தேர்வு',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    
    // Support & Contact
    support: 'ஆதரவு & தொடர்பு',
    contactUs: 'மின்னஞ்சல் மூலம் தொடர்பு கொள்ளவும்',
    contactDescription: 'பொறியியல் உதவி அல்லது வன்பொருள் சிக்கல்களுக்கு எங்கள் கணினி நிர்வாகியை நேரடியாக மின்னஞ்சல் செய்யவும்.',
    supportEmail: 'ஆதரவு மின்னஞ்சல்',
    copyEmail: 'மின்னஞ்சலை நகலெடு',
    copied: 'நகலெடுக்கப்பட்டது!',
    openMailClient: 'மின்னஞ்சல் செயலியைத் திறக்கவும்',
    sendEmailMessage: 'ஆதரவு செய்தி அனுப்பவும்',
    subject: 'பொருள்',
    queryType: 'விசாரணை வகை',
    yourMessage: 'உங்கள் செய்தி',
    sendTicket: 'மின்னஞ்சல் அனுப்பவும்',
    ticketSent: 'ஆதரவு மின்னஞ்சல் கோரிக்கை வெற்றிகரமாக உருவாக்கப்பட்டது!',
    ticketNotice: '24 மணி நேரத்திற்குள் ராஜீவ் ரஞ்சன் சவுத்ரி பதிலளிப்பார்.',

    // Live Metrics
    inverterLoad: 'இன்வெர்ட்டர் சுமை',
    panelVoltage: 'சோலார் மின்னழுத்தம்',
    panelCurrent: 'மின்னோட்டம்',
    generationWatt: 'உற்பத்தி வாட்ஸ்',
    ambientTemp: 'வெப்பநிலை',
    batteryLevel: 'பேட்டரி நிலை',
    wiperStatus: 'துடைப்பான் நிலை',
    cleaningActive: 'சுத்தம் செய்யப்படுகிறது',
    idle: 'செயலற்றது',
    overloadWarning: 'அதிக சுமை எச்சரிக்கை!',
    systemNormal: 'இயல்பு நிலை',

    // Windmill & Peltier Thermoelectric Telemetry
    windmillPeltier: 'காற்றாலை & பெல்டியர்',
    securitySystem: 'பாதுகாப்பு அமைப்பு',
    peltierCurrent: 'பெல்டியர் தொகுதி மின்னோட்டம்',
    sandTemp: 'மணல் வெப்பநிலை',
    peltierTemp: 'பெல்டியர் வெப்பநிலை',
    environmentTemp: 'சுற்றுச்சூழல் வெப்பநிலை',
    windmill: 'காற்றாலை',
    windmillRpm: 'காற்றாலை ஆர்பிஎம் (RPM)',
    electricityGenerated: 'உற்பத்தி செய்யப்பட்ட மின்சாரம்',
    airPressure: 'காற்று அழுத்தம்',
  },
};

export function getTranslation(lang: SupportedLanguage, key: string): string {
  const langDict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  return langDict[key] || TRANSLATIONS['en'][key] || key;
}
