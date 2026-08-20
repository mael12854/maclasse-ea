import { createClient } from "@/lib/supabase/server";
import { createTimetableSlot, deleteTimetableSlot } from "@/lib/actions";
import { DAYS_OF_WEEK } from "@/lib/types";
import type { ClassRow, Profile, TimetableSlot } from "@/lib/types";

export default async function EmploiDuTempsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: slots } = await supabase
    .from("timetable_slots")
    .select("*")
    .order("day_of_week")
    .order("start_time")
    .returns<TimetableSlot[]>();

  let classOptions: ClassRow[] = [];
  if (profile?.role === "admin") {
    const { data } = await supabase.from("classes").select("*").order("name");
    classOptions = data ?? [];
  }

  const { data: classesById } = await supabase.from("classes").select("id, name");
  const classNames = new Map((classesById ?? []).map((c) => [c.id, c.name]));

  const byDay = new Map<number, TimetableSlot[]>();
  for (const slot of slots ?? []) {
    byDay.set(slot.day_of_week, [...(byDay.get(slot.day_of_week) ?? []), slot]);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-encre">Emploi du temps</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS_OF_WEEK.slice(0, 6).map((day, i) => {
          const dayNumber = i + 1;
          const daySlots = byDay.get(dayNumber) ?? [];
          return (
            <div
              key={day}
              className="flex flex-col gap-2 rounded-xl border border-ardoise/15 bg-blanc p-4"
            >
              <h2 className="text-sm font-semibold text-encre">{day}</h2>
              {daySlots.length === 0 && (
                <p className="text-xs text-ardoise">Rien de prévu.</p>
              )}
              {daySlots.map((slot) => (
                <div key={slot.id} className="flex items-start justify-between gap-2 border-t border-ardoise/10 pt-2 text-sm">
                  <div>
                    <p className="font-medium text-encre">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · {slot.subject}
                    </p>
                    <p className="text-xs text-ardoise">
                      {classNames.get(slot.class_id) ?? ""}
                      {slot.room ? ` · salle ${slot.room}` : ""}
                    </p>
                  </div>
                  {profile?.role === "admin" && (
                    <form
                      action={async () => {
                        "use server";
                        await deleteTimetableSlot(slot.id);
                      }}
                    >
                      <button className="text-xs text-ardoise hover:text-rouge">✕</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {profile?.role === "admin" && (
        <form
          action={createTimetableSlot}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="w-full text-sm font-medium text-ardoise">
            Ajouter un créneau
          </h2>
          <select name="class_id" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="subject" placeholder="Matière" required className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <select name="day_of_week" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            {DAYS_OF_WEEK.slice(0, 6).map((day, i) => (
              <option key={day} value={i + 1}>
                {day}
              </option>
            ))}
          </select>
          <input type="time" name="start_time" required className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <input type="time" name="end_time" required className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <input name="room" placeholder="Salle (optionnel)" className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <button
            type="submit"
            className="rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Ajouter
          </button>
        </form>
      )}
    </div>
  );
}
