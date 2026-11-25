import Link from "next/link";
import { Megaphone, Phone, MessageCircle, Mail, MapPin, ArrowRight } from "lucide-react";
import { getLang, t, getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { features } from "@/lib/features-server";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { A11yControls } from "@/components/a11y-bar";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { ButtonLink } from "@/components/ui";
import { NewsletterForm } from "@/components/public/newsletter-form";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const T = await getT();
  const [lang, settings, user, f] = await Promise.all([getLang(), getSettings(), getCurrentUser(), features()]);
  const nav = [
    { href: "/about", label: t(lang, "about") },
    { href: "/news", label: t(lang, "news") },
    { href: "/campaigns", label: t(lang, "campaigns") },
    { href: "/events", label: t(lang, "events") },
    { href: "/resources", label: t(lang, "resources") },
    { href: "/contact", label: t(lang, "contact") },
  ].filter((n) => f.path(n.href));
  const tel = settings.hotline.replace(/[^\d+]/g, "");
  const portalHref = user ? homeFor(user.role) : "/login";

  return (
    <>
      {settings.alertEnabled === "true" && settings.alertText && (
        <div className="bg-coral-500 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium">
            <Megaphone className="size-4 shrink-0" />
            <span className={lang === "dv" && settings.alertTextDv ? "font-thaana" : undefined}>{lang === "dv" && settings.alertTextDv ? settings.alertTextDv : settings.alertText}</span>
            {settings.alertLink && (
              <Link href={settings.alertLink} className="inline-flex items-center gap-1 font-bold underline underline-offset-2">
                {T("Take action")} <ArrowRight className="size-3.5 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      )}

      {f.on("site.topbar") && <div className="bg-brand-900 text-brand-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-4">
            <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline">
              <Phone className="size-3.5" /> {t(lang, "hotline")}: <span dir="ltr">{settings.hotline}</span>
            </a>
            <a href={`https://wa.me/${tel.replace("+", "")}`} className="hidden items-center gap-1.5 hover:text-white sm:inline-flex">
              <MessageCircle className="size-3.5" /> WhatsApp / Viber
            </a>
          </div>
          <div className="flex items-center gap-2">
            {f.on("site.a11y") && <A11yControls />}
            {settings.dhivehiEnabled !== "false" && <LangSwitch lang={lang} />}
          </div>
        </div>
      </div>}

      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4">
          <Link href="/" aria-label={T("MHPU home")} className="shrink-0"><Logo compact /></Link>
          <nav className="hidden items-center gap-1 xl:flex" aria-label={T("Main")}>
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href}
                className="rounded-full px-3.5 py-2 text-sm font-semibold transition-colors"
                activeClassName="bg-brand-50 text-brand-800" inactiveClassName="text-ink/80 hover:bg-sand-50 hover:text-ink">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {f.path("/get-help") && <ButtonLink href="/get-help" variant="outline" className="hidden md:inline-flex">{t(lang, "getHelp")}</ButtonLink>}
            {f.on("site.portalButton") && <ButtonLink href={portalHref} variant="ghost" className="hidden sm:inline-flex">
              {user ? T("My portal") : t(lang, "login")}
            </ButtonLink>}
            {f.path("/join") && <ButtonLink href="/join" variant="coral" className="min-h-9 whitespace-nowrap px-3.5 sm:min-h-10 sm:px-4">{t(lang, "join")}</ButtonLink>}
            <MobileNav
              hideFrom="xl:hidden"
              items={[{ href: "/", label: t(lang, "home") }, ...nav, ...(f.path("/get-help") ? [{ href: "/get-help", label: t(lang, "getHelp") }] : [])]}
              footer={<ButtonLink href={portalHref} variant="primary" className="w-full">{user ? T("My portal") : t(lang, "login")}</ButtonLink>}
            />
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="mt-24 bg-brand-950 text-brand-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-200">{t(lang, "footerAbout")}</p>
            {f.on("site.newsletter") && <div className="mt-6">
              <div className="mb-2 text-sm font-semibold text-white">{t(lang, "newsletter")}</div>
              <NewsletterForm label={t(lang, "subscribe")} />
            </div>}
          </div>
          <FooterCol T={T} title={T("Union")} allow={f.path} links={[["/about", "About MHPU"], ["/about#affiliates", "Workplace unions"], ["/resources?category=CONSTITUTION", "Constitution"]]} />
          <FooterCol T={T} title={T("Members")} allow={f.path} links={[["/join", "Join MHPU"], ["/get-help", "Get help at work"], ["/login", "Member portal"], ["/verify", "Verify a membership"]]} />
          {f.on("site.footerContact") && <div>
            <div className="mb-3 text-sm font-semibold text-white">{T("Contact")}</div>
            <ul className="space-y-2.5 text-sm text-brand-200">
              <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" /><span dir="ltr">{settings.hotline}</span></li>
              <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" />{settings.email}</li>
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{settings.address}</li>
            </ul>
            {f.on("site.social") && <div className="mt-4 flex gap-3 text-sm">
              {settings.facebook && <a href={settings.facebook} className="hover:text-white">Facebook</a>}
              {settings.instagram && <a href={settings.instagram} className="hover:text-white">Instagram</a>}
              {settings.x && <a href={settings.x} className="hover:text-white">X</a>}
            </div>}
          </div>}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-5 text-xs text-brand-300 sm:flex-row">
            <span>© {new Date().getFullYear()} {lang === "dv" ? <span className="font-thaana">{settings.nameDv}</span> : <>Maldives Health Professionals Union · <span className="font-thaana">{settings.nameDv}</span></>} · {T("Reg. no.")} {settings.registrationNo}</span>
            <span className="flex gap-4">{f.path("/privacy") && <Link href="/privacy" className="hover:text-white">{T("Privacy")}</Link>}<Link href="/login" className="hover:text-white">{T("Staff login")}</Link></span>
          </div>
        </div>
        {/* Letterhead band: brand blue with a slanted cut into black */}
        <div className="flex h-3" aria-hidden="true">
          <div className="w-1/2 bg-brand-500 [clip-path:polygon(0_0,100%_0,calc(100%-14px)_100%,0_100%)]" />
          <div className="-ms-2 flex-1 bg-black/60" />
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links, allow, T }: { title: string; links: [string, string][]; allow: (href: string) => boolean; T: (s: string) => string }) {
  links = links.filter(([href]) => allow(href));
  if (!links.length) return null;
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-white">{T(title)}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="text-brand-200 hover:text-white">{T(label)}</Link></li>
        ))}
      </ul>
    </div>
  );
}
