import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Component under test (does not exist yet — Red phase)
import { FilterPanel } from "@/components/search/FilterPanel";

const defaultProps = {
  areas: ["東京", "大阪", "名古屋"],
  houseTypes: ["一戸建て", "マンション", "土地"],
  priceRanges: ["〜3000万", "3000〜5000万", "5000万〜"],
  onFilterChange: vi.fn(),
};

describe("FilterPanel", () => {
  it("エリア・建物タイプ・価格帯のフィルターが表示される", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText(/エリア/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/建物タイプ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/価格帯/i)).toBeInTheDocument();
  });

  it("エリアを選択するとonFilterChangeが呼ばれる", async () => {
    render(<FilterPanel {...defaultProps} />);
    const select = screen.getByLabelText(/エリア/i);
    await userEvent.selectOptions(select, "東京");
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ area: "東京" })
    );
  });

  it("建物タイプを選択するとonFilterChangeが呼ばれる", async () => {
    render(<FilterPanel {...defaultProps} />);
    const select = screen.getByLabelText(/建物タイプ/i);
    await userEvent.selectOptions(select, "一戸建て");
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ houseType: "一戸建て" })
    );
  });

  it("価格帯を選択するとonFilterChangeが呼ばれる", async () => {
    render(<FilterPanel {...defaultProps} />);
    const select = screen.getByLabelText(/価格帯/i);
    await userEvent.selectOptions(select, "〜3000万");
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceRange: "〜3000万" })
    );
  });

  it("リセットボタンで全フィルターがクリアされる", async () => {
    render(<FilterPanel {...defaultProps} />);
    await userEvent.selectOptions(screen.getByLabelText(/エリア/i), "東京");
    await userEvent.click(screen.getByRole("button", { name: /リセット|clear/i }));
    expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith({ area: "", houseType: "", priceRange: "" });
  });

  it("初期値がpropsのinitialFiltersに反映される", () => {
    render(
      <FilterPanel
        {...defaultProps}
        initialFilters={{ area: "大阪", houseType: "", priceRange: "" }}
      />
    );
    const select = screen.getByLabelText(/エリア/i) as HTMLSelectElement;
    expect(select.value).toBe("大阪");
  });
});
