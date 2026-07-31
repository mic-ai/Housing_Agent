import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
  },
}));

import { VisitorLinkQr } from "@/components/reception/VisitorLinkQr";

describe("VisitorLinkQr", () => {
  it("生成されたQRコード画像を表示する", async () => {
    render(<VisitorLinkQr url="http://localhost/api/visitor/link/visitor_1" />);

    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/png;base64,fake");
    });
  });
});
