import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DateTimePicker } from "./DateTimePicker.js";

const pad = (value: number) => String(value).padStart(2, "0");

it("abre um timestamp sincronizado com dia, hora e minuto já selecionados", async () => {
  const user = userEvent.setup();
  const instant = new Date("2026-09-24T12:37:00+00:00");
  render(<DateTimePicker label="Assinatura prevista" mode="datetime" value="2026-09-24 12:37:00+00" onValueChange={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: /Assinatura prevista/ }));

  const selectedDay = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
  expect(screen.getByRole("gridcell", { selected: true })).toHaveAttribute("data-day", selectedDay);
  expect(screen.getByRole("combobox", { name: "Horas" })).toHaveTextContent(pad(instant.getHours()));
  expect(screen.getByRole("combobox", { name: "Minutos" })).toHaveTextContent(pad(instant.getMinutes()));
  expect(screen.getByRole("button", { name: "Aplicar" })).toBeEnabled();
});
