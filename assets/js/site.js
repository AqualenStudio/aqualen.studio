(() => {
  const LANG_KEY = "aqualen_lang";

  const dict = {
    en: {
      nav_home: "Home",
      nav_projects: "Projects",
      nav_devlog: "News / Devlog",
      nav_demo: "Prototype",
      nav_about: "About",
      nav_contact: "Contact",

      hero_kicker: "AQUALEN STUDIO",
      hero_title: "Depth Over Noise",
      hero_desc:
        "Eastern minimalism, mysterious worlds.",
      cta_primary: "View Projects",
      cta_secondary: "Play Prototype",
      cta_contact: "Contact",

      sec_feat: "Featured",
      sec_feat_desc: "Stellum, selected released work, and the studio's development log.",
      sec_latest: "Latest",
      sec_latest_desc: "Short updates, dev notes, release milestones.",

      featured_stellum: "Aqualen Studio's current project. More details will be revealed as development progresses.",
      p_inkighter_title: "Inkighter (Steam)",
      p_inkighter_desc: "Published. A stylized action experience forged from ink and resolve.",
      p_stellum_title: "Stellum",
      p_stellum_desc: "Current project. Details will be revealed as development progresses.",
      p_capy_title: "Capy Strike (iOS)",
      p_capy_desc: "On hold. This project may return in the future.",
      p_switch_title: "Long-term Project",
      p_switch_desc: "A longer-horizon project kept on the studio's public roadmap.",

      badge_published: "Published",
      badge_current: "Current",
      badge_on_hold: "On hold",
      badge_soon: "Launching soon",
      badge_future: "Long-term",

      footer_line1: "© " + new Date().getFullYear() + " Aqualen Studio. All rights reserved.",
      footer_line2: "Aqualen Studio is a label under Joytoart Gaming Ltd. (Cyprus, EU).",
      footer_privacy: "Privacy",
    },
    ja: {
      nav_home: "ホーム",
      nav_projects: "プロジェクト",
      nav_devlog: "ニュース / 開発ログ",
      nav_demo: "プロトタイプ",
      nav_about: "会社情報",
      nav_contact: "連絡先",

      hero_kicker: "AQUALEN STUDIO",
      hero_title: "海、遺跡、静かなカタストロフ",
      hero_desc:
        "Joytoart Gaming Ltd.（キプロス/EU）傘下のインディーレーベル。東洋ミニマルと神秘性、そしてキレのあるゲームシステム。",
      cta_primary: "プロジェクトを見る",
      cta_secondary: "プロトタイプを遊ぶ",
      cta_contact: "お問い合わせ",

      sec_feat: "注目",
      sec_feat_desc: "Stellum、リリース済み作品、そして開発ログ。",
      sec_latest: "最新情報",
      sec_latest_desc: "短いアップデート、開発メモ、リリース進捗。",

      featured_stellum: "Aqualen Studioの現在のプロジェクト。開発の進展に合わせて詳細を公開します。",
      p_inkighter_title: "Inkighter（Steam）",
      p_inkighter_desc: "配信中。インクと意志で切り拓くスタイライズド・アクション。",
      p_stellum_title: "Stellum",
      p_stellum_desc: "現在開発中のプロジェクト。詳細は開発の進展に合わせて公開します。",
      p_capy_title: "Capy Strike（iOS）",
      p_capy_desc: "保留中。将来的に再開する可能性があります。",
      p_switch_title: "長期プロジェクト",
      p_switch_desc: "スタジオの公開ロードマップにある長期プロジェクト。",

      badge_published: "配信中",
      badge_current: "開発中",
      badge_on_hold: "保留中",
      badge_soon: "近日",
      badge_future: "長期計画",

      footer_line1: "© " + new Date().getFullYear() + " Aqualen Studio. All rights reserved.",
      footer_line2: "Aqualen Studio is a label under Joytoart Gaming Ltd.（キプロス/EU）",
      footer_privacy: "プライバシー",
    }
  };

  function getLang(){
    const saved = localStorage.getItem(LANG_KEY);
    if(saved === "ja" || saved === "en") return saved;
    // default: English (you can change to ja if you prefer)
    return "en";
  }

  function setLang(lang){
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang);
  }

  function applyLang(lang){
    document.documentElement.lang = lang;
    const table = dict[lang] || dict.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const k = el.getAttribute("data-i18n");
      if(!k) return;
      if(table[k] != null) el.textContent = table[k];
    });

    // aria labels for buttons or links
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      const k = el.getAttribute("data-i18n-aria");
      if(table[k] != null) el.setAttribute("aria-label", table[k]);
    });

    // set pressed state
    document.querySelectorAll(".lang button").forEach(btn=>{
      btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
    });
  }

  function markActiveNav(){
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navlinks a[data-nav]").forEach(a=>{
      const target = a.getAttribute("href");
      const t = target.split("/").pop();
      if(t === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // bind language buttons
    document.querySelectorAll(".lang button[data-lang]").forEach(btn=>{
      btn.addEventListener("click", ()=> setLang(btn.dataset.lang));
    });

    markActiveNav();
    applyLang(getLang());
  });
})();
