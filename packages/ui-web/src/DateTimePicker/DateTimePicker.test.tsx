import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DateTimePicker } from "./DateTimePicker.js";

const pad = (value: number) => String(value).padStart(2, "0");

it("abre um timestamp sincronizado com dia e horário já selecionados", async () => {
  const user = userEvent.setup();
  const instant = new Date("2026-09-24T12:37:00+00:00");
  render(<DateTimePicker label="Assinatura prevista" mode="datetime" value="2026-09-24 12:37:00+00" onValueChange={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: /Assinatura prevista/ }));

  const selectedDay = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
  expect(screen.getByRole("gridcell", { selected: true })).toHaveAttribute("data-day", selectedDay);
  expect(within(screen.getByRole("group", { name: "Horários" })).getByRole("button", { pressed: true })).toHaveTextContent(`${pad(instant.getHours())}:${pad(instant.getMinutes())}`);
  expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
});

it("data fecha ao escolher o dia e devolve AAAA-MM-DD", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(<DateTimePicker label="Previsão" value="2026-10-15" onValueChange={change} />);
  await user.click(screen.getByRole("button", { name: /Previsão/ }));
  await user.click(screen.getByRole("button", { name: /20 de outubro/ }));
  expect(change).toHaveBeenCalledWith("2026-10-20");
});

it("hora escolhe hora e minuto em colunas e confirma", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(<DateTimePicker label="Início" mode="time" value="09:00" onValueChange={change} />);
  await user.click(screen.getByRole("button", { name: /Início/ }));
  await user.click(within(screen.getByRole("group", { name: "Horas" })).getByRole("button", { name: "14" }));
  await user.click(within(screen.getByRole("group", { name: "Minutos" })).getByRole("button", { name: "35" }));
  await user.click(screen.getByRole("button", { name: "OK" }));
  expect(change).toHaveBeenCalledWith("14:35");
});
