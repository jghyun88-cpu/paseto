/**
 * DealFlow(파이프라인) + KPI 관련 MCP 도구
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";

export function registerPipelineTools(server: McpServer): void {
  // -----------------------------------------------------------------
  // elsa_list_deals
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_deals",
    "eLSA 딜플로우(파이프라인) 이력 조회. 특정 스타트업의 단계 이동 히스토리를 확인한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();
        const items = await client.listDealFlows({
          startup_id: params.startup_id,
        });

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "해당 스타트업의 딜플로우 이력이 없습니다.",
              },
            ],
          };
        }

        const lines = items.map(
          (df) =>
            `- [${df.moved_at}] → ${df.stage}${df.notes ? ` (${df.notes})` : ""}`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `딜플로우 이력 ${items.length}건:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `딜플로우 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_get_deal
  // -----------------------------------------------------------------
  server.tool(
    "elsa_get_deal",
    "eLSA 딜플로우 단건 조회 (placeholder). startup_id로 딜플로우 목록을 가져와 최신 항목을 반환한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();
        const items = await client.listDealFlows({
          startup_id: params.startup_id,
        });

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "해당 스타트업의 딜플로우 이력이 없습니다.",
              },
            ],
          };
        }

        // 최신 항목 (마지막 이동)
        const latest = items[items.length - 1];

        const text = [
          `# 최신 딜 단계`,
          `- 스타트업 ID: ${latest.startup_id}`,
          `- 현재 단계: ${latest.stage}`,
          `- 이동 시점: ${latest.moved_at}`,
          `- 이동자 ID: ${latest.moved_by}`,
          latest.notes ? `- 메모: ${latest.notes}` : null,
          `- 전체 이력: ${items.length}건`,
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
              text: `딜 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_list_kpis
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_kpis",
    "eLSA KPI 기록 목록. 특정 스타트업의 월별 KPI(매출, 고객수, 런웨이 등)를 조회한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
      period: z
        .string()
        .optional()
        .describe("특정 기간 필터 (YYYY-MM 형식)"),
      page: z.number().int().min(1).optional().describe("페이지 번호"),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("페이지 크기"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.listKPIs({
          startup_id: params.startup_id,
          period: params.period,
          page: params.page,
          page_size: params.page_size,
        });

        if (result.data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "해당 스타트업의 KPI 기록이 없습니다.",
              },
            ],
          };
        }

        const lines = result.data.map((kpi) => {
          const metrics = [
            kpi.revenue !== null
              ? `매출: ${kpi.revenue.toLocaleString()}`
              : null,
            kpi.customer_count !== null ? `고객: ${kpi.customer_count}` : null,
            kpi.active_users !== null ? `MAU: ${kpi.active_users}` : null,
            kpi.runway_months !== null
              ? `런웨이: ${kpi.runway_months}개월`
              : null,
            kpi.headcount !== null ? `인원: ${kpi.headcount}` : null,
            kpi.poc_count !== null ? `PoC: ${kpi.poc_count}` : null,
          ]
            .filter(Boolean)
            .join(" | ");

          return `- [${kpi.period}] ${metrics}${kpi.notes ? ` — ${kpi.notes}` : ""}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `KPI 기록 ${result.total}건:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `KPI 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_add_deal_note (placeholder)
  // -----------------------------------------------------------------
  server.tool(
    "elsa_add_deal_note",
    "eLSA 딜 노트 추가 (placeholder). 향후 딜플로우에 노트를 추가하는 API가 구현되면 연결.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
      note: z.string().min(1).describe("노트 내용"),
    },
    async (params) => {
      // 현재 eLSA API에 deal note 추가 전용 엔드포인트가 없음
      // deal-flows/move를 사용하면 단계 이동이 발생하므로 여기서는 placeholder로 둔다
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `[placeholder] 딜 노트 추가 요청 수신`,
              `- 스타트업: ${params.startup_id}`,
              `- 노트: ${params.note}`,
              "",
              "현재 eLSA API에 노트 전용 엔드포인트가 없습니다.",
              "deal-flows/move 엔드포인트는 단계 이동을 수반하므로 노트만 추가하는 용도로 사용할 수 없습니다.",
              "백엔드에 PATCH /api/v1/deal-flows/{id}/notes 엔드포인트를 추가하면 이 도구를 연결할 수 있습니다.",
            ].join("\n"),
          },
        ],
      };
    },
  );
}
