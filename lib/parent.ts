import type { SupabaseClient } from "@supabase/supabase-js";
import type { Child } from "@/lib/types";

export async function getChildren(supabase: SupabaseClient, parentId: string): Promise<Child[]> {
  const { data } = await supabase
    .from("parent_students")
    .select("profiles!parent_students_student_id_fkey(id, full_name, class_id)")
    .eq("parent_id", parentId);

  return (data ?? [])
    .map((row) => row.profiles as unknown as Child)
    .filter(Boolean)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function pickChild(children: Child[], childId?: string): Child | null {
  if (children.length === 0) return null;
  if (childId) {
    const match = children.find((c) => c.id === childId);
    if (match) return match;
  }
  return children[0];
}
