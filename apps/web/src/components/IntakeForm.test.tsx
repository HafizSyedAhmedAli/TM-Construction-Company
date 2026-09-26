// apps/web/src/components/IntakeForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeForm } from "./IntakeForm";

describe("IntakeForm", () => {
  it("submits with name, contact, city, model, category when all fields are valid", async () => {
    const onSubmit = vi.fn();
    render(<IntakeForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/name/i), "Ahmed Raza");
    await user.type(screen.getByLabelText(/contact/i), "+92-300-1234567");
    await user.selectOptions(screen.getByLabelText(/city/i), "Hyderabad");
    await user.selectOptions(screen.getByLabelText(/engagement model/i), "2");
    await user.selectOptions(screen.getByLabelText(/material category/i), "B");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ahmed Raza",
      contact: "+92-300-1234567",
      city: "Hyderabad",
      model: 2,
      category: "B",
    });
  });

  it("blocks submission and shows field errors when required fields are missing (FR-4)", async () => {
    const onSubmit = vi.fn();
    render(<IntakeForm onSubmit={onSubmit} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/city is required/i)).toBeInTheDocument();
  });

  it("only offers the predefined cities, models, and categories (FR-4)", () => {
    render(<IntakeForm onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("option", { name: "Hyderabad" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Islamabad" }),
    ).not.toBeInTheDocument();
  });

it("disables the submit button while onSubmit is pending (UX)", async () => {
  let resolveSubmit!: () => void;
  const pending = new Promise<void>((resolve) => { resolveSubmit = resolve; });
  const onSubmit = vi.fn().mockReturnValue(pending);

  render(<IntakeForm onSubmit={onSubmit} />);
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/name/i), "Ahmed Raza");
  await user.type(screen.getByLabelText(/contact/i), "+92-300-1234567");
  await user.selectOptions(screen.getByLabelText(/city/i), "Hyderabad");
  await user.selectOptions(screen.getByLabelText(/engagement model/i), "2");
  await user.selectOptions(screen.getByLabelText(/material category/i), "B");

  const button = screen.getByRole("button", { name: /submit/i });
  await user.click(button);

  expect(button).toBeDisabled();
  expect(button).toHaveTextContent(/submitting/i);

  resolveSubmit();
  await pending;
});
});
