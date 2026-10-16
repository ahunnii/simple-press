import { zodResolver } from "@hookform/resolvers/zod";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { FormBuilderValues } from "./builder-shared";
import { formCreateSchema } from "~/lib/validators/form";
import { Form } from "~/components/ui/form";

import {
  makeEmptyBuilderDefinition,
  makeScreeningQuestion,
  normalizeBuilderDefinition,
} from "./builder-shared";
import { FormScreeningCard } from "./form-screening-card";

// The real editor needs a browser-only TipTap instance; the card only has to
// place it and keep every embed switched off.
const noteField = vi.fn();
vi.mock("~/components/inputs/minimal-tiptap-form-field", () => ({
  MinimalTiptapFormField: (props: Record<string, unknown>) => {
    noteField(props);
    return <div data-testid="note-editor" />;
  },
}));

let rhf: ReturnType<typeof useForm<FormBuilderValues>>;

function Harness({ questions }: { questions: { prompt: string }[] }) {
  const definition = normalizeBuilderDefinition(makeEmptyBuilderDefinition());
  const screening = {
    ...definition.settings!.screening!,
    enabled: true,
    questions: questions.map((q, i) => ({
      ...makeScreeningQuestion(),
      id: `q${i + 1}`,
      prompt: q.prompt,
      passAnswer: i === 1 ? ("no" as const) : ("yes" as const),
    })),
  };
  rhf = useForm<FormBuilderValues>({
    resolver: zodResolver(formCreateSchema),
    mode: "onTouched",
    defaultValues: {
      name: "Intake",
      published: false,
      definition: {
        ...definition,
        settings: { ...definition.settings, screening },
      },
    },
  });
  return (
    <Form {...rhf}>
      <FormScreeningCard form={rhf} />
    </Form>
  );
}

describe("FormScreeningCard questions", () => {
  it("starts existing questions collapsed with their prompt and pass badge", () => {
    render(
      <Harness questions={[{ prompt: "Are you over 18?" }, { prompt: "" }]} />,
    );
    expect(screen.getByText("Are you over 18?")).toBeVisible();
    expect(screen.getByText("Untitled question")).toBeVisible();
    expect(screen.getByText("Continues on Yes")).toBeInTheDocument();
    expect(screen.getByText("Continues on No")).toBeInTheDocument();
    // Collapsed: no editing inputs yet.
    expect(screen.queryByLabelText(/^Question/)).toBeNull();
  });

  it("expands a question from its header", async () => {
    const user = userEvent.setup();
    render(<Harness questions={[{ prompt: "Are you over 18?" }]} />);
    await user.click(screen.getByRole("button", { name: /Are you over 18/ }));
    expect(screen.getByDisplayValue("Are you over 18?")).toBeVisible();
  });

  it("opens a newly added question", async () => {
    const user = userEvent.setup();
    render(<Harness questions={[{ prompt: "Are you over 18?" }]} />);
    await user.click(screen.getByRole("button", { name: "Add question" }));
    // The new (blank) question is open: its prompt input is on screen.
    expect(screen.getByPlaceholderText("e.g. Are you over 18?")).toBeVisible();
    // The existing one stayed collapsed.
    expect(screen.queryByDisplayValue("Are you over 18?")).toBeNull();
  });

  it("flags a collapsed question that fails validation", async () => {
    render(<Harness questions={[{ prompt: "Fine?" }, { prompt: "" }]} />);
    expect(screen.queryByText("Needs attention")).toBeNull();
    await act(async () => {
      await rhf.trigger("definition.settings.screening");
    });
    expect(await screen.findAllByText("Needs attention")).toHaveLength(1);
  });

  it("keeps every embed off in all the message editors", async () => {
    const user = userEvent.setup();
    noteField.mockClear();
    render(<Harness questions={[{ prompt: "Fine?" }]} />);
    // Open the question so its own fail-message editor mounts too.
    await user.click(screen.getByRole("button", { name: /Fine/ }));
    expect(screen.getAllByTestId("note-editor")).toHaveLength(3);
    const names = new Set<string>();
    for (const [props] of noteField.mock.calls as [Record<string, unknown>][]) {
      names.add(props.name as string);
      expect(props).toMatchObject({
        output: "json",
        formsEnabled: false,
        galleriesEnabled: false,
        quotesEnabled: false,
        embedsEnabled: false,
        videosEnabled: false,
        layoutBlocksEnabled: false,
        className: "min-w-0 grid-cols-[minmax(0,1fr)]",
      });
    }
    expect([...names].sort()).toEqual([
      "definition.settings.screening.defaultFailContent",
      "definition.settings.screening.questions.0.failContent",
      "definition.settings.screening.unlockContent",
    ]);
  });

  it("flags a collapsed question whose fail message has an error", async () => {
    render(<Harness questions={[{ prompt: "Fine?" }]} />);
    expect(screen.queryByText("Needs attention")).toBeNull();
    act(() => {
      rhf.setError("definition.settings.screening.questions.0.failContent", {
        message: "This message is too long",
      });
    });
    expect(await screen.findByText("Needs attention")).toBeInTheDocument();
  });
});
