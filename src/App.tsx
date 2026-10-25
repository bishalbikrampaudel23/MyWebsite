import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { FormEvent, PointerEvent, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

type Language = "en" | "ne";
type Theme = "light" | "dark";
type QueryStatus =
  | "idle"
  | "sending"
  | "saved"
  | "savedNoAlert"
  | "rateLimited"
  | "failed";

const text = {
  en: {
    skip: "Skip to content",
    nav: ["About", "Experience", "Projects", "Achievements", "FAQs", "Contact"],
    languageLabel: "नेपाली",
    themeDark: "Dark",
    themeLight: "Light",
    themeEnableDark: "Enable dark mode",
    themeEnableLight: "Enable light mode",
    heroKicker: "Computer Engineer · AI/ML Enthusiast · Student Leader",
    heroLead:
      "I build practical software and AI/ML solutions, and bring people together through student leadership and community programs.",
    contactCta: "Get in touch",
    projectsCta: "Explore projects",
    location: "Kathmandu, Nepal",
    aboutEyebrow: "A little about me",
    aboutTitle: "Engineer by learning. Leader by experience.",
    aboutIntro:
      "I am a Computer Engineer from Kantipur Engineering College focused on AI/ML, software development, and applied problem-solving. My experience includes serving as an elected Student Council member, founding CodeCampNepal, and organizing campus programs and community workshops.",
    aboutValues:
      "I enjoy work that brings technical depth and human connection together: building useful solutions, supporting teams, and contributing to the communities around me.",
    profile: "What I bring",
    focusLabels: ["Artificial intelligence", "Systems thinking", "Community leadership"],
    focusValues: [
      "Model building and computer vision",
      "Practical problem-solving and operations",
      "Execution and stakeholder coordination",
    ],
    education: "Education",
    degree: "B.E. Computer Engineering, Institute of Engineering",
    college: "Kantipur Engineering College",
    focus: "Areas of focus",
    focusAreas: "AI/ML · Software development · Real-world impact",
    skills: "Tools I work with",
    experienceEyebrow: "Where I have worked",
    experienceTitle: "Experience",
    current: "Present",
    roles: [
      {
        dates: "Oct 2026 — Present",
        title: "Digital Marketing Staff, Tachyonwave",
        description:
          "Learning and contributing to digital marketing work at a growing company.",
      },
      {
        dates: "Apr 2026 — Oct 2026",
        title: "Supervisor, Paaila Institute and Consultancy",
        description:
          "Managed staff and day-to-day operations, ran marketing, and built partnerships with schools.",
      },
    ],
    projectsEyebrow: "Selected work",
    projectsTitle: "Projects",
    projectTypes: ["Major project", "Web platform", "Machine learning"],
    projectDescriptions: [
      "Compares a Vision Transformer against a CNN for detecting tomato diseases, exploring practical computer-vision approaches for agriculture.",
      "A platform that connects local businesses with freelance experts to help both sides find the right work and collaborations.",
      "Uses multiple linear regression to estimate the resale price of used bikes.",
    ],
    projectTags: [
      ["Vision Transformer", "CNN", "Computer vision"],
      ["Web development", "Marketplace"],
      ["Regression", "Python"],
    ],
    achievementsEyebrow: "Outside the IDE",
    achievementsTitle: "Leadership & community",
    achievements: [
      {
        meta: "Kantipur Engineering College · 2022—2024",
        title: "Independent Student Council Member",
        description:
          "Elected by students to represent their interests and help move proposals from discussion to action.",
      },
      {
        meta: "Community · Nepal",
        title: "Founding Member, CodeCampNepal",
        description:
          "Started a community where people can learn and share code through training, workshops, and mentorship.",
        details: [
          "App development training and mentorship at Kantipur Engineering College",
          "Three-day Python workshop at Padma Kanya Campus, Bagbazar",
          "Three-day programming bootcamp at C.C.R.C. College, Kathmandu",
        ],
        link: "Follow CodeCampNepal on Instagram",
      },
      {
        meta: "Events · Kantipur Engineering College",
        title: "Event Organizer",
        description:
          "Organized the college's welcome and farewell events at Nepal Pragya Pratisthan, and coordinated blood donation programs with Red Cross Dhapakhel.",
      },
      {
        meta: "Kantipur Engineering College Music Fest",
        title: "Festival Organizer",
        description:
          "Planned and organized a college music festival featuring local artists and bands including Rockheads, Rachana Dahal, and The Treble Trouble.",
      },
    ],
    faqEyebrow: "Good to know",
    faqTitle: "A few quick answers",
    faqs: [
      {
        question: "What did you study, and what are your areas of focus?",
        answer:
          "I studied Computer Engineering at Kantipur Engineering College. I focus on AI/ML, software development, computer vision, and practical problem-solving.",
      },
      {
        question: "What projects have you worked on?",
        answer:
          "My projects include tomato disease detection comparing a Vision Transformer with a CNN, Sambandha (a platform connecting local businesses with freelance experts), and used-bike resale price prediction with linear regression.",
      },
      {
        question: "What is CodeCampNepal?",
        answer:
          "CodeCampNepal is a community I founded to make it easier for people to learn and share code. Activities have included app development training, Python and programming workshops, and mentorship.",
      },
      {
        question: "What technical skills do you use?",
        answer:
          "I work with Python, C, C++, PyTorch, TensorFlow, MySQL, and Arduino.",
      },
    ],
    queryTitle: "Have a question?",
    queryIntro:
      "Send me a private message. Your message and email address are only visible in my inbox, and I can reply to you by email.",
    name: "Your name",
    email: "Email address",
    subject: "Subject",
    message: "Your message",
    submit: "Send private message",
    sending: "Sending your private message…",
    saved:
      "Your message has been sent privately. Thank you — I’ll reply to your email.",
    savedNoAlert:
      "Your message was saved, but the inbox email alert could not be sent. Please use the contact details below if it is urgent.",
    rateLimited: "Too many messages. Please try again later.",
    failed: "Your message could not be sent. Please try again.",
    contactEyebrow: "Have something in mind?",
    contactTitle: "Let's make something meaningful.",
    contactIntro:
      "For projects, collaborations, or conversations about student leadership, reach out.",
    emailLabel: "Email",
    phoneLabel: "Phone",
    socialLabel: "Find me elsewhere",
    footer: "Built with curiosity in Kathmandu, Nepal.",
    inbox: "Owner inbox",
  },
  ne: {
    skip: "मुख्य सामग्रीमा जानुहोस्",
    nav: ["बारेमा", "अनुभव", "परियोजना", "नेतृत्व", "प्रश्नहरू", "सम्पर्क"],
    languageLabel: "English",
    themeDark: "गाढा",
    themeLight: "उज्यालो",
    themeEnableDark: "गाढा मोड खोल्नुहोस्",
    themeEnableLight: "उज्यालो मोड खोल्नुहोस्",
    heroKicker: "कम्प्युटर इन्जिनियर · AI/ML उत्साही · विद्यार्थी नेता",
    heroLead:
      "म उपयोगी software र AI/ML समाधान बनाउँछु, र विद्यार्थी नेतृत्व तथा सामुदायिक कार्यक्रममार्फत मानिसहरूलाई जोड्छु।",
    contactCta: "सम्पर्क गरौँ",
    projectsCta: "परियोजना हेर्नुहोस्",
    location: "काठमाडौं, नेपाल",
    aboutEyebrow: "मेरो बारेमा",
    aboutTitle: "अध्ययनले इन्जिनियर, अनुभवले नेता।",
    aboutIntro:
      "मैले Kantipur Engineering College बाट Computer Engineering पढेको हुँ। AI/ML, software development र practical problem-solving मा मेरो रुचि छ। निर्वाचित Student Council सदस्य, CodeCampNepal को संस्थापक, र क्याम्पस कार्यक्रम तथा सामुदायिक workshop आयोजकको अनुभव छ।",
    aboutValues:
      "प्राविधिक गहिराइ र मानवीय सम्बन्ध जोड्ने काम मन पर्छ—उपयोगी समाधान बनाउने, टोलीलाई साथ दिने र समुदायमा योगदान गर्ने।",
    profile: "मेरो योगदान",
    focusLabels: ["कृत्रिम बुद्धिमत्ता", "प्रणालीगत सोच", "सामुदायिक नेतृत्व"],
    focusValues: [
      "मोडेल निर्माण र Computer Vision",
      "समस्या समाधान र सञ्चालन",
      "कार्यसम्पादन र समन्वय",
    ],
    education: "शिक्षा",
    degree: "B.E. Computer Engineering, Institute of Engineering",
    college: "Kantipur Engineering College",
    focus: "मुख्य रुचिका क्षेत्र",
    focusAreas: "AI/ML · Software development · वास्तविक प्रभाव",
    skills: "मैले प्रयोग गर्ने प्रविधि",
    experienceEyebrow: "कार्य अनुभव",
    experienceTitle: "अनुभव",
    current: "हाल",
    roles: [
      {
        dates: "अक्टोबर २०२६ — हाल",
        title: "Digital Marketing Staff, Tachyonwave",
        description:
          "बढ्दो कम्पनीमा digital marketing सम्बन्धी काम सिक्दै र टोलीमा योगदान गर्दै।",
      },
      {
        dates: "अप्रिल २०२६ — अक्टोबर २०२६",
        title: "Supervisor, Paaila Institute and Consultancy",
        description:
          "कर्मचारी र दैनिक सञ्चालन व्यवस्थापन, marketing तथा विद्यालयसँग साझेदारी।",
      },
    ],
    projectsEyebrow: "छानिएका काम",
    projectsTitle: "परियोजनाहरू",
    projectTypes: ["प्रमुख परियोजना", "वेब प्लेटफर्म", "Machine learning"],
    projectDescriptions: [
      "टमाटरका रोग पहिचान गर्न Vision Transformer र CNN को तुलना गर्ने computer-vision परियोजना।",
      "स्थानीय व्यवसायलाई freelance विशेषज्ञसँग जोडेर उपयुक्त काम र सहकार्य भेट्टाउन सहयोग गर्ने platform।",
      "प्रयोग गरिएका बाइकको resale price अनुमान गर्न multiple linear regression प्रयोग गर्छ।",
    ],
    projectTags: [
      ["Vision Transformer", "CNN", "Computer vision"],
      ["Web development", "Marketplace"],
      ["Regression", "Python"],
    ],
    achievementsEyebrow: "प्रविधिभन्दा बाहिर",
    achievementsTitle: "नेतृत्व र समुदाय",
    achievements: [
      {
        meta: "Kantipur Engineering College · 2022—2024",
        title: "स्वतन्त्र Student Council सदस्य",
        description:
          "विद्यार्थीबाट निर्वाचित भएर उनीहरूको आवाज उठाउने र प्रस्तावलाई छलफलबाट कामसम्म पुर्‍याउने।",
      },
      {
        meta: "समुदाय · नेपाल",
        title: "CodeCampNepal संस्थापक सदस्य",
        description:
          "तालिम, workshop र mentorship मार्फत code सिक्न र साझा गर्न सकिने समुदाय सुरु गरेँ।",
        details: [
          "Kantipur Engineering College मा app development तालिम र mentorship",
          "Padma Kanya Campus, Bagbazar मा तीनदिने Python workshop",
          "C.C.R.C. College, Kathmandu मा तीनदिने programming bootcamp",
        ],
        link: "Instagram मा CodeCampNepal follow गर्नुहोस्",
      },
      {
        meta: "कार्यक्रम · Kantipur Engineering College",
        title: "कार्यक्रम आयोजक",
        description:
          "कलेजका स्वागत तथा बिदाइ कार्यक्रम आयोजना गरेँ र Red Cross Dhapakhel सँग रक्तदान कार्यक्रम समन्वय गरेँ।",
      },
      {
        meta: "Kantipur Engineering College Music Fest",
        title: "महोत्सव आयोजक",
        description:
          "Rockheads, Rachana Dahal र The Treble Trouble लगायतका स्थानीय कलाकार तथा ब्यान्डसहितको संगीत महोत्सव आयोजना गरेँ।",
      },
    ],
    faqEyebrow: "जान्नैपर्ने कुरा",
    faqTitle: "केही छोटा जवाफ",
    faqs: [
      {
        question: "तपाईंले के पढ्नुभयो? कुन क्षेत्रमा रुचि छ?",
        answer:
          "मैले Kantipur Engineering College मा Computer Engineering पढेँ। AI/ML, software development, computer vision र practical problem-solving मा मेरो रुचि छ।",
      },
      {
        question: "तपाईंले कस्ता परियोजनामा काम गर्नुभएको छ?",
        answer:
          "मेरा परियोजनामा Tomato Disease Detection, स्थानीय व्यवसाय र freelance विशेषज्ञ जोड्ने Sambandha, र linear regression बाट used bike को मूल्य अनुमान गर्ने परियोजना पर्छन्।",
      },
      {
        question: "CodeCampNepal के हो?",
        answer:
          "CodeCampNepal मैले सुरु गरेको code सिक्ने र साझा गर्ने समुदाय हो। यहाँ app development training, Python workshop, programming bootcamp र mentorship सञ्चालन भएका छन्।",
      },
      {
        question: "कुन प्राविधिक सीप प्रयोग गर्नुहुन्छ?",
        answer:
          "म Python, C, C++, PyTorch, TensorFlow, MySQL र Arduino प्रयोग गर्छु।",
      },
    ],
    queryTitle: "केही सोध्न चाहनुहुन्छ?",
    queryIntro:
      "मलाई निजी सन्देश पठाउनुहोस्। तपाईंको सन्देश र इमेल ठेगाना मेरो inbox मा मात्र देखिन्छ, र म इमेलबाट जवाफ दिन सक्छु।",
    name: "तपाईंको नाम",
    email: "इमेल ठेगाना",
    subject: "विषय",
    message: "तपाईंको सन्देश",
    submit: "निजी सन्देश पठाउनुहोस्",
    sending: "निजी सन्देश पठाउँदै…",
    saved: "तपाईंको सन्देश सुरक्षित रूपमा पठाइयो। धन्यवाद — इमेलमा जवाफ दिनेछु।",
    savedNoAlert:
      "तपाईंको सन्देश सुरक्षित भयो, तर inbox इमेल सूचना पठाउन सकिएन। अत्यावश्यक भए तलको सम्पर्क प्रयोग गर्नुहोस्।",
    rateLimited: "धेरै सन्देश आए। कृपया केही समयपछि प्रयास गर्नुहोस्।",
    failed: "सन्देश पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।",
    contactEyebrow: "केही कुरा सोच्नुभएको छ?",
    contactTitle: "केही अर्थपूर्ण बनाऔँ।",
    contactIntro:
      "परियोजना, सहकार्य वा विद्यार्थी नेतृत्वबारे कुराकानी गर्न सम्पर्क गर्नुहोस्।",
    emailLabel: "इमेल",
    phoneLabel: "फोन",
    socialLabel: "अन्यत्र भेटौँ",
    footer: "काठमाडौं, नेपालमा उत्सुकताका साथ बनाइएको।",
    inbox: "मालिकको inbox",
  },
} as const;

const skills = [
  "Python",
  "C",
  "C++",
  "PyTorch",
  "TensorFlow",
  "MySQL",
  "Arduino",
];

const projects = [
  { name: "Tomato Disease Detection", number: "01" },
  { name: "Sambandha", number: "02" },
  { name: "Bike Resale Price Prediction", number: "03" },
];

const initialMotion = { opacity: 0, y: 26 };
function getStoredValue<T extends string>(
  key: string,
  allowed: readonly T[],
): T | undefined {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.find((option) => option === value);
  } catch {
    return undefined;
  }
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : initialMotion}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function MagneticLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className: string;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.18 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.18 });

  function move(event: PointerEvent<HTMLAnchorElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.12);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.16);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      href={href}
      className={className}
      style={{ x: springX, y: springY }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {children}
    </motion.a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="arrow-icon">
      <path d="M4 16 16 4M5 4h11v11" />
    </svg>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(
    () => getStoredValue("portfolio-language", ["en", "ne"] as const) ?? "en",
  );
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = getStoredValue("portfolio-theme", ["light", "dark"] as const);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [scrolled, setScrolled] = useState(false);
  const [queryStatus, setQueryStatus] = useState<QueryStatus>("idle");
  const [queryError, setQueryError] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const copy = text[language];
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef as RefObject<HTMLElement>,
    offset: ["start start", "end start"],
  });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 58]);
  const portraitYSpring = useSpring(portraitY, {
    stiffness: 80,
    damping: 24,
    mass: 0.3,
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#171916" : "#f7f6f1",
    );
    document.title =
      language === "ne"
        ? "बिशाल बिक्रम पौडेल — इन्जिनियर र समुदाय निर्माता"
        : "Bishal Bikram Paudel — Engineer & Community Builder";
  }, [language, theme]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 32);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function savePreference(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // The page still works when browser storage is unavailable.
    }
  }

  function moveSpotlight(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--pointer-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--pointer-y",
      `${event.clientY - bounds.top}px`,
    );
  }

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    setQueryStatus("sending");
    setQueryError("");

    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          subject: values.get("subject"),
          message: values.get("message"),
          website: values.get("website"),
        }),
      });
      const result: { error?: string; notificationSent?: boolean } =
        await response.json();
      if (response.status === 429) {
        setQueryStatus("rateLimited");
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || copy.failed);
      }
      formRef.current?.reset();
      setQueryStatus(
        result.notificationSent === false ? "savedNoAlert" : "saved",
      );
    } catch (error) {
      setQueryStatus("failed");
      setQueryError(
        error instanceof Error && error.message
          ? error.message
          : copy.failed,
      );
    }
  }

  const statusMessage: Record<QueryStatus, string> = {
    idle: "",
    sending: copy.sending,
    saved: copy.saved,
    savedNoAlert: copy.savedNoAlert,
    rateLimited: copy.rateLimited,
    failed: queryError || copy.failed,
  };

  return (
    <motion.div
      className="portfolio-app"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <a className="skip-link" href="#main">
        {copy.skip}
      </a>

      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <a className="wordmark" href="#home" aria-label="Bishal Bikram Paudel, home">
          <span className="wordmark-mark">B.</span>
          <span>Bishal Bikram Paudel</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          {["about", "experience", "projects", "leadership", "faq", "contact"].map(
            (section, index) => (
              <a href={`#${section}`} key={section}>
                {copy.nav[index]}
              </a>
            ),
          )}
        </nav>
        <div className="site-controls" aria-label="Display preferences">
          <button
            className="control-button language-button"
            id="language-toggle"
            type="button"
            onClick={() => {
              const next = language === "en" ? "ne" : "en";
              setLanguage(next);
              savePreference("portfolio-language", next);
            }}
            aria-label={
              language === "en" ? "नेपालीमा देखाउनुहोस्" : "View in English"
            }
          >
            {copy.languageLabel}
          </button>
          <button
            className="control-button theme-button"
            id="theme-toggle"
            type="button"
            onClick={() => {
              const next = theme === "light" ? "dark" : "light";
              setTheme(next);
              savePreference("portfolio-theme", next);
            }}
            aria-label={
              theme === "light" ? copy.themeEnableDark : copy.themeEnableLight
            }
            aria-pressed={theme === "dark"}
          >
            <svg
              className="control-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              {theme === "dark" ? (
                <>
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              ) : (
                <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
              )}
            </svg>
            <span>{theme === "dark" ? copy.themeLight : copy.themeDark}</span>
          </button>
        </div>
      </header>

      <main id="main">
        <section
          className="hero"
          id="home"
          ref={heroRef}
          onPointerMove={moveSpotlight}
          aria-labelledby="hero-title"
        >
          <div className="hero-spotlight" aria-hidden="true" />
          <div className="hero-topline">
            <span className="hero-index">PORTFOLIO / 2026</span>
            <span className="hero-location">{copy.location}</span>
          </div>
          <div className="hero-stage">
            <motion.figure
              className="hero-portrait"
              style={{ y: reduceMotion ? 0 : portraitYSpring }}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src="/myphoto.jpg"
                alt="Bishal Bikram Paudel in a suit"
                fetchPriority="high"
                width="717"
                height="1600"
              />
              <figcaption>
                <span>Bishal Bikram Paudel</span>
                <span>{copy.location}</span>
              </figcaption>
              <span className="portrait-frame" aria-hidden="true" />
            </motion.figure>
            <div className="hero-copy">
              <motion.p
                className="eyebrow hero-eyebrow"
                initial={reduceMotion ? false : { opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.12 }}
              >
                <span className="eyebrow-rule" />
                {copy.heroKicker}
              </motion.p>
              <motion.h1
                id="hero-title"
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>Bishal Bikram</span>
                <span>
                  Paudel<span className="accent-period">.</span>
                </span>
              </motion.h1>
              <motion.p
                className="hero-lead"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.4 }}
              >
                {copy.heroLead}
              </motion.p>
              <motion.div
                className="hero-actions"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.52 }}
              >
                <MagneticLink href="#contact" className="button button-primary">
                  {copy.contactCta}
                  <ArrowIcon />
                </MagneticLink>
                <a className="text-link" href="#projects">
                  {copy.projectsCta}
                  <span aria-hidden="true">↓</span>
                </a>
              </motion.div>
            </div>
          </div>
          <a className="scroll-cue" href="#about">
            <span>SCROLL TO EXPLORE</span>
            <span className="scroll-cue-line" aria-hidden="true" />
          </a>
        </section>

        <div className="ticker" aria-label="Building with code, leading with purpose">
          <div className="ticker-track" aria-hidden="true">
            {[0, 1].map((copyIndex) => (
              <span className="ticker-group" key={copyIndex}>
                <span>BUILDING WITH CODE</span>
                <i>✳</i>
                <span>LEADING WITH PURPOSE</span>
                <i>✳</i>
                <span>FROM NEPAL TO THE WORLD</span>
                <i>✳</i>
              </span>
            ))}
          </div>
        </div>

        <section className="section about-section" id="about">
          <div className="section-grid">
            <Reveal className="section-aside">
              <SectionLabel>{copy.aboutEyebrow}</SectionLabel>
              <span className="aside-index">01 / 06</span>
            </Reveal>
            <div className="section-main">
              <Reveal>
                <h2 className="section-title">{copy.aboutTitle}</h2>
                <p className="body-copy">{copy.aboutIntro}</p>
                <p className="body-copy secondary-copy">{copy.aboutValues}</p>
              </Reveal>
              <Reveal className="profile-block" delay={0.1}>
                <SectionLabel>{copy.profile}</SectionLabel>
                <div className="focus-grid">
                  {copy.focusLabels.map((label, index) => (
                    <article className="focus-item" key={label}>
                      <span className="focus-number">0{index + 1}</span>
                      <h3>{label}</h3>
                      <p>{copy.focusValues[index]}</p>
                    </article>
                  ))}
                </div>
              </Reveal>
              <Reveal className="education-block" delay={0.1}>
                <div className="education-item">
                  <span className="detail-label">{copy.education}</span>
                  <strong>{copy.degree}</strong>
                  <span>{copy.college}</span>
                </div>
                <div className="education-item">
                  <span className="detail-label">{copy.focus}</span>
                  <strong>{copy.focusAreas}</strong>
                </div>
              </Reveal>
              <Reveal className="skills-block" delay={0.12}>
                <SectionLabel>{copy.skills}</SectionLabel>
                <ul className="skill-list">
                  {skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="section experience-section" id="experience">
          <div className="section-grid">
            <Reveal className="section-aside">
              <SectionLabel>{copy.experienceEyebrow}</SectionLabel>
              <span className="aside-index">02 / 06</span>
            </Reveal>
            <div className="section-main">
              <Reveal>
                <h2 className="section-title">{copy.experienceTitle}</h2>
              </Reveal>
              <div className="experience-list">
                {copy.roles.map((role, index) => (
                  <Reveal className="experience-item" key={role.title} delay={index * 0.08}>
                    <span className="experience-dot" aria-hidden="true" />
                    <p className="experience-date">{role.dates}</p>
                    <h3>{role.title}</h3>
                    <p className="body-copy">{role.description}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section projects-section" id="projects">
          <div className="section-grid">
            <Reveal className="section-aside">
              <SectionLabel>{copy.projectsEyebrow}</SectionLabel>
              <span className="aside-index">03 / 06</span>
            </Reveal>
            <div className="section-main">
              <Reveal>
                <h2 className="section-title">{copy.projectsTitle}</h2>
              </Reveal>
              <div className="project-list">
                {projects.map((project, index) => (
                  <Reveal className="project-row" key={project.name} delay={index * 0.06}>
                    <span className="project-number">{project.number}</span>
                    <div className="project-heading">
                      <p className="project-type">{copy.projectTypes[index]}</p>
                      <h3>{project.name}</h3>
                    </div>
                    <div className="project-detail">
                      <p>{copy.projectDescriptions[index]}</p>
                      <ul className="project-tags">
                        {copy.projectTags[index].map((tag) => (
                          <li key={tag}>{tag}</li>
                        ))}
                      </ul>
                    </div>
                    <span className="project-arrow" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section leadership-section" id="leadership">
          <div className="section-grid">
            <Reveal className="section-aside">
              <SectionLabel>{copy.achievementsEyebrow}</SectionLabel>
              <span className="aside-index">04 / 06</span>
            </Reveal>
            <div className="section-main">
              <Reveal>
                <h2 className="section-title">{copy.achievementsTitle}</h2>
              </Reveal>
              <div className="achievement-list">
                {copy.achievements.map((achievement, index) => (
                  <Reveal
                    className="achievement"
                    key={achievement.title}
                    delay={index * 0.06}
                  >
                    <span className="achievement-number">0{index + 1}</span>
                    <div className="achievement-content">
                      <p className="project-type">{achievement.meta}</p>
                      <h3>{achievement.title}</h3>
                      <p className="body-copy">{achievement.description}</p>
                      {"details" in achievement && achievement.details && (
                        <ul className="achievement-details">
                          {achievement.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      )}
                      {"link" in achievement && achievement.link && (
                        <a
                          className="inline-link"
                          href="https://www.instagram.com/nepalcodecamp/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {achievement.link} <ArrowIcon />
                        </a>
                      )}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="section-grid">
            <Reveal className="section-aside">
              <SectionLabel>{copy.faqEyebrow}</SectionLabel>
              <span className="aside-index">05 / 06</span>
            </Reveal>
            <div className="section-main">
              <Reveal>
                <h2 className="section-title">{copy.faqTitle}</h2>
              </Reveal>
              <div className="faq-list">
                {copy.faqs.map((faq, index) => (
                  <Reveal className="faq-item" key={faq.question} delay={index * 0.04}>
                    <details>
                      <summary>
                        <span>{faq.question}</span>
                        <span className="faq-plus" aria-hidden="true">
                          +
                        </span>
                      </summary>
                      <p>{faq.answer}</p>
                    </details>
                  </Reveal>
                ))}
              </div>
              <Reveal className="query-card">
                <div className="query-copy">
                  <h3>{copy.queryTitle}</h3>
                  <p>{copy.queryIntro}</p>
                </div>
                <form
                  className="query-form"
                  id="query-form"
                  ref={formRef}
                  onSubmit={submitQuery}
                >
                  <div className="form-row">
                    <label>
                      <span>{copy.name}</span>
                      <input name="name" autoComplete="name" maxLength={100} required />
                    </label>
                    <label>
                      <span>{copy.email}</span>
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    <span>{copy.subject}</span>
                    <input name="subject" maxLength={160} required />
                  </label>
                  <label>
                    <span>{copy.message}</span>
                    <textarea name="message" rows={4} maxLength={3000} required />
                  </label>
                  <label className="honeypot" aria-hidden="true">
                    <span>Leave this field empty</span>
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                  <div className="form-submit-row">
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={queryStatus === "sending"}
                    >
                      {queryStatus === "sending" ? copy.sending : copy.submit}
                      <ArrowIcon />
                    </button>
                    <p
                      className={`query-status query-status-${queryStatus}`}
                      role="status"
                      aria-live="polite"
                    >
                      {statusMessage[queryStatus]}
                    </p>
                  </div>
                </form>
              </Reveal>
            </div>
          </div>
        </section>

        <section
          className="contact-section"
          id="contact"
          onPointerMove={moveSpotlight}
          aria-labelledby="contact-title"
        >
          <div className="hero-spotlight" aria-hidden="true" />
          <div className="contact-inner">
            <Reveal>
              <SectionLabel>{copy.contactEyebrow}</SectionLabel>
              <h2 id="contact-title">{copy.contactTitle}</h2>
              <p className="contact-intro">{copy.contactIntro}</p>
            </Reveal>
            <div className="contact-bottom">
              <Reveal className="contact-details">
                <div>
                  <span className="detail-label">{copy.emailLabel}</span>
                  <a href="mailto:bishalbikrampaudel@gmail.com">
                    bishalbikrampaudel@gmail.com
                  </a>
                </div>
                <div>
                  <span className="detail-label">{copy.phoneLabel}</span>
                  <a href="tel:+9779714366342">+977 9714366342</a>
                </div>
              </Reveal>
              <Reveal className="social-block" delay={0.1}>
                <span className="detail-label">{copy.socialLabel}</span>
                <div className="social-links">
                  <a
                    href="https://github.com/bishalbikrampaudel23"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub <ArrowIcon />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/bishal-bikram-paudel"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn <ArrowIcon />
                  </a>
                  <a
                    href="https://www.instagram.com/bishal_bikram_paudel/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram <ArrowIcon />
                  </a>
                  <a
                    href="https://www.facebook.com/bishal.bikram.paudel"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Facebook <ArrowIcon />
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#home">
          <span className="wordmark-mark">B.</span>
          <span>Bishal Bikram Paudel</span>
        </a>
        <p>{copy.footer}</p>
        <a className="footer-inbox" href="/inbox.html">
          {copy.inbox}
          <ArrowIcon />
        </a>
        <span className="copyright">© {new Date().getFullYear()}</span>
      </footer>
    </motion.div>
  );
}

export default App;
