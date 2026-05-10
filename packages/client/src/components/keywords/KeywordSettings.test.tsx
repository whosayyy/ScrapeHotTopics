import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockFetchKeywords = vi.fn();
const mockCreateKeyword = vi.fn();
const mockToggleKeyword = vi.fn();
const mockDeleteKeyword = vi.fn();

vi.mock("../../services/api", () => ({
  fetchKeywords: (...args: unknown[]) => mockFetchKeywords(...args),
  createKeyword: (...args: unknown[]) => mockCreateKeyword(...args),
  toggleKeyword: (...args: unknown[]) => mockToggleKeyword(...args),
  deleteKeyword: (...args: unknown[]) => mockDeleteKeyword(...args),
  updateKeyword: vi.fn(),
}));

const { KeywordSettings } = await import("./KeywordSettings.js");

describe("KeywordSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<KeywordSettings open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("loads keywords on open", async () => {
    mockFetchKeywords.mockResolvedValue([
      { id: "1", keyword: "AI", isActive: true, isRegex: false, exclude: null, geo: null, createdAt: "", updatedAt: "" },
    ]);

    render(<KeywordSettings open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("AI")).toBeDefined();
    });
    expect(mockFetchKeywords).toHaveBeenCalled();
  });

  it("shows empty state when no keywords", async () => {
    mockFetchKeywords.mockResolvedValue([]);

    render(<KeywordSettings open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("暂无关键词，添加一个开始监控")).toBeDefined();
    });
  });
});
