import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { email, userId } from "@spark/core";
import { UserAvatar, userSelectOption } from "./UserAvatar.js";

describe("UserAvatar", () => {
  it("renders the canonical profile photo and falls back to initials", () => {
    const { rerender, container } = render(<UserAvatar user={{ name: "Ana Souza", avatarUrl: "https://images.example/ana.jpg" }} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://images.example/ana.jpg");
    rerender(<UserAvatar user={{ name: "Ana Souza", avatarUrl: null }} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("keeps the complete profile identity in user options", () => {
    const id = userId.create();
    expect(userSelectOption({ id, name: "Ana Souza", email: email("ana@example.com"), avatarUrl: "https://images.example/ana.jpg" })).toEqual({
      value: id,
      label: "Ana Souza",
      description: "ana@example.com",
      avatar: "https://images.example/ana.jpg",
    });
  });
});
