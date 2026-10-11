import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import { TrainingFormModal } from "./TrainingFormModal";
import { WeaponFormModal } from "./WeaponFormModal";

const NAV = [
  { to: "/trainings", icon: "▤", label: "Treningi" },
  { to: "/weapons", icon: "▥", label: "Moja broń" },
  { to: "/stats", icon: "◔", label: "Statystyki" },
];

const ITEM =
  "flex w-full cursor-pointer items-center gap-[11px] rounded-lg border px-[9px] py-2 text-left text-[13.5px] whitespace-nowrap focus-visible:-outline-offset-2";
const ITEM_IDLE = "border-transparent text-muted hover:bg-page hover:text-ink";
const ITEM_ACTIVE = "border-line bg-accent-soft font-[560] text-accent";
const SECTION = "px-[9px] pt-[14px] pb-[6px] text-[10.5px] font-semibold tracking-[0.08em] whitespace-nowrap text-muted";
const ICON = "w-5 flex-none text-center text-[15px]";

/** App shell: side menu (collapsible, icon-only on narrow screens) and the current view. */
export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [addingTraining, setAddingTraining] = useState(false);
  const [addingWeapon, setAddingWeapon] = useState(false);
  const { label: themeLabel, cycle: cycleTheme } = useTheme();

  // Labels fade out when the menu is collapsed and are always hidden below 720px.
  const text = `transition-opacity duration-[180ms] max-[720px]:pointer-events-none max-[720px]:opacity-0 ${collapsed ? "pointer-events-none opacity-0" : ""}`;

  return (
    <div
      className={`grid min-h-screen transition-[grid-template-columns] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)] max-[720px]:grid-cols-[52px_minmax(0,1fr)] ${collapsed ? "grid-cols-[58px_minmax(0,1fr)]" : "grid-cols-[224px_minmax(0,1fr)]"}`}
    >
      <nav
        aria-label="Nawigacja główna"
        className="sticky top-0 flex h-screen flex-col gap-[3px] overflow-hidden border-r border-line bg-card px-[10px] py-[14px]"
      >
        <div className="flex items-center gap-[10px] px-2 pt-[6px] pb-4 whitespace-nowrap">
          <span
            aria-hidden="true"
            className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px] bg-accent text-[13px] font-bold text-on-accent"
          >
            ◎
          </span>
          <span className={`text-sm font-[620] tracking-[-0.01em] ${text}`}>Dziennik strzelecki</span>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => `${ITEM} ${isActive ? ITEM_ACTIVE : ITEM_IDLE}`}
          >
            <span aria-hidden="true" className={ICON}>
              {item.icon}
            </span>
            <span className={text}>{item.label}</span>
          </NavLink>
        ))}

        <div className={`${SECTION} ${text}`}>DODAJ</div>
        <button type="button" title="Nowy trening" onClick={() => setAddingTraining(true)} className={`${ITEM} ${ITEM_IDLE}`}>
          <span aria-hidden="true" className={ICON}>
            ＋
          </span>
          <span className={text}>Nowy trening</span>
        </button>
        <button type="button" title="Nowa broń" onClick={() => setAddingWeapon(true)} className={`${ITEM} ${ITEM_IDLE}`}>
          <span aria-hidden="true" className={ICON}>
            ＋
          </span>
          <span className={text}>Nowa broń</span>
        </button>

        <div className={`${SECTION} ${text}`}>WIDOK</div>
        <button type="button" title={`Motyw: ${themeLabel}`} onClick={cycleTheme} className={`${ITEM} ${ITEM_IDLE}`}>
          <span aria-hidden="true" className={ICON}>
            ◐
          </span>
          <span className={text}>Motyw: {themeLabel}</span>
        </button>

        <button
          type="button"
          aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
          className={`${ITEM} ${ITEM_IDLE} mt-auto max-[720px]:hidden`}
        >
          <span aria-hidden="true" className={`${ICON} transition-transform duration-[260ms] ${collapsed ? "rotate-180" : ""}`}>
            ‹
          </span>
          <span className={text}>Zwiń menu</span>
        </button>
      </nav>

      <main className="relative min-w-0 overflow-x-hidden">
        <Outlet />
      </main>

      <TrainingFormModal open={addingTraining} onClose={() => setAddingTraining(false)} />
      <WeaponFormModal open={addingWeapon} onClose={() => setAddingWeapon(false)} />
    </div>
  );
}
