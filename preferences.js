(function () {
  var languageToggle = document.getElementById('language-toggle');
  var themeToggle = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');

  if (!languageToggle || !themeToggle || !themeLabel) {
    return;
  }

  var translations = {
    'skip': 'मुख्य सामग्रीमा जानुहोस्',
    'preferences.label': 'प्रदर्शन विकल्प',
    'navigation.label': 'मुख्य नेभिगेसन',
    'navigation.about': 'परिचय',
    'navigation.experience': 'अनुभव',
    'navigation.projects': 'परियोजना',
    'navigation.leadership': 'नेतृत्व',
    'navigation.queries': 'सामान्य जिज्ञासा',
    'navigation.contact': 'सम्पर्क',
    'hero.kicker': 'कम्प्युटर इन्जिनियर • AI/ML प्रेमी • विद्यार्थी नेता',
    'hero.lead': 'म उपयोगी software र AI/ML समाधान बनाउँछु, अनि विद्यार्थी नेतृत्व र सामुदायिक कार्यक्रममार्फत मानिसहरूलाई जोड्छु।',
    'hero.contact': 'सम्पर्क गर्नुहोस्',
    'hero.projects': 'परियोजना हेर्नुहोस्',
    'hero.photoAlt': 'सूट लगाउनुभएका बिशाल बिक्रम पौडेल',
    'about.title': 'सीपले इन्जिनियर, अनुभवले नेता।',
    'about.intro': 'म Kantipur Engineering College बाट Computer Engineering अध्ययन गरेको हुँ। मेरो रुचि AI/ML, software development र व्यवहारिक समस्या समाधानमा छ। निर्वाचित Student Council सदस्यका रूपमा काम गर्नु, CodeCampNepal स्थापना गर्नु र क्याम्पसका कार्यक्रम तथा सामुदायिक कार्यशाला आयोजना गर्नु मेरो अनुभवमा पर्छ।',
    'about.values': 'प्राविधिक गहिराइ र मानवीय सम्बन्ध जोडिने काम मलाई मन पर्छ—उपयोगी समाधान बनाउने, टोलीलाई साथ दिने र आफ्नो समुदायमा योगदान गर्ने।',
    'about.profile': 'मेरो परिचय',
    'about.metricAi': 'Model निर्माण र Computer Vision',
    'about.metricSystems': 'समस्या समाधान र कार्य सञ्चालन',
    'about.metricLeadership': 'कामको नेतृत्व र सरोकारवालासँग समन्वय',
    'about.degree': 'शैक्षिक उपाधि',
    'about.degreeValue': 'B.E. Computer Engineering, Institute of Engineering',
    'about.college': 'कलेज',
    'about.focus': 'मुख्य रुचि',
    'about.focusValue': 'AI/ML, Software Development र व्यवहारिक प्रभाव',
    'experience.title': 'अनुभव',
    'experience.role1': 'Digital Marketing कर्मचारी, Tachyonwave',
    'experience.description1': 'भर्खरै सुरु गरेको हुँ; बढ्दो कम्पनीमा digital marketing सिक्दै योगदान गरिरहेको छु।',
    'experience.role2': 'Supervisor, Paaila Institute and Consultancy',
    'experience.description2': 'कर्मचारी तथा दैनिक कामको व्यवस्थापन, marketing सञ्चालन र विद्यालयहरूसँग साझेदारी निर्माण।',
    'projects.title': 'परियोजना',
    'projects.major': 'मुख्य परियोजना',
    'projects.tomato': 'टमाटरको रोग पहिचानका लागि Vision Transformer र CNN को तुलना।',
    'projects.computerVision': 'Computer Vision',
    'projects.webPlatform': 'Web Platform',
    'projects.sambandha': 'स्थानीय व्यवसायलाई freelance विशेषज्ञसँग जोडेर दुवैलाई उपयुक्त सहकार्य खोज्न मद्दत गर्छ।',
    'projects.webDevelopment': 'Web Development',
    'projects.marketplace': 'अनलाइन बजार',
    'projects.bike': 'Multiple linear regression प्रयोग गरी पुरानो bike को पुनर्बिक्री मूल्य अनुमान गर्छ।',
    'projects.regression': 'Regression',
    'leadership.title': 'नेतृत्व',
    'leadership.studentRole': 'स्वतन्त्र Student Council सदस्य',
    'leadership.studentDescription': 'विद्यार्थीबाट निर्वाचित भई उनीहरूको आवाज उठाउने र प्रस्तावलाई छलफलबाट कामसम्म पुर्‍याउने जिम्मेवारी।',
    'leadership.community': 'समुदाय · नेपाल',
    'leadership.founder': 'संस्थापक सदस्य',
    'leadership.founderDescription': 'मानिसहरूलाई code सिक्न र बाँड्न सजिलो होस् भनेर CodeCampNepal सुरु गरेँ।',
    'leadership.highlight1': 'Kantipur Engineering College मा app development तालिम र mentorship',
    'leadership.highlight2': 'Padma Kanya Campus, Bagbazar मा तीनदिने Python कार्यशाला',
    'leadership.highlight3': 'C.C.R.C. College, Kathmandu मा तीनदिने programming bootcamp',
    'leadership.instagram': 'Instagram मा CodeCampNepal हेर्नुहोस्',
    'leadership.eventOrganizer': 'कार्यक्रम आयोजक',
    'leadership.eventDescription': 'Nepal Pragya Pratisthan, Kamaladi, Kathmandu मा कलेजका स्वागत तथा बिदाइ कार्यक्रम आयोजना गरेँ। Red Cross Dhapakhel, Lalitpur सँग रक्तदान कार्यक्रम पनि समन्वय गरेँ।',
    'leadership.festivalOrganizer': 'महोत्सव आयोजक',
    'leadership.festivalDescription': 'Rockheads, Rachana Dahal, The Treble Trouble लगायतका स्थानीय कलाकार र band समेटिएको कलेज संगीत महोत्सव योजना र आयोजना गरेँ।',
    'faq.title': 'सामान्य जिज्ञासा',
    'faq.intro': 'तलका जवाफ हेर्नुहोस्, वा फारामबाट मलाई निजी प्रश्न पठाउनुहोस्।',
    'faq.q1': 'तपाईंले के अध्ययन गर्नुभयो र कुन क्षेत्रमा रुचि छ?',
    'faq.a1': 'मैले Kantipur Engineering College बाट Computer Engineering अध्ययन गरेँ। मेरो रुचि AI/ML, software development, computer vision र व्यवहारिक समस्या समाधानमा छ।',
    'faq.q2': 'तपाईंले कस्ता परियोजनामा काम गर्नुभएको छ?',
    'faq.a2': 'मेरा परियोजनामा Vision Transformer र CNN तुलना गर्ने Tomato Disease Detection, स्थानीय व्यवसायलाई freelance विशेषज्ञसँग जोड्ने Sambandha, र linear regression प्रयोग गरेर bike को पुनर्बिक्री मूल्य अनुमान गर्ने परियोजना पर्छन्।',
    'faq.q3': 'CodeCampNepal के हो?',
    'faq.a3': 'CodeCampNepal मैले स्थापना गरेको समुदाय हो, जहाँ मानिसहरूले code सिक्न र ज्ञान बाँड्न सक्छन्। यसका गतिविधिमा app development तालिम, Python तथा programming कार्यशाला र mentorship समावेश छन्।',
    'faq.q4': 'तपाईं कुन technical skills प्रयोग गर्नुहुन्छ?',
    'faq.a4': 'म Python, C, C++, PyTorch, TensorFlow, MySQL र Arduino प्रयोग गर्छु।',
    'faq.q5': 'परियोजना वा सहकार्यबारे कसरी कुरा गर्न सकिन्छ?',
    'faq.a5Prefix': 'परियोजना वा सहकार्यका लागि email गर्नुहोस्:',
    'faq.a5Join': 'वा फोन गर्नुहोस्:',
    'query.title': 'व्यक्तिगत प्रश्न छ?',
    'query.intro': 'मलाई निजी सन्देश पठाउनुहोस्। तपाईंको सन्देश र email ठेगाना मेरो inbox मा मात्र देखिन्छ; म तपाईंलाई email बाट जवाफ दिन सक्छु।',
    'query.name': 'तपाईंको नाम',
    'query.email': 'Email ठेगाना',
    'query.subject': 'विषय',
    'query.message': 'तपाईंको सन्देश',
    'query.honeypot': 'यो ठाउँ खाली छोड्नुहोस्',
    'query.submit': 'निजी प्रश्न पठाउनुहोस्',
    'query.sending': 'तपाईंको निजी प्रश्न पठाउँदै…',
    'query.saved': 'तपाईंको प्रश्न निजी रूपमा पठाइयो। धन्यवाद — म तपाईंलाई email मा जवाफ दिनेछु।',
    'query.savedNoAlert': 'तपाईंको प्रश्न सुरक्षित भयो, तर inbox मा email सूचना पठाउन सकिएन। जरुरी भए तलका सम्पर्क विवरण प्रयोग गर्नुहोस्।',
    'query.rateLimited': 'धेरै सन्देश पठाइयो। कृपया केही समयपछि फेरि प्रयास गर्नुहोस्।',
    'query.failed': 'तपाईंको प्रश्न पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
    'theme.dark': 'अँध्यारो',
    'theme.light': 'उज्यालो',
    'theme.enableLight': 'उज्यालो मोड खोल्नुहोस्',
    'theme.enableDark': 'अँध्यारो मोड खोल्नुहोस्',
    'contact.title': 'सँगै राम्रो काम गरौँ।',
    'contact.intro': 'परियोजना, सहकार्य वा विद्यार्थी नेतृत्वबारे कुराकानीका लागि यहाँ सम्पर्क गर्नुहोस्।',
    'footer.ownerInbox': 'मालिकको inbox'
  };

  var language = 'en';
  var theme = 'light';

  function readPreference(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('Could not read saved portfolio preference:', error);
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Could not save portfolio preference:', error);
    }
  }

  function updateThemeControl() {
    var dark = theme === 'dark';
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', language === 'ne'
      ? (dark ? translations['theme.enableLight'] : translations['theme.enableDark'])
      : (dark ? 'Enable light mode' : 'Enable dark mode'));
    themeLabel.textContent = language === 'ne'
      ? (dark ? translations['theme.light'] : translations['theme.dark'])
      : (dark ? 'Light' : 'Dark');
    themeToggle.querySelector('.theme-icon').innerHTML = dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
      : '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/>';
  }

  function updateLanguageControl() {
    var nepali = language === 'ne';
    document.documentElement.lang = language;
    document.documentElement.classList.toggle('lang-ne', nepali);
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      var translation = translations[element.dataset.i18n];
      if (nepali && translation) {
        element.textContent = translation;
      } else if (!nepali && element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
      }
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (element) {
      var key = element.dataset.i18nAlt;
      if (nepali && translations[key]) {
        if (!element.dataset.originalAlt) {
          element.dataset.originalAlt = element.alt;
        }
        element.alt = translations[key];
      } else if (element.dataset.originalAlt) {
        element.alt = element.dataset.originalAlt;
      }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
      var key = element.dataset.i18nAriaLabel;
      if (nepali && translations[key]) {
        if (!element.dataset.originalAriaLabel) {
          element.dataset.originalAriaLabel = element.getAttribute('aria-label');
        }
        element.setAttribute('aria-label', translations[key]);
      } else if (element.dataset.originalAriaLabel) {
        element.setAttribute('aria-label', element.dataset.originalAriaLabel);
      }
    });
    languageToggle.textContent = nepali ? 'English' : 'नेपाली';
    languageToggle.setAttribute('aria-label', nepali ? 'Switch to English' : 'नेपालीमा देखाउनुहोस्');
    document.title = nepali
      ? 'बिशाल बिक्रम पौडेल | कम्प्युटर इन्जिनियर र विद्यार्थी नेता'
      : 'Bishal Bikram Paudel | Computer Engineer & Student Leader';
    var description = document.querySelector('meta[name="description"]');
    description.content = nepali
      ? 'AI/ML, software development र विद्यार्थी नेतृत्वमा केन्द्रित बिशाल बिक्रम पौडेलको portfolio।'
      : 'Portfolio of Bishal Bikram Paudel, a computer engineer focused on AI/ML and software development, and an elected student leader from Nepal.';
  }

  document.querySelectorAll('[data-i18n]').forEach(function (element) {
    element.dataset.originalText = element.textContent;
  });

  language = readPreference('portfolio-language') === 'ne' ? 'ne' : 'en';
  var savedTheme = readPreference('portfolio-theme');
  theme = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'dark'
    : 'light';
  updateLanguageControl();
  updateThemeControl();
  window.portfolioLanguage = function () { return language; };
  window.portfolioTranslate = function (key, fallback) {
    return language === 'ne' && translations[key] ? translations[key] : fallback;
  };

  languageToggle.addEventListener('click', function () {
    language = language === 'en' ? 'ne' : 'en';
    savePreference('portfolio-language', language);
    updateLanguageControl();
    updateThemeControl();
    window.dispatchEvent(new CustomEvent('portfolio:language-change', {
      detail: { language: language }
    }));
  });

  themeToggle.addEventListener('click', function () {
    theme = theme === 'light' ? 'dark' : 'light';
    savePreference('portfolio-theme', theme);
    updateThemeControl();
  });

})();
