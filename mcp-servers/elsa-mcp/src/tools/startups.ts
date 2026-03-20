/**
 * Startup 관련 MCP 도구 — 조회, 검색
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";

export function registerStartupTools(server: McpServer): void {
  // -----------------------------------------------------------------
  // elsa_list_startups
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_startups",
    "eLSA 스타트업 목록 조회. 산업, 단계, 포트폴리오 여부 등으로 필터링 가능.",
    {
      search: z.string().optional().describe("검색 키워드 (기업명, CEO 등)"),
      industry: z.string().optional().describe("산업 분야 필터"),
      stage: z.string().optional().describe("성장 단계 필터 (seed, pre_a 등)"),
      current_deal_stage: z
        .string()
        .optional()
        .describe("현재 딜 단계 필터 (inbound, deep_review 등)"),
      is_portfolio: z
        .boolean()
        .optional()
        .describe("포트폴리오 기업만 필터 (true/false)"),
      page: z.number().int().min(1).optional().describe("페이지 번호 (기본 1)"),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("페이지 크기 (기본 20, 최대 100)"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.listStartups({
          search: params.search,
          industry: params.industry,
          stage: params.stage,
          current_deal_stage: params.current_deal_stage,
          is_portfolio: params.is_portfolio,
          page: params.page,
          page_size: params.page_size,
        });

        const summary = `총 ${result.total}개 중 ${result.data.length}개 (페이지 ${result.page}/${Math.ceil(result.total / result.page_size) || 1})`;

        const lines = result.data.map(
          (s) =>
            `- [${s.company_name}] ${s.industry} | ${s.stage} | 딜단계: ${s.current_deal_stage} | 포트폴리오: ${s.is_portfolio ? "Y" : "N"} | ID: ${s.id}`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${summary}\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `스타트업 목록 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_get_startup
  // -----------------------------------------------------------------
  server.tool(
    "elsa_get_startup",
    "eLSA 스타트업 상세 정보 조회. UUID로 특정 기업 데이터를 가져온다.",
    {
      id: z.string().uuid().describe("스타트업 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();
        const s = await client.getStartup(params.id);

        const text = [
          `# ${s.company_name}`,
          `- CEO: ${s.ceo_name}`,
          `- 산업: ${s.industry}`,
          `- 단계: ${s.stage}`,
          `- 원라이너: ${s.one_liner}`,
          `- 딜 단계: ${s.current_deal_stage}`,
          `- 포트폴리오: ${s.is_portfolio ? "Y" : "N"}`,
          s.portfolio_grade ? `- 등급: ${s.portfolio_grade}` : null,
          `- 상근: ${s.is_fulltime ? "Y" : "N"}`,
          `- 소싱채널: ${s.sourcing_channel}`,
          s.location ? `- 위치: ${s.location}` : null,
          s.team_size !== null ? `- 팀 규모: ${s.team_size}명` : null,
          s.current_revenue !== null
            ? `- 매출: ${s.current_revenue.toLocaleString()}원`
            : null,
          s.current_employees !== null
            ? `- 직원: ${s.current_employees}명`
            : null,
          s.current_traction ? `- 트랙션: ${s.current_traction}` : null,
          s.problem_definition
            ? `- 문제 정의: ${s.problem_definition}`
            : null,
          s.solution_description
            ? `- 솔루션: ${s.solution_description}`
            : null,
          s.main_customer ? `- 주요 고객: ${s.main_customer}` : null,
          s.founded_date ? `- 설립일: ${s.founded_date}` : null,
          s.invested_at ? `- 투자일: ${s.invested_at}` : null,
          `- 생성일: ${s.created_at}`,
          `- ID: ${s.id}`,
        ]
          .filter(Boolean)
          .join("\n");

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `스타트업 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_search_startups
  // -----------------------------------------------------------------
  server.tool(
    "elsa_search_startups",
    "eLSA 스타트업 키워드 검색. 기업명, CEO명 등으로 빠르게 찾는다.",
    {
      keyword: z.string().min(1).describe("검색 키워드"),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("결과 수 (기본 10)"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.listStartups({
          search: params.keyword,
          page_size: params.page_size ?? 10,
        });

        if (result.data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `"${params.keyword}" 검색 결과 없음`,
              },
            ],
          };
        }

        const lines = result.data.map(
          (s) =>
            `- [${s.company_name}] CEO: ${s.ceo_name} | ${s.industry} | ${s.stage} | ID: ${s.id}`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `"${params.keyword}" 검색 결과 ${result.total}건:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `검색 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
