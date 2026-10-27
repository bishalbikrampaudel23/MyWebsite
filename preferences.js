(function () {
  var languageToggle = document.getElementById('language-toggle');
  var themeToggle = document.getElementById('theme-toggle');
  var themeLabel = document.getElementById('theme-label');

  if (!languageToggle || !themeToggle || !themeLabel) {
    return;
  }

  var translations = {
    'skip': 'मुख्य सामग्रीमा जानुहोस्',
    'preferences.label': 'Language र theme settings',
    'language.switchToEnglish': 'English मा हेर्नुहोस्',
    'language.switchToNepali': 'Nepali मा हेर्नुहोस्',
    'navigation.label': 'मुख्य मेनु',
    'navigation.about': 'About',
    'navigation.experience': 'Experience',
    'navigation.projects': 'Projects',
    'navigation.leadership': 'Leadership',
    'navigation.queries': 'FAQs',
    'navigation.contact': 'Contact',
    'hero.kicker': 'Computer Engineer • AI/ML Enthusiast • Student Leader',
    'hero.lead': 'म practical software र AI/ML solutions बनाउँछु। Student leadership र community programs मार्फत मानिसहरूलाई जोड्ने काम पनि गर्छु।',
    'hero.contact': 'सम्पर्क गरौँ',
    'hero.projects': 'Projects हेर्नुहोस्',
    'hero.photoAlt': 'औपचारिक पोसाकमा बिशाल बिक्रम पौडेल',
    'about.title': 'अध्ययनले इन्जिनियर, अनुभवले Leader',
    'about.intro': 'मैले Kantipur Engineering College बाट Computer Engineering पढेको हुँ। AI/ML, software development र practical problem-solving मा मेरो रुचि छ। निर्वाचित Student Council member का रूपमा काम गरेको, CodeCampNepal स्थापना गरेको, campus events आयोजना गरेको र community workshops सञ्चालन गरेको अनुभव छ।',
    'about.values': 'Technical कामसँगै मानिसहरूसँग जोडिएर काम गर्न मन पर्छ—उपयोगी solutions बनाउने, team लाई साथ दिने र community मा योगदान गर्ने।',
    'about.profile': 'Profile',
    'about.metricAi': 'Model building र Computer Vision',
    'about.metricSystems': 'Problem-solving र operations',
    'about.metricLeadership': 'Project execution र stakeholder coordination',
    'about.degree': 'Degree',
    'about.degreeValue': 'B.E. in Computer Engineering, Institute of Engineering',
    'about.college': 'College',
    'about.focus': 'Focus',
    'about.focusValue': 'AI/ML, Software Development र real-world impact',
    'experience.title': 'Experience',
    'experience.role1': 'Digital Marketing Staff, Tachyonwave',
    'experience.description1': 'Tachyonwave मा Digital Marketing सम्बन्धी काम सिक्दै र team मा योगदान गर्दैछु।',
    'experience.role2': 'Supervisor, Paaila Institute and Consultancy',
    'experience.description2': 'Staff management र daily operations हेर्ने, marketing चलाउने र schools सँग partnership बनाउने।',
    'projects.title': 'Projects',
    'projects.major': 'Major Project',
    'projects.tomato': 'टमाटरका रोग पहिचान गर्न Vision Transformer र CNN models को performance तुलना गर्छ।',
    'projects.computerVision': 'Computer Vision',
    'projects.webPlatform': 'Web Platform',
    'projects.sambandha': 'Local businesses लाई freelance experts सँग जोडेर दुवै पक्षलाई उपयुक्त काम र सहकार्य भेट्टाउन मद्दत गर्छ।',
    'projects.webDevelopment': 'Web Development',
    'projects.marketplace': 'Marketplace',
    'projects.bike': 'Multiple linear regression प्रयोग गरेर used bike को resale price अनुमान गर्छ।',
    'projects.regression': 'Regression',
    'leadership.title': 'Leadership र Community',
    'leadership.studentRole': 'Independent Student Council Member',
    'leadership.studentDescription': 'विद्यार्थीबाट निर्वाचित भएर उनीहरूको आवाज उठाउने र proposals लाई छलफलबाट कामसम्म पुर्‍याउने।',
    'leadership.community': 'समुदाय · नेपाल',
    'leadership.founder': 'Founding Member',
    'leadership.founderDescription': 'मानिसहरूलाई code सिक्न र share गर्न सजिलो होस् भनेर CodeCampNepal सुरु गरेँ।',
    'leadership.highlight1': 'Kantipur Engineering College मा app development training र mentorship',
    'leadership.highlight2': 'Padma Kanya Campus, Bagbazar मा तीनदिने Python workshop',
    'leadership.highlight3': 'C.C.R.C. College, Kathmandu मा तीनदिने programming bootcamp',
    'leadership.instagram': 'Instagram मा CodeCampNepal follow गर्नुहोस्',
    'leadership.eventOrganizer': 'कार्यक्रम आयोजक',
    'leadership.eventDescription': 'Nepal Pragya Pratisthan, Kamaladi, Kathmandu मा कलेजका welcome र farewell events आयोजना गरेँ। Red Cross Dhapakhel, Lalitpur सँग blood donation program पनि coordinate गरेँ।',
    'leadership.festivalOrganizer': 'महोत्सव आयोजक',
    'leadership.festivalDescription': 'Rockheads, Rachana Dahal, The Treble Trouble लगायतका local artists र bands सहभागी कलेजको music festival योजना बनाएर आयोजना गरेँ।',
    'faq.title': 'FAQs',
    'faq.intro': 'तलका जवाफ हेर्नुहोस् वा form बाट मलाई private message पठाउनुहोस्।',
    'faq.q1': 'तपाईंले के पढ्नुभयो? कुन क्षेत्रमा रुचि छ?',
    'faq.a1': 'मैले Kantipur Engineering College बाट Computer Engineering पढेँ। AI/ML, software development, computer vision र practical problem-solving मा मेरो रुचि छ।',
    'faq.q2': 'तपाईंले कस्ता परियोजनामा काम गर्नुभएको छ?',
    'faq.a2': 'मेरा projects मा Tomato Disease Detection (Vision Transformer र CNN को तुलना), local businesses लाई freelance experts सँग जोड्ने Sambandha, र linear regression बाट used bike को resale price अनुमान गर्ने project पर्छन्।',
    'faq.q3': 'CodeCampNepal के हो?',
    'faq.a3': 'CodeCampNepal मैले सुरु गरेको community हो, जहाँ मानिसहरूले code सिक्न र share गर्न सक्छन्। यहाँ app development training, Python र programming workshops, अनि mentorship sessions सञ्चालन भएका छन्।',
    'faq.q4': 'तपाईं कुन technical skills प्रयोग गर्नुहुन्छ?',
    'faq.a4': 'म Python, C, C++, PyTorch, TensorFlow, MySQL र Arduino प्रयोग गर्छु।',
    'faq.q5': 'Project वा collaboration बारे कसरी कुरा गर्ने?',
    'faq.a5Prefix': 'Project वा collaboration बारे कुरा गर्न email गर्नुहोस्:',
    'faq.a5Join': 'वा call गर्नुहोस्:',
    'query.title': 'कुनै question छ?',
    'query.intro': 'मलाई private message पठाउनुहोस्। तपाईंको message र email address मेरो inbox मा मात्र देखिन्छ; म email बाट reply दिन सक्छु।',
    'query.name': 'Your name',
    'query.email': 'Email address',
    'query.subject': 'Subject',
    'query.message': 'Your message',
    'query.honeypot': 'यो खाली छोड्नुहोस्',
    'query.submit': 'Send private message',
    'query.sending': 'तपाईंको message पठाउँदैछु…',
    'query.saved': 'तपाईंको message private रूपमा पठाइयो। धन्यवाद—म email बाट reply दिनेछु।',
    'query.savedNoAlert': 'तपाईंको message save भयो, तर inbox मा email notification पठाउन सकिएन। जरुरी भए तलका contact details प्रयोग गर्नुहोस्।',
    'query.rateLimited': 'धेरै message पठाइयो। केही समयपछि फेरि try गर्नुहोस्।',
    'query.failed': 'तपाईंको message पठाउन सकिएन। फेरि try गर्नुहोस्।',
    'query.turnstileLoading': 'Spam जाँच लोड हुँदैछ…',
    'query.turnstileComplete': 'Spam जाँच पूरा भयो।',
    'query.turnstileExpired': 'Spam जाँचको समय सकियो। कृपया फेरि पूरा गर्नुहोस्।',
    'query.turnstileError': 'Spam जाँच उपलब्ध छैन। केही समयपछि फेरि प्रयास गर्नुहोस्।',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.enableLight': 'Light mode खोल्नुहोस्',
    'theme.enableDark': 'Dark mode खोल्नुहोस्',
    'contact.title': 'सँगै केही राम्रो काम गरौँ।',
    'contact.intro': 'Projects, collaboration वा student leadership बारे कुरा गर्न सम्पर्क गर्नुहोस्।',
    'contact.methods': 'Contact methods',
    'contact.social': 'Social media',
    'leadership.instagramAria': 'Instagram मा CodeCampNepal को पृष्ठ हेर्नुहोस्',
    'footer.ownerInbox': 'Owner inbox'
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
    languageToggle.setAttribute('aria-label', nepali
      ? translations['language.switchToEnglish']
      : translations['language.switchToNepali']);
    document.title = nepali
      ? 'बिशाल बिक्रम पौडेल | Computer Engineer र Student Leader'
      : 'Bishal Bikram Paudel | Computer Engineer & Student Leader';
    var description = document.querySelector('meta[name="description"]');
    description.content = nepali
      ? 'AI/ML, software development र student leadership मा सक्रिय Computer Engineer बिशाल बिक्रम पौडेलको portfolio।'
      : 'Portfolio of Bishal Bikram Paudel, a computer engineer focused on AI/ML and software development, and an elected student leader from Nepal.';
  }

  document.querySelectorAll('[data-i18n]').forEach(function (element) {
    element.dataset.originalText = element.textContent;
  });

  language = document.documentElement.lang === 'ne' ? 'ne' : 'en';
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
    window.location.assign(language === 'en' ? '/ne/' : '/');
  });

  themeToggle.addEventListener('click', function () {
    theme = theme === 'light' ? 'dark' : 'light';
    savePreference('portfolio-theme', theme);
    updateThemeControl();
  });

})();
