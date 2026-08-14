"use client";

import { useState } from "react";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

import { ResolveNoteDialog } from "./resolve-note-dialog";

type NoteRow = RouterOutputs["editorNote"]["platformList"]["notes"][number];

type Props = {
  notes: NoteRow[];
};

export function NotesTable({ notes }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [resolvingNote, setResolvingNote] = useState<NoteRow | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Site editor notes</caption>
            <thead className="border-b">
              <tr>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Business
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Page
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Note
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  From
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground px-6 py-8 text-center text-sm"
                  >
                    No notes found.
                  </td>
                </tr>
              ) : (
                notes.map((note) => {
                  const isExpanded = expandedIds.has(note.id);
                  return (
                    <tr key={note.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/businesses/${note.business.id}`}>
                          <div className="text-foreground font-medium">
                            {note.business.name}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {note.business.subdomain}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {note.pageLabel ?? "Whole site"}
                        </Badge>
                      </td>
                      <td className="max-w-md px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(note.id)}
                          title={note.body}
                          className={
                            isExpanded
                              ? "text-foreground text-left text-sm"
                              : "text-foreground line-clamp-2 text-left text-sm"
                          }
                        >
                          {note.body}
                        </button>
                      </td>
                      <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                        {note.createdBy?.email ?? "—"}
                      </td>
                      <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                        {new Date(note.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {note.status === "resolved" ? (
                          <div>
                            <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                              Resolved
                            </Badge>
                            {note.response && (
                              <div className="text-muted-foreground mt-1 line-clamp-2 max-w-xs text-xs">
                                {note.response}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Open
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {note.status === "open" && (
                          <Button
                            size="sm"
                            onClick={() => setResolvingNote(note)}
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ResolveNoteDialog
        note={resolvingNote}
        open={resolvingNote !== null}
        onOpenChange={(open) => {
          if (!open) setResolvingNote(null);
        }}
      />
    </>
  );
}
