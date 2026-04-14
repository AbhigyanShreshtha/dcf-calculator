import { render, screen } from "@testing-library/react";

import { SensitivityHeatmap } from "./sensitivity-heatmap";

describe("SensitivityHeatmap", () => {
  it("renders a 3x3 grid and highlights the base case content", () => {
    render(
      <SensitivityHeatmap
        matrix={{
          matrix_type: "wacc_growth",
          row_values: [0.09, 0.1, 0.11],
          column_values: [0.02, 0.03, 0.04],
          cells: [
            [28, 30, 32],
            [24, 26, 27],
            [20, 22, 23],
          ],
          base_row_index: 1,
          base_column_index: 1,
          currency_symbol: "$",
        }}
      />,
    );

    expect(screen.getByText("Sensitivity Analysis")).toBeInTheDocument();
    expect(screen.getByText("$26.00")).toBeInTheDocument();
  });
});

