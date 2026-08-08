import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { DayPicker } from "react-day-picker";
import type { AgendaItem } from "../../services/contentService";
import { parseAgendaDate, toDateKey } from "../../utils/agendaDate";

type AgendaCalendarProps = {
  items: AgendaItem[];
  activeId?: string;
};

export function AgendaCalendar({ items, activeId }: AgendaCalendarProps) {
  const navigate = useNavigate();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const date = parseAgendaDate(item.date);
      if (!date) continue;
      const key = toDateKey(date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const eventDates = useMemo(
    () =>
      [...eventsByDay.keys()].map((key) => {
        const [y, m, d] = key.split("-").map(Number);
        return new Date(y, m - 1, d, 12);
      }),
    [eventsByDay],
  );

  const activeDate = useMemo(() => {
    const active = items.find((item) => item.id === activeId);
    return active ? parseAgendaDate(active.date) ?? undefined : undefined;
  }, [items, activeId]);

  const [month, setMonth] = useState<Date>(() => activeDate ?? new Date());
  const [selected, setSelected] = useState<Date | undefined>(activeDate);

  useEffect(() => {
    if (!activeDate) return;
    setSelected(activeDate);
    setMonth(activeDate);
  }, [activeDate]);

  const selectedKey = selected ? toDateKey(selected) : "";
  const dayEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];

  return (
    <aside className="dash-panel sticky top-24 overflow-hidden">
      <div className="border-b border-border px-4 py-4">
        <p className="dash-eyebrow">Calendrier</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[var(--sgi-ink)]">Tous les événements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les jours marqués indiquent une activité du centre.
        </p>
      </div>

      <div className="px-2 py-3 sm:px-3">
        <DayPicker
          mode="single"
          locale={fr}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(date) => {
            setSelected(date);
            if (!date) return;
            const key = toDateKey(date);
            const events = eventsByDay.get(key);
            if (events?.length === 1) {
              navigate(`/agenda/${events[0].id}`);
            }
          }}
          modifiers={{ event: eventDates }}
          modifiersClassNames={{
            event: "agenda-cal-event",
            selected: "agenda-cal-selected",
            today: "agenda-cal-today",
          }}
          showOutsideDays
          className="agenda-cal mx-auto w-full"
          classNames={{
            months: "flex flex-col",
            month: "w-full space-y-3",
            caption: "relative flex items-center justify-center px-8 pt-1",
            caption_label: "font-display text-sm font-semibold capitalize text-[var(--sgi-ink)]",
            nav: "flex items-center",
            nav_button:
              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-[var(--sgi-ink)] transition hover:bg-secondary",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "w-[14.28%] pb-1 text-center text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground",
            row: "mt-1 flex w-full",
            cell: "relative h-10 w-[14.28%] p-0 text-center text-sm",
            day: "mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-sm text-[var(--sgi-ink)] transition hover:bg-secondary",
            day_outside: "text-muted-foreground/45",
            day_disabled: "text-muted-foreground/30",
            day_hidden: "invisible",
          }}
          components={{
            IconLeft: () => <ChevronLeft size={16} />,
            IconRight: () => <ChevronRight size={16} />,
          }}
        />
      </div>

      <div className="border-t border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--sgi-red)]" /> Événement
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--sgi-blue)]" /> Sélection
          </span>
        </div>

        {dayEvents.length > 0 ? (
          <ul className="space-y-2">
            {dayEvents.map((event) => {
              const isActive = event.id === activeId;
              return (
                <li key={event.id}>
                  <Link
                    to={`/agenda/${event.id}`}
                    className={`block rounded-2xl border px-3 py-3 transition ${
                      isActive
                        ? "border-[var(--sgi-blue)] bg-[var(--sgi-blue)]/8"
                        : "border-border bg-white hover:border-[var(--sgi-blue)]/40"
                    }`}
                  >
                    <p className="font-display text-sm font-semibold text-[var(--sgi-ink)]">{event.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} /> {event.time || "—"}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {selected ? "Aucun événement ce jour-là." : "Sélectionnez un jour pour voir les activités."}
          </p>
        )}
      </div>

      <style>{`
        .agenda-cal .agenda-cal-event {
          position: relative;
          font-weight: 700;
          color: var(--sgi-ink);
        }
        .agenda-cal .agenda-cal-event::after {
          content: "";
          position: absolute;
          bottom: 3px;
          left: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--sgi-red);
          transform: translateX(-50%);
        }
        .agenda-cal .agenda-cal-selected,
        .agenda-cal .agenda-cal-selected:hover {
          background: var(--sgi-blue) !important;
          color: white !important;
        }
        .agenda-cal .agenda-cal-selected.agenda-cal-event::after {
          background: var(--sgi-gold-soft, #f0c75e);
        }
        .agenda-cal .agenda-cal-today:not(.agenda-cal-selected) {
          box-shadow: inset 0 0 0 1.5px var(--sgi-gold);
        }
      `}</style>
    </aside>
  );
}
